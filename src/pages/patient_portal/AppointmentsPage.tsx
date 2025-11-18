import React, { FC, useMemo, useState, useEffect } from 'react';
import { AppointmentWithPerson, Person, TeamMember, PatientServicePlan, ConsultationWithLabs } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import AppointmentRequestModal from '../../components/patient_portal/AppointmentRequestModal';
import { supabase } from '../../supabase';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

const appointmentStatusMap: { [key: string]: { text: string; color: string; bg: string } } = {
    'pending-approval': { text: 'Pendiente', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)' },
    scheduled: { text: 'Agendada', color: 'var(--primary-color)', bg: 'var(--primary-light)' },
    completed: { text: 'Completada', color: 'var(--text-light)', bg: 'var(--surface-hover-color)' },
    cancelled: { text: 'Cancelada', color: 'var(--error-color)', bg: 'var(--error-bg)' },
    'no-show': { text: 'No Asistió', color: 'var(--error-color)', bg: 'var(--error-bg)' },
    'checked-in': { text: 'En Espera', color: 'var(--primary-color)', bg: 'var(--primary-light)' },
    'in-consultation': { text: 'En Consulta', color: 'var(--primary-color)', bg: 'var(--primary-light)' },
    'called': { text: 'Llamando', color: 'var(--primary-color)', bg: 'var(--primary-light)' },
};

const AppointmentsPage: FC<{ 
    appointments: AppointmentWithPerson[]; 
    person: Person;
    servicePlans: PatientServicePlan[];
    consultations: ConsultationWithLabs[]; 
    onDataRefresh: () => void; 
}> = ({ appointments, person, servicePlans, consultations, onDataRefresh }) => {
    
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentWithPerson | null>(null);
    const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentWithPerson | null>(null);

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
        const upcoming: AppointmentWithPerson[] = [];
        const past: AppointmentWithPerson[] = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        appointments.forEach(appt => {
            const apptDate = new Date(appt.start_time);
            if (apptDate >= todayStart && !['completed', 'cancelled', 'no-show'].includes(appt.status)) {
                 upcoming.push(appt);
            } else {
                past.push(appt);
            }
        });
        return { 
            upcoming: upcoming.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
            past: past.sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
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

    const AppointmentCard: FC<{ appt: AppointmentWithPerson; onCancel: (appt: AppointmentWithPerson) => void; onReschedule: (appt: AppointmentWithPerson) => void; isUpcoming: boolean }> = ({ appt, onCancel, onReschedule, isUpcoming }) => {
        const statusInfo = appointmentStatusMap[appt.status as keyof typeof appointmentStatusMap] || { text: appt.status, color: 'var(--text-color)', bg: 'transparent' };
        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
        const canTakeAction = isUpcoming && ['scheduled', 'pending-approval'].includes(appt.status);
        const dateObj = new Date(appt.start_time);

        return (
            <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        <div style={{textAlign: 'center', backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem', borderRadius: '8px', minWidth: '60px'}}>
                            <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>{dateObj.toLocaleDateString('es-MX', {month: 'short'})}</span>
                            <span style={{display: 'block', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1}}>{dateObj.getDate()}</span>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>{appt.title}</h3>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                    </div>
                    <span style={{ color: statusInfo.color, backgroundColor: statusInfo.bg, fontWeight: 600, fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px' }}>{statusInfo.text}</span>
                </div>

                {nutritionist && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)'}}>
                        <img src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} alt="avatar" style={{width: '24px', height: '24px', borderRadius: '50%'}} />
                        <span>Especialista: {nutritionist.full_name}</span>
                    </div>
                )}
                
                {canTakeAction && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); onReschedule(appt); }} className="button-secondary" style={{padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1}}>
                            {ICONS.calendar} Reagendar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCancel(appt); }} className="button-danger" style={{padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1}}>
                            {ICONS.close} Cancelar
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

            <div style={{...styles.pageHeader, alignItems: 'center'}}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mis Citas</h1>
                <button onClick={() => setIsRequestModalOpen(true)} disabled={consultationLimitReached} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {ICONS.add} Solicitar Cita
                </button>
            </div>

            {consultationLimitReached && (
                <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid #EAB308', borderRadius: '8px', color: '#EAB308', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{fontSize: '1.2rem'}}>⚠️</span>
                    Has utilizado {usedConsultations} de {maxConsultations} citas de tu plan actual. Contacta a la clínica para renovar.
                </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                <section>
                    <h2 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                        Próximas Citas
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        {upcoming.length > 0 ? upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={setAppointmentToCancel} onReschedule={handleRequestReschedule} isUpcoming={true} />) : <p style={{color: 'var(--text-light)'}}>No tienes citas próximas.</p>}
                    </div>
                </section>
                <section>
                    <h2 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-light)' }}>
                        Historial
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        {past.length > 0 ? past.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={() => {}} onReschedule={() => {}} isUpcoming={false} />) : <p style={{color: 'var(--text-light)'}}>No hay historial de citas.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AppointmentsPage;