
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { AppointmentWithPerson, Person, TeamMember, PatientServicePlan } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

const modalRoot = document.getElementById('modal-root');

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
};

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    appointmentToEdit: AppointmentWithPerson | null;
    initialSlot?: { start: Date, end: Date };
    personsList?: Person[]; // Optional: if not provided, fetch inside
    servicePlans?: PatientServicePlan[];
    personId?: string; // Optional: to pre-select a person
    currentUser: User;
    teamMembers: TeamMember[];
    isCurrentUserAdmin: boolean;
}

const AppointmentFormModal: FC<AppointmentModalProps> = ({ 
    isOpen, onClose, onSave, onDelete, appointmentToEdit, initialSlot, 
    personsList, servicePlans = [], personId, currentUser, teamMembers, isCurrentUserAdmin 
}) => {
    const { clinic } = useClinic();
    const [persons, setPersons] = useState<Person[]>(personsList || []);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [planWarning, setPlanWarning] = useState<string | null>(null);
    const [durationInMinutes, setDurationInMinutes] = useState<number>(60);
    const [consultationLimitReached, setConsultationLimitReached] = useState(false);

    const [formData, setFormData] = useState({
        id: '', title: '', person_id: personId || '', user_id: currentUser.id,
        start_time: toLocalISOString(new Date()), end_time: toLocalISOString(new Date(new Date().getTime() + 60*60000)),
        status: 'scheduled', notes: ''
    });
    
    useEffect(() => {
        if (!personsList) {
            const fetchPersons = async () => {
                if (!clinic) return;
                const { data } = await supabase.from('persons').select('*').eq('clinic_id', clinic.id);
                setPersons(data || []);
            };
            fetchPersons();
        }
    }, [personsList, clinic]);

    useEffect(() => {
        if (appointmentToEdit) {
            const initialDuration = (new Date(appointmentToEdit.end_time).getTime() - new Date(appointmentToEdit.start_time).getTime()) / 60000;
            setDurationInMinutes(initialDuration > 0 ? initialDuration : 60);
            setFormData({
                id: appointmentToEdit.id,
                title: appointmentToEdit.title || '',
                person_id: appointmentToEdit.person_id || '',
                user_id: appointmentToEdit.user_id,
                start_time: toLocalISOString(new Date(appointmentToEdit.start_time)),
                end_time: toLocalISOString(new Date(appointmentToEdit.end_time)),
                status: appointmentToEdit.status,
                notes: appointmentToEdit.notes || ''
            });
        } else if (initialSlot) {
            const initialDuration = (initialSlot.end.getTime() - initialSlot.start.getTime()) / 60000;
            setDurationInMinutes(initialDuration > 0 ? initialDuration : 60);
            const personForSlot = persons.find(p => p.id === personId);
            setFormData(prev => ({
                ...prev, id: '', 
                title: personForSlot ? `Consulta ${personForSlot.full_name}` : '', 
                person_id: personId || '', 
                user_id: isCurrentUserAdmin ? (teamMembers[0]?.user_id || currentUser.id) : currentUser.id,
                start_time: toLocalISOString(initialSlot.start),
                end_time: toLocalISOString(initialSlot.end),
                status: 'scheduled', notes: ''
            }));
        } else {
            setDurationInMinutes(60);
            const defaultStartTime = new Date();
            const defaultEndTime = new Date(defaultStartTime.getTime() + 60 * 60000);
            const personForNew = persons.find(p => p.id === personId);
            setFormData({
                id: '',
                title: personForNew ? `Consulta ${personForNew.full_name}` : '',
                person_id: personId || '',
                user_id: isCurrentUserAdmin ? (teamMembers[0]?.user_id || currentUser.id) : currentUser.id,
                start_time: toLocalISOString(defaultStartTime),
                end_time: toLocalISOString(defaultEndTime),
                status: 'scheduled',
                notes: ''
            });
        }
    }, [appointmentToEdit, initialSlot, currentUser.id, personId, persons, isCurrentUserAdmin, teamMembers]);
    
    useEffect(() => {
        if (formData.start_time) {
            const startDate = new Date(formData.start_time);
            const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
            setFormData(prev => ({ ...prev, end_time: toLocalISOString(endDate) }));
        }
    }, [formData.start_time, durationInMinutes]);
    
    useEffect(() => {
        const checkConsultationLimit = async () => {
            setPlanWarning(null);
            setConsultationLimitReached(false);
            if (!formData.person_id) return;

            const person = persons.find(p => p.id === formData.person_id);
            if (!person || !person.current_plan_id || !person.subscription_start_date || !person.subscription_end_date) return;

            const plan = servicePlans.find(p => p.id === person.current_plan_id);
            if (!plan || !plan.max_consultations || plan.max_consultations === 0) return;

            const { count, error } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('person_id', person.id)
                .in('status', ['scheduled', 'completed', 'in-consultation', 'called', 'checked-in'])
                .gte('start_time', person.subscription_start_date)
                .lte('start_time', person.subscription_end_date);

            if (error) { console.error("Error counting appointments:", error); return; }
            
            const isCreatingNew = !formData.id;
            const isApproving = formData.status === 'pending-approval';
            
            // Limit is only enforced when creating a new appointment or approving a pending one.
            // Editing an existing 'scheduled' appointment is allowed.
            if (count !== null && count >= plan.max_consultations) {
                const warningMsg = `Advertencia: El paciente ha utilizado ${count} de ${plan.max_consultations} citas de su plan.`;
                if (isCreatingNew || isApproving) {
                    setPlanWarning(`${warningMsg} No se pueden agendar más.`);
                    setConsultationLimitReached(true);
                } else {
                     setPlanWarning(warningMsg);
                }
            } else if (count !== null) {
                setPlanWarning(`El paciente ha utilizado ${count} de ${plan.max_consultations} citas de su plan.`);
            }
        };

        checkConsultationLimit();
    }, [formData.id, formData.person_id, formData.status, persons, servicePlans]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'person_id' && (!prev.title || prev.title.startsWith('Consulta'))) {
                const person = persons.find(p => p.id === value);
                newState.title = person ? `Consulta ${person.full_name}` : '';
            }
            return newState;
        });
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        try {
            const wasPending = appointmentToEdit?.status === 'pending-approval';
            const isNowScheduled = formData.status === 'scheduled';
            const isNewAppointment = !formData.id;

            await onSave(formData);
            
            // After successfully saving, check if we need to send a notification
            if ((wasPending && isNowScheduled) || (isNewAppointment && isNowScheduled)) {
                const person = persons.find(p => p.id === formData.person_id);
                if (person && person.user_id) {
                     fetch('/api/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: person.user_id,
                          title: 'Cita Confirmada',
                          body: `Tu cita "${formData.title}" para el ${new Date(formData.start_time).toLocaleDateString('es-MX')} a las ${new Date(formData.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ha sido confirmada.`
                        })
                    }).catch(err => console.error("Failed to send notification:", err));
                }
            }
        } catch(err: any) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async () => {
        setLoading(true);
        setFormError(null);
        try {
            await onDelete(formData.id);
        } catch(err: any) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = async () => {
        setLoading(true);
        setFormError(null);
        try {
            const updatedFormData = { ...formData, status: 'scheduled' };
            await onSave(updatedFormData);

            // Send notification after successful approval
            const person = persons.find(p => p.id === formData.person_id);
            if (person && person.user_id) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: person.user_id,
                      title: 'Cita Confirmada',
                      body: `Tu solicitud de cita para "${formData.title}" ha sido confirmada.`
                    })
                }).catch(err => console.error("Failed to send notification:", err));
            }

        } catch(err: any) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen || !modalRoot) return null;

    const isPending = formData.status === 'pending-approval';
    const isNewAppointment = !formData.id;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{formData.id ? 'Editar Cita' : 'Nueva Cita'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {formError && <p style={styles.error}>{formError}</p>}
                    {planWarning && <p style={{...styles.error, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', borderColor: '#EAB308'}}>{planWarning}</p>}
                    {isPending && (
                        <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid #EAB308', borderRadius: '8px', color: '#EAB308', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                           {ICONS.clock} Esta cita es una solicitud pendiente de aprobación.
                        </div>
                    )}
                    <label>Título</label><input name="title" value={formData.title} onChange={handleChange} required />
                    <label>Paciente / Afiliado</label>
                    <select name="person_id" value={formData.person_id} onChange={handleChange}>
                        <option value="">-- Cita sin paciente --</option>
                        {persons.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                    {isCurrentUserAdmin && (
                        <><label>Asignado a</label>
                        <select name="user_id" value={formData.user_id} onChange={handleChange}>
                            {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                        </select></>
                    )}
                    
                    <label>Inicio</label>
                    <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} style={{marginBottom: '1rem'}} />

                    <label>Duración</label>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem'}}>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            {[30, 60, 120].map(mins => (
                                <button
                                    type="button"
                                    key={mins}
                                    onClick={() => setDurationInMinutes(mins)}
                                    className={`filter-button ${durationInMinutes === mins ? 'active' : ''}`}
                                >
                                    {mins === 60 ? '1 hr' : mins === 120 ? '2 hr' : `${mins} min`}
                                </button>
                            ))}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1}}>
                            <input
                                type="number"
                                value={durationInMinutes}
                                onChange={(e) => setDurationInMinutes(parseInt(e.target.value, 10) || 0)}
                                style={{margin: 0, width: '80px', textAlign: 'center'}}
                            />
                            <span>minutos</span>
                        </div>
                    </div>

                    <label>Estado</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                        <option value="pending-approval">Pendiente Aprobación</option>
                        <option value="scheduled">Agendada</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option><option value="no-show">No se presentó</option>
                    </select>
                    <label>Notas</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}></textarea>
                </div>
                <div style={{...styles.modalFooter, justifyContent: 'space-between'}}>
                    <div>{formData.id && <button type="button" onClick={handleDelete} className="button-danger" disabled={loading}>Eliminar Cita</button>}</div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                        {isPending && <button type="button" onClick={handleApprove} disabled={loading || consultationLimitReached}>Aprobar Cita</button>}
                        <button type="submit" disabled={loading || ((isNewAppointment || isPending) && consultationLimitReached)}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                    </div>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default AppointmentFormModal;
