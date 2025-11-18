
import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { AppointmentWithPerson, Person, TeamMember } from '../../types';
import { supabase } from '../../supabase';

interface DayAppointmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    appointments: AppointmentWithPerson[];
    onEditAppointment: (appointment: AppointmentWithPerson) => void;
    onAddAppointment: (slot: { start: Date; end: Date }) => void;
    teamMembers: TeamMember[];
}

const modalRoot = document.getElementById('modal-root');

const DayAppointmentsModal: FC<DayAppointmentsModalProps> = ({ isOpen, onClose, date, appointments, onEditAppointment, onAddAppointment, teamMembers }) => {
    if (!isOpen || !modalRoot) return null;

    const memberMap = new Map(teamMembers.map(m => [m.user_id, m]));

    const handleApprove = async (appointment: AppointmentWithPerson) => {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'scheduled' })
            .eq('id', appointment.id);
        
        if (error) {
            console.error("Error approving appointment:", error);
        } else {
            // Send notification after successful approval
            if (appointment.person_id) {
                const { data: person } = await supabase.from('persons').select('user_id').eq('id', appointment.person_id).single();
                if (person && person.user_id) {
                     fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: person.user_id,
                          title: 'Cita Aprobada',
                          body: `Tu solicitud de cita para "${appointment.title}" ha sido aprobada.`
                        })
                    }).catch(err => console.error("Failed to send notification:", err));
                }
            }
        }
    };

    const handleAddNew = () => {
        const defaultStart = new Date(date);
        defaultStart.setHours(9, 0, 0, 0);
        const defaultEnd = new Date(defaultStart.getTime() + 60 * 60000); // 1 hour later
        onAddAppointment({ start: defaultStart, end: defaultEnd });
    };
    
    const sortedAppointments = [...appointments].sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={{...styles.modalTitle, margin: 0}}>Citas del Día</h2>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontWeight: 500 }}>
                            {date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {sortedAppointments.length > 0 ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {sortedAppointments.map(appt => {
                                const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
                                const startTime = new Date(appt.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
                                const endTime = new Date(appt.end_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
                                // FIX: Explicitly cast person to a type with full_name to prevent 'unknown' error
                                const person = appt.persons as { full_name: string } | null;
                                const isPending = appt.status === 'pending-approval';

                                return (
                                    <div 
                                        key={appt.id} 
                                        onClick={() => onEditAppointment(appt)} 
                                        className="table-row-hover" 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1rem', 
                                            padding: '1rem', 
                                            borderRadius: '8px', 
                                            cursor: 'pointer', 
                                            backgroundColor: 'var(--surface-hover-color)',
                                            borderLeft: isPending ? `4px solid var(--accent-color)` : 'none'
                                        }}
                                    >
                                        <div style={{textAlign: 'center', flexShrink: 0, width: '70px'}}>
                                            <p style={{margin: 0, fontWeight: 600, color: 'var(--primary-color)'}}>{startTime}</p>
                                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>a {endTime}</p>
                                        </div>
                                        <div style={{borderLeft: `2px solid var(--border-color)`, paddingLeft: '1rem', flex: 1}}>
                                            <p style={{margin: 0, fontWeight: 600}}>{appt.title}</p>
                                            {person?.full_name && <p style={{margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>Paciente: {person.full_name}</p>}
                                            {nutritionist && <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>Atiende: {nutritionist.full_name}</p>}
                                            {isPending && <p style={{margin: '0.5rem 0 0 0', color: 'var(--accent-color)', fontWeight: 500, fontSize: '0.9rem'}}>Pendiente de Aprobación</p>}
                                        </div>
                                        {isPending && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleApprove(appt); }}
                                                className="button-primary"
                                                style={{padding: '0.5rem 1rem', flexShrink: 0, backgroundColor: 'var(--accent-color)'}}
                                            >
                                                Aprobar
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0'}}>No hay citas programadas para este día.</p>
                    )}
                </div>
                <div style={{...styles.modalFooter, justifyContent: 'space-between'}}>
                    <button onClick={handleAddNew} className="button-secondary">{ICONS.add} Nueva Cita</button>
                    <button onClick={onClose} >Cerrar</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default DayAppointmentsModal;
