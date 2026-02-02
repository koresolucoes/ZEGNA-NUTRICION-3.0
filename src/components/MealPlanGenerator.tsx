
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
    "Determinando porciones y gramajes exactos...",
    "Distribuyendo macronutrientes...",
    "Seleccionando grupos de alimentos con medidas caseras...",
    "Creando menú detallado para la semana...",
    "Balanceando la dieta...",
    "Añadiendo variedad y sabor...",
    "Finalizando plan con especificaciones precisas...",
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
    
    // Conflict State
    const [conflictDates, setConflictDates] = useState<string[]>([]);
    const [isOverwriting, setIsOverwriting] = useState(false);

    const intervalRef = useRef<number | null>(null);

    const generatePlan = async () => {
        setError(null);
        setConflictDates([]); // Reset conflicts
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

            let promptContext = `Actúa como un nutriólogo clínico experto. Tu tarea es generar un plan alimenticio ALTAMENTE DETALLADO Y CUANTIFICADO para ${numDays} días.`;
            
            promptContext += `\n\n**PERFIL DEL PACIENTE:**`;
            promptContext += `\n- Objetivo principal: ${healthGoal}.`;
            if(lastConsultation) {
                 promptContext += `\n- Datos biométricos: Peso ${lastConsultation.weight_kg} kg, Altura ${lastConsultation.height_cm} cm, IMC ${lastConsultation.imc}.`;
            }
            if (customInstructions) {
                promptContext += `\n- Instrucciones personalizadas: ${customInstructions}.`;
            }
            if (recipeExamples) {
                promptContext += `\n- Inspiración (opcional): Puedes incluir platillos similares a: ${recipeExamples}.`
            }

            promptContext += `\n\n**REGLAS CRÍTICAS DE FORMATO Y PRECISIÓN (OBLIGATORIO):**
            1. **CANTIDADES EXACTAS:** No uses términos vagos como "una porción", "un poco" o "al gusto". Debes especificar la cantidad de CADA ingrediente.
            2. **MEDIDAS:** Usa medidas caseras (tazas, cucharadas, piezas, rebanadas) o peso (gramos).
            3. **DETALLE:** Indica el método de preparación brevemente.
            4. **ESTRUCTURA:** [Cantidad] [Unidad] de [Alimento] [Preparación].
            
            **Ejemplo CORRECTO:**
            "120g de pechuga de pollo asada + 1/2 taza de arroz integral al vapor + 1 taza de brócoli cocido con 1 cucharadita de aceite de oliva."
            
            **Ejemplo INCORRECTO:**
            "Pollo con arroz y verduras."`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    plan_semanal: {
                        type: Type.ARRAY,
                        description: `Array de ${numDays} días con menús detallados y cuantificados.`,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                dia: { type: Type.STRING, description: "Día del plan (e.g., Día 1, Lunes)" },
                                desayuno: { type: Type.STRING, description: "Menú del desayuno con cantidades exactas (ej. 2 huevos, 1 pan tostado)." },
                                colacion_1: { type: Type.STRING, description: "Colación matutina con cantidades exactas (ej. 1 manzana, 10 almendras)." },
                                comida: { type: Type.STRING, description: "Menú de la comida con cantidades exactas y gramajes." },
                                colacion_2: { type: Type.STRING, description: "Colación vespertina con cantidades exactas." },
                                cena: { type: Type.STRING, description: "Menú de la cena con cantidades exactas." },
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
    
    // New Function: Initiate Save (Checks for conflicts)
    const initiateSavePlan = async () => {
        if (!generatedPlan) return;
        setLoading(true);
        setError(null);
        
        try {
             // Calculate the dates that will be used
            const today = new Date();
            const tomorrowUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
            
            const datesToCheck: string[] = [];
            for (let i = 0; i < generatedPlan.plan_semanal.length; i++) {
                const planDate = new Date(tomorrowUTC);
                planDate.setUTCDate(tomorrowUTC.getUTCDate() + i);
                datesToCheck.push(planDate.toISOString().split('T')[0]);
            }
            
            // Check for existing plans in database
            const { data: existingLogs, error: checkError } = await supabase
                .from('diet_logs')
                .select('log_date')
                .eq('person_id', person.id)
                .in('log_date', datesToCheck);
                
            if (checkError) throw checkError;
            
            if (existingLogs && existingLogs.length > 0) {
                // Conflict found!
                const conflicts = existingLogs.map(l => l.log_date);
                setConflictDates(conflicts);
                setLoading(false);
                return;
            }
            
            // No conflicts, proceed to save directly
            await executeSave(false);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // New Function: Execute Save (Handles Overwrite)
    const executeSave = async (overwrite: boolean) => {
        if (!generatedPlan) return;
        setIsOverwriting(true);
        setLoading(true);

        try {
             // If overwriting, delete existing logs first
            if (overwrite && conflictDates.length > 0) {
                const { error: deleteError } = await supabase
                    .from('diet_logs')
                    .delete()
                    .eq('person_id', person.id)
                    .in('log_date', conflictDates);
                
                if (deleteError) throw new Error(`Error eliminando planes anteriores: ${deleteError.message}`);
            }

            // 1. Create a summary log entry for activity feed
            const summaryLogPayload = {
                log_type: 'Plan Alimenticio (IA)',
                description: `Se generó un plan alimenticio detallado de ${numDays} días. Objetivo: ${healthGoal}.${overwrite ? ' (Sobreescribió planes existentes)' : ''}`,
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
                        body: `Tu nutriólogo ha creado un nuevo plan de alimentación detallado para ti. ¡Revísalo en el portal!`
                    })
                }).catch(err => console.error("Failed to send notification:", err));
            }

            onPlanSaved();
        } catch (err: any) {
             setError(`Error al guardar el plan: ${err.message}`);
        } finally {
             setLoading(false);
             setIsOverwriting(false);
             setConflictDates([]);
        }
    }

    const modalContent = (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Plan Detallado con IA</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {conflictDates.length > 0 && (
                        <div style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                            border: '1px solid #F59E0B', 
                            borderRadius: '12px', 
                            padding: '1.5rem', 
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>⚠️</div>
                            <h3 style={{margin: '0 0 0.5rem 0', color: '#B45309'}}>Conflicto de Fechas Detectado</h3>
                            <p style={{marginBottom: '1rem', color: '#92400E'}}>
                                Ya existen planes registrados para <strong>{conflictDates.length}</strong> de los días seleccionados.
                                <br />
                                <span style={{fontSize: '0.9rem'}}>Fechas afectadas: {conflictDates.map(d => new Date(d).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'})).join(', ')}.</span>
                            </p>
                            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                                <button 
                                    onClick={() => setConflictDates([])} 
                                    className="button-secondary"
                                    style={{backgroundColor: 'white'}}
                                >
                                    Cancelar y Revisar
                                </button>
                                <button 
                                    onClick={() => executeSave(true)} 
                                    className="button-primary"
                                    style={{backgroundColor: '#F59E0B', border: 'none'}}
                                    disabled={isOverwriting}
                                >
                                    {isOverwriting ? 'Sobreescribiendo...' : 'Sobreescribir Existentes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!generatedPlan && !loading && conflictDates.length === 0 && (
                        <>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Se generará un plan con <strong>medidas exactas y porciones</strong> para <strong>{person.full_name}</strong>.</p>

                            <div style={{display: 'flex', gap: '1rem'}}>
                                <div style={{flex: 1}}>
                                     <label htmlFor="num_days_meal_plan">Número de Días</label>
                                    <input
                                        id="num_days_meal_plan"
                                        type="number"
                                        min="1"
                                        max="14"
                                        value={numDays}
                                        onChange={(e) => setNumDays(e.target.value)}
                                    />
                                </div>
                                 <div style={{flex: 3}}>
                                    <label htmlFor="health_goal">Objetivo Principal *</label>
                                    <input
                                        id="health_goal"
                                        name="health_goal"
                                        value={healthGoal}
                                        onChange={(e) => setHealthGoal(e.target.value)}
                                        placeholder="Ej: Déficit calórico, aumento de masa muscular..."
                                        required
                                    />
                                </div>
                            </div>

                            <label htmlFor="custom_instructions">Instrucciones Adicionales (Opcional)</label>
                            <textarea
                                id="custom_instructions"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                rows={3}
                                placeholder="Ej: Incluir medidas en tazas, evitar lácteos, usar ingredientes económicos..."
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
                    
                    {generatedPlan && generatedPlan.plan_semanal && !loading && conflictDates.length === 0 && (
                        <div style={{maxHeight: '45vh', overflowY: 'auto', paddingRight: '1rem'}}>
                            <h3 style={{color: 'var(--primary-dark)', fontSize: '1.1rem'}}>Plan Semanal Sugerido</h3>
                            {generatedPlan.plan_semanal.map((day: any, index: number) => (
                                <div key={`${day.dia}-${index}`} style={{marginBottom: '1rem', backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px'}}>
                                    <h4 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0', color: 'var(--primary-color)'}}>{day.dia}</h4>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Desayuno:</strong> {day.desayuno}</p>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Colación 1:</strong> {day.colacion_1 || 'N/A'}</p>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Comida:</strong> {day.comida}</p>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Colación 2:</strong> {day.colacion_2 || 'N/A'}</p>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Cena:</strong> {day.cena}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cancelar</button>
                    {generatedPlan && conflictDates.length === 0 ? (
                         <button onClick={initiateSavePlan} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Plan'}</button>
                    ) : !generatedPlan && conflictDates.length === 0 ? (
                         <button onClick={generatePlan} disabled={loading || !healthGoal}>{loading ? 'Generando...' : 'Generar Plan'}</button>
                    ) : null}
                </div>
            </div>
        </div>
    );

    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default MealPlanGenerator;
