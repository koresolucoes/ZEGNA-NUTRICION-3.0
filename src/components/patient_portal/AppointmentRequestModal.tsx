

import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, TeamMember, Appointment, Clinic } from '../../types';

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
                setClinic(data);
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

                // Use new flexible schedule if available, otherwise fallback
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
                    // Fallback to old system
                    const operatingDays = clinic.operating_days || [1, 2, 3, 4, 5]; // Default Mon-Fri
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
            setError('Error: no se ha identificado al paciente. Por favor, recarga la página.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const startTime = new Date(`${selectedDate}T${selectedSlot}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60000); // 1 hour duration
            
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

            setSuccess('Tu solicitud de cita ha sido enviada. Recibirás una notificación cuando sea aprobada.');
            
            // Send notification to the selected nutritionist
            fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: selectedNutritionistId, // The user_id of the professional
                  title: 'Nueva Solicitud de Cita',
                  body: `El paciente ${person.full_name} ha solicitado una nueva cita. Revisa la agenda para aprobarla.`
                })
            }).catch(err => console.error("Failed to send notification:", err));

            setTimeout(onSave, 3000);
        } catch (err: any) {
            setError(`Error al enviar solicitud: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Solicitar Cita</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <label htmlFor="nutritionist">Seleccionar Profesional</label>
                    <select id="nutritionist" value={selectedNutritionistId} onChange={e => setSelectedNutritionistId(e.target.value)} required>
                        {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                    </select>

                    <label htmlFor="date">Seleccionar Fecha</label>
                    <input type="date" id="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required min={new Date().toISOString().split('T')[0]}/>

                    <label>Horarios Disponibles</label>
                    {slotsLoading ? <p>Cargando horarios...</p> : (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', backgroundColor: 'var(--background-color)', borderRadius: '8px'}}>
                            {availableSlots.length > 0 ? availableSlots.map(slot => (
                                <button
                                    type="button"
                                    key={slot}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`filter-button ${selectedSlot === slot ? 'active' : ''}`}
                                >{slot}</button>
                            )) : <p style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-light)'}}>No hay horarios disponibles para este día.</p>}
                        </div>
                    )}
                    
                    <label htmlFor="notes">Motivo de la cita (opcional)</label>
                    <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Consulta de seguimiento, revisar nuevo plan, etc." />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !selectedSlot}>{loading ? 'Enviando...' : 'Enviar Solicitud'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default AppointmentRequestModal;