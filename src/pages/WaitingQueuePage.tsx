import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { AppointmentWithPerson, TeamMember } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import ConsultingRoomModal from '../components/shared/ConsultingRoomModal';

interface WaitingQueuePageProps {
    user: User;
    isMobile: boolean;
    navigate: (page: string, context?: any) => void;
}

const WaitingQueuePage: FC<WaitingQueuePageProps> = ({ user, isMobile, navigate }) => {
    const { clinic, profile } = useClinic();
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for the new consulting room modal
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [appointmentToCall, setAppointmentToCall] = useState<AppointmentWithPerson | null>(null);

    const fetchQueueData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const today = new Date();
            const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            const [{ data: apptsData, error: apptsError }, { data: teamData, error: teamError }] = await Promise.all([
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)')
                    .eq('clinic_id', clinic.id)
                    .gte('start_time', todayStart)
                    .lte('start_time', todayEnd)
                    .in('status', ['scheduled', 'checked-in', 'called', 'in-consultation'])
                    .order('start_time'),
                supabase.from('team_members_with_profiles').select('user_id, full_name, avatar_url').eq('clinic_id', clinic.id)
            ]);

            if (apptsError) throw apptsError;
            if (teamError) throw teamError;
            
            setAppointments(apptsData as AppointmentWithPerson[] || []);
            setTeamMembers(teamData || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        if (!clinic) return; // Guard: Don't run effect if clinic isn't loaded

        fetchQueueData();
        const channel = supabase.channel(`waiting-queue-appointments-${clinic.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` }, payload => {
                console.log('Change received!', payload);
                fetchQueueData();
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Realtime subscription started for WaitingQueuePage.`);
                }
                 if (status === 'CLOSED') {
                    console.log(`Realtime subscription closed for WaitingQueuePage.`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Realtime subscription error on WaitingQueuePage:`, err);
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [fetchQueueData, clinic]);

    const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.user_id, m])), [teamMembers]);

    // -- Action Handlers --
    const updateAppointmentStatus = async (id: string, status: string, extraData: object = {}) => {
        const { error } = await supabase.from('appointments').update({ status, ...extraData }).eq('id', id);
        if (error) setError(error.message);
    };

    const handleCheckIn = (id: string) => updateAppointmentStatus(id, 'checked-in', { check_in_time: new Date().toISOString() });
    
    const handleCall = (appt: AppointmentWithPerson) => {
        if (profile && profile.consulting_room) {
            updateAppointmentStatus(appt.id, 'called', { consulting_room: profile.consulting_room });
        } else {
            setAppointmentToCall(appt);
            setIsRoomModalOpen(true);
        }
    };
    
    const handleConfirmRoom = (room: string) => {
        if (appointmentToCall) {
            updateAppointmentStatus(appointmentToCall.id, 'called', { consulting_room: room });
        }
        setIsRoomModalOpen(false);
        setAppointmentToCall(null);
    };

    const handleStartConsultation = async (appt: AppointmentWithPerson) => {
        await updateAppointmentStatus(appt.id, 'in-consultation');
        if (appt.person_id && appt.persons) {
            const personType = appt.persons.person_type === 'member' ? 'afiliado' : 'client';
            navigate(`${personType}-detail`, { personId: appt.person_id, startInConsultation: true });
        }
    };
    const handleComplete = async (id: string) => {
        await updateAppointmentStatus(id, 'completed');
        
        const appointment = appointments.find(appt => appt.id === id);
        if (appointment?.person_id) {
            // Award gamification points for attendance
            const { error: rpcError } = await supabase.rpc('award_points_for_consultation_attendance', {
                p_person_id: appointment.person_id,
                p_appointment_id: appointment.id
            });

            if (rpcError) {
                console.warn('Could not award points for consultation attendance:', rpcError);
            }
        }
    };

    const scheduled = appointments.filter(a => a.status === 'scheduled').sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const waiting = appointments.filter(a => a.status === 'checked-in').sort((a,b) => new Date(a.check_in_time!).getTime() - new Date(b.check_in_time!).getTime());
    const inConsultation = appointments.filter(a => a.status === 'called' || a.status === 'in-consultation');
    
    // -- Render Components --
    const AppointmentCard: FC<{ appt: AppointmentWithPerson }> = ({ appt }) => {
        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
        
        const handleCardClick = () => {
            if (appt.person_id && appt.persons) {
                const personType = appt.persons.person_type === 'member' ? 'afiliado' : 'client';
                navigate(`${personType}-detail`, { personId: appt.person_id });
            }
        };

        return (
            <div style={cardStyles.card}>
                <div style={{...cardStyles.cardHeader, cursor: 'pointer'}} onClick={handleCardClick} className="nav-item-hover">
                    <img src={appt.persons?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${appt.persons?.full_name || '?'}&radius=50`} alt="avatar" style={cardStyles.avatar} />
                    <div>
                        <h4 style={cardStyles.patientName}>{appt.persons?.full_name || appt.title}</h4>
                        <p style={cardStyles.time}>{new Date(appt.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                {nutritionist && <p style={cardStyles.nutritionist}>con {nutritionist.full_name}</p>}
                <div style={cardStyles.actions}>
                    {appt.status === 'scheduled' && <button onClick={() => handleCheckIn(appt.id)}>Registrar Llegada</button>}
                    {appt.status === 'checked-in' && <button onClick={() => handleCall(appt)}>Llamar a Paciente</button>}
                    {appt.status === 'called' && <button onClick={() => handleStartConsultation(appt)}>Iniciar Consulta</button>}
                    {appt.status === 'in-consultation' && (
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <button onClick={() => handleStartConsultation(appt)} className="button-secondary" style={{ flex: 1 }}>Ver Consulta</button>
                            <button onClick={() => handleComplete(appt.id)} style={{ flex: 1 }}>Finalizar</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const QueueColumn: FC<{ title: string; appointments: AppointmentWithPerson[]; count: number }> = ({ title, appointments, count }) => (
        <div style={columnStyles.column}>
            <h3 style={columnStyles.header}>{title} <span style={columnStyles.count}>{count}</span></h3>
            <div style={columnStyles.content}>
                {appointments.length > 0 ? appointments.map(a => <AppointmentCard key={a.id} appt={a} />) : <p style={columnStyles.emptyText}>No hay pacientes.</p>}
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            {isRoomModalOpen && appointmentToCall && (
                <ConsultingRoomModal
                    isOpen={isRoomModalOpen}
                    onClose={() => {
                        setIsRoomModalOpen(false);
                        setAppointmentToCall(null);
                    }}
                    onConfirm={handleConfirmRoom}
                    patientName={appointmentToCall.persons?.full_name || appointmentToCall.title}
                />
            )}
            <div style={{...styles.pageHeader, paddingBottom: 0, borderBottom: 'none'}}>
                <h1>Sala de Espera Virtual</h1>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            {loading ? <p>Cargando fila de espera...</p> : (
                <div style={{
                    display: isMobile ? 'flex' : 'grid',
                    flexDirection: 'column',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                    height: isMobile ? 'auto' : 'calc(100vh - 150px)',
                }}>
                    <QueueColumn title="Programados para Hoy" appointments={scheduled} count={scheduled.length} />
                    <QueueColumn title="En Sala de Espera" appointments={waiting} count={waiting.length} />
                    <QueueColumn title="En Consulta" appointments={inConsultation} count={inConsultation.length} />
                </div>
            )}
        </div>
    );
};

const columnStyles: { [key: string]: React.CSSProperties } = {
    column: { backgroundColor: 'var(--surface-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { padding: '1rem', margin: 0, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' },
    count: { backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'grid', placeItems: 'center', fontSize: '0.9rem' },
    content: { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    emptyText: { textAlign: 'center', color: 'var(--text-light)', marginTop: '2rem' }
};

const cardStyles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '1rem' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%' },
    patientName: { margin: 0, fontSize: '1rem', fontWeight: 600 },
    time: { margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--primary-color)' },
    nutritionist: { fontSize: '0.85rem', color: 'var(--text-light)', margin: '0.5rem 0 0 0', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' },
    actions: { marginTop: '1rem', display: 'flex' },
};

export default WaitingQueuePage;