
import React from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const PatientManagementGuide: React.FC = () => {
    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    
    const conceptCardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flex: 1
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

    const visualFeatureStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    };

    return (
        <GuideSection title="Módulo 1: Gestión de Pacientes y Afiliados" icon={ICONS.users}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Este módulo es el punto de entrada para administrar tu base de datos de personas. Zegna clasifica los expedientes en dos listas para facilitar la administración financiera y operativa, aunque ambos comparten la misma estructura clínica.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Clasificación de Perfiles</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.user}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Pacientes (Directos)</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Personas que acuden a tu consulta de forma particular. Tú gestionas sus cobros y planes directamente.
                    </p>
                </div>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.users}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Afiliados (Convenios)</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Miembros que provienen de empresas, gimnasios o planes familiares. Suelen tener condiciones especiales o facturación agrupada.
                    </p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Funcionalidades Principales</h3>
            
            <div style={visualFeatureStyle}>
                <div style={{fontSize: '1.5rem', color: 'var(--text-light)'}}>{ICONS.grid}</div>
                <div>
                    <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--text-color)'}}>Vistas Flexibles</h4>
                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>
                        Alterna entre <b>Vista de Tarjetas</b> (visual, ideal para identificar rostros) y <b>Vista de Lista</b> (compacta, ideal para gestión rápida) usando los botones en la esquina superior derecha.
                    </p>
                </div>
            </div>

            <div style={visualFeatureStyle}>
                <div style={{fontSize: '1.5rem', color: '#10B981'}}>●</div>
                <div>
                    <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--text-color)'}}>Semáforo de Suscripción</h4>
                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>
                        Cada perfil muestra un indicador de estado. 
                        <span style={{color: '#10B981', fontWeight: 600}}> Verde</span> significa plan activo. 
                        <span style={{color: '#EF4444', fontWeight: 600}}> Rojo</span> indica que el plan ha vencido.
                    </p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Acciones Críticas</h3>
            <ol style={{ paddingLeft: '20px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li>
                    <b style={bStyle}>Crear Expediente:</b> Usa el botón <b style={{color: 'var(--primary-color)'}}>+ Nuevo</b>. Solo necesitas el nombre para empezar; puedes completar los datos clínicos después.
                </li>
                <li>
                    <b style={bStyle}>Invitar al Portal (Nuevo):</b> Una vez creado el perfil, ve a sus detalles y busca el botón "Invitar al Portal". Esto enviará un correo para que el paciente cree su contraseña y acceda a su App personal.
                </li>
                <li>
                    <b style={bStyle}>Transferencia de Tipo:</b> Si un paciente particular se une a un convenio (o viceversa), usa la opción <b style={bStyle}>"Transferir"</b> (ícono de intercambio) para mover su expediente entre listas sin perder datos.
                </li>
            </ol>
            
            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Tip Pro:</b> Utiliza la barra de búsqueda para encontrar pacientes no solo por nombre, sino también por su <b>Folio Interno</b> (ej. JM-9821), el cual se genera automáticamente basado en sus iniciales y teléfono.
                </p>
            </div>
        </GuideSection>
    );
};

export default PatientManagementGuide;
