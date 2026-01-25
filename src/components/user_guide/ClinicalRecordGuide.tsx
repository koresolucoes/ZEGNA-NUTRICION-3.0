
import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const ClinicalRecordGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    
    const tipBoxStyle: React.CSSProperties = {
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };

    const layoutItemStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
    };
    
    const subListStyle: React.CSSProperties = {
        paddingLeft: '1.25rem',
        marginTop: '0.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    };

    return (
        <GuideSection title="Módulo 2: El Expediente Clínico Unificado" icon={ICONS.briefcase}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Centralizar toda la información clínica y administrativa de una persona. En la versión 3.1, hemos rediseñado el expediente con un sistema de carpetas para mantener el orden incluso con grandes cantidades de datos.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Estructura de Navegación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div style={layoutItemStyle}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.activity} Resumen</h4>
                    <p style={{fontSize: '0.9rem', margin: 0}}>Tu "dashboard" del paciente. Visualiza gráficas de progreso, la próxima cita, y alertas clínicas importantes de un vistazo.</p>
                </div>
                
                <div style={layoutItemStyle}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.book} Expediente</h4>
                    <p style={{fontSize: '0.9rem', margin: 0}}>Contiene la historia clínica estática.</p>
                    <ul style={subListStyle}>
                        <li>• Alergias e Intolerancias</li>
                        <li>• Historial Médico y Patológico</li>
                        <li>• Medicamentos y Suplementos</li>
                        <li>• Hábitos de Estilo de Vida</li>
                    </ul>
                </div>
                
                <div style={layoutItemStyle}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.sparkles} Planes</h4>
                    <p style={{fontSize: '0.9rem', margin: 0}}>La parte activa del tratamiento.</p>
                     <ul style={subListStyle}>
                        <li>• Planes Actuales (Dieta/Ejercicio)</li>
                        <li>• Historial de Cálculos</li>
                        <li>• Bitácora y Archivos Adjuntos</li>
                        <li>• Auto-Registro del Paciente</li>
                    </ul>
                </div>
                
                <div style={layoutItemStyle}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.settings} Gestión</h4>
                    <p style={{fontSize: '0.9rem', margin: 0}}>Administración del cliente.</p>
                     <ul style={subListStyle}>
                        <li>• Historial de Citas</li>
                        <li>• Equipo de Cuidado (Roles)</li>
                        <li>• Información Legal (Consentimiento)</li>
                    </ul>
                </div>
            </div>

             <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Elementos Clave de la Interfaz</h3>
             <ul style={{paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                 <li>
                     <b style={bStyle}>Encabezado Fijo (Sticky Header):</b> En escritorio, siempre verás el nombre, edad, último peso e IMC en la parte superior mientras haces scroll, junto con un indicador visual del estado de su plan.
                 </li>
                 <li>
                     <b style={bStyle}>Barra de Acciones Rápidas:</b> Ubicada a la derecha. Úsala para tareas frecuentes como <b style={bStyle}>"Iniciar Consulta"</b>, "Registrar Cobro", "Referir" o "Invitar al Portal" sin tener que navegar por las pestañas.
                 </li>
             </ul>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, lineHeight: 1.7}}>
                    <b style={{color: 'var(--primary-dark)'}}>Novedad v3.1 (Cumplimiento):</b> En la pestaña <b style={bStyle}>Gestión &gt; Información</b>, ahora puedes gestionar la firma del <b>Consentimiento Informado</b> digitalmente o subir el PDF firmado para cumplir con la NOM-004.
                </p>
            </div>
        </GuideSection>
    );
};

export default ClinicalRecordGuide;
