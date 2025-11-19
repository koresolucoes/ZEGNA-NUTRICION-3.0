
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
    quickSuccess?: string | null; // New prop for showing success messages
}

const SummaryPanel: FC<SummaryPanelProps> = ({
    person, latestMetrics, relevantAppointment, updateAppointmentStatus, appointmentUpdateLoading,
    quickConsult, setQuickConsult, handleQuickConsultSubmit, formLoading,
    quickLog, setQuickLog, handleQuickLogSubmit, sendContextToAi, formatSummaryForAI, calculateAge,
    quickSuccess
}) => {
    const bigInputStyle: React.CSSProperties = {
        fontSize: '1.2rem',
        padding: '0.75rem',
        fontWeight: 600,
        textAlign: 'center',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-color)',
        width: '100%'
    };
    
    const successToastStyle: React.CSSProperties = {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        color: '#065F46',
        padding: '0.5rem',
        borderRadius: '6px',
        fontSize: '0.85rem',
        textAlign: 'center',
        marginBottom: '0.75rem',
        fontWeight: 600,
        border: '1px solid #10B981',
        animation: 'fadeIn 0.3s'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={styles.detailCard}>
                <div style={styles.detailCardHeader}>
                    <h3 style={styles.detailCardTitle}>Datos Personales</h3>
                    <button onClick={() => sendContextToAi(formatSummaryForAI())} style={{...styles.iconButton, border: 'none', color: 'var(--primary-color)'}} title="Enviar contexto al Asistente">{ICONS.send}</button>
                </div>
                <div style={styles.detailCardBody}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <div>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Edad</p>
                            <p style={{ margin: '0', fontWeight: 600 }}>{calculateAge(person.birth_date)} años</p>
                        </div>
                         <div style={{textAlign: 'right'}}>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Último Peso</p>
                            <p style={{ margin: '0', fontWeight: 600 }}>{latestMetrics.latestWeight ? `${latestMetrics.latestWeight} kg` : '-'}</p>
                        </div>
                    </div>
                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem'}}>
                        <p style={{margin: 0, fontWeight: 600, color: 'var(--text-light)', fontSize: '0.8rem'}}>OBJETIVO</p>
                        <p style={{margin: 0}}>{person.health_goal || 'Sin especificar'}</p>
                    </div>
                </div>
            </div>

            {relevantAppointment && (
                <div style={{...styles.detailCard, border: '2px solid var(--primary-color)'}}>
                    <div style={{...styles.detailCardHeader, backgroundColor: 'var(--primary-light)'}}>
                        <h3 style={{...styles.detailCardTitle, color: 'var(--primary-dark)'}}>Cita en Curso</h3>
                    </div>
                    <div style={styles.detailCardBody}>
                        <p style={{margin: '0 0 0.25rem 0', fontWeight: 600}}>{relevantAppointment.title}</p>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                            {new Date(relevantAppointment.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                        <div style={{marginTop: '1rem'}}>
                            <button onClick={() => updateAppointmentStatus(relevantAppointment.id, 'completed')} disabled={appointmentUpdateLoading} style={{width: '100%'}}>
                                {appointmentUpdateLoading ? '...' : '✅ Marcar Completada'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div style={styles.detailCard}>
                <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Signos Vitales</h3></div>
                <div style={styles.detailCardBody}>
                    {quickSuccess && <div style={successToastStyle}>{ICONS.check} {quickSuccess}</div>}
                    <form onSubmit={handleQuickConsultSubmit}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{flex: 1}}>
                                <label style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Peso (kg)</label>
                                <input type="number" step="0.1" placeholder="0.0" value={quickConsult.weight_kg} onChange={e => setQuickConsult(p => ({ ...p, weight_kg: e.target.value }))} style={bigInputStyle} />
                            </div>
                            <div style={{flex: 1}}>
                                <label style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Talla (cm)</label>
                                <input type="number" step="0.1" placeholder="0" value={quickConsult.height_cm} onChange={e => setQuickConsult(p => ({ ...p, height_cm: e.target.value }))} style={bigInputStyle} />
                            </div>
                        </div>
                        <button type="submit" disabled={formLoading === 'consult' || (!quickConsult.weight_kg && !quickConsult.height_cm)} style={{ width: '100%', padding: '0.6rem' }} className="button-secondary">
                            {formLoading === 'consult' ? '...' : 'Registrar Mediciones'}
                        </button>
                    </form>
                </div>
            </div>

            <div style={styles.detailCard}>
                <div style={styles.detailCardHeader}><h3 style={styles.detailCardTitle}>Notas Rápidas</h3></div>
                <div style={styles.detailCardBody}>
                    <form onSubmit={handleQuickLogSubmit}>
                        <textarea 
                            rows={3} 
                            placeholder="Escribe una nota rápida para la bitácora..." 
                            value={quickLog} 
                            onChange={e => setQuickLog(e.target.value)}
                            style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', backgroundColor: 'var(--background-color)'}}
                        ></textarea>
                        <button type="submit" disabled={formLoading === 'log' || !quickLog.trim()} style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }} className="button-secondary">
                            {formLoading === 'log' ? '...' : 'Guardar Nota'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SummaryPanel;
