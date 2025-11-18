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
            setTeamMembers(teamData as unknown as TeamMember[] || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        if (!clinic) return;

        fetchQueueData();
        const channel = supabase.channel(`waiting-queue-appointments-${clinic.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` }, payload => {
                fetchQueueData();
            })
            .subscribe();

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
            await supabase.rpc('award_points_for_consultation_attendance', {
                p_person_id: appointment.person_id,
                p_appointment_id: appointment.id
            });
        }
    };

    const scheduled = appointments.filter(a => a.status === 'scheduled').sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const waiting = appointments.filter(a => a.status === 'checked-in').sort((a,b) => new Date(a.check_in_time!).getTime() - new Date(b.check_in_time!).getTime());
    const inConsultation = appointments.filter(a => a.status === 'called' || a.status === 'in-consultation');
    
    // -- Render Components --
    const AppointmentCard: FC<{ appt: AppointmentWithPerson; type: 'scheduled' | 'waiting' | 'active' }> = ({ appt, type }) => {
        const nutritionist = appt.user_id ? memberMap.get(appt.user_id) : null;
        
        const handleCardClick = () => {
            if (appt.person_id && appt.persons) {
                const personType = appt.persons.person_type === 'member' ? 'afiliado' : 'client';
                navigate(`${personType}-detail`, { personId: appt.person_id });
            }
        };
        
        // Styles based on type
        let accentColor = 'var(--border-color)';
        if (type === 'waiting') accentColor = '#EAB308'; // Yellow
        if (type === 'active') accentColor = '#10B981'; // Green
        if (type === 'scheduled') accentColor = 'var(--text-light)';

        const statusLabel = appt.status === 'called' ? 'Llamando...' : appt.status === 'in-consultation' ? 'En Consulta' : null;

        return (
            <div style={{ 
                backgroundColor: 'var(--surface-color)', 
                borderRadius: '12px', 
                padding: '1rem', 
                boxShadow: 'var(--shadow)', 
                border: `1px solid var(--border-color)`,
                borderLeft: `4px solid ${accentColor}`,
                position: 'relative'
            }}>
                {statusLabel && (
                    <div style={{
                        position: 'absolute', top: '0.5rem', right: '0.5rem', 
                        fontSize: '0.7rem', fontWeight: 700, 
                        color: appt.status === 'called' ? '#EAB308' : '#10B981',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {statusLabel}
                    </div>
                )}

                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', cursor: 'pointer'}} onClick={handleCardClick}>
                    <img 
                        src={appt.persons?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${appt.persons?.full_name || '?'}&radius=50`} 
                        alt="avatar" 
                        style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-hover-color)'}} 
                    />
                    <div style={{flex: 1, minWidth: 0}}>
                        <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{appt.persons?.full_name || appt.title}</h4>
                        <p style={{margin: '0.1rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                            {new Date(appt.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {nutritionist && (
                     <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1rem'}}>
                        <img src={nutritionist.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${nutritionist.full_name}&radius=50`} style={{width:'16px', height:'16px', borderRadius: '50%'}} alt="nutri"/>
                        <span>{nutritionist.full_name?.split(' ')[0]}</span>
                        {appt.consulting_room && <span style={{marginLeft: 'auto', fontWeight: 600, color: 'var(--text-color)'}}>Sala {appt.consulting_room}</span>}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {appt.status === 'scheduled' && (
                        <button onClick={() => handleCheckIn(appt.id)} style={{width: '100%', fontSize: '0.85rem', padding: '0.5rem'}}>
                             Check-in
                        </button>
                    )}
                    {appt.status === 'checked-in' && (
                        <button onClick={() => handleCall(appt)} style={{width: '100%', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--primary-color)'}}>
                             Llamar
                        </button>
                    )}
                    {appt.status === 'called' && (
                        <button onClick={() => handleStartConsultation(appt)} style={{width: '100%', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: '#10B981'}}>
                             Iniciar
                        </button>
                    )}
                    {appt.status === 'in-consultation' && (
                        <>
                            <button onClick={() => handleStartConsultation(appt)} className="button-secondary" style={{flex: 1, fontSize: '0.85rem', padding: '0.5rem'}}>Ver</button>
                            <button onClick={() => handleComplete(appt.id)} style={{flex: 1, fontSize: '0.85rem', padding: '0.5rem', backgroundColor: 'var(--text-light)'}}>Fin</button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const QueueColumn: FC<{ title: string; appointments: AppointmentWithPerson[]; type: 'scheduled' | 'waiting' | 'active'; count: number; icon: React.ReactNode }> = ({ title, appointments, type, count, icon }) => (
        <div style={{
            backgroundColor: 'var(--surface-hover-color)', 
            borderRadius: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            height: '100%',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <span style={{color: 'var(--primary-color)'}}>{icon}</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
                </div>
                <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.length > 0 ? appointments.map(a => <AppointmentCard key={a.id} appt={a} type={type} />) : <p style={{textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '2rem', opacity: 0.6}}>Sin pacientes</p>}
            </div>
        </div>
    );

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
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
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1rem', borderBottom: 'none'}}>
                <h1 style={{fontSize: '1.5rem'}}>Control de Flujo de Pacientes</h1>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            
            {loading ? <p>Cargando...</p> : (
                <div style={{
                    display: isMobile ? 'flex' : 'grid',
                    flexDirection: isMobile ? 'column' : 'row',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1.5rem',
                    flex: 1,
                    overflowX: isMobile ? 'auto' : 'visible',
                    overflowY: 'hidden',
                    paddingBottom: '1rem' // For scrollbar
                }}>
                    <QueueColumn title="Programados" appointments={scheduled} type="scheduled" count={scheduled.length} icon={ICONS.calendar} />
                    <QueueColumn title="En Sala de Espera" appointments={waiting} type="waiting" count={waiting.length} icon={ICONS.clock} />
                    <QueueColumn title="En Consulta" appointments={inConsultation} type="active" count={inConsultation.length} icon={ICONS.activity} />
                </div>
            )}
        </div>
    );
};

export default WaitingQueuePage;