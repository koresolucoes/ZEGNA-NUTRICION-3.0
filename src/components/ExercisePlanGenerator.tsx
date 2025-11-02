
import React, { FC, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Type } from '@google/genai';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';
import { Person, ConsultationWithLabs } from '../types';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';

interface ExercisePlanGeneratorProps {
    person: Person;
    lastConsultation: ConsultationWithLabs | null;
    onClose: () => void;
    onPlanSaved: () => void;
}

const modalRoot = document.getElementById('modal-root');

const exerciseThinkingMessages = [
    "Interpretando objetivo de acondicionamiento...",
    "Analizando datos físicos del paciente...",
    "Estructurando la división semanal (push/pull/legs, etc.)...",
    "Seleccionando ejercicios para el tren superior...",
    "Añadiendo rutinas de cardio y resistencia...",
    "Balanceando volumen e intensidad...",
    "Considerando limitaciones y previniendo lesiones...",
    "Diseñando periodos de descanso y recuperación...",
    "Compilando la rutina final...",
];

const ExercisePlanGenerator: FC<ExercisePlanGeneratorProps> = ({ person, lastConsultation, onClose, onPlanSaved }) => {
    const { clinic } = useClinic();
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
            setError("Por favor, define el objetivo de salud principal para generar la rutina.");
            return;
        }

        setLoading(true);
        setGeneratedPlan(null);
        
        let messageIndex = 0;
        setThinkingMessage(exerciseThinkingMessages[messageIndex]);
        intervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % exerciseThinkingMessages.length;
            setThinkingMessage(exerciseThinkingMessages[messageIndex]);
        }, 2000);

        try {
            let promptContext = `Actúa como un entrenador personal profesional. Genera una rutina de ejercicios semanal detallada (Lunes a Domingo) para una persona.`;
            promptContext += `\n- Objetivo principal: ${healthGoal}.`;
            if (lastConsultation) {
                promptContext += `\n- Datos físicos relevantes: Peso ${lastConsultation.weight_kg} kg, Altura ${lastConsultation.height_cm} cm, IMC ${lastConsultation.imc}.`;
            }
            if (customInstructions) {
                promptContext += `\n- Instrucciones adicionales y limitaciones: ${customInstructions}.`;
            }
            promptContext += `\nEl plan debe ser seguro, efectivo y adecuado para los objetivos. Para cada día, especifica el enfoque (ej. Tren superior, Cardio, Descanso) y una lista de ejercicios. Para cada ejercicio, detalla el nombre, series, repeticiones y tiempo de descanso.`;
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    plan_semanal: {
                        type: Type.ARRAY,
                        description: "Array de 7 días, de Lunes a Domingo.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                dia: { 
                                    type: Type.STRING,
                                    description: "Día de la semana (ej. Lunes, Martes)."
                                },
                                enfoque: { 
                                    type: Type.STRING,
                                    description: "Enfoque principal del día, debe ser una frase corta y concisa (ej. 'Tren Superior y Core', 'Cardio y Resistencia', 'Día de Descanso')." 
                                },
                                ejercicios: {
                                    type: Type.ARRAY,
                                    description: "Lista de ejercicios para el día. Si es día de descanso, este array puede estar vacío.",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            nombre: { 
                                                type: Type.STRING,
                                                description: "Nombre del ejercicio."
                                            },
                                            series: { 
                                                type: Type.STRING,
                                                description: "Número de series (ej. '3' o '3-4')."
                                            },
                                            repeticiones: { 
                                                type: Type.STRING,
                                                description: "Número de repeticiones o duración (ej. '10-12' o '30 segundos')."
                                            },
                                            descanso: { 
                                                type: Type.STRING,
                                                description: "Tiempo de descanso entre series (ej. '60 segundos')."
                                            },
                                        },
                                        required: ["nombre", "series", "repeticiones", "descanso"]
                                    }
                                }
                            },
                            required: ["dia", "enfoque", "ejercicios"]
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
            const planJson = JSON.parse(data.text);
            setGeneratedPlan(planJson);

        } catch (err: any) {
            console.error(err);
            setError(`Error al generar la rutina: ${err.message || 'Hubo un problema con la solicitud.'}`);
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
                log_type: 'Rutina de Ejercicio (IA)',
                description: `Se generó una rutina de ejercicios de 7 días. Objetivo: ${healthGoal}.`,
                person_id: person.id,
                log_time: new Date().toISOString(),
            };
            const { error: summaryLogError } = await supabase.from('logs').insert(summaryLogPayload);
            if (summaryLogError) throw summaryLogError;

            // 2. Create detailed daily exercise logs in the new table
            const today = new Date();
            // Create a date for tomorrow in UTC, avoiding local timezone side-effects.
            const tomorrowUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

            const exerciseLogPayloads = generatedPlan.plan_semanal.map((day: any, index: number) => {
                const planDate = new Date(tomorrowUTC);
                planDate.setUTCDate(tomorrowUTC.getUTCDate() + index);

                return {
                    person_id: person.id,
                    log_date: planDate.toISOString().split('T')[0],
                    dia: day.dia,
                    enfoque: day.enfoque,
                    ejercicios: day.ejercicios || [],
                };
            });
            
            const { error: exerciseLogError } = await supabase.from('exercise_logs').insert(exerciseLogPayloads);
            if (exerciseLogError) throw exerciseLogError;
            
            // Send notification to patient if they have a user account
            if (person.user_id) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: person.user_id,
                        title: '¡Nueva Rutina de Ejercicio!',
                        body: `Tu nutriólogo ha creado una nueva rutina de ejercicio para ti. ¡Revísala en el portal!`
                    })
                }).catch(err => console.error("Failed to send notification:", err));
            }

            onPlanSaved();
        } catch (err: any) {
             setError(`Error al guardar la rutina: ${err.message}`);
        } finally {
             setLoading(false);
        }
    }

    const modalContent = (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Rutina de Ejercicio con IA</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {!generatedPlan && !loading && (
                        <>
                            <p>Se generará una rutina para <strong>{person.full_name}</strong>.</p>
                            
                            <label htmlFor="health_goal">Objetivo de Salud Principal *</label>
                            <textarea
                                id="health_goal"
                                name="health_goal"
                                value={healthGoal}
                                onChange={(e) => setHealthGoal(e.target.value)}
                                rows={2}
                                placeholder="Ej: Pérdida de peso, aumento de masa muscular, acondicionamiento cardiovascular..."
                                required
                            />

                            <label htmlFor="custom_instructions">Instrucciones Adicionales (Opcional)</label>
                            <textarea
                                id="custom_instructions"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                rows={3}
                                placeholder="Ej: Lesión en la rodilla, sin acceso a gimnasio, preferencia por ejercicios de cardio..."
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

                    {error && <p style={styles.error}>{error}</p>}
                    
                    {generatedPlan && !loading && (
                        <div style={{maxHeight: '45vh', overflowY: 'auto', paddingRight: '1rem'}}>
                            <h3 style={{color: 'var(--primary-dark)'}}>Rutina Semanal Sugerida</h3>
                            {generatedPlan.plan_semanal.map((day: any, dayIndex: number) => (
                                <div key={day.dia + dayIndex} style={{marginBottom: '1rem'}}>
                                    <h4 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem'}}>{day.dia} - {day.enfoque}</h4>
                                    {day.ejercicios && day.ejercicios.length > 0 ? (
                                        <ul style={{paddingLeft: '20px', margin: '0.5rem 0'}}>
                                            {day.ejercicios.map((ex: any, exIndex: number) => (
                                                <li key={ex.nombre + exIndex}>
                                                    <strong>{ex.nombre}:</strong> {ex.series} de {ex.repeticiones}, descanso {ex.descanso}.
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p style={{paddingLeft: '20px'}}>Descanso o actividad de baja intensidad.</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cancelar</button>
                    {generatedPlan ? (
                         <button onClick={savePlanToLog} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Rutina'}</button>
                    ) : (
                         <button onClick={generatePlan} disabled={loading || !healthGoal}>{loading ? 'Generando...' : 'Generar Rutina'}</button>
                    )}
                </div>
            </div>
        </div>
    );

    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ExercisePlanGenerator;
