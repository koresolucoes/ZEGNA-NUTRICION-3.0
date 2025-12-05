
import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import { ICONS } from '../../pages/AuthPage';
import { styles } from '../../constants';

interface AllyNotificationsMenuProps {
    onNavigate: (page: string, context?: any) => void;
}

interface NotificationItem {
    id: string;
    type: 'referral' | 'partnership';
    title: string;
    description: string;
    time: string;
    linkPage: string;
    linkContext?: any;
}

const AllyNotificationsMenu: FC<AllyNotificationsMenuProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError || !allyIdData) return;

            // 1. Pending Received Referrals
            const { data: referrals } = await supabase
                .from('referrals')
                .select('id, patient_info, sending_clinic:clinics!referrals_sending_clinic_id_fkey(name), sending_ally:allies!referrals_sending_ally_id_fkey(full_name), created_at')
                .eq('receiving_ally_id', allyIdData)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            // 2. Pending Partnership Requests (Where Ally is the responder)
            // Note: Usually clinics request allies, so we check clinic_ally_partnerships where ally_id is me and status is pending
            // However, the current DB schema for clinic_ally_partnerships doesn't have a 'requester' field explicitly distinguishing direction in the same way as ally-ally.
            // Assuming pending status in clinic_ally_partnerships implies a request TO the ally if it exists.
            
            const { data: partnerships } = await supabase
                .from('clinic_ally_partnerships')
                .select('id, clinics(name), created_at, status')
                .eq('ally_id', allyIdData)
                .eq('status', 'pending');
                
            const { data: allyPartnerships } = await supabase
                .from('ally_ally_partnerships')
                .select('id, requester:allies!requester_id(full_name), created_at, status')
                .eq('responder_id', allyIdData)
                .eq('status', 'pending');

            const newNotifications: NotificationItem[] = [];

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
                        linkPage: 'referrals',
                        linkContext: { activeTab: 'received' }
                    });
                });
            }

            if (partnerships) {
                partnerships.forEach(part => {
                    newNotifications.push({
                        id: `part-clinic-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Clínica',
                        description: `${(part.clinics as any)?.name || 'Una clínica'} quiere conectar contigo.`,
                        time: part.created_at,
                        linkPage: 'directory', 
                        linkContext: {}
                    });
                });
            }
            
            if (allyPartnerships) {
                allyPartnerships.forEach(part => {
                    newNotifications.push({
                        id: `part-ally-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Colega',
                        description: `${part.requester?.full_name || 'Un colega'} quiere conectar contigo.`,
                        time: part.created_at,
                        linkPage: 'partnerships', 
                        linkContext: { activeTab: 'allies' }
                    });
                });
            }
            
            newNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            setNotifications(newNotifications);
            setUnreadCount(newNotifications.length);

        } catch (error) {
            console.error("Error fetching ally notifications:", error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

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
                className="nav-item-hover"
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
                    right: -10,
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
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Avisos</h3>
                        {unreadCount > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{unreadCount} nuevos</span>}
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
                                <p style={{ fontSize: '0.9rem' }}>No tienes avisos pendientes.</p>
                            </div>
                        )}
                    </div>
                     <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)' }}>
                        <button onClick={() => { setIsOpen(false); onNavigate('notifications'); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                            Ver Todo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllyNotificationsMenu;
