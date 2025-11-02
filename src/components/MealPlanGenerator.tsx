import React, { FC, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Type } from '@google/genai';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';
import { Person, ConsultationWithLabs, KnowledgeResource } from '../types';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';

interface MealPlanGeneratorProps {
    person: Person;
    lastConsultation: ConsultationWithLabs | null;
    onClose: () => void;
    onPlanSaved: () => void;
    knowledgeResources: KnowledgeResource[];
}

const modalRoot = document.getElementById('modal-root');

const mealThinkingMessages = [
    "Analizando objetivo del paciente...",
    "Calculando requerimientos calóricos...",
    "Distribuyendo macronutrientes...",
    "Seleccionando grupos de alimentos...",
    "Creando menú para la primera semana...",
    "Diseñando platillos para la segunda semana (si aplica)...",
    "Balanceando la dieta para todo el periodo...",
    "Añadiendo variedad y sabor...",
    "Finalizando plan y revisando consistencia...",
];


const MealPlanGenerator: FC<MealPlanGeneratorProps> = ({ person, lastConsultation, onClose, onPlanSaved, knowledgeResources }) => {
    const { clinic } = useClinic();
    const [numDays, setNumDays] = useState('7');
    const [healthGoal, setHealthGoal] = useState(person.health_goal || '');
    const [customInstructions, setCustomInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
    const [thinkingMessage, setThinkingMessage] = useState('');
    const intervalRef = useRef<number | null>(null);

    const generatePlan = async () => {
        setError(null);
        if (!healthGoal) {
            setError("Por favor, define el objetivo de salud principal para generar el plan.");
            return;
        }

        setLoading(true);
        setGeneratedPlan(null);
        
        let messageIndex = 0;
        setThinkingMessage(mealThinkingMessages[messageIndex]);
        intervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % mealThinkingMessages.length;
            setThinkingMessage(mealThinkingMessages[messageIndex]);
        }, 2000);

        try {
            const recipeExamples = knowledgeResources
                .map(r => r.title)
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 3) // Take up to 3
                .map(title => `"${title}"`) // Add quotes
                .join(', ');

            let promptContext = `Actúa como un nutriólogo profesional. Genera un plan alimenticio detallado para ${numDays} días para un paciente.`;
            promptContext += `\n- Objetivo principal del paciente: ${healthGoal}.`;
            if(lastConsultation) {
                 promptContext += `\n- Últimos datos de consulta: Peso ${lastConsultation.weight_kg} kg, Altura ${lastConsultation.height_cm} cm, IMC ${lastConsultation.imc}.`;
            }
            if (customInstructions) {
                promptContext += `\n- Instrucciones adicionales: ${customInstructions}.`;
            }
            if (recipeExamples) {
                promptContext += `\n- Para enriquecer el plan, puedes incluir platillos como los siguientes: ${recipeExamples}. Sé creativo y usa la gastronomía local como inspiración.`
            }
            promptContext += `\nEl plan debe ser balanceado, saludable y adecuado para los objetivos. Incluye desayuno, comida, cena y dos colaciones para cada día.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    plan_semanal: {
                        type: Type.ARRAY,
                        description: `Array de ${numDays} días.`,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                dia: { type: Type.STRING, description: "Día del plan (e.g., Día 1)" },
                                desayuno: { type: Type.STRING, description: "Descripción del desayuno." },
                                colacion_1: { type: Type.STRING, description: "Descripción de la colación de media mañana." },
                                comida: { type: Type.STRING, description: "Descripción de la comida." },
                                colacion_2: { type: Type.STRING, description: "Descripción de la colación de media tarde." },
                                cena: { type: Type.STRING, description: "Descripción de la cena." },
                            },
                            required: ["dia", "desayuno", "comida", "cena"]
                        }
                    }
                },
                required: ["plan_semanal"]
            };

            const apiResponse = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clinic_id: clinic?.id,
                    contents: promptContext,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `Error from server: ${apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            
            let responseText = String(data.text || '').trim();
            // Clean markdown formatting that other models might add
            if (responseText.startsWith('```json')) {
                responseText = responseText.substring(7);
            }
            if (responseText.endsWith('```')) {
                responseText = responseText.substring(0, responseText.length - 3);
            }
            
            const jsonStartIndex = responseText.indexOf('{');
            const jsonEndIndex = responseText.lastIndexOf('}');
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                responseText = responseText.substring(jsonStartIndex, jsonEndIndex + 1);
            } else {
                throw new Error("La respuesta de la IA no contenía un objeto JSON válido.");
            }

            const planJson = JSON.parse(responseText);
            // Ensure the root key 'plan_semanal' exists and is an array before setting state
            if (planJson && Array.isArray(planJson.plan_semanal)) {
                setGeneratedPlan(planJson);
            } else {
                throw new Error("El JSON de la IA tiene un formato incorrecto. La clave 'plan_semanal' no es un array.");
            }


        } catch (err: any) {
            console.error(err);
            setError(`Error al generar el plan: ${err.message || 'Hubo un problema con la solicitud.'}`);
        } finally {
            setLoading(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    };

    const savePlanToLog = async () => {
        if (!generatedPlan) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Create a summary log entry for activity feed
            const summaryLogPayload = {
                log_type: 'Plan Alimenticio (IA)',
                description: `Se generó un plan alimenticio de ${numDays} días. Objetivo: ${healthGoal}.`,
                // FIX: Use person_id for the unified schema
                person_id: person.id,
                log_time: new Date().toISOString(),
            };

            const { error: summaryLogError } = await supabase.from('logs').insert(summaryLogPayload);
            if (summaryLogError) throw summaryLogError;

            // 2. Create detailed daily diet logs in the new table
            const today = new Date();
            // Create a date for tomorrow in UTC, avoiding local timezone side-effects.
            const tomorrowUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

            const dietLogPayloads = generatedPlan.plan_semanal.map((day: any, index: number) => {
                const planDate = new Date(tomorrowUTC);
                planDate.setUTCDate(tomorrowUTC.getUTCDate() + index);

                return {
                    // FIX: Use person_id for the unified schema
                    person_id: person.id,
                    log_date: planDate.toISOString().split('T')[0],
                    desayuno: day.desayuno,
                    colacion_1: day.colacion_1 || null,
                    comida: day.comida,
                    colacion_2: day.colacion_2 || null,
                    cena: day.cena,
                };
            });
            
            const { error: dietLogError } = await supabase.from('diet_logs').insert(dietLogPayloads);
            if (dietLogError) throw dietLogError;

            // Send notification to patient if they have a user account
            if (person.user_id) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: person.user_id,
                        title: '¡Nuevo Plan Alimenticio!',
                        body: `Tu nutriólogo ha creado un nuevo plan de alimentación para ti. ¡Revísalo en el portal!`
                    })
                }).catch(err => console.error("Failed to send notification:", err));
            }

            onPlanSaved();
        } catch (err: any) {
             setError(`Error al guardar el plan: ${err.message}`);
        } finally {
             setLoading(false);
        }
    }

    const modalContent = (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Plan Alimenticio con IA</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {!generatedPlan && !loading && (
                        <>
                            <p>Se generará un plan para <strong>{person.full_name}</strong>.</p>

                            <label htmlFor="num_days_meal_plan">Número de Días del Plan</label>
                            <input
                                id="num_days_meal_plan"
                                type="number"
                                min="1"
                                max="14"
                                value={numDays}
                                onChange={(e) => setNumDays(e.target.value)}
                                style={{maxWidth: '150px'}}
                            />
                            
                            <label htmlFor="health_goal">Objetivo de Salud Principal *</label>
                            <textarea
                                id="health_goal"
                                name="health_goal"
                                value={healthGoal}
                                onChange={(e) => setHealthGoal(e.target.value)}
                                rows={2}
                                placeholder="Ej: Pérdida de peso, control de glucosa, aumento de masa muscular..."
                                required
                            />

                            <label htmlFor="custom_instructions">Instrucciones Adicionales (Opcional)</label>
                            <textarea
                                id="custom_instructions"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                rows={3}
                                placeholder="Ej: Evitar lácteos, preferencia por comidas altas en proteína, presupuesto limitado..."
                            />
                        </>
                    )}

                    {loading && (
                        <div style={{textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                             <div className="spinner" style={{marginBottom: '20px', width: '40px', height: '40px', border: '4px solid var(--surface-hover-color)', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                             <p style={{ minHeight: '2.5em', color: 'var(--text-light)', fontWeight: 500 }}>
                                 {thinkingMessage}
                             </p>
                             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {error && <p style={{...styles.error, whiteSpace: 'pre-wrap'}}>{error}</p>}
                    
                    {generatedPlan && generatedPlan.plan_semanal && !loading &&(
                        <div style={{maxHeight: '45vh', overflowY: 'auto', paddingRight: '1rem'}}>
                            <h3 style={{color: 'var(--primary-dark)'}}>Plan Semanal Sugerido</h3>
                            {generatedPlan.plan_semanal.map((day: any, index: number) => (
                                <div key={`${day.dia}-${index}`} style={{marginBottom: '1rem'}}>
                                    <h4 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem'}}>{day.dia}</h4>
                                    <p style={{margin: '0.25rem 0'}}><strong>Desayuno:</strong> {day.desayuno}</p>
                                    <p style={{margin: '0.25rem 0'}}><strong>Colación 1:</strong> {day.colacion_1 || 'N/A'}</p>
                                    <p style={{margin: '0.25rem 0'}}><strong>Comida:</strong> {day.comida}</p>
                                    <p style={{margin: '0.25rem 0'}}><strong>Colación 2:</strong> {day.colacion_2 || 'N/A'}</p>
                                    <p style={{margin: '0.25rem 0'}}><strong>Cena:</strong> {day.cena}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cancelar</button>
                    {generatedPlan ? (
                         <button onClick={savePlanToLog} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Plan'}</button>
                    ) : (
                         <button onClick={generatePlan} disabled={loading || !healthGoal}>{loading ? 'Generando...' : 'Generar Plan'}</button>
                    )}
                </div>
            </div>
        </div>
    );

    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default MealPlanGenerator;