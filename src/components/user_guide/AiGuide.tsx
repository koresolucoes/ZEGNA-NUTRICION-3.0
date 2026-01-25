
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
        use_knowledge_base: true, // New toggle
    });

    const handleToolToggle = (tool: keyof typeof tools) => {
        setTools(prev => ({ ...prev, [tool]: !prev[tool] }));
    };
    
    const Tooltip: React.FC<{text: string}> = ({ text }) => (
        <span title={text} style={{cursor: 'help', color: 'var(--text-light)', border: '1px solid var(--text-light)', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', marginLeft: '8px', fontWeight: 'bold'}}>?</span>
    );
    
    const whatsappPrompt = "Eres una secretaria virtual amigable y eficiente para una clínica de nutrición. Tu objetivo es responder preguntas y ayudar a agendar citas. Tienes acceso a herramientas para consultar información. Sé siempre cortés y profesional.";
    const patientPrompt = "Eres un asistente de nutrición personal y amigable. Tu objetivo es ayudar al paciente a seguir su plan, resolver dudas sobre sus comidas o ejercicios del día y motivarlo. Habla de forma clara y alentadora.";

    return (
        <GuideSection title="Módulo 6: Biblioteca y Agente IA (Cerebro)" icon={ICONS.sparkles}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Este módulo es el "cerebro" de tu clínica. Centraliza el conocimiento experto y configura a tu asistente virtual para que trabaje por ti, respondiendo dudas 24/7 con tu propia información.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>1. La Biblioteca (Conocimiento)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.book}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Recursos Educativos (RAG)</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Sube PDFs, guías o recetas. <b style={{color: 'var(--primary-color)'}}>¡Tu IA ahora puede leerlos!</b> Si activas la opción "Usar Base de Conocimiento", el agente consultará estos documentos antes de responder.
                    </p>
                </div>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.file}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Plantillas de Planes</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Crea estructuras base para dietas o rutinas. Úsalas para asignar planes rápidamente a nuevos pacientes sin empezar de cero. (Uso exclusivo del profesional).
                    </p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>2. El Agente IA (Simulación)</h3>
             <p style={pStyle}>
                En <b style={bStyle}>Configuración &gt; Agente IA</b>, defines la personalidad y capacidades. Prueba cómo cambia la configuración aquí:
            </p>
            
            <div style={{backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem'}}>
                 
                 <h4 style={{marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase', color: 'var(--text-light)'}}>Personalidad del Agente</h4>
                 <div className="sub-tabs" style={{borderBottom: '1px solid var(--border-color)', marginBottom: '1rem'}}>
                    <button onClick={() => setActiveEditor('whatsapp')} className={`sub-tab-button ${activeEditor === 'whatsapp' ? 'active' : ''}`} style={{padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeEditor === 'whatsapp' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeEditor === 'whatsapp' ? 'var(--primary-color)' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600}}>WhatsApp</button>
                    <button onClick={() => setActiveEditor('patient')} className={`sub-tab-button ${activeEditor === 'patient' ? 'active' : ''}`} style={{padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeEditor === 'patient' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeEditor === 'patient' ? 'var(--primary-color)' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600}}>Portal Paciente</button>
                 </div>
                 <textarea value={activeEditor === 'whatsapp' ? whatsappPrompt : patientPrompt} readOnly rows={4} style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', fontSize: '0.9rem', color: 'var(--text-color)', resize: 'none'}}/>

                 <h4 style={{marginTop: '2rem', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase', color: 'var(--text-light)'}}>Capacidades Habilitadas</h4>
                 <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool_kb" style={{marginBottom: 0, display: 'flex', alignItems: 'center', fontSize: '0.9rem'}}>Usar Base de Conocimiento (RAG) <Tooltip text="Permite al agente leer tus PDFs y artículos subidos para responder preguntas técnicas." /></label>
                        <label className="switch"><input id="tool_kb" type="checkbox" checked={tools.use_knowledge_base} onChange={() => handleToolToggle('use_knowledge_base')} /><span className="slider round"></span></label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool2" style={{marginBottom: 0, display: 'flex', alignItems: 'center', fontSize: '0.9rem'}}>Agendar nuevas citas <Tooltip text="Permite al agente crear una nueva cita en tu agenda si un paciente lo solicita." /></label>
                        <label className="switch"><input id="tool2" type="checkbox" checked={tools.book_appointment} onChange={() => handleToolToggle('book_appointment')} /><span className="slider round"></span></label>
                    </div>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                        <label htmlFor="tool3" style={{marginBottom: 0, display: 'flex', alignItems: 'center', fontSize: '0.9rem'}}>Consultar datos del paciente <Tooltip text="Permite al agente ver el plan de comidas y ejercicios del paciente conectado para responder '¿Qué me toca hoy?'." /></label>
                        <label className="switch"><input id="tool3" type="checkbox" checked={tools.get_my_data_for_ai} onChange={() => handleToolToggle('get_my_data_for_ai')} /><span className="slider round"></span></label>
                    </div>
                 </div>
            </div>
            
             <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Novedad v3.1:</b> El agente ahora tiene <b>"Memoria de Progreso"</b>. Puede analizar el historial de peso y medidas del paciente para responder preguntas como <i>"¿He bajado de peso este mes?"</i> con datos reales.
                </p>
            </div>
        </GuideSection>
    );
};

export default AiGuide;
