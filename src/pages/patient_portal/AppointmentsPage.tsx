
import React, { FC, useMemo, useState, useEffect } from 'react';
import { AppointmentWithPerson, Person, TeamMember, PatientServicePlan, ConsultationWithLabs } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import AppointmentRequestModal from '../../components/patient_portal/AppointmentRequestModal';
import { supabase } from '../../supabase';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

const appointmentStatusMap: { [key: string]: { text: string; color: string; bg: string; icon: React.ReactNode } } = {
    'pending-approval': { text: 'Pendiente', color: '#B45309', bg: '#FEF3C7', icon: ICONS.clock },
    scheduled: { text: 'Confirmada', color: '#047857', bg: '#D1FAE5', icon: ICONS.check },
    completed: { text: 'Completada', color: '#374151', bg: '#F3F4F6', icon: ICONS.check },
    cancelled: { text: 'Cancelada', color: '#B91C1C', bg: '#FEE2E2', icon: ICONS.close },
    'no-show': { text: 'No Asistió', color: '#B91C1C', bg: '#FEE2E2', icon: ICONS.close },
    'in-consultation': { text: 'En Curso', color: '#4338CA', bg: '#E0E7FF', icon: ICONS.activity },
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

    const handleCancelAppointment = async () => {
        if (!appointmentToCancel) return;
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentToCancel.id);
        if (error) console.error('Error cancelling appointment:', error);
        else onDataRefresh();
        setAppointmentToCancel(null);
    };

    const AppointmentCard: FC<{ appt: AppointmentWithPerson; canCancel?: boolean }> = ({ appt, canCancel }) => {
        const dateObj = new Date(appt.start_time);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
        const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const weekday = dateObj.toLocaleDateString('es-MX', { weekday: 'long' });
        const statusConfig = appointmentStatusMap[appt.status] || appointmentStatusMap['scheduled'];

        return (
            <div className="fade-in" style={{
                display: 'flex',
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
            }}>
                {/* Left: Date Block */}
                <div style={{
                    width: '85px',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '1px dashed #E5E7EB',
                    padding: '0 10px'
                }}>
                    <span style={{fontSize: '0.8rem', fontWeight: 700, color: '#9CA3AF'}}>{month}</span>
                    <span style={{fontSize: '1.8rem', fontWeight: 800, color: '#1F2937', lineHeight: 1}}>{day}</span>
                    <span style={{fontSize: '0.7rem', color: '#9CA3AF'}}>{dateObj.getFullYear()}</span>
                </div>

                {/* Right: Details */}
                <div style={{ flex: 1, padding: '1.25rem' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem'}}>
                         <div>
                             <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)'}}>{appt.title}</h3>
                             <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6B7280', textTransform: 'capitalize'}}>
                                 {weekday} • {time}
                             </p>
                         </div>
                         <div style={{
                             backgroundColor: statusConfig.bg, color: statusConfig.color,
                             padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                             display: 'flex', alignItems: 'center', gap: '4px'
                         }}>
                             {statusConfig.text}
                         </div>
                    </div>

                    {canCancel && (
                        <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6'}}>
                            <button 
                                onClick={() => setAppointmentToCancel(appt)}
                                style={{
                                    width: '100%', padding: '0.6rem', border: '1px solid #FECACA', 
                                    backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '10px',
                                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                Cancelar Cita
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem 5rem 1rem' }}>
             {appointmentToCancel && (
                <ConfirmationModal
                    isOpen={!!appointmentToCancel}
                    onClose={() => setAppointmentToCancel(null)}
                    onConfirm={handleCancelAppointment}
                    title="Cancelar Cita"
                    message={<p>¿Seguro que deseas cancelar tu cita del <strong>{new Date(appointmentToCancel.start_time).toLocaleDateString()}</strong>?</p>}
                    confirmText="Sí, cancelar"
                />
            )}
            
            {isRequestModalOpen && (
                <AppointmentRequestModal
                    isOpen={isRequestModalOpen}
                    onClose={() => setIsRequestModalOpen(false)}
                    onSave={() => { setIsRequestModalOpen(false); onDataRefresh(); }}
                    person={person}
                    teamMembers={teamMembers}
                />
            )}

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Mis Citas</h1>
                <button 
                    onClick={() => setIsRequestModalOpen(true)} 
                    className="button-primary"
                    style={{
                        padding: '0.7rem 1rem', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(56, 189, 248, 0.3)'
                    }}
                >
                    {ICONS.add} Agendar
                </button>
            </div>

             {/* Custom Tab Switcher */}
            <div style={{ backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '14px', display: 'flex', marginBottom: '2rem' }}>
                 <button 
                    onClick={() => setActiveTab('upcoming')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none',
                        backgroundColor: activeTab === 'upcoming' ? 'white' : 'transparent',
                        color: activeTab === 'upcoming' ? '#111827' : '#6B7280',
                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        boxShadow: activeTab === 'upcoming' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                 >
                     Próximas
                 </button>
                 <button 
                    onClick={() => setActiveTab('history')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none',
                        backgroundColor: activeTab === 'history' ? 'white' : 'transparent',
                        color: activeTab === 'history' ? '#111827' : '#6B7280',
                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        boxShadow: activeTab === 'history' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                 >
                     Historial
                 </button>
            </div>
            
            <div style={{ minHeight: '300px' }}>
                {activeTab === 'upcoming' ? (
                    upcoming.length > 0 ? upcoming.map(appt => (
                        <AppointmentCard key={appt.id} appt={appt} canCancel={true} />
                    )) : (
                        <div style={{textAlign: 'center', padding: '3rem', color: '#9CA3AF', border: '2px dashed #E5E7EB', borderRadius: '20px'}}>
                             <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>📅</div>
                             <p>No tienes citas próximas.</p>
                        </div>
                    )
                ) : (
                    past.length > 0 ? past.map(appt => (
                        <AppointmentCard key={appt.id} appt={appt} canCancel={false} />
                    )) : (
                        <div style={{textAlign: 'center', padding: '3rem', color: '#9CA3AF', border: '2px dashed #E5E7EB', borderRadius: '20px'}}>
                             <p>No hay historial de citas.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default AppointmentsPage;
