import React, { FC, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FoodEquivalent } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';
import { Type } from '@google/genai';

interface AiMealPlanGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanSaved: () => void;
    equivalentsData: FoodEquivalent[];
    planPortions: Record<string, string>;
    personId: string | null;
}

const modalRoot = document.getElementById('modal-root');

const AiMealPlanGeneratorModal: FC<AiMealPlanGeneratorModalProps> = ({ isOpen, onClose, onPlanSaved, equivalentsData, planPortions, personId }) => {
    const { clinic } = useClinic();
    const [numDays, setNumDays] = useState('3');
    const [customInstructions, setCustomInstructions] = useState('');
    const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [thinkingMessage, setThinkingMessage] = useState('');
    const intervalRef = useRef<number | null>(null);

    const thinkingMessages = [
        "Consultando al chef de Mazatlán...",
        "Calculando porciones diarias...",
        "Diseñando menú para los primeros días...",
        "Asegurando variedad para la primera semana...",
        "Inspirándose en el Malecón...",
        "Planificando la segunda semana (si aplica)...",
        "Revisando que todo cumpla con los equivalentes...",
        "Compilando el plan final de hasta 14 días...",
    ];

    const activeEquivalents = useMemo(() => {
        return Object.entries(planPortions)
            .filter(([_, portions]) => parseFloat(portions) > 0)
            .map(([id, portions]) => {
                const eq = equivalentsData.find(e => e.id === id);
                return { name: eq?.subgroup_name || 'Desconocido', portions };
            });
    }, [planPortions, equivalentsData]);

    const handleGenerate = async () => {
        setError(null);
        setLoading(true);
        setGeneratedPlan(null);
        
        let messageIndex = 0;
        setThinkingMessage(thinkingMessages[messageIndex]);
        intervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % thinkingMessages.length;
            setThinkingMessage(thinkingMessages[messageIndex]);
        }, 2000);

        try {
            const equivalentsList = activeEquivalents.map(eq => `- ${eq.name}: ${eq.portions} porción(es)`).join('\n');

            let prompt = `Actúa como un nutriólogo experto y chef especializado en la gastronomía de Sinaloa, México (especialmente Mazatlán). Tu tarea es crear un plan alimenticio detallado para ${numDays} días, basado ESTRICTAMENTE en la siguiente distribución DIARIA de porciones de alimentos equivalentes del SMAE.

**Distribución Diaria de Equivalentes (debe cumplirse para CADA DÍA del plan):**
${equivalentsList}

**Instrucciones Adicionales del Nutriólogo:**
${customInstructions || "Ninguna."}

**Instrucciones de Creatividad y Formato:**
1.  Sé creativo e inspírate en platillos locales como aguachile, pescado zarandeado, chilorio, etc., pero adáptalos para que sean saludables y cumplan con los equivalentes.
2.  Ofrece variedad entre los días. No repitas los mismos platillos exactos.
3.  La respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional ni formato markdown.
4.  El plan debe incluir desayuno, comida, cena y dos colaciones para cada día.`;

            const schema = {
                type: Type.OBJECT,
                properties: {
                    plan_semanal: {
                        type: Type.ARRAY,
                        description: `Array de ${numDays} días.`,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                dia: { type: Type.STRING, description: "Día del plan (ej. Día 1, Día 2)." },
                                desayuno: { type: Type.STRING, description: "Descripción del desayuno para este día." },
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic?.id,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `Error del servidor: ${apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            
            // Robust JSON parsing: Find the first '{' and the last '}'
            // FIX: Cast `data.text` to a string before calling string methods like `.trim()` to prevent type errors.
            // The value from response.json() can be inferred as 'unknown', so we safely convert it to a string.
            let responseText = String(data.text || '').trim();
            const jsonStartIndex = responseText.indexOf('{');
            const jsonEndIndex = responseText.lastIndexOf('}');

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                responseText = responseText.substring(jsonStartIndex, jsonEndIndex + 1);
            } else {
                // If we can't find a JSON object, the response is likely malformed.
                throw new Error("La respuesta de la IA no contenía un objeto JSON válido.");
            }

            const planJson = JSON.parse(responseText);
            setGeneratedPlan(planJson);

        } catch (err: any) {
            setError(`Hubo un error al generar el plan. El modelo de IA puede haber devuelto un formato inesperado. Inténtalo de nuevo. Error: ${err.message}`);
        } finally {
            setLoading(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    };
    
    const handleSavePlanToPatient = async () => {
        if (!generatedPlan || !generatedPlan.plan_semanal || !personId) {
            setError("No hay un plan generado o no se ha seleccionado un paciente para asignarlo.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const today = new Date();
            const tomorrowUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

            const dietLogPayloads = generatedPlan.plan_semanal.map((day: any, index: number) => {
                const planDate = new Date(tomorrowUTC);
                planDate.setUTCDate(tomorrowUTC.getUTCDate() + index);
                return {
                    person_id: personId,
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

            await supabase.from('logs').insert({
                person_id: personId,
                log_type: 'Plan Alimenticio (IA)',
                description: `Se generó y guardó un nuevo plan alimenticio de ${numDays} días con inspiración en la cocina de Sinaloa.`,
            });
            
            const { data: person } = await supabase.from('persons').select('user_id').eq('id', personId).single();
            if (person?.user_id) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: person.user_id, title: '¡Nuevo Plan Alimenticio!', body: 'Tu nutriólogo ha creado un nuevo plan para ti. ¡Revísalo en tu portal!' })
                }).catch(err => console.error("Failed to send notification:", err));
            }

            onPlanSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Plan Alimenticio con IA</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    {!generatedPlan && !loading && (
                        <>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Se generará un plan basado en la distribución diaria de tu calculadora, con un toque de la cocina de Sinaloa.</p>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem'}}>
                                {activeEquivalents.map((eq, i) => <li key={i}><strong>{eq.portions}</strong>x <strong>{eq.name}</strong></li>)}
                            </ul>
                            <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
                                <div style={{flex: 1}}>
                                    <label htmlFor="num_days">Número de días del plan</label>
                                    <input id="num_days" type="number" min="1" max="14" value={numDays} onChange={e => setNumDays(e.target.value)} />
                                </div>
                                <div style={{flex: 2}}>
                                    <label htmlFor="custom_instructions">Instrucciones Adicionales (Opcional)</label>
                                    <input id="custom_instructions" value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="Ej: vegetariano, sin gluten..."/>
                                </div>
                            </div>
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
                    
                    {generatedPlan && generatedPlan.plan_semanal && !loading && (
                        <div>
                             <h3 style={{color: 'var(--primary-dark)'}}>Plan Alimenticio Generado</h3>
                             <div style={{maxHeight: '45vh', overflowY: 'auto', paddingRight: '1rem'}}>
                                {generatedPlan.plan_semanal.map((day: any, index: number) => (
                                    <div key={index} style={{marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                                        <h4 style={{margin: '0 0 1rem 0', color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>{day.dia}</h4>
                                        <p style={{margin: '0.25rem 0'}}><strong>Desayuno:</strong> {day.desayuno}</p>
                                        <p style={{margin: '0.25rem 0'}}><strong>Colación 1:</strong> {day.colacion_1 || 'N/A'}</p>
                                        <p style={{margin: '0.25rem 0'}}><strong>Comida:</strong> {day.comida}</p>
                                        <p style={{margin: '0.25rem 0'}}><strong>Colación 2:</strong> {day.colacion_2 || 'N/A'}</p>
                                        <p style={{margin: '0.25rem 0'}}><strong>Cena:</strong> {day.cena}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                    {generatedPlan ? (
                         <button 
                            onClick={handleSavePlanToPatient} 
                            disabled={loading || !personId} 
                            title={!personId ? "Debes asociar un paciente al plan para guardarlo" : "Guardar el plan generado en el expediente del paciente"}
                         >
                            {loading ? 'Guardando...' : 'Guardar Plan al Paciente'}
                         </button>
                    ) : (
                         <button onClick={handleGenerate} disabled={loading}>{loading ? 'Generando...' : 'Generar Plan'}</button>
                    )}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default AiMealPlanGeneratorModal;