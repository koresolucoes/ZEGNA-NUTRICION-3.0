import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const NetworkGuide: React.FC = () => {
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
    const flowContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--background-color)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
    };
    const flowStepStyle: React.CSSProperties = {
        textAlign: 'center',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
    };
    const flowArrowStyle: React.CSSProperties = {
        fontSize: '2rem',
        color: 'var(--primary-color)',
        fontWeight: 'bold',
        flexShrink: 0
    };
     const consentBoxStyle: React.CSSProperties = {
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
    };


    return (
        <GuideSection title="Módulo 7: Red de Colaboradores y Referidos" icon={ICONS.network}>
            <style>{`
                .network-flow-container, .consent-flow-container {
                    display: flex;
                    gap: 1.5rem;
                }
                .network-flow-arrow {
                    align-self: center;
                }
                @media (max-width: 768px) {
                    .network-flow-container {
                        flex-direction: column;
                    }
                    .network-flow-arrow {
                        transform: rotate(90deg);
                    }
                     .consent-flow-container {
                        flex-direction: column;
                    }
                }
            `}</style>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Expandir tu capacidad de atención creando una red de cuidado integral. Conecta con otros profesionales, recibe y envía pacientes de forma segura y documentada, cumpliendo con las normativas de privacidad.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Tipos de Conexiones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.users}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Aliados</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Profesionales externos a tu clínica (médicos, psicólogos, entrenadores). Puedes invitarlos a la red Zegna, incluso si no son usuarios, para gestionar referidos.</p>
                </div>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.clinic}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Clínicas</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Otras clínicas de nutrición que también utilizan el ecosistema Zegna. Podrán intercambiar referidos de forma nativa.</p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Flujo para Establecer un Vínculo</h3>
            <div className="network-flow-container" style={flowContainerStyle}>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.users}</div>
                    <p><b>1. Explora</b><br/>Usa los directorios para encontrar al profesional o clínica que buscas.</p>
                </div>
                <div className="network-flow-arrow" style={flowArrowStyle}>→</div>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.send}</div>
                    <p><b>2. Conecta</b><br/>Envía una solicitud de vínculo con un clic. El otro profesional recibirá una notificación.</p>
                </div>
                <div className="network-flow-arrow" style={flowArrowStyle}>→</div>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.check}</div>
                    <p><b>3. Colabora</b><br/>Una vez que acepten, aparecerán en "Mis Vínculos" y podrás empezar a referir pacientes.</p>
                </div>
            </div>
            
            <h3 style={{ color: 'var(--text-color)', marginTop: '2.5rem' }}>El Proceso Clave: Enviar un Referido</h3>
             <p style={pStyle}>
                Al referir un paciente, el sistema te pedirá confirmar el consentimiento para compartir sus datos, cumpliendo con la LFPDPPP. El método varía según si el paciente tiene acceso al portal.
            </p>
            <div style={consentBoxStyle}>
                 <h4 style={{margin: 0, color: 'var(--primary-color)'}}>Flujo de Consentimiento</h4>
                 <div className="consent-flow-container" style={{marginTop: '1rem'}}>
                    <div style={{flex: 1, borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem'}}>
                        <p style={bStyle}>Opción A: Paciente con Portal</p>
                        <p style={{fontSize: '0.9rem'}}>Se envía una solicitud de consentimiento al portal del paciente. El referido solo se enviará <b style={bStyle}>después de que el paciente apruebe</b> explícitamente compartir su información.</p>
                    </div>
                    <div style={{flex: 1}}>
                        <p style={bStyle}>Opción B: Paciente sin Portal</p>
                        <p style={{fontSize: '0.9rem'}}>Deberás marcar una casilla confirmando que obtuviste el <b style={bStyle}>consentimiento informado por escrito</b>. Esta es tu constancia de cumplimiento legal.</p>
                    </div>
                 </div>
            </div>

        </GuideSection>
    );
};

export default NetworkGuide;