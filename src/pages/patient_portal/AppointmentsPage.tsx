
import React, { FC, useMemo, useState, useEffect } from 'react';
import { AppointmentWithPerson, Person, TeamMember, PatientServicePlan, ConsultationWithLabs } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import AppointmentRequestModal from '../../components/patient_portal/AppointmentRequestModal';
import { supabase } from '../../supabase';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

const appointmentStatusMap: { [key: string]: { text: string; color: string; bg: string; icon: React.ReactNode } } = {
    'pending-approval': { text: 'Pendiente', color: '#EAB308', bg: '#FEF9C3', icon: ICONS.clock },
    scheduled: { text: 'Confirmada', color: '#10B981', bg: '#D1FAE5', icon: ICONS.check },
    completed: { text: 'Completada', color: '#6B7280', bg: '#F3F4F6', icon: ICONS.check },
    cancelled: { text: 'Cancelada', color: '#EF4444', bg: '#FEE2E2', icon: ICONS.close },
    'no-show': { text: 'No Asistió', color: '#EF4444', bg: '#FEE2E2', icon: ICONS.close },
    'checked-in': { text: 'En Espera', color: '#3B82F6', bg: '#DBEAFE', icon: ICONS.activity },
    'in-consultation': { text: 'En Consulta', color: '#8B5CF6', bg: '#EDE9FE', icon: ICONS.activity },
    'called': { text: 'Llamando', color: '#F59E0B', bg: '#FEF3C7', icon: ICONS.activity },
};

