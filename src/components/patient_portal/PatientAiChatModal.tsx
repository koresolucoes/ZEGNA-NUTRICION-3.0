
import React, { FC, useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, AiAgent } from '../../types';
import { Type } from "@google/genai";

const modalRoot = document.getElementById('modal-root');

interface PatientAiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: Person;
}

const PatientAiChatModal: FC<PatientAiChatModalProps> = ({ isOpen, onClose, person }) => {
    const [agentConfig, setAgentConfig] = useState<AiAgent | null>(null);
    // We store raw history objects compatible with Gemini API
    const [messages, setMessages] = useState<any[]>([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAgentConfig = async () => {
            if (!person.clinic_id) return;
            const { data, error } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('clinic_id', person.clinic_id)
                .single();
            if (error && error.code !== 'PGRST116') {
                setError("No se pudo cargar la configuración del agente.");
            } else {
                setAgentConfig(data);
            }
        };

        if (isOpen) {
            fetchAgentConfig();
            setMessages([]);
        }
    }, [isOpen, person.clinic_id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Helper to call our server-side API
    const callGeminiApi = async (currentHistory: any[], systemInstruction: string, tools: any[]) => {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clinic_id: person.clinic_id,
                contents: currentHistory,
                config: {
                    systemInstruction: systemInstruction,
                    tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error calling AI service');
        }

        return await response.json();
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || loading || !agentConfig) return;

        const userMessage = { role: 'user', parts: [{ text: userInput }] };
        const newMessages = [...messages, userMessage];
        
        setMessages(newMessages);
        setUserInput('');
        setLoading(true);
        setError(null);
        
        try {
            // Define Tools
            const functionDeclarations: any[] = [];
            const agentTools = agentConfig.tools as { [key: string]: { enabled: boolean } } | null;

            if (agentTools?.get_my_data_for_ai?.enabled) {
                functionDeclarations.push({
                    name: 'get_my_data_for_ai',
                    description: 'Obtiene un resumen de los datos del paciente para un día específico, incluyendo plan de comidas, rutina de ejercicio, estado del plan y progreso reciente. Úsalo para responder cualquier pregunta sobre estos temas.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            day_offset: {
                                type: Type.INTEGER,
                                description: 'El desfase de días desde hoy. 0 es para hoy, 1 para mañana, -1 para ayer.'
                            }
                        },
                        required: ['day_offset']
                    }
                });
            }
            if (agentTools?.get_available_slots?.enabled) {
                functionDeclarations.push({
                    name: 'get_available_slots',
                    description: 'Consulta los horarios de citas disponibles para un día específico. Devuelve una lista de horas de inicio disponibles.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: { target_date: { type: Type.STRING, description: 'La fecha para la cual se quieren consultar los horarios, en formato AAAA-MM-DD.' } },
                        required: ['target_date'],
                    },
                });
            }
            if (agentTools?.book_appointment?.enabled) {
                functionDeclarations.push({
                    name: 'book_appointment',
                    description: 'Agenda una nueva cita para el paciente actual en un horario específico.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            start_time: { type: Type.STRING, description: 'La fecha y hora de inicio de la cita en formato ISO 8601 (ej. "2024-10-28T10:00:00-06:00").' },
                            notes: { type: Type.STRING, description: 'Notas adicionales o el motivo de la cita (opcional).' }
                        },
                        required: ['start_time'],
                    },
                });
            }
            
            const now = new Date();
            const dateOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const todayString = now.toLocaleDateString('es-MX', dateOptions);

            const systemInstruction = `${agentConfig.patient_system_prompt || 'Eres un asistente nutricional amigable.'}\n\nCONTEXTO TEMPORAL:\n- HOY ES: ${todayString}.\n\nIMPORTANTE: Estás conversando directamente con el paciente ${person.full_name}. No necesitas pedirle su nombre o número de folio. Utiliza la herramienta 'get_my_data_for_ai' para obtener su información personal del plan.`;

            // --- Turn 1: User sends message, Model responds (maybe with tools) ---
            let apiResult = await callGeminiApi(newMessages, systemInstruction, functionDeclarations);
            
            // Add model response to history
            if (apiResult.candidateContent) {
                newMessages.push(apiResult.candidateContent);
                setMessages([...newMessages]);
            }

            // Handle Function Calls
            if (apiResult.functionCalls && apiResult.functionCalls.length > 0) {
                const functionResponses: any[] = [];
                
                for (const funcCall of apiResult.functionCalls) {
                    let functionResult;
                    try {
                        if (funcCall.name === 'get_my_data_for_ai') {
                            const { data, error: rpcError } = await supabase.rpc('get_my_data_for_ai', { p_person_id: person.id, day_offset: funcCall.args.day_offset || 0 });
                            if (rpcError) throw rpcError;
                            functionResult = { result: data };
                        } else if (funcCall.name === 'get_available_slots') {
                            const { data, error: rpcError } = await supabase.rpc('get_available_slots', { p_clinic_id: person.clinic_id, p_target_date: funcCall.args.target_date });
                            if (rpcError) throw rpcError;
                            functionResult = { result: data || [] };
                        } else if (funcCall.name === 'book_appointment') {
                            const { data, error: rpcError } = await supabase.rpc('book_appointment', { p_clinic_id: person.clinic_id, p_patient_query: person.full_name, p_start_time: funcCall.args.start_time, p_notes: funcCall.args.notes || null });
                            if (rpcError) throw rpcError;
                            functionResult = { result: data };
                        }
                        else {
                            functionResult = { error: `Función desconocida: ${funcCall.name}` };
                        }
                    } catch (rpcError: any) {
                        functionResult = { error: `Error al ejecutar la función: ${rpcError.message}` };
                    }
                    
                    // Important: Match ID if provided by Gemini, though SDK usually handles it.
                    // We construct the response part manually for the next call.
                    functionResponses.push({ 
                        functionResponse: {
                            name: funcCall.name,
                            response: functionResult 
                        }
                    });
                }
                
                // Add tool outputs to history
                const toolMessage = { role: 'tool', parts: functionResponses };
                newMessages.push(toolMessage);
                setMessages([...newMessages]);

                // --- Turn 2: Send tool outputs back to Model ---
                apiResult = await callGeminiApi(newMessages, systemInstruction, functionDeclarations);
                
                if (apiResult.candidateContent) {
                    newMessages.push(apiResult.candidateContent);
                    setMessages([...newMessages]);
                }
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error de conexión.");
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Lo siento, ocurrió un error al procesar tu solicitud." }] }]);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px', height: '80vh' }} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Asistente Personal</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {messages.map((msg, index) => {
                        // Filter out tool calls/responses from visual chat
                        const textPart = msg.parts?.find((p: any) => p.text);
                        if (!textPart) return null; 
                        
                        return(
                            <div key={index} style={{ marginBottom: '1rem', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '85%', padding: '0.5rem 1rem', borderRadius: '12px',
                                    backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                                    color: msg.role === 'user' ? 'var(--white)' : 'var(--text-color)',
                                    textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                }}>{textPart.text}</div>
                            </div>
                        );
                    })}
                    {loading && <div style={{textAlign: 'center', color: 'var(--text-light)'}}>...</div>}
                    <div ref={messagesEndRef} />
                </div>
                 <form onSubmit={handleSendMessage} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                    <input 
                        type="text" 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)} 
                        placeholder={!agentConfig?.is_patient_portal_agent_active ? "El agente está desactivado" : "Haz una pregunta sobre tu plan..."}
                        style={{flex: 1, margin: 0, ...styles.input}}
                        disabled={loading || !agentConfig?.is_patient_portal_agent_active}
                    />
                    <button type="submit" disabled={loading || !userInput.trim() || !agentConfig?.is_patient_portal_agent_active} style={{...styles.iconButton, backgroundColor: 'var(--primary-color)', color: 'white', width: '40px', height: '40px'}}>
                        {ICONS.send}
                    </button>
                </form>
            </div>
        </div>,
        modalRoot
    );
};

export default PatientAiChatModal;
