
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Clinic, PopulatedAllyPartnership, Ally } from '../../types';
import ClinicDetailsModal from '../../components/ally_portal/ClinicDetailsModal';
import SendReferralToClinicModal from '../../components/ally_portal/SendReferralToClinicModal';
import SendReferralToAllyModal from '../../components/ally_portal/SendReferralToAllyModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

// Define a specific type for referrals populated with clinic info
type PopulatedPartnership = {
    id: string;
    status: string;
    clinic_id: string;
    clinics: {
        id: string;
        name: string;
        logo_url: string | null;
        address: string | null;
        phone_number: string | null;
        email: string | null;
        website: string | null;
    } | null;
};

const AllyPartnershipsPage: FC = () => {
    const [partnerships, setPartnerships] = useState<PopulatedPartnership[]>([]);
    const [allyPartnerships, setAllyPartnerships] = useState<PopulatedAllyPartnership[]>([]);
    const [allyId, setAllyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'clinics' | 'allies'>('clinics');
    const [modal, setModal] = useState<{ type: 'sendReferralClinic' | 'sendReferralAlly' | 'viewDetails' | null, data: any }>({ type: null, data: null });

    const fetchPartnerships = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: allyIdData, error: allyIdError } = await supabase.rpc('get_ally_id_for_current_user');
            if (allyIdError) throw allyIdError;
            setAllyId(allyIdData);

            const [clinicPartnershipsRes, allyPartnershipsRes] = await Promise.all([
                supabase.from('clinic_ally_partnerships').select('*, clinics(*)').eq('ally_id', allyIdData).order('created_at', { ascending: false }),
                supabase.from('ally_ally_partnerships').select('*, requester:allies!requester_id(*), responder:allies!responder_id(*)').or(`requester_id.eq.${allyIdData},responder_id.eq.${allyIdData}`)
            ]);
            
            if (clinicPartnershipsRes.error) throw clinicPartnershipsRes.error;
            if (allyPartnershipsRes.error) throw allyPartnershipsRes.error;
            
            setPartnerships(clinicPartnershipsRes.data as any);
            setAllyPartnerships(allyPartnershipsRes.data as any);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPartnerships();
        const channel = supabase.channel('ally-partnerships-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_ally_partnerships' }, fetchPartnerships)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ally_ally_partnerships' }, fetchPartnerships)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchPartnerships]);

    const handleClinicStatusUpdate = async (partnershipId: string, status: 'active' | 'revoked') => {
        const { error } = await supabase.rpc('update_partnership_status_as_ally', {
            p_partnership_id: partnershipId,
            p_new_status: status
        });
        if (error) setError(`Error al actualizar: ${error.message}`);
    };
    
    const handleAllyStatusUpdate = async (partnershipId: string, status: 'active' | 'revoked' | 'rejected') => {
        const { error } = await supabase.rpc('update_ally_partnership_status', {
            p_partnership_id: partnershipId,
            p_new_status: status
        });
        if (error) setError(`Error al actualizar: ${error.message}`);
    };

    const StatusBadge: FC<{ status: string }> = ({ status }) => {
        const colors: any = {
            pending: { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308', icon: '⏳' },
            active: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', icon: '✅' },
            revoked: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', icon: '🚫' },
            rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', icon: '❌' },
        };
        const style = colors[status] || { bg: '#f3f4f6', text: '#6b7280', icon: '?' };
        return (
            <span style={{ 
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, 
                backgroundColor: style.bg, color: style.text, display: 'flex', alignItems: 'center', gap: '4px' 
            }}>
                <span>{style.icon}</span>
                <span style={{textTransform: 'capitalize'}}>{status === 'active' ? 'Vinculado' : status}</span>
            </span>
        );
    };

    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            style={{
                padding: '0.75rem 2rem',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                backgroundColor: activeTab === id ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                color: activeTab === id ? '#ffffff' : 'var(--text-light)',
                transition: 'all 0.2s',
                boxShadow: activeTab === id ? '0 4px 12px rgba(56, 189, 248, 0.3)' : 'none',
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="fade-in">
            {modal.type === 'viewDetails' && modal.data && <ClinicDetailsModal isOpen={true} onClose={() => setModal({ type: null, data: null })} clinic={modal.data} />}
            {/* Send referral logic would be integrated here similar to CollaboratorsPage */}
            
            <div style={{marginBottom: '2.5rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Mis Vínculos</h1>
                <p style={{ margin: 0, color: 'var(--text-light)', maxWidth: '700px' }}>
                    Gestiona tus conexiones estratégicas.
                </p>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
                <TabButton id="clinics" label="Clínicas" />
                <TabButton id="allies" label="Colegas" />
            </div>
            
            {loading && <SkeletonLoader type="card" count={4} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && !error && (
                <div className="info-grid">
                    {activeTab === 'clinics' && (
                        partnerships.length > 0 ? partnerships.map(p => (
                            <div key={p.id} className="card-hover" style={{
                                backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', 
                                overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)'
                            }}>
                                <div style={{padding: '1.5rem', flex: 1}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                         <div style={{width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--surface-hover-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)'}}>
                                            {p.clinics?.name.charAt(0)}
                                         </div>
                                         <StatusBadge status={p.status} />
                                    </div>
                                    
                                    <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>{p.clinics?.name}</h3>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                        {ICONS.mapPin} {p.clinics?.address || 'Sin dirección'}
                                    </p>
                                </div>
                                
                                <div style={{ display: 'flex', padding: '1rem', borderTop: '1px solid var(--border-color)', gap: '0.75rem', backgroundColor: 'var(--surface-hover-color)' }}>
                                    <button onClick={() => setModal({type: 'viewDetails', data: p.clinics})} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                        Detalles
                                    </button>
                                    {p.status === 'active' ? (
                                        <button onClick={() => handleClinicStatusUpdate(p.id, 'revoked')} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--error-color)', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                            Revocar
                                        </button>
                                    ) : p.status === 'pending' ? (
                                         <button onClick={() => handleClinicStatusUpdate(p.id, 'active')} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                            Aceptar
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )) : (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                                <p style={{fontSize: '1.1rem'}}>No tienes vínculos con clínicas.</p>
                            </div>
                        )
                    )}

                    {activeTab === 'allies' && (
                        allyPartnerships.length > 0 ? allyPartnerships.map(p => {
                            const otherAlly = p.requester_id === allyId ? p.responder : p.requester;
                            return (
                                <div key={p.id} className="card-hover" style={{
                                    backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', 
                                    overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)'
                                }}>
                                    <div style={{padding: '1.5rem', flex: 1}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                            <img src={otherAlly?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${otherAlly?.full_name}&radius=50`} alt="Avatar" style={{width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover'}} />
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>{otherAlly?.full_name}</h3>
                                        <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 500}}>{otherAlly?.specialty}</p>
                                    </div>
                                    
                                    <div style={{ display: 'flex', padding: '1rem', borderTop: '1px solid var(--border-color)', gap: '0.75rem', backgroundColor: 'var(--surface-hover-color)' }}>
                                          {p.status === 'active' ? (
                                            <button onClick={() => handleAllyStatusUpdate(p.id, 'revoked')} style={{width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--error-color)', backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                                Revocar
                                            </button>
                                        ) : (p.status === 'pending' && p.responder_id === allyId) ? (
                                            <>
                                                <button onClick={() => handleAllyStatusUpdate(p.id, 'active')} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                                    Aceptar
                                                </button>
                                                <button onClick={() => handleAllyStatusUpdate(p.id, 'rejected')} style={{flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--error-color)', backgroundColor: 'var(--surface-color)', color: 'var(--error-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'}}>
                                                    Rechazar
                                                </button>
                                            </>
                                        ) : (
                                             <button disabled style={{width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-light)', cursor: 'default', fontSize: '0.85rem'}}>
                                                {p.status === 'pending' ? 'Solicitud Enviada' : 'Acción no disponible'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                                <p style={{fontSize: '1.1rem'}}>No tienes vínculos con otros profesionales.</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default AllyPartnershipsPage;
