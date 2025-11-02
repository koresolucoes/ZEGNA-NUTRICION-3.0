import React, { FC, useState, useEffect, useCallback, useMemo, useRef, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { AppointmentWithPerson, Person, TeamMember, Appointment, Clinic, PatientServicePlan } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import { createPortal } from 'react-dom';
import AppointmentFormModal from '../components/forms/AppointmentFormModal';
import DayAppointmentsModal from '../components/agenda/DayAppointmentsModal';

const modalRoot = document.getElementById('modal-root');

// --- Helper Functions ---
const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
const areDatesEqual = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

// --- Main Page Component ---
const AgendaPage: FC<{ user: User; isMobile: boolean }> = ({ user, isMobile }) => {
    const { clinic, role } = useClinic();
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>(isMobile ? 'month' : 'week');
    
    // Data states
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI states
    const [selectedNutritionist, setSelectedNutritionist] = useState(role === 'admin' ? 'all' : user.id);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        appointmentToEdit: AppointmentWithPerson | null;
        initialSlot?: { start: Date; end: Date };
    }>({ isOpen: false, appointmentToEdit: null });
    const [dayModalState, setDayModalState] = useState<{
        isOpen: boolean;
        date: Date | null;
        appointments: AppointmentWithPerson[];
    }>({ isOpen: false, date: null, appointments: [] });

    const fetchAgendaData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const [personsRes, teamRes, plansRes] = await Promise.all([
                supabase.from('persons').select('*').eq('clinic_id', clinic.id).order('full_name'),
                supabase.from('team_members_with_profiles').select('*').eq('clinic_id', clinic.id),
                supabase.from('patient_service_plans').select('*').eq('clinic_id', clinic.id),
            ]);
            if (personsRes.error) throw personsRes.error;
            if (teamRes.error) throw teamRes.error;
            if (plansRes.error) throw plansRes.error;

            setPersons(personsRes.data || []);
            setTeamMembers(teamRes.data || []);
            setServicePlans(plansRes.data || []);

            // FIX: Added `person_type` to the select statement to match the `AppointmentWithPerson` type definition and prevent type errors.
            let query = supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('clinic_id', clinic.id);
            if (selectedNutritionist !== 'all') {
                query = query.eq('user_id', selectedNutritionist);
            }
            // Fetch pending approvals as well
            const { data, error: appointmentsError } = await query
                .in('status', ['scheduled', 'checked-in', 'called', 'in-consultation', 'pending-approval'])
                .order('start_time');

            if (appointmentsError) throw appointmentsError;
            setAppointments(data as AppointmentWithPerson[] || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic, selectedNutritionist]);

    useEffect(() => {
        if (!clinic) return; // Guard: Don't run effect if clinic isn't loaded
        
        fetchAgendaData();

        const channel = supabase.channel('appointments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` }, 
            payload => {
                console.log('Change received in appointments table!', payload);
                fetchAgendaData();
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Realtime subscription started for AgendaPage.`);
                }
                 if (status === 'CLOSED') {
                    console.log(`Realtime subscription closed for AgendaPage.`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Realtime subscription error on AgendaPage:`, err);
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [fetchAgendaData, clinic]);
    
    // --- Event Handlers ---
    const handleDateChange = (amount: number) => {
        const newDate = new Date(viewDate);
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else newDate.setDate(newDate.getDate() + (amount * 7));
        setViewDate(newDate);
    };

    const handleOpenModal = (appointment: AppointmentWithPerson | null, initialSlot?: { start: Date, end: Date }) => {
        setModalState({ isOpen: true, appointmentToEdit: appointment, initialSlot });
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, appointmentToEdit: null, initialSlot: undefined });
    };

    const handleSaveAppointment = async (formData: any) => {
        if (!clinic) return;
        try {
            const payload = {
                clinic_id: clinic.id,
                user_id: formData.user_id,
                person_id: formData.person_id || null,
                title: formData.title,
                notes: formData.notes,
                status: formData.status,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
            };
    
            // --- GAMIFICATION LOGIC ---
            const wasCompleted = modalState.appointmentToEdit?.status === 'completed';
            const isNowCompleted = formData.status === 'completed';
    
            if (formData.id && !wasCompleted && isNowCompleted && formData.person_id) {
                const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                    p_person_id: formData.person_id,
                    p_appointment_id: formData.id
                });
                if (rpcError) console.warn('Could not award points on appointment completion from Agenda:', rpcError.message);
            }
            // --- END GAMIFICATION ---
    
            if (formData.id) { // Update
                const { error } = await supabase.from('appointments').update(payload).eq('id', formData.id);
                if (error) throw error;
            } else { // Insert
                const { data, error } = await supabase.from('appointments').insert(payload).select().single();
                if (error) throw error;
                // If a new appointment is somehow marked as completed right away
                if (data && isNowCompleted && data.person_id) {
                     const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                        p_person_id: data.person_id,
                        p_appointment_id: data.id
                    });
                    if (rpcError) console.warn('Could not award points on new completed appointment:', rpcError.message);
                }
            }
            handleCloseModal();
            // Data will refetch via realtime subscription
        } catch (err: any) {
            console.error("Error saving appointment:", err);
            // You can set an error state in the modal here
        }
    };
    
    const handleDeleteAppointment = async (appointmentId: string) => {
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
            if (error) throw error;
            handleCloseModal();
        } catch (err: any) {
            console.error("Error deleting appointment:", err);
        }
    };
    
    const handleDayClick = (date: Date, appointments: AppointmentWithPerson[]) => {
        setDayModalState({ isOpen: true, date, appointments });
    };

    const handleCloseDayModal = () => {
        setDayModalState({ isOpen: false, date: null, appointments: [] });
    };

    const handleEditFromDayModal = (appointment: AppointmentWithPerson) => {
        handleCloseDayModal();
        handleOpenModal(appointment);
    };

    const handleAddFromDayModal = (slot: { start: Date; end: Date }) => {
        handleCloseDayModal();
        handleOpenModal(null, slot);
    };


    const Header: FC = () => {
        const title = viewMode === 'month' 
            ? viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            : `Semana del ${new Date(viewDate.setDate(viewDate.getDate() - viewDate.getDay() + 1)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

        return (
            <div style={{...styles.filterBar, justifyContent: 'space-between', flexWrap: 'nowrap'}}>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    <button onClick={() => handleDateChange(-1)} className="button-secondary" style={{padding: '0.5rem'}}>{"<"}</button>
                    <button onClick={() => setViewDate(new Date())} className="button-secondary" style={{padding: '0.5rem 1rem'}}>Hoy</button>
                    <button onClick={() => handleDateChange(1)} className="button-secondary" style={{padding: '0.5rem'}}>{">"}</button>
                    <h2 style={{margin: '0 0 0 1rem', fontSize: '1.5rem', textTransform: 'capitalize'}}>{title}</h2>
                </div>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                    {role === 'admin' && !isMobile && (
                        <select value={selectedNutritionist} onChange={e => setSelectedNutritionist(e.target.value)} style={{marginBottom: 0}}>
                            <option value="all">Toda la clínica</option>
                            {teamMembers.map(m => <option key={m.user_id} value={m.user_id!}>{m.full_name}</option>)}
                        </select>
                    )}
                    <div style={styles.filterButtonGroup}>
                        <button onClick={() => setViewMode('month')} className={`filter-button ${viewMode === 'month' ? 'active' : ''}`}>Mes</button>
                        <button onClick={() => setViewMode('week')} className={`filter-button ${viewMode === 'week' ? 'active' : ''}`}>Semana</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in">
            {modalState.isOpen && modalRoot && createPortal(
                <AppointmentFormModal 
                    isOpen={modalState.isOpen}
                    onClose={handleCloseModal} 
                    onSave={handleSaveAppointment}
                    onDelete={handleDeleteAppointment}
                    appointmentToEdit={modalState.appointmentToEdit}
                    initialSlot={modalState.initialSlot}
                    personsList={persons}
                    servicePlans={servicePlans}
                    currentUser={user}
                    teamMembers={teamMembers}
                    isCurrentUserAdmin={role === 'admin'}
                />, modalRoot
            )}
            {dayModalState.isOpen && modalRoot && createPortal(
                <DayAppointmentsModal
                    isOpen={dayModalState.isOpen}
                    onClose={handleCloseDayModal}
                    date={dayModalState.date!}
                    appointments={dayModalState.appointments}
                    onEditAppointment={handleEditFromDayModal}
                    onAddAppointment={handleAddFromDayModal}
                    teamMembers={teamMembers}
                />,
                modalRoot
            )}
            <div style={{...styles.pageHeader, paddingBottom: 0, borderBottom: 'none'}}>
                <h1>Agenda</h1>
                <button onClick={() => handleOpenModal(null, { start: new Date(), end: new Date(new Date().getTime() + 60 * 60000) })}>{ICONS.add} Nueva Cita</button>
            </div>
            <Header />
            {loading && <p>Cargando agenda...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                viewMode === 'month' 
                ? <MonthView clinic={clinic} viewDate={viewDate} appointments={appointments} onDayClick={handleDayClick} /> 
                : <WeekView clinic={clinic} viewDate={viewDate} appointments={appointments} onOpenModal={handleOpenModal} isMobile={isMobile} />
            )}
        </div>
    );
};


// --- Sub-components for AgendaPage ---

const MonthView: FC<{ clinic: Clinic | null; viewDate: Date; appointments: AppointmentWithPerson[]; onDayClick: (date: Date, appointments: AppointmentWithPerson[]) => void }> = ({ clinic, viewDate, appointments, onDayClick }) => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const today = new Date();
    
    const calendarDays = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const operatingDays = clinic?.operating_days || [1,2,3,4,5];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            {dayNames.map(day => <div key={day} style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600, backgroundColor: 'var(--surface-hover-color)', borderBottom: '1px solid var(--border-color)' }}>{day}</div>)}
            {calendarDays.map((day, index) => {
                const date = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) : null;
                const dayOfWeek = date ? date.getDay() : -1;
                const isOperatingDay = operatingDays.includes(dayOfWeek);
                const isToday = date ? areDatesEqual(date, today) : false;
                const appointmentsForDay = date ? appointments.filter(a => areDatesEqual(new Date(a.start_time), date)) : [];
                return (
                    <div key={index} style={{ 
                        minHeight: '120px', 
                        borderRight: '1px solid var(--border-color)', 
                        borderTop: '1px solid var(--border-color)', 
                        padding: '0.5rem', 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: isOperatingDay ? 'transparent' : 'rgba(128, 128, 128, 0.05)',
                    }}>
                        <span style={{ fontWeight: 'bold', color: isToday ? 'var(--primary-color)' : 'var(--text-color)' }}>{day}</span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '0.5rem' }}>
                            {appointmentsForDay.length > 0 && (
                                <button
                                    onClick={() => onDayClick(date!, appointmentsForDay)} 
                                    style={{
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        border: '2px solid var(--surface-color)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        padding: 0,
                                        transition: 'transform 0.1s ease'
                                    }}
                                    className="nav-item-hover"
                                    title={`${appointmentsForDay.length} cita${appointmentsForDay.length > 1 ? 's' : ''}`}
                                >
                                    {appointmentsForDay.length}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const WeekView: FC<{ clinic: Clinic | null; viewDate: Date; appointments: AppointmentWithPerson[]; onOpenModal: (appt: AppointmentWithPerson | null, slot?: {start: Date, end: Date}) => void, isMobile: boolean }> = ({ clinic, viewDate, appointments, onOpenModal, isMobile }) => {
    const operatingDays = useMemo(() => clinic?.operating_days || [1, 2, 3, 4, 5], [clinic]);
    const startHour = useMemo(() => parseInt((clinic?.operating_hours_start || '09:00').split(':')[0]), [clinic]);
    const endHour = useMemo(() => parseInt((clinic?.operating_hours_end || '18:00').split(':')[0]), [clinic]);
    
    const visibleHours = useMemo(() => Array.from({ length: endHour - startHour }, (_, i) => startHour + i), [startHour, endHour]);
    
    const allWeekDates = useMemo(() => {
        const start = new Date(viewDate);
        start.setDate(start.getDate() - start.getDay()); // Start from Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [viewDate]);

    const visibleDays = useMemo(() => allWeekDates.filter(date => operatingDays.includes(date.getDay())), [allWeekDates, operatingDays]);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const hourHeight = 80; // 80px per hour slot for more space
    const totalDayMinutes = (endHour - startHour) * 60;
    const totalPixelHeight = visibleHours.length * hourHeight;

    if (visibleDays.length === 0) {
        return <div style={{padding: '2rem', textAlign: 'center'}}>La clínica no tiene días de funcionamiento configurados para esta semana.</div>;
    }

    return (
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', height: isMobile ? 'auto' : 'calc(100vh - 220px)', backgroundColor: 'var(--surface-color)' }}>
            <div style={{ borderRight: '1px solid var(--border-color)', flexShrink: 0, paddingTop: '50px' }}> {/* Time column */}
                {visibleHours.map(hour => <div key={hour} style={{ height: `${hourHeight}px`, textAlign: 'right', padding: '0 0.5rem', fontSize: '0.8rem', color: 'var(--text-light)', position: 'relative', top: '-8px' }}>{`${hour.toString().padStart(2, '0')}:00`}</div>)}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)`, overflowY: isMobile ? 'visible' : 'auto', position: 'relative' }}>
                {visibleDays.map((date, dayIndex) => {
                    const isToday = areDatesEqual(date, new Date());
                    let timeIndicatorTop = null;
                    if (isToday) {
                        const minutesFromStart = (currentTime.getHours() - startHour) * 60 + currentTime.getMinutes();
                        if (minutesFromStart >= 0 && minutesFromStart <= totalDayMinutes) {
                            timeIndicatorTop = (minutesFromStart / totalDayMinutes) * totalPixelHeight;
                        }
                    }

                    return (
                        <div key={dayIndex} style={{ 
                            borderRight: dayIndex < visibleDays.length - 1 ? '1px solid var(--border-color)' : 'none', 
                            position: 'relative',
                            backgroundColor: isToday ? 'var(--surface-hover-color)' : 'transparent'
                        }}>
                            <div style={{ 
                                padding: '0.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', 
                                position: 'sticky', top: 0, backgroundColor: 'var(--surface-color)', zIndex: 10, height: '50px',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            }}>
                                <div style={{ textTransform: 'capitalize', fontSize: '0.8rem', lineHeight: 1.1, color: 'var(--text-light)' }}>{date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</div>
                                <div style={{ fontSize: '1.5rem', color: isToday ? 'var(--primary-color)' : 'var(--text-color)', lineHeight: 1.1 }}>{date.getDate()}</div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                {visibleHours.map(hour => (
                                    <React.Fragment key={hour}>
                                        <div onClick={() => { const start = new Date(date); start.setHours(hour, 0, 0); const end = new Date(start.getTime() + 60 * 60000); onOpenModal(null, { start, end }); }} style={{ height: `${hourHeight / 2}px`, borderBottom: '1px dotted var(--border-color)', cursor: 'pointer' }}></div>
                                        <div onClick={() => { const start = new Date(date); start.setHours(hour, 30, 0); const end = new Date(start.getTime() + 60 * 60000); onOpenModal(null, { start, end }); }} style={{ height: `${hourHeight / 2}px`, borderBottom: '1px solid var(--border-color)' }}></div>
                                    </React.Fragment>
                                ))}
                                {timeIndicatorTop !== null && (
                                    <div style={{ position: 'absolute', top: `${timeIndicatorTop}px`, left: 0, right: 0, height: '2px', backgroundColor: 'var(--error-color)', zIndex: 20 }}>
                                        <div style={{ position: 'absolute', left: '-5px', top: '-5px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--error-color)'}}></div>
                                    </div>
                                )}
                                {appointments
                                    .filter(a => areDatesEqual(new Date(a.start_time), date))
                                    .map(appt => {
                                        const start = new Date(appt.start_time);
                                        const end = new Date(appt.end_time);
                                        if (start.getHours() < startHour || start.getHours() >= endHour) return null;

                                        const topOffsetMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
                                        const top = (topOffsetMinutes / totalDayMinutes) * totalPixelHeight;
                                        const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                        const height = Math.max((duration / totalDayMinutes) * totalPixelHeight - 2, 20); // Min height, with 2px margin
                                        
                                        const isPending = appt.status === 'pending-approval';
                                        return (
                                            <div key={appt.id} onClick={() => onOpenModal(appt)} title={`${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${appt.title}`} style={{
                                                position: 'absolute', top: `${top}px`, left: '5px', right: '5px', height: `${height}px`,
                                                backgroundColor: isPending ? 'rgba(234, 179, 8, 0.15)' : 'var(--primary-light)', 
                                                color: isPending ? '#EAB308' : 'var(--primary-dark)',
                                                borderLeft: `4px solid ${isPending ? '#EAB308' : 'var(--primary-color)'}`,
                                                borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer',
                                                overflow: 'hidden', zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                            }}>
                                                <p style={{margin: 0, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} {appt.persons?.full_name || appt.title}</p>
                                                {isPending && <p style={{margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic'}}>{ICONS.clock} <span>Pendiente</span></p>}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgendaPage;