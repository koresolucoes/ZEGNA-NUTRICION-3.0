import React, { FC } from 'react';
import { AppointmentWithPerson, TeamMember } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';

const appointmentStatusMap: { [key: string]: string } = {
    scheduled: 'Agendada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    'no-show': 'No se presentó',
};

interface AppointmentsTabProps {
    appointments: AppointmentWithPerson[];
    memberMap: Map<string, TeamMember>;
    onAdd: () => void;
    onEdit: (appointment: AppointmentWithPerson) => void;
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({ appointments, memberMap, onAdd, onEdit }) => {
    return (
        <section className="fade-in">
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Citas Programadas</h2>
                <button onClick={onAdd}>{ICONS.add} Nueva Cita</button>
            </div>
            {appointments.length > 0 ? (
                <div className="info-grid">
                    {appointments.map(appt => {
                        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
                        return (
                            <div key={appt.id} className="info-card info-card-clickable" onClick={() => onEdit(appt)}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                                        {appt.title}
                                    </h4>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                        <strong>Fecha:</strong> {new Date(appt.start_time).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                                    </p>
                                     <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                        <strong>Estado:</strong> <span style={{ textTransform: 'capitalize' }}>{appointmentStatusMap[appt.status as keyof typeof appointmentStatusMap] || appt.status}</span>
                                    </p>
                                    {nutritionist && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <img src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>Atiende: {nutritionist.full_name || 'Usuario'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(appt); }} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : <p>No hay citas programadas para esta persona.</p>}
        </section>
    );
};