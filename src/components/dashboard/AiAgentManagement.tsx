
import React, { FC, useState, useEffect, FormEvent, useMemo } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { AiAgent, WhatsappConnection } from '../../types';

const AiAgentManagement: FC = () => {
    const { clinic } = useClinic();
    const [wappConnection, setWappConnection] = useState<Partial<WhatsappConnection>>({ provider: 'twilio', is_active: false });
    const [agent, setAgent] = useState<Partial<AiAgent>>({ 
        model_provider: 'gemini', 
        model_name: 'gemini-2.5-flash',
        provider_api_key: '',
        system_prompt: 'Eres una secretaria virtual amigable y eficiente para una clínica de nutrición. Tu objetivo es responder preguntas y ayudar a agendar citas. Tienes acceso a herramientas para consultar información de los pacientes si es necesario. Sé siempre cortés y profesional. Nunca des consejos médicos o nutricionales.',
        patient_system_prompt: 'Eres un asistente de nutrición personal y amigable. Tu objetivo es ayudar al paciente a seguir su plan, resolver dudas sobre sus comidas o ejercicios del día y motivarlo. Habla de forma clara y alentadora. No puedes dar diagnósticos médicos.',
        is_active: false,
        is_patient_portal_agent_active: false, 
        use_knowledge_base: false,
        tools: { 
            get_patient_details: { enabled: false }, 
            get_my_data_for_ai: { enabled: false },
            get_available_slots: { enabled: false },
            book_appointment: { enabled: false },
        },
    });
    const [activeEditor, setActiveEditor] = useState<'whatsapp' | 'patient'>('whatsapp');
    
    const [credentials, setCredentials] = useState({
        accountSid: '',
        authToken: '',
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        verifyToken: '',
    });

    const [loading, setLoading] = useState({ connection: true, agent: true });
    const [error, setError] = useState<{ connection?: string; agent?: string; test?: string }>({});
    const [success, setSuccess] = useState<{ connection?: string; agent?: string; test?: string }>({});
    const [testLoading, setTestLoading] = useState(false);
    
    // Helper function to normalize phone numbers by stripping non-digit characters
    const normalizePhoneNumber = (phone: string | null | undefined): string => {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    };


    useEffect(() => {
        const fetchData = async () => {
            if (!clinic) return;
            setLoading({ connection: true, agent: true });

            const { data: connData, error: connError } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .eq('clinic_id', clinic.id)
                .single();

            if (connError && connError.code !== 'PGRST116') {
                setError(prev => ({ ...prev, connection: connError.message }));
            } else if (connData) {
                setWappConnection(connData);
                const dbCreds = connData.credentials as any || {};
                
                setCredentials(prev => ({
                    ...prev,
                    accountSid: dbCreds.accountSid || '',
                    authToken: dbCreds.authToken || '',
                    phoneNumberId: dbCreds.phoneNumberId || '',
                    wabaId: dbCreds.wabaId || '',
                    accessToken: dbCreds.accessToken || '',
                    verifyToken: dbCreds.verifyToken || prev.verifyToken || crypto.randomUUID()
                }));

            } else {
                setCredentials(prev => ({ ...prev, verifyToken: crypto.randomUUID() }));
            }
            setLoading(prev => ({ ...prev, connection: false }));

            const { data: agentData, error: agentError } = await supabase.from('ai_agents').select('*').eq('clinic_id', clinic.id).single();
            if (agentError && agentError.code !== 'PGRST116') {
                setError(prev => ({ ...prev, agent: agentError.message }));
            } else if (agentData) {
                const defaultTools = { 
                    get_patient_details: { enabled: false }, 
                    get_my_data_for_ai: { enabled: false },
                    get_available_slots: { enabled: false },
                    book_appointment: { enabled: false },
                };
                setAgent({ 
                    ...agentData, 
                    model_provider: agentData.model_provider || 'gemini',
                    model_name: agentData.model_name || 'gemini-2.5-flash',
                    provider_api_key: agentData.provider_api_key || '',
                    is_patient_portal_agent_active: agentData.is_patient_portal_agent_active || false,
                    tools: agentData.tools ? {...defaultTools, ...agentData.tools} : defaultTools 
                });
            }
            setLoading(prev => ({ ...prev, agent: false }));
        };

        fetchData();
    }, [clinic]);

    const handleCredsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        const field = activeEditor === 'whatsapp' ? 'system_prompt' : 'patient_system_prompt';
        setAgent(prev => ({ ...prev, [field]: value }));
    };
    
    const handleAgentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
        if (name === 'model_provider') {
            let defaultModel = '';
            if (value === 'gemini') {
                defaultModel = 'gemini-2.5-flash';
            } else if (value === 'openai') {
                defaultModel = 'gpt-4o-mini';
            } else if (value === 'openrouter') {
                defaultModel = 'openai/gpt-4o-mini';
            }
            setAgent(prev => ({ ...prev, model_provider: value, model_name: defaultModel }));
        } else {
            setAgent(prev => ({ ...prev, [name]: fieldValue }));
        }
    };


    const handleToolToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAgent(prev => ({
            ...prev,
            tools: {
                ...(prev.tools || {}),
                [name]: { enabled: checked }
            }
        }));
    };

    const handleTestConnection = async () => {
        setTestLoading(true);
        setError(prev => ({ ...prev, test: undefined }));
        setSuccess(prev => ({ ...prev, test: undefined }));
        try {
            const provider = wappConnection.provider;
            
            const credentialsToTest = provider === 'twilio' 
                ? { accountSid: credentials.accountSid, authToken: credentials.authToken } 
                : { accessToken: credentials.accessToken };

            const response = await fetch('/api/test-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, credentials: credentialsToTest }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Falló la prueba de conexión.');
            }

            setSuccess(prev => ({ ...prev, test: result.message }));
            setTimeout(() => setSuccess(prev => ({...prev, test: undefined})), 4000);

        } catch (err: any) {
            setError(prev => ({ ...prev, test: err.message }));
        } finally {
            setTestLoading(false);
        }
    };


    const handleSaveConnection = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) return;
        setLoading(prev => ({ ...prev, connection: true }));
        setError(prev => ({ ...prev, connection: undefined, test: undefined }));
        setSuccess(prev => ({ ...prev, connection: undefined, test: undefined }));
        try {
            let credentialsToSave = {};
            if (wappConnection.provider === 'twilio') {
                credentialsToSave = {
                    accountSid: credentials.accountSid,
                    authToken: credentials.authToken,
                };
            } else { // meta
                credentialsToSave = {
                    phoneNumberId: credentials.phoneNumberId,
                    wabaId: credentials.wabaId,
                    accessToken: credentials.accessToken,
                    verifyToken: credentials.verifyToken,
                };
            }
            
            const payload = {
                clinic_id: clinic.id,
                provider: wappConnection.provider,
                phone_number: normalizePhoneNumber(wappConnection.phone_number), // Normalize before saving
                credentials: credentialsToSave,
                is_active: wappConnection.is_active,
            };

            const { error } = await supabase.from('whatsapp_connections').upsert([payload], {
                onConflict: 'clinic_id',
            });
            if (error) throw error;
            setSuccess(prev => ({ ...prev, connection: "Configuración de WhatsApp guardada." }));
             setTimeout(() => setSuccess(prev => ({ ...prev, connection: undefined })), 3000);
        } catch (err: any) {
            setError(prev => ({ ...prev, connection: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, connection: false }));
        }
    };
    
    const handleSaveAgent = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) return;
        setLoading(prev => ({ ...prev, agent: true }));
        setError(prev => ({ ...prev, agent: undefined }));
        setSuccess(prev => ({ ...prev, agent: undefined }));
        try {
            const payload = {
                clinic_id: clinic.id,
                system_prompt: agent.system_prompt,
                patient_system_prompt: agent.patient_system_prompt,
                model_provider: agent.model_provider,
                provider_api_key: agent.provider_api_key,
                model_name: agent.model_name,
                is_active: agent.is_active,
                is_patient_portal_agent_active: agent.is_patient_portal_agent_active,
                use_knowledge_base: agent.use_knowledge_base,
                tools: agent.tools,
            };
            
            const { error } = await supabase
                .from('ai_agents')
                .upsert([payload], { onConflict: 'clinic_id' });

            if (error) throw error;
            setSuccess(prev => ({ ...prev, agent: "Configuración del agente guardada." }));
            setTimeout(() => setSuccess(prev => ({ ...prev, agent: undefined })), 3000);
        } catch (err: any) {
            setError(prev => ({ ...prev, agent: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, agent: false }));
        }
    };

    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp-webhook` : '';
    const successMessageStyle: React.CSSProperties = {...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'};

    const promptValue = activeEditor === 'whatsapp' ? agent.system_prompt : agent.patient_system_prompt;
    const promptLabel = `Personalidad del Agente`;
    
    const toolLabels: { [key: string]: string } = {
        get_patient_details: 'Consultar datos de pacientes',
        get_my_data_for_ai: 'Consultar datos del paciente conectado (plan, progreso)',
        get_available_slots: 'Consultar horarios disponibles',
        book_appointment: 'Agendar nuevas citas',
    };
    const toolsForWhatsapp = ['get_patient_details', 'get_available_slots', 'book_appointment'];
    const toolsForPatient = ['get_my_data_for_ai', 'get_available_slots', 'book_appointment'];

    const providerName = useMemo(() => {
        if (agent.model_provider === 'openai') return 'OpenAI';
        if (agent.model_provider === 'openrouter') return 'OpenRouter';
        return 'Google Gemini';
    }, [agent.model_provider]);

    return (
        <div className="fade-in" style={{ maxWidth: '900px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start' }}>
                <form onSubmit={handleSaveAgent} style={{...styles.detailCard, margin: 0}}>
                     <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Configuración del Agente IA</h3></div>
                     <div style={styles.detailCardBody}>
                        {error.agent && <p style={styles.error}>{error.agent}</p>}
                        {success.agent && <p style={successMessageStyle}>{success.agent}</p>}
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                            <div>
                                <label>Proveedor de IA</label>
                                <select name="model_provider" value={agent.model_provider || 'gemini'} onChange={handleAgentChange}>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="openrouter">OpenRouter</option>
                                </select>
                            </div>
                            <div>
                                <label>Nombre del Modelo</label>
                                <input name="model_name" type="text" value={agent.model_name || ''} onChange={handleAgentChange} placeholder="Ej: gemini-2.5-flash" />
                            </div>
                            <div style={{gridColumn: 'span 2'}}>
                                <label>API Key de {providerName}</label>
                                <input name="provider_api_key" type="password" value={agent.provider_api_key || ''} onChange={handleAgentChange} placeholder={agent.model_provider === 'gemini' ? "Opcional, déjalo en blanco para usar la clave del sistema" : "Pega tu clave aquí"} />
                                {agent.model_provider === 'gemini' && (
                                    <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)', fontSize: '0.8rem'}}>
                                        Deja este campo en blanco para usar la clave de Gemini configurada en el servidor.
                                    </small>
                                )}
                            </div>
                        </div>

                        <label>Agente a configurar</label>
                        <select value={activeEditor} onChange={e => setActiveEditor(e.target.value as any)} style={{marginBottom: '1.5rem'}}>
                            <option value="whatsapp">Agente de WhatsApp</option>
                            <option value="patient">Agente del Portal del Paciente</option>
                        </select>

                        <label>{promptLabel}</label>
                        <textarea value={promptValue || ''} onChange={handlePromptChange} rows={5} />
                        
                        <h5 style={{marginTop: '1.5rem', fontSize: '1rem'}}>Activación y Herramientas del Agente</h5>

                        {activeEditor === 'whatsapp' && (
                            <div className="fade-in">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <label htmlFor="is_active_wapp" style={{marginBottom: 0, fontWeight: 500}}>Activar Agente de WhatsApp</label>
                                    <label className="switch"><input id="is_active_wapp" name="is_active" type="checkbox" checked={agent.is_active || false} onChange={handleAgentChange} /><span className="slider round"></span></label>
                                </div>
                                {agent.is_active && (
                                    <div style={{ marginLeft: '1rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
                                        <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginTop: 0}}>Capacidades para WhatsApp:</p>
                                        {toolsForWhatsapp.map(toolKey => (
                                            <div key={`whatsapp-${toolKey}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label htmlFor={`tool_wapp_${toolKey}`} style={{marginBottom: 0}}>{toolLabels[toolKey]}</label>
                                                <label className="switch"><input id={`tool_wapp_${toolKey}`} name={toolKey} type="checkbox" checked={(agent.tools as any)?.[toolKey]?.enabled || false} onChange={handleToolToggle} /></label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeEditor === 'patient' && (
                            <div className="fade-in">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <label htmlFor="is_active_portal" style={{marginBottom: 0, fontWeight: 500}}>Activar Agente del Portal del Paciente</label>
                                    <label className="switch"><input id="is_active_portal" name="is_patient_portal_agent_active" type="checkbox" checked={agent.is_patient_portal_agent_active || false} onChange={handleAgentChange} /><span className="slider round"></span></label>
                                </div>
                                {agent.is_patient_portal_agent_active && (
                                    <div style={{ marginLeft: '1rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
                                        <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginTop: 0}}>Capacidades para Portal del Paciente:</p>
                                        {toolsForPatient.map(toolKey => (
                                            <div key={`patient-${toolKey}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label htmlFor={`tool_patient_${toolKey}`} style={{marginBottom: 0}}>{toolLabels[toolKey]}</label>
                                                <label className="switch"><input id={`tool_patient_${toolKey}`} name={toolKey} type="checkbox" checked={(agent.tools as any)?.[toolKey]?.enabled || false} onChange={handleToolToggle} /></label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" disabled={loading.agent}>{loading.agent ? 'Guardando...' : 'Guardar Configuración de Agente'}</button>
                         </div>
                     </div>
                </form>

                <form onSubmit={handleSaveConnection} style={{...styles.detailCard, margin: 0}}>
                    <div style={styles.detailCardHeader}>
                        <h3 style={styles.detailCardTitle}>Conexión de WhatsApp</h3>
                    </div>
                    <div style={styles.detailCardBody}>
                         {error.connection && <p style={styles.error}>{error.connection}</p>}
                         {success.connection && <p style={successMessageStyle}>{success.connection}</p>}
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div>
                                <label>Proveedor de API</label>
                                <select name="provider" value={wappConnection.provider || 'twilio'} onChange={e => setWappConnection(p => ({...p, provider: e.target.value}))}>
                                    <option value="twilio">Twilio</option>
                                    <option value="meta">WhatsApp Cloud API (Meta)</option>
                                </select>
                            </div>
                            <div>
                                <label>Tu Número de WhatsApp</label>
                                <input name="phone_number" value={wappConnection.phone_number || ''} onChange={e => setWappConnection(p => ({...p, phone_number: e.target.value}))} placeholder="+521234567890" required />
                            </div>
                        </div>

                        {wappConnection.provider === 'twilio' && (
                            <div className="fade-in">
                                <label style={{marginTop: '1rem'}}>Account SID</label>
                                <input name="accountSid" value={credentials.accountSid} onChange={handleCredsChange} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>Encuentra esto en el Dashboard de tu cuenta de Twilio.</small>

                                <label style={{marginTop: '1rem'}}>Auth Token</label>
                                <input type="password" name="authToken" value={credentials.authToken} onChange={handleCredsChange} placeholder="••••••••••••••••••••••••" required />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>Es tu "Auth Token" principal de Twilio.</small>
                            </div>
                        )}

                        {wappConnection.provider === 'meta' && (
                             <div className="fade-in">
                                <label style={{marginTop: '1rem'}}>Phone Number ID</label>
                                <input name="phoneNumberId" value={credentials.phoneNumberId} onChange={handleCredsChange} placeholder="10xxxxxxxxxxxxx" required />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>En tu App de Meta {'>'} WhatsApp {'>'} "Getting Started".</small>

                                <label style={{marginTop: '1rem'}}>WhatsApp Business Account ID (WABA ID)</label>
                                <input name="wabaId" value={credentials.wabaId} onChange={handleCredsChange} placeholder="10xxxxxxxxxxxxx" required />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>En tu App de Meta {'>'} WhatsApp {'>'} "Getting Started".</small>

                                <label style={{marginTop: '1rem'}}>Permanent Access Token</label>
                                <input type="password" name="accessToken" value={credentials.accessToken} onChange={handleCredsChange} placeholder="••••••••••••••••••••••••" required />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>Debes generar un token de acceso permanente para tu app.</small>
                            </div>
                        )}
                        
                        {error.test && <p style={{...styles.error, marginTop: '1rem'}}>{error.test}</p>}
                        {success.test && <p style={{...successMessageStyle, marginTop: '1rem'}}>{success.test}</p>}

                         <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <label htmlFor="is_active_conn" style={{marginBottom: 0}}>Activar Conexión</label>
                                <label className="switch"><input id="is_active_conn" name="is_active" type="checkbox" checked={wappConnection.is_active || false} onChange={e => setWappConnection(p => ({ ...p, is_active: e.target.checked }))} /><span className="slider round"></span></label>
                            </div>
                             <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={handleTestConnection} disabled={testLoading} className="button-secondary">
                                    {testLoading ? 'Probando...' : 'Probar Conexión'}
                                </button>
                                <button type="submit" disabled={loading.connection}>{loading.connection ? 'Guardando...' : 'Guardar Conexión'}</button>
                            </div>
                         </div>
                    </div>
                </form>
                <div style={{...styles.detailCard, margin: 0}}>
                    <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Configuración del Webhook</h3></div>
                    <div style={styles.detailCardBody}>
                        <p>Para que los mensajes lleguen a tu agente, debes configurar esta URL en tu proveedor de WhatsApp:</p>
                        <input type="text" readOnly value={webhookUrl} style={{ backgroundColor: 'var(--background-color)', cursor: 'text' }} />
                         
                        {wappConnection.provider === 'twilio' && <p style={{marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>En Twilio, ve a "Develop" {'>'} "Messaging" {'>'} "Try it Out" {'>'} "Send a WhatsApp message" y pega esta URL en el campo "WHEN A MESSAGE COMES IN".</p>}
                        {wappConnection.provider === 'meta' && (
                            <div style={{marginTop: '1rem'}}>
                                <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>En tu App de Meta {'>'} WhatsApp {'>'} "Configuration", edita la configuración del Webhook.</p>
                                <label style={{marginTop: '1rem'}}>Tu Token de Verificación</label>
                                <input type="text" readOnly value={credentials.verifyToken} style={{ backgroundColor: 'var(--background-color)', cursor: 'text', fontFamily: 'monospace' }} />
                                <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)'}}>Copia y pega este token en el campo "Verify Token" en tu configuración de Meta.</small>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAgentManagement;
