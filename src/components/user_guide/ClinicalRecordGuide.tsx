import React, { useState } from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';

const ClinicalRecordGuide: React.FC = () => {
    const [activeTab, setActiveTab] = useState('summary');

    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    
    // Styles for the interactive diagram
    const diagramContainerStyle: React.CSSProperties = {
        backgroundColor: 'var(--background-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginTop: '1.5rem',
    };

    const headerStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '1rem',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-around', // Changed for better mobile wrapping
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem 1.5rem', // Added more gap for spacing
        marginBottom: '1rem'
    };
    
    const headerItemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0.5rem',
        borderRadius: '4px',
        cursor: 'help',
        border: '1px solid transparent',
        transition: 'all 0.2s',
        minWidth: '120px', // Ensure items have some space
    };
    
    const headerLabelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.25rem' };
    const headerValueStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)' };
    
    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        overflowX: 'auto',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '1rem',
    };

    const tabButtonStyle: React.CSSProperties = {
        padding: '0.8rem 1.2rem',
        border: 'none',
        borderBottom: '3px solid transparent',
        backgroundColor: 'transparent',
        color: 'var(--text-light)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 500,
        transition: 'all 0.2s ease-in-out',
        whiteSpace: 'nowrap',
    };

    const tabContentStyle: React.CSSProperties = {
        padding: '1.5rem',
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '8px'
    };
    
    const tipBoxStyle: React.CSSProperties = {
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };

    const tabs = [
        { key: 'summary', label: 'Resumen' },
        { key: 'record', label: 'Expediente Clínico' },
        { key: 'plans', label: 'Planes' },
        { key: 'management', label: 'Gestión' },
    ];
    
    const tabContent: Record<string, {title: string, description: string}> = {
        summary: {
            title: 'Resumen Rápido',
            description: 'Esta pestaña te da una vista de "un vistazo" de la información más relevante: alertas clínicas, última consulta, próximos eventos y acciones rápidas.'
        },
        record: {
            title: 'Expediente Clínico Detallado',
            description: 'Aquí se encuentra el núcleo de la información clínica. Usa las sub-pestañas para navegar entre el historial médico, alergias, medicamentos, hábitos de vida y los resultados de todas las consultas anteriores.'
        },
        plans: {
            title: 'Planes y Seguimiento',
            description: 'Gestiona y visualiza los planes alimenticios y de ejercicio, consulta el historial de planes calculados, revisa los registros diarios del paciente y explora las gráficas de progreso.'
        },
        management: {
            title: 'Gestión Administrativa',
            description: 'Esta área se enfoca en la parte administrativa del paciente: gestiona sus citas, revisa los pagos y facturas, y administra el equipo de cuidado interno asignado a este caso.'
        }
    };


    return (
        <GuideSection title="Módulo 2: El Expediente Clínico Unificado" icon={ICONS.briefcase}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Centralizar toda la información clínica y administrativa de una persona en un solo lugar. Este es el espacio donde pasarás la mayor parte del tiempo, ya sea analizando datos, registrando nuevas consultas o creando planes.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Anatomía del Expediente (Interactivo)</h3>
            <p style={{fontSize: '0.9rem'}}>Pasa el cursor sobre los elementos del encabezado y haz clic en las pestañas para explorar.</p>

            <div style={diagramContainerStyle}>
                {/* Header Section */}
                <div style={headerStyle} title="Encabezado Fijo: Muestra los datos más críticos del paciente en todo momento, sin importar en qué pestaña te encuentres.">
                    <div style={headerItemStyle} title="Nombre y Edad: Identificación principal del paciente.">
                        <span style={headerLabelStyle}>Paciente</span>
                        <span style={headerValueStyle}>Paciente de Ejemplo</span>
                    </div>
                    <div style={headerItemStyle} title="Último Peso Registrado: Extraído de la consulta más reciente.">
                        <span style={headerLabelStyle}>Último Peso</span>
                        <span style={headerValueStyle}>75.5 kg</span>
                    </div>
                    <div style={headerItemStyle} title="Último IMC Calculado: Basado en el último peso y altura registrados.">
                        <span style={headerLabelStyle}>Último IMC</span>
                        <span style={headerValueStyle}>26.1</span>
                    </div>
                    <div style={headerItemStyle} title="Estado del Plan de Servicio: Indica si el plan del paciente está activo o vencido.">
                        <span style={headerLabelStyle}>Plan</span>
                        <span style={headerValueStyle} style={{color: 'var(--primary-color)'}}>Activo</span>
                    </div>
                </div>

                {/* Tabs Section */}
                <div title="Área de Pestañas: Organiza la vasta cantidad de información en secciones lógicas para una fácil navegación.">
                    <div style={tabContainerStyle}>
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    ...tabButtonStyle,
                                    ...(activeTab === tab.key && { color: 'var(--primary-color)', borderBottomColor: 'var(--primary-color)', fontWeight: 600 })
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div style={tabContentStyle} className="fade-in">
                        <h4 style={{margin: 0, color: 'var(--primary-color)'}}>{tabContent[activeTab].title}</h4>
                        <p style={{margin: '0.5rem 0 0 0', fontSize: '0.95rem'}}>{tabContent[activeTab].description}</p>
                    </div>
                </div>
            </div>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, lineHeight: 1.7}}>
                    <b style={{color: 'var(--primary-dark)'}}>Conexión con Módulo 3:</b> El botón <b style={{color: 'var(--primary-dark)'}}>"Iniciar Consulta"</b>, ubicado en la parte superior del expediente, transforma esta vista en el "Modo Consulta", una interfaz optimizada para la atención en tiempo real.
                </p>
            </div>
        </GuideSection>
    );
};

export default ClinicalRecordGuide;