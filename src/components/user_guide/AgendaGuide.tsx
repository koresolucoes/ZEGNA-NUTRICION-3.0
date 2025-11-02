import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const AgendaGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    
    const flowContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'stretch', // Ensure cards have same height
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--background-color)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
    };
    
    const flowCardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '1.5rem',
        borderRadius: '8px',
        textAlign: 'center',
        flex: 1,
        minWidth: '200px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
    };
    
    const flowTitleStyle: React.CSSProperties = {
        margin: 0,
        fontSize: '1rem',
        color: 'var(--text-color)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
    };
    
    const flowArrowStyle: React.CSSProperties = {
        fontSize: '2rem',
        color: 'var(--primary-color)',
        fontWeight: 'bold',
        flexShrink: 0,
        alignSelf: 'center'
    };

    const stepListStyle: React.CSSProperties = {
        paddingLeft: '20px',
        marginTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    };

    const tipBoxStyle: React.CSSProperties = {
        marginTop: '2.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };

    return (
        <GuideSection title="Módulo 4: Agenda y Sala de Espera" icon={ICONS.calendar}>
            <style>{`
                .agenda-flow-container {
                    display: flex;
                    align-items: stretch;
                }
                @media (max-width: 960px) {
                    .agenda-flow-container {
                        flex-direction: column;
                    }
                    .agenda-flow-arrow {
                        transform: rotate(90deg);
                        margin: 1rem 0;
                    }
                }
            `}</style>

            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Digitalizar y automatizar el flujo de pacientes desde que agendan hasta que finalizan su consulta, mejorando la organización y la experiencia en la clínica.
            </p>
            <p style={pStyle}>
                La <b style={bStyle}>Agenda</b> te permite gestionar tus citas en vistas de mes o semana. La <b style={bStyle}>Sala de Espera</b> es tu centro de operaciones en tiempo real para el día de consulta.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>El Viaje del Paciente (Interactivo)</h3>
            <div className="agenda-flow-container" style={flowContainerStyle}>
                {/* Step 1: Programado */}
                <div style={flowCardStyle}>
                    <div>
                        <h4 style={flowTitleStyle}>{ICONS.calendar} Programado</h4>
                        <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>Todas las citas del día aparecen aquí.</p>
                    </div>
                    <button className="button-secondary" title="Marca la llegada del paciente. Al hacerlo, pasará a la columna 'En Espera'.">
                        Registrar Llegada
                    </button>
                </div>
                
                <div className="agenda-flow-arrow" style={flowArrowStyle}>→</div>

                {/* Step 2: En Espera */}
                <div style={flowCardStyle}>
                    <div>
                        <h4 style={flowTitleStyle}>{ICONS.clock} En Espera</h4>
                        <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>Pacientes que ya hicieron check-in.</p>
                    </div>
                    <button title="Abre una ventana para asignar un consultorio (ej. '1A'). El paciente será llamado en la pantalla pública.">
                        Llamar a Paciente
                    </button>
                </div>

                <div className="agenda-flow-arrow" style={flowArrowStyle}>→</div>

                {/* Step 3: En Consulta */}
                <div style={flowCardStyle}>
                    <div>
                        <h4 style={flowTitleStyle}>{ICONS.activity} En Consulta</h4>
                        <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>Pacientes que están siendo atendidos.</p>
                    </div>
                    <button title="Abre el Modo Consulta, la interfaz optimizada para la atención en tiempo real.">
                        Iniciar Consulta
                    </button>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2.5rem' }}>Configuración de la Pantalla Pública</h3>
            <p style={pStyle}>
                Muestra la fila de espera en una TV o tablet en tu recepción para que los pacientes vean cuándo son llamados. La configuración es sencilla:
            </p>
            <ol style={stepListStyle}>
                <li>
                    Navega a <b style={bStyle}>Mi Clínica &gt; Pantallas de Espera</b> en el menú lateral.
                </li>
                <li>
                    Haz clic en <b style={bStyle}>"Nueva Pantalla"</b>, asígnale un nombre (ej. "TV Sala Principal") y guarda. El sistema generará un <b style={bStyle}>código único</b> de 8 caracteres para esa pantalla.
                </li>
                <li>
                    En el navegador de tu TV o tablet, abre la URL pública de la sala de espera y, cuando se te solicite, introduce el <b style={bStyle}>código único</b> que generaste para vincular el dispositivo.
                </li>
                <li>
                    ¡Listo! Ahora, cada vez que uses la acción <b style={bStyle}>"Llamar a Paciente"</b>, el nombre del paciente parpadeará en la pantalla y sonará una alerta de audio.
                </li>
            </ol>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Tip de Accesibilidad:</b> Antes de que la alerta de audio suene por primera vez, la página de la pantalla pública pedirá una interacción (un clic). Esto es una medida de seguridad de los navegadores. Simplemente haz clic en cualquier lugar de la pantalla en el dispositivo de la sala de espera una vez para activarla permanentemente.
                </p>
            </div>
        </GuideSection>
    );
};

export default AgendaGuide;
