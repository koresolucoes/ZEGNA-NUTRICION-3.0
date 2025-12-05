
import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import { ICONS } from '../../pages/AuthPage';
import { styles } from '../../constants';
import { useClinic } from '../../contexts/ClinicContext';

interface NotificationsMenuProps {
    onNavigate: (page: string, context?: any) => void;
}

interface NotificationItem {
    id: string;
    type: 'appointment' | 'referral' | 'partnership' | 'feedback';
    title: string;
    description: string;
    time: string;
    linkPage: string;
    linkContext?: any;
    status: 'unread' | 'read';
}

const NotificationsMenu: FC<NotificationsMenuProps> = ({ onNavigate }) => {
    const { clinic } = useClinic();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!clinic) return;

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
            
            // 4. Recent Feedback (Last 24h)
            // Ideally we'd have a 'read' status on feedback, but for now just show very recent ones
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const { data: feedback } = await supabase
                .from('beta_feedback')
                .select('id, feedback_type, message, created_at')
                .gte('created_at', yesterday.toISOString())
                .limit(5);

            const newNotifications: NotificationItem[] = [];

            if (appointments) {
                appointments.forEach(appt => {
                    newNotifications.push({
                        id: `appt-${appt.id}`,
                        type: 'appointment',
                        title: 'Solicitud de Cita',
                        description: `${appt.persons?.full_name || 'Paciente'} solicitó para el ${new Date(appt.start_time).toLocaleDateString()}`,
                        time: appt.start_time, // Using start time or created_at if available
                        linkPage: 'agenda',
                        status: 'unread'
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
                        title: 'Nuevo Referido',
                        description: `${senderName} te envió a ${patientName}.`,
                        time: ref.created_at,
                        linkPage: 'clinic-network',
                        linkContext: { activeTab: 'received' }, // Pass context if page supports it
                        status: 'unread'
                    });
                });
            }

            if (partnerships) {
                partnerships.forEach(part => {
                    newNotifications.push({
                        id: `part-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Vínculo',
                        description: `${part.requester?.name} quiere conectar contigo.`,
                        time: part.created_at,
                        linkPage: 'clinic-network', 
                        status: 'unread'
                    });
                });
            }
            
            // Sort by date descending (most recent first)
            // For appointments without created_at in select, we used start_time, might not be accurate for "notification time" but acceptable
            // Ideally add created_at to appointment select above
            newNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.length);

        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [clinic]);

    useEffect(() => {
        fetchNotifications();
        
        // Poll every 60 seconds to keep updated without heavy realtime subscriptions for now
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = (item: NotificationItem) => {
        setIsOpen(false);
        onNavigate(item.linkPage, item.linkContext);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'appointment': return ICONS.calendar;
            case 'referral': return ICONS.user;
            case 'partnership': return ICONS.network;
            default: return ICONS.bell;
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Notificaciones"
            >
                <div style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>{ICONS.bell}</div>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'var(--error-color)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '50%',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--surface-color)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '320px',
                    backgroundColor: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    marginTop: '8px'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Notificaciones</h3>
                        {unreadCount > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{unreadCount} nuevas</span>}
                    </div>
                    
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {notifications.length > 0 ? (
                            notifications.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleNotificationClick(item)}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: '0.75rem',
                                        alignItems: 'flex-start',
                                        backgroundColor: 'var(--surface-color)', // Could add logic for read/unread bg
                                        transition: 'background-color 0.2s'
                                    }}
                                    className="nav-item-hover"
                                >
                                    <div style={{
                                        backgroundColor: 'var(--surface-hover-color)',
                                        color: 'var(--primary-color)',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)' }}>{item.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.4 }}>{item.description}</p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-light)', opacity: 0.8 }}>
                                            {new Date(item.time).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                <p style={{ fontSize: '0.9rem' }}>No tienes notificaciones pendientes.</p>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)' }}>
                        <button onClick={() => { setIsOpen(false); onNavigate('agenda'); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                            Ver Agenda Completa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsMenu;
