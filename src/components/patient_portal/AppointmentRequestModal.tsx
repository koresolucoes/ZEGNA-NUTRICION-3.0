
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, TeamMember, Clinic } from '../../types';

const modalRoot = document.getElementById('modal-root');

interface AppointmentRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    person: Person;
    teamMembers: TeamMember[];
}

const AppointmentRequestModal: FC<AppointmentRequestModalProps> = ({ isOpen, onClose, onSave, person, teamMembers }) => {
    const [selectedNutritionistId, setSelectedNutritionistId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    useEffect(() => {
        if (teamMembers.length > 0 && !selectedNutritionistId) {
            setSelectedNutritionistId(teamMembers[0].user_id!);
        }
    }, [teamMembers, selectedNutritionistId]);

    useEffect(() => {
        const fetchClinic = async () => {
            if (person?.clinic_id) {
                const { data } = await supabase.from('clinics').select('*').eq('id', person.clinic_id).single();
                setClinic(data as unknown as Clinic);
            }
        };
        fetchClinic();
    }, [person]);

    useEffect(() => {
        const fetchAvailableSlots = async () => {
            if (!selectedNutritionistId || !selectedDate || !clinic) return;
            setSlotsLoading(true);
            setSelectedSlot('');
            
            try {
                const startOfDay = new Date(selectedDate + 'T00:00:00');
                const endOfDay = new Date(selectedDate + 'T23:59:59');

                const { data: existingAppointments, error } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .eq('user_id', selectedNutritionistId)
                    .gte('start_time', startOfDay.toISOString())
                    .lte('end_time', endOfDay.toISOString());

                if (error) throw error;
                
                const dayOfWeek = startOfDay.getDay();
                let startHour: number, endHour: number;

                if (clinic.operating_schedule && clinic.operating_schedule.length === 7) {
                    const daySchedule = clinic.operating_schedule[dayOfWeek];
                    if (!daySchedule || !daySchedule.active) {
                        setAvailableSlots([]);
                        setSlotsLoading(false);
                        return;
                    }
                    startHour = parseInt(daySchedule.start.split(':')[0]);
                    endHour = parseInt(daySchedule.end.split(':')[0]);
                } else {
                    const operatingDays = clinic.operating_days || [1, 2, 3, 4, 5]; 
                    if (!operatingDays.includes(dayOfWeek)) {
                        setAvailableSlots([]);
                        setSlotsLoading(false);
                        return;
                    }
                    startHour = parseInt((clinic.operating_hours_start || '09:00').split(':')[0]);
                    endHour = parseInt((clinic.operating_hours_end || '18:00').split(':')[0]);
                }
                
                const slots = [];
                for (let hour = startHour; hour < endHour; hour++) {
                    const slotStart = new Date(startOfDay);
                    slotStart.setHours(hour, 0, 0, 0);

                    const isBooked = existingAppointments.some(appt => {
                        const apptStart = new Date(appt.start_time);
                        return apptStart.getHours() === hour;
                    });

                    if (!isBooked) {
                        slots.push(slotStart.toTimeString().substring(0, 5));
                    }
                }
                setAvailableSlots(slots);
            } catch (err: any) {
                setError('Error al cargar horarios disponibles.');
            } finally {
                setSlotsLoading(false);
            }
        };
        fetchAvailableSlots();
    }, [selectedNutritionistId, selectedDate, clinic]);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedSlot) {
            setError('Por favor, selecciona un horario.');
            return;
        }
        if (!person) {
            setError('Error: no se ha identificado al paciente.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const startTime = new Date(`${selectedDate}T${selectedSlot}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60000); 
            
            const payload = {
                person_id: person.id,
                user_id: selectedNutritionistId,
                clinic_id: person.clinic_id,
                title: `Solicitud de ${person.full_name}`,
                notes,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'pending-approval'
            };

            const { error: dbError } = await supabase.from('appointments').insert(payload);
            if (dbError) throw dbError;

            setSuccess('Solicitud enviada. Te notificaremos cuando sea aprobada.');
            
            fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: selectedNutritionistId,
                  title: 'Nueva Solicitud de Cita',
                  body: `El paciente ${person.full_name} ha solicitado una nueva cita.`
                })
            }).catch(err => console.error("Failed to send notification:", err));

            setTimeout(() => onSave(), 2500);
        } catch (err: any) {
            setError(`Error al enviar solicitud: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;
    
    // Touch-friendly input styles for better mobile UX
    const touchInputStyle = {
        ...styles.input,
        padding: '1rem', // Increased padding for touch
        fontSize: '1.1rem', // Larger font
        borderRadius: '12px',
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)',
        height: 'auto',
        marginBottom: 0
    };

    return createPortal(
        <div style={{...styles.modalOverlay, zIndex: 1300}}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px', borderRadius: '20px', maxHeight: '95vh', display: 'flex', flexDirection: 'column'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Solicitar Cita</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, flex: 1, overflowY: 'auto', paddingTop: '1.5rem'}}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <div style={{marginBottom: '1.5rem'}}>
                        <label htmlFor="nutritionist" style={{...styles.label, fontSize: '0.9rem', marginBottom: '0.5rem'}}>Especialista</label>
                        <select id="nutritionist" value={selectedNutritionistId} onChange={e => setSelectedNutritionistId(e.target.value)} required style={touchInputStyle}>
                            {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                        </select>
                    </div>

                    <div style={{marginBottom: '1.5rem'}}>
                        <label htmlFor="date" style={{...styles.label, fontSize: '0.9rem', marginBottom: '0.5rem'}}>Fecha Deseada</label>
                        <input type="date" id="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} style={touchInputStyle}/>
                    </div>

                    <label style={{...styles.label, marginBottom: '0.75rem', fontSize: '0.9rem'}}>Horarios Disponibles</label>
                    {slotsLoading ? <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-light)'}}>Buscando espacios...</div> : (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem'}}>
                            {availableSlots.length > 0 ? availableSlots.map(slot => (
                                <button
                                    type="button"
                                    key={slot}
                                    onClick={() => setSelectedSlot(slot)}
                                    style={{
                                        padding: '1rem 0.5rem', // Larger touch target
                                        borderRadius: '12px',
                                        border: `2px solid ${selectedSlot === slot ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                        backgroundColor: selectedSlot === slot ? 'var(--primary-light)' : 'var(--surface-color)',
                                        color: selectedSlot === slot ? 'var(--primary-dark)' : 'var(--text-color)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '1.1rem',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                >{slot}</button>
                            )) : <div style={{gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-light)', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px'}}>No hay horarios disponibles para este día.</div>}
                        </div>
                    )}
                    
                    <label htmlFor="notes" style={{...styles.label, fontSize: '0.9rem', marginBottom: '0.5rem'}}>Motivo (opcional)</label>
                    <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Revisión mensual..." style={{...touchInputStyle, resize: 'none'}} />
                </div>
                <div style={{...styles.modalFooter, padding: '1.5rem', backgroundColor: 'var(--surface-color)'}}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading} style={{padding: '1rem', borderRadius: '12px', flex: 1}}>Cancelar</button>
                    <button type="submit" disabled={loading || !selectedSlot} className="button-primary" style={{padding: '1rem', borderRadius: '12px', flex: 2, fontSize: '1rem', fontWeight: 700}}>{loading ? 'Enviando...' : 'Enviar Solicitud'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default AppointmentRequestModal;
