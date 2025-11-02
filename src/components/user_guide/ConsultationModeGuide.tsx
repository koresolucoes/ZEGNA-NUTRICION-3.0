import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const ConsultationModeGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };

    // Styles for the diagram elements
    const diagramPanelStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };
    
    const diagramIconStyle: React.CSSProperties = { fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '0.75rem' };
    const diagramTitleStyle: React.CSSProperties = { margin: 0, color: 'var(--text-color)', fontSize: '1rem', fontWeight: 600 };
    const diagramTextStyle: React.CSSProperties = { margin: '0.5rem 0 0 0', fontSize: '0.85rem' };

    const contextItemStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.9rem',
        textAlign: 'center'
    };
    
    const tipBoxStyle: React.CSSProperties = {
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };

    return (
        <GuideSection title="Módulo 3: Modo Consulta" icon={ICONS.activity}>
            <style>{`
                .consultation-diagram-container {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr 1fr;
                    gap: 1rem;
                    background-color: var(--background-color);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-top: 1.5rem;
                }
                .context-flow-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    background-color: var(--background-color);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-top: 1rem;
                }
                .context-flow-arrow {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--primary-color);
                    transition: transform 0.3s ease-in-out;
                }
                
                @media (max-width: 768px) {
                    .consultation-diagram-container,
                    .context-flow-container {
                        grid-template-columns: 1fr;
                        flex-direction: column;
                    }
                    .context-flow-arrow {
                        transform: rotate(90deg);
                    }
                }
            `}</style>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Es una interfaz especializada y libre de distracciones, diseñada para optimizar el flujo de trabajo durante una consulta en tiempo real. Su estructura de tres paneles te permite ver, registrar y analizar información simultáneamente.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Anatomía del Modo Consulta</h3>
            <div className="consultation-diagram-container">
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.user}</div>
                    <h4 style={diagramTitleStyle}>Resumen del Paciente</h4>
                    <p style={diagramTextStyle}>Accede a los datos clave del paciente y registra nuevas mediciones o notas rápidas sin salir de la vista.</p>
                </div>
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.book}</div>
                    <h4 style={diagramTitleStyle}>Línea de Tiempo Unificada</h4>
                    <p style={diagramTextStyle}>El panel central. Explora todo el historial del paciente (consultas, planes, notas) de forma cronológica. Es tu principal fuente de contexto.</p>
                </div>
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.sparkles}</div>
                    <h4 style={diagramTitleStyle}>Asistente IA</h4>
                    <p style={diagramTextStyle}>Tu copiloto clínico. Hazle preguntas, pide resúmenes o analiza datos específicos que le envíes desde la línea de tiempo.</p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>La Magia del Contexto: Tu Herramienta Más Poderosa</h3>
            <p style={pStyle}>
                La funcionalidad clave de este modo es la capacidad de "enviar" eventos de la línea de tiempo directamente al Asistente IA. Al hacerlo, le proporcionas a la IA el contexto exacto sobre el cual quieres hacer una pregunta, obteniendo respuestas mucho más precisas.
            </p>
            
            <div className="context-flow-container">
                <div style={{...contextItemStyle, flex: 2, width: '100%'}}>
                    <p style={{margin: 0, fontWeight: 600}}>1. Evento en la Línea de Tiempo</p>
                    <p style={{margin: '0.5rem 0 0 0'}}>Consulta de Seguimiento</p>
                </div>
                <div className="context-flow-arrow">
                    <p style={{margin: 0, fontSize: '0.8rem'}}>Haz clic en</p>
                    {ICONS.send}
                    <p style={{margin: 0, fontSize: '2rem'}}>→</p>
                </div>
                <div style={{...contextItemStyle, flex: 3, width: '100%'}}>
                    <p style={{margin: 0, fontWeight: 600}}>2. Se añade al Asistente IA</p>
                    <div style={{
                        backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', border: '1px solid var(--primary-color)',
                        borderRadius: '16px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
                        marginTop: '0.5rem', fontSize: '0.85rem'
                    }}>
                        <span>Contexto: Consulta...</span>
                        <span>&times;</span>
                    </div>
                </div>
            </div>
            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Tip de Productividad:</b> Utiliza el Modo Consulta como tu "puesto de mando" durante la atención. La vista está diseñada para que no necesites cambiar de pantalla mientras hablas con tu paciente.
                </p>
            </div>
        </GuideSection>
    );
};

export default ConsultationModeGuide;
