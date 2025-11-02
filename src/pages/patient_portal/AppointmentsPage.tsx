import React, { FC, useMemo, useState, useEffect } from 'react';
import { AppointmentWithPerson, Person, TeamMember, PatientServicePlan, ConsultationWithLabs } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import AppointmentRequestModal from '../../components/patient_portal/AppointmentRequestModal';
import { supabase } from '../../supabase';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

const appointmentStatusMap: { [key: string]: { text: string; color: string; } } = {
    'pending-approval': { text: 'Pendiente de Aprobación', color: 'var(--accent-color)' },
    scheduled: { text: 'Agendada', color: 'var(--primary-color)' },
    completed: { text: 'Completada', color: 'var(--text-light)' },
    cancelled: { text: 'Cancelada', color: 'var(--error-color)' },
    'no-show': { text: 'No Asistió', color: 'var(--accent-color)' },
    'checked-in': { text: 'En Espera', color: 'var(--primary-color)' },
    'in-consultation': { text: 'En Consulta', color: 'var(--primary-color)' },
    'called': { text: 'Llamando', color: 'var(--primary-color)' },
};

const AppointmentsPage: FC<{ 
    appointments: AppointmentWithPerson[]; 
    person: Person;
    servicePlans: PatientServicePlan[];
    consultations: ConsultationWithLabs[]; // Consultations are needed for the count
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
            const startDate = person.subscription_start_date; // 'YYYY-MM-DD'
            const endDate = person.subscription_end_date;   // 'YYYY-MM-DD'

            const used = appointments.filter(a => {
                const isConsumingStatus = ['scheduled', 'completed', 'in-consultation', 'called', 'checked-in'].includes(a.status);
                if (!isConsumingStatus) return false;

                const apptDate = a.start_time.substring(0, 10); // Extract 'YYYY-MM-DD' from timestamp
                return apptDate >= startDate && apptDate <= endDate;
            }).length;

            return { usedConsultations: used, maxConsultations: plan.max_consultations };
        }
        return { usedConsultations: 0, maxConsultations: null };
    }, [person, servicePlans, appointments]);

    const consultationLimitReached = useMemo(() => {
        if (maxConsultations === null || maxConsultations === 0) return false; // Unlimited
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
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointmentToCancel.id);

        if (error) {
            console.error('Error cancelling appointment:', error);
        } else {
            onDataRefresh();
        }
        setAppointmentToCancel(null);
    };
    
    const handleRequestReschedule = (appt: AppointmentWithPerson) => {
        setAppointmentToReschedule(appt);
        setIsRequestModalOpen(true);
    };

    const handleSaveFromModal = async () => {
        if (appointmentToReschedule) {
            // New request was just saved in the modal, now cancel the old one.
            await supabase
                .from('appointments')
                .update({ status: 'cancelled', notes: `Cancelada para reagendar. Nueva solicitud creada.` })
                .eq('id', appointmentToReschedule.id);
            setAppointmentToReschedule(null);
        }
        setIsRequestModalOpen(false);
        onDataRefresh();
    };

    const handleCloseRequestModal = () => {
        setIsRequestModalOpen(false);
        setAppointmentToReschedule(null); // Always clear on close
    };

    const AppointmentCard: FC<{ appt: AppointmentWithPerson; onCancel: (appt: AppointmentWithPerson) => void; onReschedule: (appt: AppointmentWithPerson) => void; isUpcoming: boolean }> = ({ appt, onCancel, onReschedule, isUpcoming }) => {
        const statusInfo = appointmentStatusMap[appt.status as keyof typeof appointmentStatusMap] || { text: appt.status, color: 'var(--text-color)' };
        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
        const canTakeAction = isUpcoming && ['scheduled', 'pending-approval'].includes(appt.status);

        return (
            <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', padding: '1rem', borderLeft: `4px solid ${statusInfo.color}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{appt.title}</h3>
                    <span style={{ color: statusInfo.color, fontWeight: 600, fontSize: '0.9rem' }}>{statusInfo.text}</span>
                </div>
                <p style={{ margin: '0.5rem 0', color: 'var(--text-light)' }}>
                    {new Date(appt.start_time).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                </p>
                {nutritionist && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem'}}>
                        <img src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name || '?'}&radius=50`} alt="avatar" style={{width: '24px', height: '24px', borderRadius: '50%'}} />
                        <span>con {nutritionist.full_name}</span>
                    </div>
                )}
                {canTakeAction && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); onReschedule(appt); }} className="button-secondary" style={{padding: '0.5rem 1rem', fontSize: '0.9rem', flex: 1}}>
                            {ICONS.calendar} Reagendar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCancel(appt); }} className="button-danger" style={{padding: '0.5rem 1rem', fontSize: '0.9rem', flex: 1}}>
                            {ICONS.close} Cancelar Cita
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fade-in">
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

            <div style={{...styles.pageHeader, borderBottom: 'none', paddingBottom: 0}}>
                <div>
                    <h1 style={{ color: 'var(--primary-color)' }}>Mis Citas</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        Consulta el historial de tus citas y solicita nuevas.
                    </p>
                </div>
                <div>
                    {consultationLimitReached && (
                        <div style={{ padding: '0.5rem 1rem', marginBottom: '1rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', border: '1px solid #EAB308', borderRadius: '8px', color: '#EAB308', fontWeight: 500, textAlign: 'center' }}>
                            Has utilizado {usedConsultations} de {maxConsultations} citas de tu plan. Contacta a la clínica para renovarlo.
                        </div>
                    )}
                    <button onClick={() => setIsRequestModalOpen(true)} disabled={consultationLimitReached}>
                        {ICONS.add} Solicitar Nueva Cita
                    </button>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <section>
                    <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                        Próximas Citas y Solicitudes
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        {upcoming.length > 0 ? upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={setAppointmentToCancel} onReschedule={handleRequestReschedule} isUpcoming={true} />) : <p>No tienes citas próximas ni solicitudes pendientes.</p>}
                    </div>
                </section>
                <section>
                    <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                        Citas Pasadas
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        {past.length > 0 ? past.map(appt => <AppointmentCard key={appt.id} appt={appt} onCancel={() => {}} onReschedule={() => {}} isUpcoming={false} />) : <p>No tienes citas en tu historial.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AppointmentsPage;