
import React, { FC, useState, useEffect, FormEvent, useMemo, useRef } from 'react';
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

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

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
            // Pre-fill search term if editing
            if (appointmentToEdit.persons) {
                setSearchTerm(appointmentToEdit.persons.full_name);
            }
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
            if (personForSlot) setSearchTerm(personForSlot.full_name);
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
            if (personForNew) setSearchTerm(personForNew.full_name);
        }
    }, [appointmentToEdit, initialSlot, currentUser.id, personId, persons, isCurrentUserAdmin, teamMembers]);
    
    useEffect(() => {
        if (formData.start_time) {
            const startDate = new Date(formData.start_time);
            const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
            setFormData(prev => ({ ...prev, end_time: toLocalISOString(endDate) }));
        }
    }, [formData.start_time, durationInMinutes]);

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
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

    const filteredPersons = useMemo(() => {
        if (!searchTerm) return persons;
        const lowerTerm = searchTerm.toLowerCase();
        return persons.filter(p => 
            p.full_name.toLowerCase().includes(lowerTerm) || 
            p.folio?.toLowerCase().includes(lowerTerm)
        );
    }, [persons, searchTerm]);

    const handlePersonSelect = (person: Person) => {
        setFormData(prev => ({
            ...prev,
            person_id: person.id,
            title: (!prev.title || prev.title.startsWith('Consulta')) ? `Consulta ${person.full_name}` : prev.title
        }));
        setSearchTerm(person.full_name);
        setIsDropdownOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    // Modern Styling
    const modernInputStyle = {
        ...styles.input,
        backgroundColor: 'var(--surface-hover-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '0.8rem 1rem',
        fontSize: '0.95rem',
        marginBottom: '0',
        transition: 'all 0.2s'
    };

    const labelStyle = {
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-color)',
        marginBottom: '0.4rem',
        display: 'block'
    };

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '550px', borderRadius: '20px', padding: 0}}>
                <div style={{...styles.modalHeader, padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)'}}>
                    <div>
                        <h2 style={{...styles.modalTitle, fontSize: '1.3rem'}}>{formData.id ? 'Editar Cita' : 'Nueva Cita'}</h2>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                            {formData.id ? 'Modifica los detalles del evento' : 'Programa un nuevo espacio en la agenda'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>
                
                <div style={{...styles.modalBody, padding: '2rem'}}>
                    {formError && <p style={styles.error}>{formError}</p>}
                    {planWarning && <div style={{padding: '0.75rem 1rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#B45309', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(234, 179, 8, 0.3)'}}>⚠️ {planWarning}</div>}
                    {isPending && (
                        <div style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3B82F6', borderRadius: '8px', color: '#1D4ED8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'}}>
                           {ICONS.clock} Solicitud pendiente de aprobación por el paciente.
                        </div>
                    )}

                    <div style={{marginBottom: '1.5rem'}}>
                        <label style={labelStyle}>Paciente / Afiliado</label>
                        <div ref={searchContainerRef} style={{position: 'relative'}}>
                            <div style={{display: 'flex', alignItems: 'center', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none'}}>
                                {ICONS.user}
                            </div>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Buscar paciente por nombre o folio..."
                                style={{...modernInputStyle, paddingLeft: '2.8rem'}}
                            />
                            {isDropdownOpen && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                    backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)',
                                    borderRadius: '10px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {filteredPersons.length > 0 ? (
                                        filteredPersons.map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => handlePersonSelect(p)}
                                                className="nav-item-hover"
                                                style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem'}}
                                            >
                                                <div style={{fontWeight: 500}}>{p.full_name}</div>
                                                {p.folio && <div style={{fontSize: '0.75rem', color: 'var(--text-light)'}}>{p.folio}</div>}
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{padding: '1rem', color: 'var(--text-light)', fontSize: '0.9rem', textAlign: 'center'}}>No se encontraron pacientes.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{marginBottom: '1.5rem'}}>
                        <label style={labelStyle}>Título de la Cita</label>
                        <input name="title" value={formData.title} onChange={handleChange} required style={modernInputStyle} placeholder="Ej: Consulta de Seguimiento" />
                    </div>
                    
                    {isCurrentUserAdmin && (
                        <div style={{marginBottom: '1.5rem'}}>
                            <label style={labelStyle}>Asignar a Especialista</label>
                            <select name="user_id" value={formData.user_id} onChange={handleChange} style={modernInputStyle}>
                                {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                        <div>
                            <label style={labelStyle}>Fecha y Hora de Inicio</label>
                            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} style={modernInputStyle} />
                        </div>
                         <div>
                            <label style={labelStyle}>Estado</label>
                            <select name="status" value={formData.status} onChange={handleChange} style={modernInputStyle}>
                                <option value="scheduled">Agendada</option>
                                <option value="pending-approval">Pendiente</option>
                                <option value="completed">Completada</option>
                                <option value="cancelled">Cancelada</option>
                                <option value="no-show">No se presentó</option>
                            </select>
                        </div>
                    </div>

                    <div style={{marginBottom: '1.5rem'}}>
                        <label style={labelStyle}>Duración</label>
                        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                            {[30, 45, 60, 90].map(mins => (
                                <button
                                    type="button"
                                    key={mins}
                                    onClick={() => setDurationInMinutes(mins)}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        border: durationInMinutes === mins ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        backgroundColor: durationInMinutes === mins ? 'var(--primary-light)' : 'transparent',
                                        color: durationInMinutes === mins ? 'var(--primary-color)' : 'var(--text-color)',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {mins} min
                                </button>
                            ))}
                             <div style={{position: 'relative', width: '80px'}}>
                                <input
                                    type="number"
                                    value={durationInMinutes}
                                    onChange={(e) => setDurationInMinutes(parseInt(e.target.value, 10) || 0)}
                                    style={{...modernInputStyle, textAlign: 'center', paddingRight: '0.5rem'}}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Notas Internas</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} style={{...modernInputStyle, resize: 'vertical'}} placeholder="Detalles adicionales sobre la cita..."></textarea>
                    </div>
                </div>

                <div style={{...styles.modalFooter, backgroundColor: 'var(--surface-color)', padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)'}}>
                    <div style={{marginRight: 'auto'}}>
                         {formData.id && <button type="button" onClick={handleDelete} className="button-danger" disabled={loading} style={{backgroundColor: 'transparent', color: 'var(--error-color)', border: '1px solid var(--error-bg)', padding: '0.7rem 1rem'}}>{ICONS.delete}</button>}
                    </div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button type="button" onClick={onClose} className="button-secondary" disabled={loading} style={{padding: '0.7rem 1.5rem'}}>Cancelar</button>
                        {isPending && <button type="button" onClick={handleApprove} disabled={loading || consultationLimitReached} style={{backgroundColor: '#EAB308', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontWeight: 600, cursor: 'pointer'}}>Aprobar</button>}
                        <button type="submit" disabled={loading || ((isNewAppointment || isPending) && consultationLimitReached)} className="button-primary" style={{padding: '0.7rem 1.5rem'}}>
                            {loading ? 'Guardando...' : 'Guardar Cita'}
                        </button>
                    </div>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default AppointmentFormModal;
