
import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const ConsultationModeGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };

    const diagramPanelStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1
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
                    display: flex;
                    gap: 1rem;
                    background-color: var(--background-color);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-top: 1.5rem;
                    flex-wrap: wrap;
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
                    .context-flow-container {
                        flex-direction: column;
                    }
                    .context-flow-arrow {
                        transform: rotate(90deg);
                    }
                }
            `}</style>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Una interfaz inmersiva diseñada para el momento de la atención. Elimina distracciones y pone las herramientas críticas al alcance de tu mano para que te enfoques en el paciente.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Anatomía de la Pantalla</h3>
            <div className="consultation-diagram-container">
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.user}</div>
                    <h4 style={diagramTitleStyle}>1. Panel Izquierdo</h4>
                    <p style={diagramTextStyle}><b>Acción Rápida:</b> Registra signos vitales (peso, talla) y notas breves al instante sin navegar por menús.</p>
                </div>
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.list}</div>
                    <h4 style={diagramTitleStyle}>2. Línea de Tiempo</h4>
                    <p style={diagramTextStyle}><b>Contexto Histórico:</b> Visualiza cronológicamente consultas pasadas, planes y bitácoras. Es el corazón del expediente.</p>
                </div>
                <div style={diagramPanelStyle}>
                    <div style={diagramIconStyle}>{ICONS.sparkles}</div>
                    <h4 style={diagramTitleStyle}>3. Asistente IA</h4>
                    <p style={diagramTextStyle}><b>Copiloto:</b> Un chat siempre disponible para responder dudas o analizar datos que le envíes.</p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Flujo de Contexto Inteligente</h3>
            <p style={pStyle}>
                La funcionalidad más potente es la capacidad de "inyectar" contexto a la IA. En lugar de copiar y pegar, simplemente selecciona un elemento de la línea de tiempo.
            </p>
            
            <div className="context-flow-container">
                <div style={{...contextItemStyle, flex: 1, width: '100%'}}>
                    <p style={{margin: 0, fontWeight: 600}}>Paso 1</p>
                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.85rem'}}>Ubica una Consulta o Plan anterior en la línea de tiempo.</p>
                </div>
                <div className="context-flow-arrow">
                    <p style={{margin: 0, fontSize: '0.8rem'}}>Clic en</p>
                    {ICONS.sparkles}
                </div>
                <div style={{...contextItemStyle, flex: 1, width: '100%'}}>
                    <p style={{margin: 0, fontWeight: 600}}>Paso 2</p>
                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.85rem'}}>La IA recibe los datos y puedes preguntar: <i>"¿Cómo ha variado su peso desde esta cita?"</i></p>
                </div>
            </div>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Novedad v3.1 (Herramientas en Modal):</b> Ya no necesitas salir del Modo Consulta para calcular algo. Usa el botón <b style={bStyle}>"Herramientas"</b> en la barra superior para abrir las calculadoras (GET, IMC, etc.) en una ventana superpuesta, manteniendo visible la información del paciente.
                </p>
            </div>
        </GuideSection>
    );
};

export default ConsultationModeGuide;
