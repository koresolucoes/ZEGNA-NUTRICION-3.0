import React, { FC } from 'react';
import { styles } from '../../constants';
import { AppointmentWithPerson } from '../../types';

interface UpcomingAppointmentsWidgetProps {
    appointments: AppointmentWithPerson[];
    loading: boolean;
    navigateToDetail: (type: 'client' | 'member', id: string) => void;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isToday) return `Hoy, ${time}`;
    if (isTomorrow) return `Mañana, ${time}`;
    return `${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${time}`;
};


const UpcomingAppointmentsWidget: FC<UpcomingAppointmentsWidgetProps> = ({ appointments, loading, navigateToDetail }) => {
    
    const renderSkeleton = (lines = 4) => (
        <div>
            {[...Array(lines)].map((_, i) => (
                <div key={i} style={{height: '40px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '4px', marginBottom: '1rem'}}></div>
            ))}
        </div>
    );
    
    const handleClick = (appt: AppointmentWithPerson) => {
        if (appt.person_id && appt.persons) {
             const personType = appt.persons.person_type === 'member' ? 'member' : 'client';
             navigateToDetail(personType, appt.person_id);
        }
    };

    return (
        <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Próximas Citas</h3></div>
            <div style={styles.infoCardBody}>
                {loading ? renderSkeleton() : (
                    <ul style={styles.activityList}>
                        {appointments.length > 0 ? appointments.map(appt => (
                            <li key={appt.id} style={{...styles.activityItem, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', cursor: appt.person_id ? 'pointer' : 'default' }} onClick={() => handleClick(appt)}>
                                <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <p style={{margin: 0, fontWeight: 500, color: 'var(--primary-color)'}}>{appt.title}</p>
                                    <span style={{fontSize: '0.85rem', color: 'var(--text-light)', textAlign: 'right' as const, flexShrink: 0, fontWeight: 600}}>{formatDate(appt.start_time)}</span>
                                </div>
                                 <p style={{margin: '0.1rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                    Paciente: {appt.persons?.full_name || 'Sin asignar'}
                                </p>
                            </li>
                        )) : <p>No hay citas programadas.</p>}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default UpcomingAppointmentsWidget;