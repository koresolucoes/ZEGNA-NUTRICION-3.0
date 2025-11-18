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
            pending: { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308' },
            active: { bg: 'var(--primary-light)', text: 'var(--primary-color)' },
            revoked: { bg: 'var(--error-bg)', text: 'var(--error-color)' },
            rejected: { bg: 'var(--error-bg)', text: 'var(--error-color)' },
        };
        const style = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
        return (
            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, backgroundColor: style.bg, color: style.text, border: `1px solid ${style.text}` }}>
                {status}
            </span>
        );
    };

    const actionButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: 'var(--text-light)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5rem',
        borderRadius: '8px',
        flex: 1,
        fontSize: '0.75rem',
        textAlign: 'center',
        lineHeight: 1.2
    };

    return (
        <div className="fade-in">
            {modal.type === 'viewDetails' && modal.data && <ClinicDetailsModal isOpen={true} onClose={() => setModal({ type: null, data: null })} clinic={modal.data} />}
            {/* Modals for sending referrals would go here if implemented fully with patient selection logic */}
            
            <div style={styles.pageHeader}>
                <h1>Mis Vínculos</h1>
            </div>
            <p style={{marginTop: '-1.5rem', color: 'var(--text-light)', maxWidth: '800px', marginBottom: '1.5rem'}}>
                Gestiona tus conexiones con clínicas y otros profesionales.
            </p>

            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'clinics' ? 'active' : ''}`} onClick={() => setActiveTab('clinics')}>Clínicas</button>
                <button className={`tab-button ${activeTab === 'allies' ? 'active' : ''}`} onClick={() => setActiveTab('allies')}>Aliados</button>
            </nav>
            
            {loading && <SkeletonLoader type="card" count={4} />}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && !error && (
                <div className="info-grid" style={{marginTop: '1.5rem'}}>
                    {activeTab === 'clinics' && (
                        partnerships.length > 0 ? partnerships.map(p => (
                            <div key={p.id} className="info-card" style={{display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch'}}>
                                <div style={{padding: '1rem', flex: 1}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                                         <h4 style={{margin: 0, color: 'var(--primary-color)'}}>{p.clinics?.name}</h4>
                                         <StatusBadge status={p.status} />
                                    </div>
                                    <p style={{margin: 0, fontSize: '0.9rem'}}>{p.clinics?.address}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                                    <button onClick={() => setModal({type: 'viewDetails', data: p.clinics})} style={actionButtonStyle} className="nav-item-hover">
                                        {ICONS.details}
                                        <span>Detalles</span>
                                    </button>
                                    {p.status === 'active' ? (
                                        <button onClick={() => handleClinicStatusUpdate(p.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">
                                            {ICONS.delete}
                                            <span>Revocar</span>
                                        </button>
                                    ) : p.status === 'pending' ? (
                                         <button onClick={() => handleClinicStatusUpdate(p.id, 'active')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">
                                            {ICONS.check}
                                            <span>Aceptar</span>
                                        </button>
                                    ) : (
                                         <button disabled style={{...actionButtonStyle, opacity: 0.5}}>
                                            {ICONS.close}
                                            <span>{p.status}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : <p>No tienes vínculos con clínicas.</p>
                    )}

                    {activeTab === 'allies' && (
                        allyPartnerships.length > 0 ? allyPartnerships.map(p => {
                            const otherAlly = p.requester_id === allyId ? p.responder : p.requester;
                            return (
                                <div key={p.id} className="info-card" style={{display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch'}}>
                                    <div style={{padding: '1rem', flex: 1}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                                            <div>
                                                <h4 style={{margin: 0, color: 'var(--primary-color)'}}>{otherAlly?.full_name}</h4>
                                                <p style={{margin: 0, fontSize: '0.85rem', fontWeight: 500}}>{otherAlly?.specialty}</p>
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                                          {p.status === 'active' ? (
                                            <button onClick={() => handleAllyStatusUpdate(p.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">
                                                {ICONS.delete}
                                                <span>Revocar</span>
                                            </button>
                                        ) : (p.status === 'pending' && p.responder_id === allyId) ? ( // Only responder can accept
                                            <>
                                                <button onClick={() => handleAllyStatusUpdate(p.id, 'active')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">
                                                    {ICONS.check}
                                                    <span>Aceptar</span>
                                                </button>
                                                <button onClick={() => handleAllyStatusUpdate(p.id, 'rejected')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">
                                                    {ICONS.close}
                                                    <span>Rechazar</span>
                                                </button>
                                            </>
                                        ) : (
                                             <button disabled style={{...actionButtonStyle, opacity: 0.5}}>
                                                <span>{p.status}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : <p>No tienes vínculos con otros aliados.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AllyPartnershipsPage;