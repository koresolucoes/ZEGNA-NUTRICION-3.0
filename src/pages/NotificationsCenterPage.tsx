
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { ICONS } from './AuthPage';
import { styles } from '../constants';
import { useClinic } from '../contexts/ClinicContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';

interface NotificationItem {
    id: string;
    type: 'appointment' | 'referral' | 'partnership' | 'feedback';
    title: string;
    description: string;
    time: string;
    linkPage: string;
    linkContext?: any;
}

const NotificationsCenterPage: FC<{ navigate: (page: string, context?: any) => void }> = ({ navigate }) => {
    const { clinic } = useClinic();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        try {
            // 1. Pending Appointments
            const { data: appointments } = await supabase
                .from('appointments')
                .select('id, title, start_time, persons(full_name)')
                .eq('clinic_id', clinic.id)
                .eq('status', 'pending-approval')
                .order('created_at', { ascending: false });

            // 2. Pending Received Referrals
            const { data: referrals } = await supabase
                .from('referrals')
                .select('id, patient_info, sending_clinic:clinics!referrals_sending_clinic_id_fkey(name), sending_ally:allies!referrals_sending_ally_id_fkey(full_name), created_at')
                .eq('receiving_clinic_id', clinic.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            // 3. Pending Partnership Requests
            const { data: partnerships } = await supabase
                .from('clinic_clinic_partnerships')
                .select('id, requester:clinics!requester_id(name), created_at')
                .eq('responder_id', clinic.id)
                .eq('status', 'pending');
            
            // 4. Recent Feedback (Last 48h)
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const { data: feedback } = await supabase
                .from('beta_feedback')
                .select('id, feedback_type, message, created_at')
                .gte('created_at', twoDaysAgo.toISOString());

            const newNotifications: NotificationItem[] = [];

            if (appointments) {
                appointments.forEach(appt => {
                    newNotifications.push({
                        id: `appt-${appt.id}`,
                        type: 'appointment',
                        title: 'Solicitud de Cita',
                        description: `${appt.persons?.full_name || 'Paciente'} solicitó cita para el ${new Date(appt.start_time).toLocaleDateString()}. Revisa tu agenda para aprobar o rechazar.`,
                        time: appt.start_time,
                        linkPage: 'agenda',
                    });
                });
            }

            if (referrals) {
                referrals.forEach(ref => {
                    const senderName = ref.sending_clinic?.name || ref.sending_ally?.full_name || 'Desconocido';
                    const patientName = (ref.patient_info as any)?.name || 'Paciente';
                    newNotifications.push({
                        id: `ref-${ref.id}`,
                        type: 'referral',
                        title: 'Referido Recibido',
                        description: `${senderName} te ha referido al paciente ${patientName}. Acepta la solicitud para ver los detalles clínicos.`,
                        time: ref.created_at,
                        linkPage: 'clinic-network',
                        linkContext: { activeTab: 'received' }
                    });
                });
            }

            if (partnerships) {
                partnerships.forEach(part => {
                    newNotifications.push({
                        id: `part-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Vínculo',
                        description: `${part.requester?.name} quiere conectar contigo para intercambiar referidos.`,
                        time: part.created_at,
                        linkPage: 'clinic-network', 
                    });
                });
            }
            
            if (feedback) {
                feedback.forEach(fb => {
                    newNotifications.push({
                        id: `fb-${fb.id}`,
                        type: 'feedback',
                        title: `Feedback: ${fb.feedback_type}`,
                        description: `Usuario reportó: "${fb.message.substring(0, 80)}..."`,
                        time: fb.created_at,
                        linkPage: 'home', // No specific page for feedback yet
                    });
                });
            }
            
            newNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            setNotifications(newNotifications);

        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'appointment': return ICONS.calendar;
            case 'referral': return ICONS.user;
            case 'partnership': return ICONS.network;
            default: return ICONS.bell;
        }
    };
    
    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'appointment': return 'Agenda';
            case 'referral': return 'Red Clínica';
            case 'partnership': return 'Red Clínica';
            case 'feedback': return 'Sistema';
            default: return 'Aviso';
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={styles.pageHeader}>
                <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <span style={{color: 'var(--primary-color)'}}>🔔</span> Centro de Notificaciones
                </h1>
            </div>
            <p style={{marginTop: '-1.5rem', marginBottom: '2.5rem', color: 'var(--text-light)'}}>
                Revisa todas las solicitudes pendientes y alertas de tu clínica en un solo lugar.
            </p>

            {loading ? <SkeletonLoader type="list" count={5} /> : 
            notifications.length === 0 ? (
                <div style={{textAlign: 'center', padding: '4rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)'}}>
                    <p style={{fontSize: '1.2rem', color: 'var(--text-light)'}}>Todo está al día. No tienes notificaciones pendientes.</p>
                </div>
            ) : (
                <div style={{display: 'grid', gap: '1.5rem'}}>
                    {notifications.map(item => (
                        <div 
                            key={item.id} 
                            className="card-hover"
                            style={{
                                backgroundColor: 'var(--surface-color)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1.5rem',
                                alignItems: 'flex-start',
                                boxShadow: 'var(--shadow)'
                            }}
                        >
                            <div style={{
                                backgroundColor: 'var(--surface-hover-color)',
                                color: 'var(--primary-color)',
                                width: '50px', height: '50px',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem',
                                flexShrink: 0
                            }}>
                                {getIcon(item.type)}
                            </div>
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                    <span style={{fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.5px'}}>
                                        {getTypeLabel(item.type)}
                                    </span>
                                    <span style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                        {new Date(item.time).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 600}}>{item.title}</h3>
                                <p style={{margin: '0 0 1rem 0', color: 'var(--text-color)', lineHeight: 1.5}}>{item.description}</p>
                                <button 
                                    onClick={() => navigate(item.linkPage, item.linkContext)}
                                    className="button-secondary"
                                    style={{fontSize: '0.9rem', padding: '0.6rem 1.2rem'}}
                                >
                                    Ver Detalles →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsCenterPage;
