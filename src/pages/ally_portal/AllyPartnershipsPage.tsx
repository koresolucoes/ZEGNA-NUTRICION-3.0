
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Clinic, PopulatedAllyPartnership, Ally } from '../../types';
import ClinicDetailsModal from '../../components/ally_portal/ClinicDetailsModal';
import SendReferralToClinicModal from '../../components/ally_portal/SendReferralToClinicModal';
import SendReferralToAllyModal from '../../components/ally_portal/SendReferralToAllyModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import CatalogCard from '../../components/shared/CatalogCard';
import AllyDetailsModal from '../../components/collaborators/AllyDetailsModal';

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
    const [modal, setModal] = useState<{ type: 'sendReferralClinic' | 'sendReferralAlly' | 'viewClinic' | 'viewAlly' | null, data: any }>({ type: null, data: null });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        setActionLoading(partnershipId);
        const { error } = await supabase.rpc('update_partnership_status_as_ally', {
            p_partnership_id: partnershipId,
            p_new_status: status
        });
        setActionLoading(null);
        if (error) setError(`Error al actualizar: ${error.message}`);
    };
    
    const handleAllyStatusUpdate = async (partnershipId: string, status: 'active' | 'revoked' | 'rejected') => {
        setActionLoading(partnershipId);
        const { error } = await supabase.rpc('update_ally_partnership_status', {
            p_partnership_id: partnershipId,
            p_new_status: status
        });
        setActionLoading(null);
        if (error) setError(`Error al actualizar: ${error.message}`);
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

    const actionButtonStyle = (primary: boolean = false): React.CSSProperties => ({
        flex: 1,
        padding: '0.6rem',
        borderRadius: '8px',
        border: '1px solid transparent',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: primary ? 'var(--primary-color)' : 'transparent',
        color: primary ? '#ffffff' : 'var(--text-color)',
        transition: 'all 0.2s',
        borderColor: primary ? 'transparent' : 'var(--border-color)'
    });

    return (
        <div className="fade-in">
            {modal.type === 'viewClinic' && modal.data && <ClinicDetailsModal isOpen={true} onClose={() => setModal({ type: null, data: null })} clinic={modal.data} />}
            {modal.type === 'viewAlly' && modal.data && <AllyDetailsModal isOpen={true} onClose={() => setModal({ type: null, data: null })} ally={modal.data} />}
            {modal.type === 'sendReferralClinic' && modal.data && <SendReferralToClinicModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); }} clinicId={modal.data.id} clinicName={modal.data.name} />}
            {modal.type === 'sendReferralAlly' && <SendReferralToAllyModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); }} receivingAlly={modal.data} />}
            
            <div style={{marginBottom: '2.5rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Mis Vínculos</h1>
                <p style={{ margin: 0, color: 'var(--text-light)', maxWidth: '700px' }}>
                    Gestiona tus conexiones estratégicas con clínicas y colegas.
                </p>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
                <TabButton id="clinics" label="Clínicas" />
                <TabButton id="allies" label="Colegas" />
            </div>
            
            {loading && <SkeletonLoader type="card" count={4} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && !error && (
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {activeTab === 'clinics' && (
                        partnerships.length > 0 ? partnerships.map(p => {
                            const status = p.status;
                            const isLoading = actionLoading === p.id;
                            
                            return (
                                <CatalogCard
                                    key={p.id}
                                    title={p.clinics?.name || 'Clínica'}
                                    subtitle={p.clinics?.address || 'Ubicación no disponible'}
                                    avatarSrc={p.clinics?.logo_url}
                                    avatarSeed={p.clinics?.name}
                                    headerGradientSeed={p.clinics?.name || 'Clinic'}
                                    overlayBadge={status === 'active' ? 'VINCULADO' : status.toUpperCase()}
                                    onImageClick={() => setModal({type: 'viewClinic', data: p.clinics})}
                                    actions={
                                        <>
                                            {status === 'active' ? (
                                                <button onClick={() => handleClinicStatusUpdate(p.id, 'revoked')} disabled={isLoading} style={{...actionButtonStyle(), color: 'var(--error-color)'}} title="Revocar">
                                                    {isLoading ? '...' : ICONS.delete} Revocar
                                                </button>
                                            ) : status === 'pending' ? (
                                                <button onClick={() => handleClinicStatusUpdate(p.id, 'active')} disabled={isLoading} style={actionButtonStyle(true)}>
                                                    {isLoading ? '...' : 'Aceptar'}
                                                </button>
                                            ) : (
                                                <button disabled style={{...actionButtonStyle(), cursor: 'default', opacity: 0.7}}>{status}</button>
                                            )}
                                            
                                            <button onClick={() => setModal({type: 'viewClinic', data: p.clinics})} style={actionButtonStyle()}>
                                                {ICONS.details} Detalles
                                            </button>
                                            
                                            {status === 'active' && (
                                                 <button onClick={() => setModal({ type: 'sendReferralClinic', data: p.clinics })} style={actionButtonStyle(true)}>
                                                    {ICONS.send} Referir
                                                </button>
                                            )}
                                        </>
                                    }
                                >
                                    {status === 'active' && (
                                        <div style={{marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--primary-color)'}}>
                                            {p.clinics?.phone_number && <span title={p.clinics.phone_number}>{ICONS.phone}</span>}
                                            {p.clinics?.website && <span title={p.clinics.website}>{ICONS.link}</span>}
                                            {p.clinics?.email && <span title={p.clinics.email}>{ICONS.send}</span>}
                                        </div>
                                    )}
                                </CatalogCard>
                            );
                        }) : (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                                <p style={{fontSize: '1.1rem'}}>No tienes vínculos con clínicas.</p>
                            </div>
                        )
                    )}

                    {activeTab === 'allies' && (
                        allyPartnerships.length > 0 ? allyPartnerships.map(p => {
                            const otherAlly = p.requester_id === allyId ? p.responder : p.requester;
                            const status = p.status;
                            const isLoading = actionLoading === p.id;
                            const isResponder = p.responder_id === allyId;

                            return (
                                <CatalogCard
                                    key={p.id}
                                    title={otherAlly.full_name}
                                    subtitle={otherAlly.specialty}
                                    avatarSrc={otherAlly.avatar_url}
                                    avatarSeed={otherAlly.full_name}
                                    headerGradientSeed={otherAlly.full_name}
                                    overlayBadge={status === 'active' ? 'VINCULADO' : status.toUpperCase()}
                                    onImageClick={() => setModal({type: 'viewAlly', data: otherAlly})}
                                    actions={
                                        <>
                                            {status === 'active' ? (
                                                <button onClick={() => handleAllyStatusUpdate(p.id, 'revoked')} disabled={isLoading} style={{...actionButtonStyle(), color: 'var(--error-color)'}} title="Revocar">
                                                    {isLoading ? '...' : ICONS.delete} Revocar
                                                </button>
                                            ) : (status === 'pending' && isResponder) ? (
                                                <>
                                                     <button onClick={() => handleAllyStatusUpdate(p.id, 'active')} disabled={isLoading} style={actionButtonStyle(true)}>
                                                        {isLoading ? '...' : 'Aceptar'}
                                                    </button>
                                                    <button onClick={() => handleAllyStatusUpdate(p.id, 'rejected')} disabled={isLoading} style={{...actionButtonStyle(), color: 'var(--error-color)'}}>
                                                        Rechazar
                                                    </button>
                                                </>
                                            ) : (
                                                <button disabled style={{...actionButtonStyle(), cursor: 'default', opacity: 0.7}}>{status === 'pending' ? 'Pendiente' : status}</button>
                                            )}

                                            <button onClick={() => setModal({type: 'viewAlly', data: otherAlly})} style={actionButtonStyle()}>
                                                {ICONS.details} Detalles
                                            </button>
                                            
                                            {status === 'active' && (
                                                <button onClick={() => setModal({ type: 'sendReferralAlly', data: otherAlly })} style={actionButtonStyle(true)}>
                                                    {ICONS.send} Referir
                                                </button>
                                            )}
                                        </>
                                    }
                                >
                                    {status === 'active' && (
                                        <div style={{marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--primary-color)'}}>
                                            {otherAlly.phone_number && <span title={otherAlly.phone_number}>{ICONS.phone}</span>}
                                            {otherAlly.website && <span title={otherAlly.website}>{ICONS.link}</span>}
                                            {otherAlly.contact_email && <span title={otherAlly.contact_email}>{ICONS.send}</span>}
                                        </div>
                                    )}
                                </CatalogCard>
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
