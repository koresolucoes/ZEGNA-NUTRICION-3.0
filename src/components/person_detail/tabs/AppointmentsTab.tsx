
import React, { FC, useMemo } from 'react';
import { AppointmentWithPerson, TeamMember } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';

interface AppointmentsTabProps {
    appointments: AppointmentWithPerson[];
    memberMap: Map<string, TeamMember>;
    onAdd: () => void;
    onEdit: (appointment: AppointmentWithPerson) => void;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'scheduled': return { label: 'Agendada', color: 'var(--primary-color)', bg: 'var(--primary-light)' };
        case 'pending-approval': return { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
        case 'completed': return { label: 'Completada', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
        case 'cancelled': return { label: 'Cancelada', color: 'var(--error-color)', bg: 'var(--error-bg)' };
        case 'no-show': return { label: 'No asistió', color: 'var(--error-color)', bg: 'var(--error-bg)' };
        case 'in-consultation': return { label: 'En Consulta', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' };
        case 'checked-in': return { label: 'En Espera', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
        default: return { label: status, color: 'var(--text-light)', bg: 'var(--surface-hover-color)' };
    }
};

export const AppointmentsTab: FC<AppointmentsTabProps> = ({ appointments, memberMap, onAdd, onEdit }) => {
    
    const sortedAppointments = useMemo(() => {
        return [...appointments].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    }, [appointments]);

    return (
        <section className="fade-in" style={{ overflow: 'visible' }}> {/* Ensure no scrollbar on section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Historial de Citas</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Gestiona las consultas programadas y pasadas.</p>
                </div>
                <button onClick={onAdd} className="button-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {ICONS.add} Nueva Cita
                </button>
            </div>
            
            {sortedAppointments.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {sortedAppointments.map(appt => {
                        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
                        const statusConfig = getStatusConfig(appt.status);
                        const dateObj = new Date(appt.start_time);
                        const day = dateObj.getDate();
                        const month = dateObj.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
                        const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

                        return (
                            <div 
                                key={appt.id} 
                                onClick={() => onEdit(appt)}
                                className="card-hover"
                                style={{ 
                                    backgroundColor: 'var(--surface-color)', 
                                    borderRadius: '12px', 
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Left Status Border Indicator */}
                                <div style={{ width: '6px', backgroundColor: statusConfig.color }}></div>

                                <div style={{ padding: '1rem', flex: 1, display: 'flex', gap: '1.25rem', alignItems: 'center', minWidth: 0 }}>
                                    
                                    {/* Date Calendar Block */}
                                    <div style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: 'var(--surface-hover-color)', borderRadius: '10px', 
                                        width: '60px', height: '60px', flexShrink: 0, border: '1px solid var(--border-color)'
                                    }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', lineHeight: 1 }}>{month}</span>
                                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-color)', lineHeight: 1 }}>{day}</span>
                                    </div>

                                    {/* Main Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '0.5rem'}}>
                                            <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {appt.title}
                                            </h4>
                                            <span style={{ 
                                                fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', 
                                                backgroundColor: statusConfig.bg, color: statusConfig.color, textTransform: 'capitalize', flexShrink: 0
                                            }}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                                {ICONS.clock} {time}
                                            </div>
                                            
                                            {nutritionist && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                    <img 
                                                        src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} 
                                                        alt="avatar" 
                                                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} 
                                                    />
                                                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'}}>{nutritionist.full_name?.split(' ')[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Action Icon */}
                                    <div style={{ color: 'var(--text-light)', opacity: 0.5 }}>
                                        {ICONS.edit}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-light)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>{ICONS.calendar}</div>
                    <p style={{ margin: 0 }}>No hay citas programadas para esta persona.</p>
                    <button onClick={onAdd} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}>
                        Programar la primera cita
                    </button>
                </div>
            )}
        </section>
    );
};
