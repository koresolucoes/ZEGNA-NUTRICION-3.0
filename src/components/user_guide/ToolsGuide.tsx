import React, { useState } from 'react';
import GuideSection from './GuideSection';
import { ICONS } from '../../pages/AuthPage';
import { styles } from '../../constants';

const ToolsGuide: React.FC = () => {
    const [activeTab, setActiveTab] = useState('references');

    const pStyle: React.CSSProperties = { marginBottom: '1rem', lineHeight: 1.7 };
    const bStyle: React.CSSProperties = { color: 'var(--text-color)', fontWeight: 600 };
    
    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        overflowX: 'auto',
        borderBottom: '2px solid var(--border-color)',
        margin: '1.5rem 0',
        backgroundColor: 'var(--background-color)',
        borderRadius: '8px 8px 0 0'
    };

    const tabButtonStyle: React.CSSProperties = {
        padding: '0.8rem 1.2rem',
        border: 'none',
        borderBottom: '3px solid transparent',
        backgroundColor: 'transparent',
        color: 'var(--text-light)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 500,
        transition: 'all 0.2s ease-in-out',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const tabContentStyle: React.CSSProperties = {
        padding: '1.5rem',
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '8px'
    };
    
    const tipBoxStyle: React.CSSProperties = {
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--primary-light)',
        borderLeft: '4px solid var(--primary-color)',
        borderRadius: '8px',
        color: 'var(--primary-dark)'
    };


    const tabs = [
        { key: 'references', label: 'Referencias', icon: ICONS.book },
        { key: 'tools', label: 'Herramientas', icon: ICONS.calculator },
        { key: 'manage', label: 'Gestionar Equivalentes', icon: ICONS.edit },
        { key: 'planner', label: 'Planificador', icon: ICONS.sparkles },
        { key: 'history', label: 'Historial', icon: ICONS.clock },
    ];

    const tabContent: Record<string, {title: string, description: string}> = {
        references: {
            title: 'Referencias Clínicas',
            description: 'Tu biblioteca de consulta rápida. Crea tarjetas con criterios diagnósticos o valores de laboratorio. Si tienes un paciente seleccionado, el sistema superpondrá sus datos sobre la tarjeta para una comparación instantánea.'
        },
        tools: {
            title: 'Herramientas Clínicas',
            description: 'Un conjunto de calculadoras especializadas. Desde requerimientos energéticos hasta función renal y riesgo de síndrome metabólico. Los resultados se pueden guardar directamente en la bitácora del paciente seleccionado.'
        },
        manage: {
            title: 'Gestionar Equivalentes',
            description: 'Esta es tu base de datos personal de alimentos equivalentes. Puedes añadir tus propios alimentos o importar la lista estándar del SMAE (Sistema Mexicano de Alimentos Equivalentes) para usarla en el Planificador Dietético.'
        },
        planner: {
            title: 'Planificador Dietético',
            description: 'La herramienta principal para crear planes de alimentación detallados. Define metas calóricas y de macronutrientes, y distribuye las porciones de equivalentes. Usa el generador con IA para crear un menú semanal completo con un solo clic.'
        },
        history: {
            title: 'Historial de Planes',
            description: 'Cada vez que guardas un plan desde el Planificador, se almacena aquí. Puedes cargar un plan antiguo para reutilizarlo o adaptarlo para un nuevo paciente, ahorrándote tiempo.'
        }
    };

    return (
        <GuideSection title="Módulo 5: Herramientas y Calculadoras" icon={ICONS.calculator}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Agilizar tus cálculos clínicos y la creación de planes dietéticos. Este módulo está dividido en varias pestañas, cada una con una función específica.
            </p>

            <div style={tipBoxStyle}>
                 <p style={{margin: 0, fontWeight: 500, lineHeight: 1.7 }}>
                    <b style={{color: 'var(--primary-dark)'}}>¡Importante! El Selector de Paciente:</b> En la parte superior de esta página, encontrarás un buscador de pacientes. Seleccionar a alguien aquí es <b style={{color: 'var(--primary-dark)'}}>crucial</b>, ya que conecta todas las herramientas con los datos de ese paciente específico, permitiéndote guardar cálculos y comparar resultados.
                </p>
            </div>
            
            <div className="sub-tabs" style={tabContainerStyle}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            ...tabButtonStyle,
                            ...(activeTab === tab.key && { color: 'var(--primary-color)', borderBottomColor: 'var(--primary-color)', fontWeight: 600 })
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>
            <div style={tabContentStyle} className="fade-in">
                <h4 style={{margin: 0, color: 'var(--primary-color)'}}>{tabContent[activeTab].title}</h4>
                <p style={{margin: '0.5rem 0 0 0', fontSize: '0.95rem'}}>{tabContent[activeTab].description}</p>
            </div>
        </GuideSection>
    );
};

export default ToolsGuide;