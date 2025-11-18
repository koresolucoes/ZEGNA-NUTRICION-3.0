
import React, { useState } from 'react';
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

    return (
        <GuideSection title="Módulo 2: El Expediente Clínico Unificado" icon={ICONS.briefcase}>
            <p style={pStyle}>
                <b style={bStyle}>Propósito:</b> Centralizar toda la información clínica y administrativa de una persona en un solo lugar. Este es el espacio donde pasarás la mayor parte del tiempo, ya sea analizando datos, registrando nuevas consultas o creando planes.
            </p>

            <h3 style={{ color: 'var(--text-color)', marginTop: '2rem' }}>Anatomía del Expediente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div style={layoutItemStyle}>
                    <h4 style={{margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.activity} Encabezado Fijo</h4>
                    <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Siempre visible en la parte superior, muestra los datos más críticos del paciente: nombre, edad, último peso, IMC y estado de su plan de servicio.</p>
                </div>
                <div style={layoutItemStyle}>
                    <h4 style={{margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.sparkles} Barra Lateral de Acciones</h4>
                    <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>En la columna derecha (o en la parte superior en móviles) encontrarás las acciones más importantes, como "Iniciar Consulta", "Registrar Cobro" y "Generar Reporte", siempre a la mano.</p>
                </div>
                 <div style={{...layoutItemStyle, gridColumn: '1 / -1'}}>
                    <h4 style={{margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.book} Área de Contenido Principal</h4>
                    <div style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                        La columna principal (izquierda) contiene un sistema de pestañas para organizar la gran cantidad de información:
                        <ul style={{paddingLeft: '1.25rem', marginTop: '0.5rem'}}>
                            <li><b style={bStyle}>Resumen:</b> Un dashboard visual con las gráficas de progreso más importantes.</li>
                            <li><b style={bStyle}>Expediente Clínico:</b> El historial médico detallado, consultas, alergias y medicamentos.</li>
                            <li><b style={bStyle}>Planes y Seguimiento:</b> Gestiona planes alimenticios, rutinas, bitácoras y archivos.</li>
                            <li><b style={bStyle}>Gestión:</b> Administra citas, pagos y el equipo de cuidado interno.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div style={tipBoxStyle}>
                <p style={{margin: 0, fontWeight: 500, lineHeight: 1.7}}>
                    <b style={{color: 'var(--primary-dark)'}}>Conexión con Módulo 3:</b> El botón <b style={{color: 'var(--primary-dark)'}}>"Iniciar Consulta"</b>, ubicado en la barra de acciones, transforma esta vista en el "Modo Consulta", una interfaz optimizada para la atención en tiempo real.
                </p>
            </div>
        </GuideSection>
    );
};

export default ClinicalRecordGuide;
