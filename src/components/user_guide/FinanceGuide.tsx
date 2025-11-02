import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';
import { styles } from '../../constants';

const FinanceGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };

    // Styles for the flow diagram
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
    
    const tipBoxStyle: React.CSSProperties = {
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '4px',
        color: 'var(--primary-dark)'
    };
    
    const h3Style: React.CSSProperties = { color: 'var(--text-color)', marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' };

    return (
        <GuideSection title="Módulo 8: Finanzas y Facturación" icon={ICONS.dollar}>
             <style>{`
                .finance-flow-container {
                    display: flex;
                }
                @media (max-width: 768px) {
                    .finance-flow-container {
                        flex-direction: column;
                    }
                    .finance-flow-arrow {
                        transform: rotate(90deg);
                        margin: 1rem 0;
                    }
                }
            `}</style>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Centralizar el control financiero de tu clínica, desde el registro de cobros y análisis de ingresos hasta la facturación fiscal y la gestión de tu propia suscripción a la plataforma.
            </p>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <b style={{color: 'var(--primary-dark)'}}>Conexión Automática:</b> Todos los cobros que registras en el expediente de un paciente (a través de la pestaña "Resumen") se reflejan automáticamente en el Dashboard Financiero.
                </p>
            </div>

            <h3 style={h3Style}>Dashboard Financiero</h3>
            <p style={pStyle}>
                Ubicado en <b style={bStyle}>Administración &gt; Finanzas</b>, este panel te ofrece una vista completa de la salud económica de tu clínica. Podrás visualizar:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><b style={bStyle}>Ingresos Totales</b> por día, semana o mes.</li>
                <li><b style={bStyle}>Gráficas de Rendimiento</b> que muestran la evolución de tus ingresos y qué servicios son los más populares.</li>
                <li>Un <b style={bStyle}>Registro Detallado</b> de cada pago, con la opción de generar recibos y facturas.</li>
            </ul>

            <h3 style={h3Style}>Flujo de Facturación (CFDI 4.0)</h3>
            <p style={pStyle}>
                Genera facturas fiscales válidas directamente desde la plataforma. El proceso es simple:
            </p>
            <div className="finance-flow-container" style={flowContainerStyle}>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.dollar}</div>
                    <p><b>1. Registra un Pago</b><br/>En el expediente del paciente, registra un cobro por un servicio.</p>
                </div>
                <div className="finance-flow-arrow" style={flowArrowStyle}>→</div>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.calculator}</div>
                    <p><b>2. Genera Factura</b><br/>En el Dashboard Financiero, busca el pago y haz clic en el ícono de facturar.</p>
                </div>
                <div className="finance-flow-arrow" style={flowArrowStyle}>→</div>
                <div style={flowStepStyle}>
                    <div style={{fontSize: '2rem'}}>{ICONS.file}</div>
                    <p><b>3. Descarga y Envía</b><br/>Completa los datos fiscales del receptor y obtén el PDF y XML listos para enviar.</p>
                </div>
            </div>
            <p style={{marginTop: '1rem', fontSize: '0.9rem'}}>
                <b style={{color: 'var(--accent-color)'}}>¡Ojo!</b> Para poder facturar, primero debes configurar tus credenciales fiscales (e.firma) en <b style={bStyle}>Mi Clínica &gt; Facturación</b>.
            </p>

            <h3 style={h3Style}>Suscripción a Zegna Nutrición</h3>
            <p style={pStyle}>
                Gestiona tu plan de acceso a la plataforma desde <b style={bStyle}>Mi Clínica &gt; Suscripción y Pagos</b>. Aquí podrás:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Cambiar entre los planes <b style={bStyle}>Gratis, Pro y Business</b> para desbloquear más funcionalidades.</li>
                <li>Elegir entre un ciclo de facturación <b style={bStyle}>mensual</b> o <b style={bStyle}>anual</b> (con descuento).</li>
                <li>Ver el estado de tu suscripción actual.</li>
            </ul>

        </GuideSection>
    );
};

export default FinanceGuide;