
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { AiAgent, WhatsappConnection } from '../../types';

const AiAgentManagement: FC = () => {
    const { clinic } = useClinic();
    
    // States
    const [wappConnection, setWappConnection] = useState<Partial<WhatsappConnection>>({ provider: 'twilio', is_active: false });
    const [agent, setAgent] = useState<Partial<AiAgent>>({ 
        model_provider: 'gemini', 
        model_name: 'gemini-3-flash-preview',
        provider_api_key: '',
        system_prompt: 'Eres una secretaria virtual...',
        patient_system_prompt: 'Eres un asistente de nutrición...',
        is_active: false,
        is_patient_portal_agent_active: false, 
        use_knowledge_base: false,
        tools: { 
            get_patient_details: { enabled: false }, 
            get_my_data_for_ai: { enabled: false },
            get_available_slots: { enabled: false },
            book_appointment: { enabled: false },
            get_patient_progress: { enabled: false }, // New tool
        },
    });

    // UI States
    const [activeEditor, setActiveEditor] = useState<'whatsapp' | 'patient'>('whatsapp');
    const [isEditingConnection, setIsEditingConnection] = useState(false);
    
    // Credentials State (Form)
    const [credentials, setCredentials] = useState({
        accountSid: '', authToken: '', phoneNumberId: '', wabaId: '', accessToken: '', verifyToken: crypto.randomUUID(),
    });
    const [phoneNumberInput, setPhoneNumberInput] = useState('');

    // Loading/Feedback States
    const [loading, setLoading] = useState({ connection: false, agent: false, initial: true });
    const [error, setError] = useState<{ connection?: string; agent?: string }>({});
    const [success, setSuccess] = useState<{ connection?: string; agent?: string }>({});

    // --- Load Data ---
    useEffect(() => {
        const fetchData = async () => {
            if (!clinic) return;
            setLoading(prev => ({...prev, initial: true}));

            // 1. Fetch Connection
            const { data: connData } = await supabase.from('whatsapp_connections').select('*').eq('clinic_id', clinic.id).single();
            if (connData) {
                setWappConnection(connData);
                const dbCreds = connData.credentials as any || {};
                setCredentials({
                    accountSid: dbCreds.accountSid || '',
                    authToken: dbCreds.authToken || '',
                    phoneNumberId: dbCreds.phoneNumberId || '',
                    wabaId: dbCreds.wabaId || '',
                    accessToken: dbCreds.accessToken || '',
                    verifyToken: dbCreds.verifyToken || crypto.randomUUID()
                });
                setPhoneNumberInput(connData.phone_number);
                setIsEditingConnection(false);
            } else {
                setIsEditingConnection(true); // Start in edit mode if no connection
            }

            // 2. Fetch Agent
            const { data: agentData } = await supabase.from('ai_agents').select('*').eq('clinic_id', clinic.id).single();
            if (agentData) {
                const existingTools = (agentData.tools as unknown as Record<string, any>) || {};
                 const defaultTools = { 
                    get_patient_details: { enabled: false }, 
                    get_my_data_for_ai: { enabled: false },
                    get_available_slots: { enabled: false },
                    book_appointment: { enabled: false },
                    get_patient_progress: { enabled: false },
                };
                setAgent({ ...agentData, model_provider: 'gemini', tools: { ...defaultTools, ...existingTools } });
            }
            setLoading(prev => ({...prev, initial: false}));
        };
        fetchData();
    }, [clinic]);

    // --- Handlers ---

    const handleSaveAgent = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) return;
        setLoading(prev => ({ ...prev, agent: true }));
        setError(prev => ({ ...prev, agent: undefined }));
        
        try {
            const payload = {
                clinic_id: clinic.id,
                ...agent,
                model_provider: 'gemini', // Force Gemini
                // Ensure system_prompt is a string as it is required in the DB schema
                system_prompt: agent.system_prompt || '',
                tools: agent.tools as any
            };
            const { error } = await supabase.from('ai_agents').upsert(payload, { onConflict: 'clinic_id' });
            if (error) throw error;
            setSuccess(prev => ({ ...prev, agent: "Configuración guardada." }));
            setTimeout(() => setSuccess(prev => ({ ...prev, agent: undefined })), 3000);
        } catch (err: any) {
            setError(prev => ({ ...prev, agent: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, agent: false }));
        }
    };

    const handleSaveConnection = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) return;
        setLoading(prev => ({ ...prev, connection: true }));
        setError(prev => ({ ...prev, connection: undefined }));

        try {
            // Validate based on provider
            if (wappConnection.provider === 'twilio') {
                if (!credentials.accountSid || !credentials.authToken || !phoneNumberInput) throw new Error("Faltan credenciales de Twilio.");
            } else {
                if (!credentials.phoneNumberId || !credentials.accessToken || !phoneNumberInput) throw new Error("Faltan credenciales de Meta.");
            }

            const payload = {
                clinic_id: clinic.id,
                provider: wappConnection.provider,
                phone_number: phoneNumberInput,
                is_active: true,
                credentials: wappConnection.provider === 'twilio' 
                    ? { accountSid: credentials.accountSid, authToken: credentials.authToken } 
                    : { phoneNumberId: credentials.phoneNumberId, wabaId: credentials.wabaId, accessToken: credentials.accessToken, verifyToken: credentials.verifyToken }
            };

            const { error } = await supabase.from('whatsapp_connections').upsert(payload, { onConflict: 'clinic_id' });
            if (error) throw error;

            // Update local state to reflect "Saved" state
            setWappConnection(prev => ({ ...prev, ...payload, is_active: true }));
            setIsEditingConnection(false);
            setSuccess(prev => ({ ...prev, connection: "Conexión establecida con éxito." }));
            setTimeout(() => setSuccess(prev => ({ ...prev, connection: undefined })), 3000);

        } catch (err: any) {
             setError(prev => ({ ...prev, connection: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, connection: false }));
        }
    };

    const handleDisconnect = async () => {
        if (!clinic || !window.confirm("¿Estás seguro? Esto detendrá el bot de WhatsApp inmediatamente.")) return;
        
        setLoading(prev => ({ ...prev, connection: true }));
        try {
            const { error } = await supabase.from('whatsapp_connections').delete().eq('clinic_id', clinic.id);
            if (error) throw error;
            
            setWappConnection({ provider: 'twilio', is_active: false });
            setCredentials(prev => ({...prev, accountSid: '', authToken: '', accessToken: ''}));
            setPhoneNumberInput('');
            setIsEditingConnection(true);
        } catch (err: any) {
            setError(prev => ({ ...prev, connection: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, connection: false }));
        }
    };

    // --- Styles matching updated visual aesthetics ---
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow)',
        transition: 'all 0.3s ease'
    };
    
    const headerStyle: React.CSSProperties = {
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '1rem', 
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem'
    };

    const labelStyle: React.CSSProperties = { 
        display: 'block', 
        marginBottom: '0.5rem', 
        fontWeight: 600, 
        fontSize: '0.9rem', 
        color: 'var(--text-color)' 
    };
    
    const inputStyle: React.CSSProperties = { 
        width: '100%',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-color)',
        color: 'var(--text-color)',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        marginBottom: 0 
    };

    const ToggleSwitch: FC<{ label: string; checked: boolean; onChange: (e: any) => void; name: string; description?: string }> = ({ label, checked, onChange, name, description }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
            <div style={{paddingRight: '1rem'}}>
                <label htmlFor={name} style={{marginBottom: 0, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: 'var(--text-color)'}}>{label}</label>
                {description && <p style={{margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>{description}</p>}
            </div>
            <label className="switch">
                <input id={name} name={name} type="checkbox" checked={checked} onChange={onChange} />
                <span className="slider round"></span>
            </label>
        </div>
    );

    const handleToolToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAgent(prev => ({
            ...prev,
            tools: { ...(prev.tools as any || {}), [name]: { enabled: checked } }
        }));
    };

    if (loading.initial) return <div style={{padding: '2rem', textAlign: 'center'}}>Cargando configuración...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Left Column: AI Configuration */}
                <form onSubmit={handleSaveAgent}>
                    <section style={cardStyle}>
                        <div style={headerStyle}>
                            <span style={{fontSize: '1.5rem', color: 'var(--primary-color)'}}>🧠</span>
                            <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>Cerebro del Agente</h3>
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem'}}>
                            <div style={{padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '8px', color: 'var(--primary-dark)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <span>✨</span>
                                <strong>Motor de IA:</strong> Google Gemini
                            </div>

                            <div>
                                <label style={labelStyle}>Versión del Modelo</label>
                                <div className="select-wrapper">
                                    <select name="model_name" value={agent.model_name || 'gemini-3-flash-preview'} onChange={e => setAgent({...agent, model_name: e.target.value})} style={inputStyle}>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Recomendado - Velocidad)</option>
                                        <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (Alta Capacidad - Razonamiento)</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Estable)</option>
                                    </select>
                                </div>
                                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                                    <strong>Gemini 3 Flash</strong> es ideal para respuestas rápidas. Usa <strong>Pro</strong> para casos clínicos complejos.
                                </p>
                            </div>
                        </div>

                        <div style={{marginBottom: '1.5rem'}}>
                             <label style={{...labelStyle, marginBottom: '1rem'}}>Base de Conocimiento</label>
                             <ToggleSwitch 
                                label="Usar Biblioteca" 
                                description="Permite al agente leer tus recursos y documentos para responder."
                                name="use_knowledge_base" 
                                checked={agent.use_knowledge_base || false} 
                                onChange={e => setAgent({...agent, use_knowledge_base: e.target.checked})} 
                            />
                        </div>

                        <div style={{marginBottom: '1.5rem'}}>
                            <label style={labelStyle}>Personalidad (System Prompt)</label>
                            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                                <button type="button" onClick={() => setActiveEditor('whatsapp')} style={{padding: '0.5rem 1rem', borderBottom: activeEditor === 'whatsapp' ? '2px solid var(--primary-color)' : '2px solid transparent', fontWeight: activeEditor === 'whatsapp' ? 600 : 500, color: activeEditor === 'whatsapp' ? 'var(--primary-color)' : 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s'}}>WhatsApp</button>
                                <button type="button" onClick={() => setActiveEditor('patient')} style={{padding: '0.5rem 1rem', borderBottom: activeEditor === 'patient' ? '2px solid var(--primary-color)' : '2px solid transparent', fontWeight: activeEditor === 'patient' ? 600 : 500, color: activeEditor === 'patient' ? 'var(--primary-color)' : 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s'}}>Portal Paciente</button>
                            </div>
                            
                            <textarea 
                                value={activeEditor === 'whatsapp' ? agent.system_prompt : agent.patient_system_prompt || ''} 
                                onChange={e => setAgent(prev => ({...prev, [activeEditor === 'whatsapp' ? 'system_prompt' : 'patient_system_prompt']: e.target.value}))} 
                                rows={6} 
                                style={{...inputStyle, lineHeight: 1.6, resize: 'vertical', minHeight: '120px'}} 
                                placeholder="Instrucciones para el comportamiento del agente..."
                            />
                        </div>

                        <div style={{display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                            <button type="submit" disabled={loading.agent} className="button-primary" style={{padding: '0.75rem 2rem'}}>
                                {loading.agent ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                        {success.agent && <p style={{color: 'var(--primary-color)', textAlign: 'right', marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 500}}>{success.agent}</p>}
                        {error.agent && <p style={styles.error}>{error.agent}</p>}
                    </section>
                </form>

                {/* Right Column: WhatsApp & Status */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                    
                    {/* Capabilities Card */}
                    <section style={cardStyle}>
                        <div style={headerStyle}>
                            <span style={{fontSize: '1.5rem', color: 'var(--primary-color)'}}>⚡</span>
                            <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>Capacidades</h3>
                        </div>
                        
                        <ToggleSwitch label="Agente de WhatsApp" name="is_active" checked={agent.is_active || false} onChange={e => setAgent({...agent, is_active: e.target.checked})} />
                        <ToggleSwitch label="Agente del Portal" name="is_patient_portal_agent_active" checked={agent.is_patient_portal_agent_active || false} onChange={e => setAgent({...agent, is_patient_portal_agent_active: e.target.checked})} />

                        <div style={{marginTop: '2rem'}}>
                            <label style={{...labelStyle, color: 'var(--text-light)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px'}}>Herramientas Habilitadas</label>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s'}} className="nav-item-hover">
                                    <input type="checkbox" name="get_available_slots" checked={(agent.tools as any)?.get_available_slots?.enabled} onChange={handleToolToggle} style={{width: '18px', height: '18px', accentColor: 'var(--primary-color)'}} /> 
                                    <span style={{fontSize: '0.95rem'}}>Consultar Agenda</span>
                                </label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s'}} className="nav-item-hover">
                                    <input type="checkbox" name="book_appointment" checked={(agent.tools as any)?.book_appointment?.enabled} onChange={handleToolToggle} style={{width: '18px', height: '18px', accentColor: 'var(--primary-color)'}} /> 
                                    <span style={{fontSize: '0.95rem'}}>Agendar Citas</span>
                                </label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s'}} className="nav-item-hover">
                                    <input type="checkbox" name="get_patient_details" checked={(agent.tools as any)?.get_patient_details?.enabled} onChange={handleToolToggle} style={{width: '18px', height: '18px', accentColor: 'var(--primary-color)'}} /> 
                                    <span style={{fontSize: '0.95rem'}}>Consultar Info Paciente</span>
                                </label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s'}} className="nav-item-hover">
                                    <input type="checkbox" name="get_my_data_for_ai" checked={(agent.tools as any)?.get_my_data_for_ai?.enabled} onChange={handleToolToggle} style={{width: '18px', height: '18px', accentColor: 'var(--primary-color)'}} /> 
                                    <span style={{fontSize: '0.95rem'}}>Datos Personales (Portal)</span>
                                </label>
                                 <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s'}} className="nav-item-hover">
                                    <input type="checkbox" name="get_patient_progress" checked={(agent.tools as any)?.get_patient_progress?.enabled} onChange={handleToolToggle} style={{width: '18px', height: '18px', accentColor: 'var(--primary-color)'}} /> 
                                    <span style={{fontSize: '0.95rem'}}>Analizar Progreso del Paciente</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* WhatsApp Connection Card */}
                    <section style={{...cardStyle, borderColor: wappConnection.is_active ? '#10B981' : 'var(--border-color)', borderWidth: wappConnection.is_active ? '2px' : '1px'}}>
                         <div style={headerStyle}>
                            <span style={{fontSize: '1.5rem', color: '#10B981'}}>💬</span>
                            <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>WhatsApp</h3>
                        </div>

                        {/* VIEW MODE: Connection Summary */}
                        {!isEditingConnection && wappConnection.is_active ? (
                             <div className="fade-in">
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid #10B981'}}>
                                    <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'}}></div>
                                    <span style={{fontWeight: 700, color: '#047857', fontSize: '1rem'}}>Conectado ({wappConnection.provider === 'meta' ? 'Meta Cloud API' : 'Twilio'})</span>
                                </div>
                                <div style={{marginBottom: '2rem'}}>
                                    <label style={{fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '0.5rem'}}>Número Vinculado</label>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                        <span style={{fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-color)'}}>{wappConnection.phone_number}</span>
                                    </div>
                                </div>
                                <div style={{display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                                    <button onClick={() => setIsEditingConnection(true)} className="button-secondary" style={{flex: 1}}>
                                        {ICONS.edit} Editar
                                    </button>
                                    <button onClick={handleDisconnect} style={{flex: 1, backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: '1px solid var(--error-color)'}}>
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* EDIT/CREATE MODE: Form */
                            <form onSubmit={handleSaveConnection} className="fade-in">
                                <div style={{marginBottom: '1.5rem'}}>
                                    <label style={labelStyle}>Proveedor de Mensajería</label>
                                    <div className="select-wrapper">
                                        <select 
                                            value={wappConnection.provider} 
                                            onChange={e => setWappConnection(prev => ({...prev, provider: e.target.value}))} 
                                            style={inputStyle}
                                        >
                                            <option value="twilio">Twilio</option>
                                            <option value="meta">Meta (Cloud API)</option>
                                        </select>
                                    </div>
                                </div>

                                {wappConnection.provider === 'twilio' ? (
                                    <>
                                        <div style={{marginBottom: '1.5rem'}}><label style={labelStyle}>Account SID</label><input value={credentials.accountSid} onChange={e => setCredentials({...credentials, accountSid: e.target.value})} style={inputStyle} placeholder="AC..." /></div>
                                        <div style={{marginBottom: '1.5rem'}}><label style={labelStyle}>Auth Token</label><input type="password" value={credentials.authToken} onChange={e => setCredentials({...credentials, authToken: e.target.value})} style={inputStyle} placeholder="••••••••" /></div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{marginBottom: '1.5rem'}}><label style={labelStyle}>Phone Number ID</label><input value={credentials.phoneNumberId} onChange={e => setCredentials({...credentials, phoneNumberId: e.target.value})} style={inputStyle} placeholder="Identificador del teléfono" /></div>
                                        <div style={{marginBottom: '1.5rem'}}><label style={labelStyle}>WABA ID</label><input value={credentials.wabaId} onChange={e => setCredentials({...credentials, wabaId: e.target.value})} style={inputStyle} placeholder="Identificador de la cuenta comercial" /></div>
                                        <div style={{marginBottom: '1.5rem'}}><label style={labelStyle}>Permanent Access Token</label><input type="password" value={credentials.accessToken} onChange={e => setCredentials({...credentials, accessToken: e.target.value})} style={inputStyle} placeholder="Token de acceso del sistema" /></div>
                                        <div style={{marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid var(--border-color)'}}>
                                            <strong style={{color: 'var(--primary-color)'}}>Webhook Verify Token:</strong> 
                                            <div style={{fontFamily: 'monospace', marginTop: '0.5rem', wordBreak: 'break-all'}}>{credentials.verifyToken}</div>
                                        </div>
                                    </>
                                )}

                                <div style={{marginBottom: '2rem'}}>
                                    <label style={labelStyle}>Número de Teléfono (con código país)</label>
                                    <input value={phoneNumberInput} onChange={e => setPhoneNumberInput(e.target.value)} placeholder="+5215512345678" style={inputStyle} />
                                    <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>Debe coincidir con el número registrado en el proveedor.</p>
                                </div>

                                {error.connection && <p style={styles.error}>{error.connection}</p>}
                                {success.connection && <p style={{color: 'var(--primary-color)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500}}>{success.connection}</p>}

                                <div style={{display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
                                    {wappConnection.is_active && (
                                        <button type="button" onClick={() => setIsEditingConnection(false)} className="button-secondary" style={{flex: 1}}>
                                            Cancelar
                                        </button>
                                    )}
                                    <button type="submit" disabled={loading.connection} className="button-primary" style={{flex: 1}}>
                                        {loading.connection ? 'Guardando...' : wappConnection.is_active ? 'Guardar Cambios' : 'Conectar'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>

            </div>
        </div>
    );
};

export default AiAgentManagement;
