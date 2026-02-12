
import React, { FC } from 'react';
import { Person, ConsultationWithLabs, Allergy, MedicalHistory, DietLog, ExerciseLog, AppointmentWithPerson } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import ProgressChart from '../../shared/ProgressChart';

interface SummaryTabProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    appointments: AppointmentWithPerson[];
    isMobile: boolean;
    onViewPlans: () => void;
}

export const SummaryTab: FC<SummaryTabProps> = ({ person, consultations, allergies, medicalHistory, dietLogs, exerciseLogs, appointments, isMobile, onViewPlans }) => {
    
    const latestConsultation = consultations?.[0] || null;
    const latestDiet = dietLogs?.[0] || null;
    const latestExercise = exerciseLogs?.[0] || null;

    const sortedConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
    const weightData = sortedConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
    const imcData = sortedConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));

    const Widget: FC<{ title: string; children: React.ReactNode, icon?: React.ReactNode }> = ({ title, children, icon }) => (
        <div style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow)'
        }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
                {icon && <span style={{color: 'var(--primary-color)', fontSize: '1.2rem'}}>{icon}</span>}
                <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)'}}>{title}</h3>
            </div>
            {children}
        </div>
    );
    
    const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' };
    const valueStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                <ProgressChart title="Evolución del Peso" data={weightData} unit="kg" />
                <ProgressChart title="Evolución del IMC" data={imcData} unit="pts" />
            </div>

            {/* Recent Activity Section */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <Widget title="Última Consulta" icon={ICONS.clinic}>
                    {latestConsultation ? (
                        <>
                            <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                {new Date(latestConsultation.consultation_date).toLocaleDateString('es-MX', {dateStyle: 'long', timeZone: 'UTC'})}
                            </p>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <div><p style={labelStyle}>Peso</p><p style={valueStyle}>{latestConsultation.weight_kg} kg</p></div>
                                <div><p style={labelStyle}>IMC</p><p style={valueStyle}>{latestConsultation.imc}</p></div>
                                <div><p style={labelStyle}>TA</p><p style={valueStyle}>{latestConsultation.ta || '-'}</p></div>
                            </div>
                            {latestConsultation.notes && (
                                <p style={{margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', fontStyle: 'italic'}}>
                                    "{latestConsultation.notes.substring(0, 80)}{latestConsultation.notes.length > 80 ? '...' : ''}"
                                </p>
                            )}
                        </>
                    ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic'}}>No hay consultas registradas.</p>}
                </Widget>

                <Widget title="Plan de Alimentación" icon={ICONS.book}>
                    {latestDiet ? (
                        <>
                            <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                Asignado para: {new Date(latestDiet.log_date).toLocaleDateString('es-MX', {weekday: 'long', timeZone: 'UTC'})}
                            </p>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                                <div><p style={labelStyle}>Comida Principal</p><p style={{fontSize: '0.95rem', color: 'var(--text-color)'}}>{latestDiet.comida || 'N/A'}</p></div>
                                <div><p style={labelStyle}>Cena</p><p style={{fontSize: '0.95rem', color: 'var(--text-color)'}}>{latestDiet.cena || 'N/A'}</p></div>
                            </div>
                            <button 
                                onClick={onViewPlans}
                                className="button-secondary"
                                style={{
                                    width: '100%',
                                    marginTop: '1rem',
                                    fontSize: '0.85rem',
                                    padding: '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                Ver plan completo →
                            </button>
                        </>
                    ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic'}}>No hay un plan activo para hoy.</p>}
                </Widget>

                 <Widget title="Rutina de Ejercicio" icon={ICONS.activity}>
                    {latestExercise ? (
                        <>
                             <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                Asignado para: {new Date(latestExercise.log_date).toLocaleDateString('es-MX', {weekday: 'long', timeZone: 'UTC'})}
                            </p>
                            <p style={labelStyle}>Enfoque</p>
                            <p style={valueStyle}>{latestExercise.enfoque || 'General'}</p>
                            <button 
                                onClick={onViewPlans}
                                className="button-secondary"
                                style={{
                                    width: '100%',
                                    marginTop: '1rem',
                                    fontSize: '0.85rem',
                                    padding: '0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                Ver detalles completos →
                            </button>
                        </>
                    ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic'}}>Día de descanso o sin asignar.</p>}
                </Widget>
            </div>
        </div>
    );
};
