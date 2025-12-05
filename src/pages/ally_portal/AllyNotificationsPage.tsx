
import React, { FC, useState, useEffect, useCallback } from 'react';
import PushNotificationManager from '../../components/shared/PushNotificationManager';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

interface NotificationItem {
    id: string;
    type: 'referral' | 'partnership';
    title: string;
    description: string;
    time: string;
    linkPage: string;
    linkContext?: any;
}

const AllyNotificationsPage: FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError || !allyIdData) return;

            const [referralsRes, partnershipsRes, allyPartnershipsRes] = await Promise.all([
                supabase.from('referrals')
                    .select('id, patient_info, sending_clinic:clinics!referrals_sending_clinic_id_fkey(name), sending_ally:allies!referrals_sending_ally_id_fkey(full_name), created_at')
                    .eq('receiving_ally_id', allyIdData)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false }),
                supabase.from('clinic_ally_partnerships')
                    .select('id, clinics(name), created_at, status')
                    .eq('ally_id', allyIdData)
                    .eq('status', 'pending'),
                supabase.from('ally_ally_partnerships')
                    .select('id, requester:allies!requester_id(full_name), created_at, status')
                    .eq('responder_id', allyIdData)
                    .eq('status', 'pending')
            ]);

            const newNotifications: NotificationItem[] = [];

            if (referralsRes.data) {
                referralsRes.data.forEach(ref => {
                    const senderName = ref.sending_clinic?.name || ref.sending_ally?.full_name || 'Desconocido';
                    const patientName = (ref.patient_info as any)?.name || 'Paciente';
                    newNotifications.push({
                        id: `ref-${ref.id}`,
                        type: 'referral',
                        title: 'Nuevo Referido Pendiente',
                        description: `${senderName} te ha referido a ${patientName}.`,
                        time: ref.created_at,
                        linkPage: 'referrals',
                    });
                });
            }

            if (partnershipsRes.data) {
                partnershipsRes.data.forEach(part => {
                    newNotifications.push({
                        id: `part-clinic-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Clínica',
                        description: `${(part.clinics as any)?.name || 'Una clínica'} quiere conectar contigo.`,
                        time: part.created_at,
                        linkPage: 'directory',
                    });
                });
            }

            if (allyPartnershipsRes.data) {
                allyPartnershipsRes.data.forEach(part => {
                    newNotifications.push({
                        id: `part-ally-${part.id}`,
                        type: 'partnership',
                        title: 'Solicitud de Colega',
                        description: `${part.requester?.full_name || 'Un colega'} quiere conectar contigo.`,
                        time: part.created_at,
                        linkPage: 'partnerships', 
                    });
                });
            }
            
            newNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            setNotifications(newNotifications);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Notificaciones</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Mantente al día con referidos, solicitudes y configuración de alertas.
                </p>
            </div>
            
            <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)'}}>
                <button 
                    onClick={() => setActiveTab('alerts')}
                    style={{
                        padding: '1rem', background: 'none', border: 'none', 
                        borderBottom: activeTab === 'alerts' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        fontWeight: activeTab === 'alerts' ? 700 : 500,
                        color: activeTab === 'alerts' ? 'var(--primary-color)' : 'var(--text-light)',
                        cursor: 'pointer'
                    }}
                >
                    Avisos {notifications.length > 0 && <span style={{backgroundColor: 'var(--error-color)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', marginLeft: '4px'}}>{notifications.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    style={{
                        padding: '1rem', background: 'none', border: 'none', 
                        borderBottom: activeTab === 'settings' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        fontWeight: activeTab === 'settings' ? 700 : 500,
                        color: activeTab === 'settings' ? 'var(--primary-color)' : 'var(--text-light)',
                        cursor: 'pointer'
                    }}
                >
                    Configuración Push
                </button>
            </div>

            {activeTab === 'alerts' && (
                <div className="fade-in">
                    {loading ? <SkeletonLoader type="list" count={3} /> : 
                    notifications.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '4rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', color: 'var(--text-light)'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>🔕</div>
                            <p>No tienes avisos pendientes por revisar.</p>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {notifications.map(item => (
                                <div key={item.id} style={{
                                    backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', 
                                    border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary-color)',
                                    boxShadow: 'var(--shadow)'
                                }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                        <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)'}}>{item.title}</h3>
                                        <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(item.time).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{margin: '0', color: 'var(--text-light)'}}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="fade-in">
                    <div style={{backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)'}}>
                        <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Alertas en este Dispositivo</h3>
                        <p style={{color: 'var(--text-light)', marginBottom: '2rem'}}>Activa las notificaciones push para recibir alertas instantáneas cuando te envíen un paciente o soliciten un vínculo, incluso si no estás en la app.</p>
                        <PushNotificationManager />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllyNotificationsPage;
