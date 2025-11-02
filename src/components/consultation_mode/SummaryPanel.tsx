
import React, { FC, FormEvent } from 'react';
import { Person, AppointmentWithPerson } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface LatestMetrics {
    hasAnyData: boolean;
    latestWeight?: number | null;
    latestHeight?: number | null;
    latestGlucose?: number | null;
    latestCholesterol?: number | null;
    latestTriglycerides?: number | null;
    latestHba1c?: number | null;
}

interface SummaryPanelProps {
    person: Person;
    latestMetrics: LatestMetrics;
    relevantAppointment: AppointmentWithPerson | null;
    updateAppointmentStatus: (id: string, status: 'completed' | 'no-show' | 'cancelled') => Promise<void>;
    appointmentUpdateLoading: boolean;
    quickConsult: { weight_kg: string; height_cm: string };
    setQuickConsult: React.Dispatch<React.SetStateAction<{ weight_kg: string; height_cm: string; }>>;
    handleQuickConsultSubmit: (e: FormEvent) => Promise<void>;
    formLoading: 'consult' | 'log' | null;
    quickLog: string;
    setQuickLog: React.Dispatch<React.SetStateAction<string>>;
    handleQuickLogSubmit: (e: FormEvent) => Promise<void>;
    sendContextToAi: (context: { displayText: string; fullText: string; }) => void;
    formatSummaryForAI: () => { displayText: string; fullText: string; };
    calculateAge: (birthDate: string | null | undefined) => string;
}

const SummaryPanel: FC<SummaryPanelProps> = ({
    person, latestMetrics, relevantAppointment, updateAppointmentStatus, appointmentUpdateLoading,
    quickConsult, setQuickConsult, handleQuickConsultSubmit, formLoading,
    quickLog, setQuickLog, handleQuickLogSubmit, sendContextToAi, formatSummaryForAI, calculateAge
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {relevantAppointment && (
                <div style={styles.detailCard}>
                    <div style={styles.detailCardHeader}>
                        <h3 style={styles.detailCardTitle}>Cita Programada para Hoy</h3>
                    </div>
                    <div style={styles.detailCardBody}>
                        <p style={{margin: '0 0 0.25rem 0', fontWeight: 600}}>{relevantAppointment.title}</p>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                            {new Date(relevantAppointment.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            -
                            {new Date(relevantAppointment.end_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                            <button onClick={() => updateAppointmentStatus(relevantAppointment.id, 'completed')} disabled={appointmentUpdateLoading} style={{width: '100%'}}>
                                {appointmentUpdateLoading ? '...' : 'Marcar como Completada'}
                            </button>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button className="button-secondary" onClick={() => updateAppointmentStatus(relevantAppointment.id, 'no-show')} disabled={appointmentUpdateLoading} style={{width: '100%'}}>
                                     No Asistió
                                </button>
                                <button className="button-secondary" onClick={() => updateAppointmentStatus(relevantAppointment.id, 'cancelled')} disabled={appointmentUpdateLoading} style={{width: '100%'}}>
                                     Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div style={styles.detailCard}>
                <div style={styles.detailCardHeader}>
                    <h3 style={styles.detailCardTitle}>Resumen del Paciente</h3>
                    <button onClick={() => sendContextToAi(formatSummaryForAI())} style={{...styles.iconButton, border: 'none'}} title="Enviar resumen al Asistente IA">{ICONS.send}</button>
                </div>
                <div style={styles.detailCardBody}>
                    <p style={{ margin: '0 0 0.25rem 0' }}><strong>Edad:</strong> {calculateAge(person.birth_date)} años</p>
                    <p style={{ margin: '0 0 1rem 0' }}><strong>Objetivo:</strong> {person.health_goal || 'Sin especificar'}</p>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <h4 style={{ ...styles.detailGroupTitle, margin: '0 0 0.5rem 0' }}>Últimos Datos Registrados</h4>
                        {latestMetrics.hasAnyData ? (
                            <div>
                                <p style={{ margin: '0 0 0.25rem 0' }}><strong>Peso:</strong> {latestMetrics.latestWeight ?? '-'} kg</p>
                                <p style={{ margin: '0 0 0.75rem 0' }}><strong>Altura:</strong> {latestMetrics.latestHeight ?? '-'} cm</p>
                                
                                {(latestMetrics.latestGlucose || latestMetrics.latestCholesterol || latestMetrics.latestTriglycerides || latestMetrics.latestHba1c) ? (
                                    <>
                                        <h5 style={{...styles.detailGroupTitle, fontSize: '0.8rem', marginTop: '0.5rem'}}>Laboratorio:</h5>
                                        <p style={{ margin: '0 0 0.25rem 0' }}><strong>Glucosa:</strong> {latestMetrics.latestGlucose ?? '-'} mg/dl</p>
                                        <p style={{ margin: '0 0 0.25rem 0' }}><strong>Colesterol:</strong> {latestMetrics.latestCholesterol ?? '-'} mg/dl</p>
                                        <p style={{ margin: '0 0 0.25rem 0' }}><strong>Triglicéridos:</strong> {latestMetrics.latestTriglycerides ?? '-'} mg/dl</p>
                                        <p style={{ margin: '0 0 0.25rem 0' }}><strong>HbA1c:</strong> {latestMetrics.latestHba1c ?? '-'} %</p>
                                    </>
                                ) : (
                                    <p style={{ margin: 0, color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.9rem' }}>Sin datos de laboratorio recientes.</p>
                                )}
                            </div>
                        ) : (
                            <p style={{ margin: 0, color: 'var(--text-light)' }}>No hay datos de consultas anteriores.</p>
                        )}
                    </div>
                </div>
            </div>
            <div style={styles.detailCard}><div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Captura Rápida</h3></div>
                <div style={styles.detailCardBody}>
                    <form onSubmit={handleQuickConsultSubmit}>
                        <label>Nuevas Mediciones</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" step="0.1" placeholder="Peso" value={quickConsult.weight_kg} onChange={e => setQuickConsult(p => ({ ...p, weight_kg: e.target.value }))} />
                            <input type="number" step="0.1" placeholder="Altura" value={quickConsult.height_cm} onChange={e => setQuickConsult(p => ({ ...p, height_cm: e.target.value }))} />
                        </div>
                        <button type="submit" disabled={formLoading === 'consult'} style={{ width: '100%', marginTop: '0.5rem' }}>{formLoading === 'consult' ? '...' : 'Guardar'}</button>
                    </form>
                    <form onSubmit={handleQuickLogSubmit} style={{ marginTop: '1rem' }}>
                        <label>Nueva Nota de Bitácora</label>
                        <textarea rows={3} placeholder="Añadir nota..." value={quickLog} onChange={e => setQuickLog(e.target.value)}></textarea>
                        <button type="submit" disabled={formLoading === 'log'} style={{ width: '100%', marginTop: '0.5rem' }}>{formLoading === 'log' ? '...' : 'Guardar'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SummaryPanel;
