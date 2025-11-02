import React, { useState } from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';
import { styles } from '../../constants';

const AiGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    const conceptCardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    };
    const iconStyle: React.CSSProperties = {
        fontSize: '1.5rem',
        color: 'var(--primary-color)',
        backgroundColor: 'var(--primary-light)',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.5rem'
    };
     const tipBoxStyle: React.CSSProperties = {
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };
    
    // State for the interactive simulation
    const [activeEditor, setActiveEditor] = useState<'whatsapp' | 'patient'>('whatsapp');
    const [tools, setTools] = useState({
        get_available_slots: true,
        book_appointment: true,
        get_my_data_for_ai: true,
    });

    const handleToolToggle = (tool: keyof typeof tools) => {
        setTools(prev => ({ ...prev, [tool]: !prev[tool] }));
    };
    
    const Tooltip: React.FC<{text: string}> = ({ text }) => (
        <span title={text} style={{cursor: 'help', color: 'var(--text-light)', border: '1px solid var(--text-light)', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', marginLeft: '8px'}}>?</span>
    );
    
    const whatsappPrompt = "Eres una secretaria virtual amigable y eficiente para una clínica de nutrición. Tu objetivo es responder preguntas y ayudar a agendar citas. Tienes acceso a herramientas para consultar información. Sé siempre cortés y profesional. Nunca des consejos médicos o nutricionales.";
    const patientPrompt = "Eres un asistente de nutrición personal y amigable. Tu objetivo es ayudar al paciente a seguir su plan, resolver dudas sobre sus comidas o ejercicios del día y motivarlo. Habla de forma clara y alentadora.";

    return (
        <GuideSection title="Módulo 6: Biblioteca y Agente IA" icon={ICONS.sparkles}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Automatizar tareas, centralizar el conocimiento de tu clínica y ofrecer una experiencia más interactiva a tus pacientes. Se divide en dos componentes que trabajan en conjunto: la Biblioteca y el Agente IA.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>La Biblioteca: El Conocimiento de tu IA</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.book}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Recursos</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Son el "alimento" para el cerebro de tu IA. Aquí puedes subir artículos, guías o recetas. Cuando la opción <b style={bStyle}>"Usar base de conocimiento"</b> está activa en la configuración del agente, la IA buscará en estos recursos para responder preguntas.
                    </p>
                </div>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.file}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Plantillas</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Son planes de alimentación o ejercicio pre-diseñados por ti para <b style={bStyle}>agilizar tu propio flujo de trabajo</b>. No son utilizados por la IA para conversar, sino que te sirven para asignar planes rápidamente.
                    </p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>El Agente IA: El Cerebro Operativo (Simulación Interactiva)</h3>
             <p style={pStyle}>
                Aquí configuras la "personalidad" y las "capacidades" de tu asistente virtual. La configuración es accesible desde <b style={bStyle}>Configuración &gt; Agente IA</b>.
            </p>
            
            <div style={{backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
                    <div>
                        <label>Proveedor</label>
                        <select disabled style={{cursor: 'help'}}><option>Google Gemini</option></select>
                    </div>
                     <div style={{flex: 1}}>
                        <label style={{display: 'flex', alignItems: 'center'}}>Modelo <Tooltip text="El 'motor' de la IA. Gemini Flash es rápido y eficiente, mientras que modelos como GPT-4o pueden ser más potentes pero costosos." /></label>
                        <input type="text" value="gemini-2.5-flash" disabled style={{cursor: 'help'}}/>
                    </div>
                </div>
                <div>
                     <label style={{display: 'flex', alignItems: 'center'}}>API Key <Tooltip text="Opcional. Si tienes tu propia clave de API (ej. de OpenAI o OpenRouter), puedes introducirla aquí para usar tus propios modelos. Si no, el sistema usará la clave de Gemini preconfigurada." /></label>
                    <input type="password" value="••••••••••••••••" disabled style={{cursor: 'help'}}/>
                </div>
                
                 <h4 style={{marginTop: '2rem', marginBottom: '1rem'}}>Personalidad del Agente</h4>
                 <div className="sub-tabs" style={{borderBottom: '1px solid var(--border-color)', marginBottom: '1rem'}}>
                    <button onClick={() => setActiveEditor('whatsapp')} className={`sub-tab-button ${activeEditor === 'whatsapp' ? 'active' : ''}`}>Agente de WhatsApp</button>
                    <button onClick={() => setActiveEditor('patient')} className={`sub-tab-button ${activeEditor === 'patient' ? 'active' : ''}`}>Agente del Portal</button>
                 </div>
                 <textarea value={activeEditor === 'whatsapp' ? whatsappPrompt : patientPrompt} readOnly rows={5} style={{backgroundColor: 'var(--surface-hover-color)'}}/>

                 <h4 style={{marginTop: '2rem', marginBottom: '1rem'}}>Capacidades (Herramientas)</h4>
                 <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool1" style={{marginBottom: 0, display: 'flex', alignItems: 'center'}}>Consultar horarios disponibles <Tooltip text="Permite al agente revisar tu agenda y responder sobre los espacios libres para citas." /></label>
                        <label className="switch"><input id="tool1" type="checkbox" checked={tools.get_available_slots} onChange={() => handleToolToggle('get_available_slots')} /><span className="slider round"></span></label>
                    </div>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool2" style={{marginBottom: 0, display: 'flex', alignItems: 'center'}}>Agendar nuevas citas <Tooltip text="Permite al agente crear una nueva cita en tu agenda si un paciente lo solicita. ¡Una de las herramientas más potentes!" /></label>
                        <label className="switch"><input id="tool2" type="checkbox" checked={tools.book_appointment} onChange={() => handleToolToggle('book_appointment')} /><span className="slider round"></span></label>
                    </div>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool3" style={{marginBottom: 0, display: 'flex', alignItems: 'center'}}>Consultar datos del paciente conectado <Tooltip text="Permite al agente (del portal o WhatsApp) acceder al plan de comidas y ejercicio del paciente que está conversando para responder preguntas específicas como '¿Qué me toca cenar hoy?'." /></label>
                        <label className="switch"><input id="tool3" type="checkbox" checked={tools.get_my_data_for_ai} onChange={() => handleToolToggle('get_my_data_for_ai')} /><span className="slider round"></span></label>
                    </div>
                 </div>
            </div>
            
             <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <b style={{color: 'var(--primary-dark)'}}>Sinergia:</b> Una biblioteca rica en <b style={{color: 'var(--primary-dark)'}}>Recursos</b> + un Agente IA con la <b style={{color: 'var(--primary-dark)'}}>personalidad</b> y <b style={{color: 'var(--primary-dark)'}}>herramientas</b> correctas = un asistente virtual potente que automatiza tu clínica y mejora la experiencia del paciente.
                </p>
            </div>
        </GuideSection>
    );
};

export default AiGuide;
