
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
    const mockCardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '8px',
        padding: '1rem 1.5rem',
        marginTop: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '1rem'
    };
    const mockButtonStyle: React.CSSProperties = {
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--text-light)',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    };

    return (
        <GuideSection title="Módulo 1: Gestión de Pacientes y Afiliados" icon={ICONS.users}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Este es el corazón de tu clínica digital. El sistema te permite administrar dos tipos de perfiles para adaptarse a diferentes modelos de negocio. Aunque ambos comparten la misma estructura de expediente, se gestionan en listas separadas para una mejor organización.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Conceptos Clave</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.user}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Pacientes</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Son tus clientes directos, individuos que contratan tus servicios por cuenta propia.</p>
                </div>
                <div style={conceptCardStyle}>
                    <div style={iconStyle}>{ICONS.users}</div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Afiliados</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Son miembros que llegan a través de un convenio con un tercero (ej. una empresa, un gimnasio o un plan familiar).</p>
                </div>
            </div>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Flujo de Trabajo Principal</h3>
            <p style={{ ...pStyle, marginTop: 0 }}>Gestionar tus perfiles es un proceso simple y centralizado:</p>
            <ol style={{ paddingLeft: '20px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><b style={bStyle}>Agregar:</b> Desde las páginas de "Pacientes" o "Afiliados", haz clic en el botón <b style={bStyle}>"Agregar"</b> para abrir el formulario de registro.</li>
                <li><b style={bStyle}>Buscar:</b> Utiliza la barra de búsqueda en la parte superior de cada lista para encontrar rápidamente a una persona por su nombre o folio.</li>
                <li><b style={bStyle}>Acceder al Expediente:</b> Haz clic en el <b style={bStyle}>nombre o la tarjeta</b> de cualquier persona en la lista. Esto te llevará a su expediente clínico unificado, donde tendrás una vista completa de su información.</li>
                <li><b style={bStyle}>Acciones Rápidas:</b> Dentro de cada lista, tienes acceso a acciones directas para cada persona.</li>
            </ol>
            
            <h4 style={{color: 'var(--text-color)', marginTop: '1.5rem'}}>Ejemplo Interactivo:</h4>
            <p style={{fontSize: '0.9rem'}}>Pasa el cursor sobre los íconos de acción para ver qué hace cada uno.</p>
            <div style={mockCardStyle}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <img src={`https://api.dicebear.com/8.x/initials/svg?seed=Ejemplo&radius=50`} alt="Avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />
                    <div>
                        <p style={{margin: 0, fontWeight: 600}}>Paciente de Ejemplo</p>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>Folio: PE-1234</p>
                    </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}} className="card-actions">
                    <button style={mockButtonStyle} title="Ver Expediente: Haz clic en el nombre o aquí para abrir la vista detallada.">{ICONS.details}</button>
                    <button style={mockButtonStyle} title="Editar Perfil: Modifica los datos personales y de suscripción.">{ICONS.edit}</button>
                    <button style={mockButtonStyle} title="Transferir: Cambia el perfil de 'Paciente' a 'Afiliado' (o viceversa).">{ICONS.transfer}</button>
                    <button style={{...mockButtonStyle, color: 'var(--error-color)'}} title="Eliminar: Borra el perfil y todos sus datos permanentemente.">{ICONS.delete}</button>
                </div>
            </div>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', lineHeight: 1.6}}>
                    <b style={{color: 'var(--primary-dark)'}}>Tip:</b> Usa el botón flotante <span style={{backgroundColor: 'var(--primary-color)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>+</span> para agregar un nuevo paciente o afiliado desde cualquier parte del sistema.
                </p>
            </div>
        </GuideSection>
    );
};

export default PatientManagementGuide;
