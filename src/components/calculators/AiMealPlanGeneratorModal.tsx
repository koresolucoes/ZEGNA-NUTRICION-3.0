
import React, { FC, useState, useMemo, useRef, useEffect } from 'react';
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
    
    // Clinical Context State
    const [clinicalContext, setClinicalContext] = useState<{ allergies: string[], conditions: string[] }>({ allergies: [], conditions: [] });
    const [loadingContext, setLoadingContext] = useState(false);

    const intervalRef = useRef<number | null>(null);

    const thinkingMessages = [
        "Consultando expediente clínico y restricciones...",
        "Calculando gramajes exactos según equivalentes...",
        "Ajustando porciones al Sistema Mexicano (SMAE)...",
        "Diseñando menú con medidas caseras precisas...",
        "Verificando alérgenos y patologías...",
        "Compilando el plan detallado...",
    ];

    const activeEquivalents = useMemo(() => {
        return Object.entries(planPortions)
            .filter(([_, portions]) => parseFloat(String(portions)) > 0)
            .map(([id, portions]) => {
                const eq = equivalentsData.find(e => e.id === id);
                return { name: eq?.subgroup_name || 'Desconocido', portions };
            });
    }, [planPortions, equivalentsData]);

    // Fetch clinical data when modal opens
    useEffect(() => {
        const fetchClinicalData = async () => {
            if (!personId) return;
            setLoadingContext(true);
            try {
                const [allergiesRes, historyRes] = await Promise.all([
                    supabase.from('allergies_intolerances').select('substance').eq('person_id', personId),
                    supabase.from('medical_history').select('condition').eq('person_id', personId)
                ]);
                
                setClinicalContext({
                    allergies: allergiesRes.data?.map(a => a.substance) || [],
                    conditions: historyRes.data?.map(h => h.condition) || []
                });
            } catch (e) {
                console.error("Error fetching clinical context", e);
            } finally {
                setLoadingContext(false);
            }
        };

        if (isOpen) {
            fetchClinicalData();
        }
    }, [isOpen, personId]);

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
            
            const allergiesText = clinicalContext.allergies.length > 0 ? clinicalContext.allergies.join(', ') : 'Ninguna conocida';
            const conditionsText = clinicalContext.conditions.length > 0 ? clinicalContext.conditions.join(', ') : 'Ninguna registrada';

            let prompt = `Actúa como un nutriólogo clínico experto y calculista dietético preciso. Tu tarea es crear un plan alimenticio detallado para ${numDays} días.

**OBJETIVO CRÍTICO:** Generar un menú que cumpla EXACTAMENTE con la distribución de equivalentes del SMAE (Sistema Mexicano de Alimentos Equivalentes) proporcionada abajo.

**CONTEXTO CLÍNICO DEL PACIENTE (OBLIGATORIO RESPETAR):**
- ⚠️ ALERGIAS/INTOLERANCIAS: ${allergiesText} (EXCLUIR ESTOS ALIMENTOS TOTALMENTE)
- Condiciones Médicas: ${conditionsText}

**DISTRIBUCIÓN DIARIA DE EQUIVALENTES A CUMPLIR:**
${equivalentsList}

**Instrucciones de Formato y Precisión:**
1.  **MEDIDAS EXACTAS:** No uses descripciones vagas como "una porción de fruta". DEBES usar medidas caseras precisas o gramajes (ej: "1 taza de papaya picada", "30g de avena cruda", "90g de pechuga de pollo pesado en crudo", "2 rebanadas de pan integral").
2.  **CÁLCULO REAL:** Asegúrate de que la suma de los ingredientes de cada día corresponda matemáticamente a los equivalentes solicitados.
3.  **ESTILO:** Usa ingredientes comunes en México. Si puedes, dales un toque culinario agradable (ej. "a la mexicana", "asado"), pero priorizando la precisión de la cantidad.
4.  **VARIEDAD:** No repitas el mismo menú exacto todos los días.

**Instrucciones Adicionales del Nutriólogo:**
${customInstructions || "Ninguna."}

La respuesta DEBE ser únicamente un objeto JSON válido.`;

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
                                desayuno: { type: Type.STRING, description: "Menú detallado con cantidades exactas (ej. 2 huevos revueltos con 1/2 taza de ejotes...)." },
                                colacion_1: { type: Type.STRING, description: "Colación detallada con cantidades exactas." },
                                comida: { type: Type.STRING, description: "Comida detallada con cantidades exactas." },
                                colacion_2: { type: Type.STRING, description: "Colación detallada con cantidades exactas." },
                                cena: { type: Type.STRING, description: "Cena detallada con cantidades exactas." },
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
            
            let responseText = String(data.text || '').trim();
            const jsonStartIndex = responseText.indexOf('{');
            const jsonEndIndex = responseText.lastIndexOf('}');

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                responseText = responseText.substring(jsonStartIndex, jsonEndIndex + 1);
            } else {
                throw new Error("La respuesta de la IA no contenía un objeto JSON válido.");
            }

            const planJson = JSON.parse(responseText);
            setGeneratedPlan(planJson);

        } catch (err: any) {
            setError(`Hubo un error al generar el plan. Inténtalo de nuevo. Error: ${err.message}`);
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
                description: `Se generó y guardó un nuevo plan alimenticio de ${numDays} días basado en equivalentes exactos.`,
            });
            
            const { data: person } = await supabase.from('persons').select('user_id').eq('id', personId).single();
            if (person?.user_id) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: person.user_id, title: '¡Nuevo Plan Alimenticio!', body: 'Tu nutriólogo ha creado un nuevo plan calculado para ti.' })
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
            <div style={{...styles.modalContent, maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Plan Preciso (IA + SMAE)</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                
                <div style={{...styles.modalBody, flex: 1, overflowY: 'auto'}}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    {!generatedPlan && !loading && (
                        <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem'}}>
                            <div>
                                <h3 style={{fontSize: '1rem', color: 'var(--primary-color)', marginTop: 0}}>Configuración</h3>
                                <p style={{marginTop: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                    La IA utilizará estrictamente la distribución de equivalentes definida en el planificador para crear menús con medidas exactas.
                                </p>
                                
                                <div style={{marginBottom: '1.5rem'}}>
                                    <label htmlFor="num_days">Días a generar</label>
                                    <input id="num_days" type="number" min="1" max="14" value={numDays} onChange={e => setNumDays(e.target.value)} />
                                </div>
                                
                                <div>
                                    <label htmlFor="custom_instructions">Instrucciones Adicionales</label>
                                    <textarea 
                                        id="custom_instructions" 
                                        value={customInstructions} 
                                        onChange={e => setCustomInstructions(e.target.value)} 
                                        rows={3}
                                        placeholder="Ej: Preferencia por comidas frías en la comida, no le gusta el pescado..."
                                    />
                                </div>

                                {/* Clinical Context Display */}
                                <div style={{marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                    <h4 style={{margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                        {ICONS.briefcase} Contexto Clínico (Detectado)
                                    </h4>
                                    {loadingContext ? <span style={{fontSize: '0.8rem'}}>Cargando...</span> : (
                                        <div style={{fontSize: '0.85rem'}}>
                                            <div style={{marginBottom: '0.5rem'}}>
                                                <strong>Alergias: </strong>
                                                {clinicalContext.allergies.length > 0 ? (
                                                    <span style={{color: 'var(--error-color)'}}>{clinicalContext.allergies.join(', ')}</span>
                                                ) : <span style={{color: 'var(--text-light)'}}>Ninguna</span>}
                                            </div>
                                            <div>
                                                <strong>Condiciones: </strong>
                                                {clinicalContext.conditions.length > 0 ? (
                                                    <span style={{color: 'var(--primary-color)'}}>{clinicalContext.conditions.join(', ')}</span>
                                                ) : <span style={{color: 'var(--text-light)'}}>Ninguna</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '400px', overflowY: 'auto'}}>
                                <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700}}>Distribución Diaria (SMAE)</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                                    {activeEquivalents.map((eq, i) => (
                                        <li key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)'}}>
                                            <span>{eq.name}</span>
                                            <span style={{fontWeight: 700, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '10px'}}>{eq.portions}</span>
                                        </li>
                                    ))}
                                </ul>
                                {activeEquivalents.length === 0 && <p style={{fontSize: '0.9rem', color: 'var(--error-color)'}}>No hay porciones asignadas en el planificador.</p>}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div style={{textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                             <div className="spinner" style={{marginBottom: '20px', width: '50px', height: '50px', border: '5px solid var(--surface-hover-color)', borderTop: '5px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                             <p style={{ minHeight: '2.5em', color: 'var(--text-color)', fontWeight: 600, fontSize: '1.1rem' }}>
                                 {thinkingMessage}
                             </p>
                             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}
                    
                    {generatedPlan && generatedPlan.plan_semanal && !loading && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                             <div style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#065F46', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem'}}>
                                <strong>¡Plan Generado!</strong> Verifica que las porciones y medidas sean correctas antes de guardar.
                             </div>
                             <div style={{display: 'grid', gap: '1.5rem'}}>
                                {generatedPlan.plan_semanal.map((day: any, index: number) => (
                                    <div key={index} style={{border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden'}}>
                                        <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--primary-color)'}}>
                                            {day.dia}
                                        </div>
                                        <div style={{padding: '1rem', display: 'grid', gap: '1rem'}}>
                                            <div><span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Desayuno</span><p style={{margin: '0.25rem 0 0 0', lineHeight: 1.5}}>{day.desayuno}</p></div>
                                            {day.colacion_1 && <div><span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Colación 1</span><p style={{margin: '0.25rem 0 0 0', lineHeight: 1.5}}>{day.colacion_1}</p></div>}
                                            <div><span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Comida</span><p style={{margin: '0.25rem 0 0 0', lineHeight: 1.5}}>{day.comida}</p></div>
                                            {day.colacion_2 && <div><span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Colación 2</span><p style={{margin: '0.25rem 0 0 0', lineHeight: 1.5}}>{day.colacion_2}</p></div>}
                                            <div><span style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Cena</span><p style={{margin: '0.25rem 0 0 0', lineHeight: 1.5}}>{day.cena}</p></div>
                                        </div>
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
                         <button onClick={handleGenerate} disabled={loading || activeEquivalents.length === 0}>
                             {loading ? 'Generando...' : 'Generar Plan'}
                         </button>
                    )}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default AiMealPlanGeneratorModal;