const AppointmentsPage: FC<{ 
    appointments: AppointmentWithPerson[]; 
    person: Person;
    servicePlans: PatientServicePlan[];
    consultations: ConsultationWithLabs[]; 
    onDataRefresh: () => void; 
}> = ({ appointments, person, servicePlans, onDataRefresh }) => {
    
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentWithPerson | null>(null);
    const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentWithPerson | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

    useEffect(() => {
        const fetchTeam = async () => {
            if (person?.clinic_id) {
                const { data } = await supabase.from('team_members_with_profiles').select('*').eq('clinic_id', person.clinic_id);
                setTeamMembers(data || []);
            }
        };
        fetchTeam();
    }, [person]);

    const { usedConsultations, maxConsultations } = useMemo(() => {
        const plan = servicePlans.find(p => p.id === person.current_plan_id);
        if (plan && person.subscription_start_date && person.subscription_end_date) {
            const startDate = person.subscription_start_date;
            const endDate = person.subscription_end_date;
            const used = appointments.filter(a => {
                const isConsumingStatus = ['scheduled', 'completed', 'in-consultation', 'called', 'checked-in'].includes(a.status);
                if (!isConsumingStatus) return false;
                const apptDate = a.start_time.substring(0, 10);
                return apptDate >= startDate && apptDate <= endDate;
            }).length;
            return { usedConsultations: used, maxConsultations: plan.max_consultations };
        }
        return { usedConsultations: 0, maxConsultations: null };
    }, [person, servicePlans, appointments]);

    const consultationLimitReached = useMemo(() => {
        if (maxConsultations === null || maxConsultations === 0) return false;
        return usedConsultations >= maxConsultations;
    }, [usedConsultations, maxConsultations]);

    const { upcoming, past } = useMemo(() => {
        const upcomingList: AppointmentWithPerson[] = [];
        const pastList: AppointmentWithPerson[] = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        appointments.forEach(appt => {
            const apptDate = new Date(appt.start_time);
            if (apptDate >= todayStart && !['completed', 'cancelled', 'no-show'].includes(appt.status)) {
                 upcomingList.push(appt);
            } else {
                pastList.push(appt);
            }
        });
        return { 
            upcoming: upcomingList.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
            past: pastList.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        };
    }, [appointments]);

    const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.user_id, m])), [teamMembers]);

    const handleCancelAppointment = async () => {
        if (!appointmentToCancel) return;
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentToCancel.id);
        if (error) console.error('Error cancelling appointment:', error);
        else onDataRefresh();
        setAppointmentToCancel(null);
    };
    
    const handleRequestReschedule = (appt: AppointmentWithPerson) => {
        setAppointmentToReschedule(appt);
        setIsRequestModalOpen(true);
    };

    const handleSaveFromModal = async () => {
        if (appointmentToReschedule) {
            await supabase.from('appointments').update({ status: 'cancelled', notes: `Cancelada para reagendar. Nueva solicitud creada.` }).eq('id', appointmentToReschedule.id);
            setAppointmentToReschedule(null);
        }
        setIsRequestModalOpen(false);
        onDataRefresh();
    };

    const handleCloseRequestModal = () => {
        setIsRequestModalOpen(false);
        setAppointmentToReschedule(null);
    };

    // Ticket Card Component
    const AppointmentCard: FC<{ appt: AppointmentWithPerson; onCancel: (appt: AppointmentWithPerson) => void; onReschedule: (appt: AppointmentWithPerson) => void; isUpcoming: boolean }> = ({ appt, onCancel, onReschedule, isUpcoming }) => {
        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
        const canTakeAction = isUpcoming && ['scheduled', 'pending-approval'].includes(appt.status);
        const dateObj = new Date(appt.start_time);
        const month = dateObj.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
        const day = dateObj.getDate();
        const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const weekday = dateObj.toLocaleDateString('es-MX', { weekday: 'long' });
        const statusConfig = appointmentStatusMap[appt.status] || appointmentStatusMap['scheduled'];

        return (
            <div style={{
                display: 'flex',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                overflow: 'hidden',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
                transition: 'transform 0.2s',
            }} className="card-hover">
                {/* Left Date Column - The "Stub" */}
                <div style={{
                    backgroundColor: 'var(--surface-hover-color)',
                    width: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem 0.5rem',
                    borderRight: '2px dashed var(--border-color)',
                    position: 'relative'
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>{month}</span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1, margin: '4px 0' }}>{day}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{dateObj.getFullYear()}</span>
                    
                    {/* Perforation circles visual effect */}
                    <div style={{position: 'absolute', top: '-6px', right: '-6px', width: '12px', height: '12px', backgroundColor: 'var(--background-color)', borderRadius: '50%', border: '1px solid var(--border-color)'}}></div>
                    <div style={{position: 'absolute', bottom: '-6px', right: '-6px', width: '12px', height: '12px', backgroundColor: 'var(--background-color)', borderRadius: '50%', border: '1px solid var(--border-color)'}}></div>
                </div>

                {/* Right Content Column */}
                <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                         <div>
                             <span style={{fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 600, letterSpacing: '0.5px'}}>{weekday} • {time}</span>
                             <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', lineHeight: 1.2 }}>{appt.title}</h3>
                         </div>
                         <span style={{
                             backgroundColor: statusConfig.bg, color: statusConfig.color,
                             padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                             textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                         }}>
                             {statusConfig.text}
                         </span>
                    </div>

                    {nutritionist && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem'}}>
                             <img 
                                src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} 
                                alt="avatar" 
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>{nutritionist.full_name}</span>
                        </div>
                    )}

                    {canTakeAction && (
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <button onClick={(e) => {e.stopPropagation(); onReschedule(appt)}} className="button-secondary" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>
                                Reagendar
                            </button>
                            <button onClick={(e) => {e.stopPropagation(); onCancel(appt)}} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
             {appointmentToCancel && (
                <ConfirmationModal
                    isOpen={!!appointmentToCancel}
                    onClose={() => setAppointmentToCancel(null)}
                    onConfirm={handleCancelAppointment}
                    title="Confirmar Cancelación"
                    message={<p>¿Estás seguro de que quieres cancelar esta cita? Esta acción no se puede deshacer.</p>}
                    confirmText="Sí, cancelar cita"
                />
            )}
            {isRequestModalOpen && (
                <AppointmentRequestModal
                    isOpen={isRequestModalOpen}
                    onClose={handleCloseRequestModal}
                    onSave={handleSaveFromModal}
                    person={person}
                    teamMembers={teamMembers}
                />
            )}

            <div style={{...styles.pageHeader, marginBottom: '1.5rem', alignItems: 'center'}}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Mis Citas</h1>
                <button 
                    onClick={() => setIsRequestModalOpen(true)} 
                    disabled={consultationLimitReached} 
                    style={{
                        backgroundColor: 'var(--primary-color)', color: 'white', border: 'none',
                        padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: consultationLimitReached ? 'not-allowed' : 'pointer',
                        opacity: consultationLimitReached ? 0.6 : 1, boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)'
                    }}
                >
                    {ICONS.add} Solicitar Cita
                </button>
            </div>

            {consultationLimitReached && (
                <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid #EAB308', borderRadius: '12px', color: '#EAB308', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <span style={{fontSize: '1.2rem'}}>⚠️</span>
                    Has utilizado todas las citas de tu plan actual ({usedConsultations}/{maxConsultations}).
                </div>
            )}

             {/* Segmented Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '4px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                 <button 
                    onClick={() => setActiveTab('upcoming')}
                    style={{
                        padding: '0.75rem', border: 'none', borderRadius: '10px',
                        backgroundColor: activeTab === 'upcoming' ? 'var(--surface-color)' : 'transparent',
                        color: activeTab === 'upcoming' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: activeTab === 'upcoming' ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem',
                        boxShadow: activeTab === 'upcoming' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                 >
                     Próximas
                 </button>
                 <button 
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '0.75rem', border: 'none', borderRadius: '10px',
                        backgroundColor: activeTab === 'history' ? 'var(--surface-color)' : 'transparent',
                        color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: activeTab === 'history' ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem',
                        boxShadow: activeTab === 'history' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                 >
                     Historial
                 </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeTab === 'upcoming' ? (
                    upcoming.length > 0 ? upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={setAppointmentToCancel} onReschedule={handleRequestReschedule} isUpcoming={true} />) 
                    : <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)'}}><p style={{margin:0}}>No tienes citas próximas.</p></div>
                ) : (
                    past.length > 0 ? past.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={() => {}} onReschedule={() => {}} isUpcoming={false} />) 
                    : <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)'}}><p style={{margin:0}}>No hay historial de citas.</p></div>
                )}
            </div>
        </div>
    );
};

export default AppointmentsPage;
