import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { Clinic, PopulatedAllyPartnership, Ally } from '../../types';
import ClinicDetailsModal from '../../components/ally_portal/ClinicDetailsModal';
import SendReferralToClinicModal from '../../components/ally_portal/SendReferralToClinicModal';
import SendReferralToAllyModal from '../../components/ally_portal/SendReferralToAllyModal';


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


    const pendingClinics = partnerships.filter(p => p.status === 'pending');
    const activeClinics = partnerships.filter(p => p.status === 'active');
    
    const pendingAllies = allyPartnerships.filter(p => p.status === 'pending' && p.responder_id === allyId);
    const activeAllies = allyPartnerships.filter(p => p.status === 'active');

    const actionButtonStyle: React.CSSProperties = {
        background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        padding: '0.5rem', borderRadius: '8px', flex: 1, fontSize: '0.75rem',
        textAlign: 'center', lineHeight: 1.2
    };

    const PartnershipCard: FC<{ partnership: PopulatedPartnership; isPending?: boolean }> = ({ partnership, isPending }) => (
        <div className="info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 0 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, padding: '1rem' }}>
                <img src={partnership.clinics?.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${partnership.clinics?.name?.charAt(0) || 'C'}&radius=50`} alt="logo" style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}}/>
                <div style={{flex: 1, overflow: 'hidden'}}><h4 style={{ margin: 0, color: 'var(--primary-color)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{partnership.clinics?.name || 'Clínica Asociada'}</h4><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{partnership.clinics?.address || 'Dirección no disponible'}</p></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                {isPending ? (
                    <><button onClick={() => handleClinicStatusUpdate(partnership.id, 'active')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.check}<span>Aceptar</span></button><button onClick={() => handleClinicStatusUpdate(partnership.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.close}<span>Rechazar</span></button></>
                ) : (
                    <><button onClick={() => setModal({ type: 'sendReferralClinic', data: partnership })} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.send}<span>Referir</span></button><button onClick={() => handleClinicStatusUpdate(partnership.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Revocar</span></button></>
                )}
                <button onClick={() => setModal({ type: 'viewDetails', data: partnership.clinics })} style={actionButtonStyle} className="nav-item-hover">{ICONS.details}<span>Detalles</span></button>
            </div>
        </div>
    );
    
    const AllyPartnershipCard: FC<{ partnership: PopulatedAllyPartnership; isPending?: boolean }> = ({ partnership, isPending }) => {
        const otherAlly = partnership.requester_id === allyId ? partnership.responder : partnership.requester;
        return (
             <div className="info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 0 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, padding: '1rem' }}>
                    <img src={otherAlly.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${otherAlly.full_name?.charAt(0) || 'A'}&radius=50`} alt="avatar" style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}}/>
                    <div style={{flex: 1, overflow: 'hidden'}}><h4 style={{ margin: 0, color: 'var(--primary-color)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{otherAlly.full_name}</h4><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{otherAlly.specialty}</p></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                    {isPending ? (
                        <><button onClick={() => handleAllyStatusUpdate(partnership.id, 'active')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.check}<span>Aceptar</span></button><button onClick={() => handleAllyStatusUpdate(partnership.id, 'rejected')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.close}<span>Rechazar</span></button></>
                    ) : (
                        <><button onClick={() => setModal({ type: 'sendReferralAlly', data: { receivingAlly: otherAlly } })} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.send}<span>Referir</span></button><button onClick={() => handleAllyStatusUpdate(partnership.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Revocar</span></button></>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in">
             {modal.type === 'sendReferralClinic' && <SendReferralToClinicModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); fetchPartnerships(); }} clinicId={modal.data.clinic_id} clinicName={modal.data.clinics.name} />}
             {modal.type === 'sendReferralAlly' && <SendReferralToAllyModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); fetchPartnerships(); }} receivingAlly={modal.data.receivingAlly} />}
            {modal.type === 'viewDetails' && <ClinicDetailsModal isOpen={true} onClose={() => setModal({ type: null, data: null })} clinic={modal.data as Clinic} />}
            <div style={styles.pageHeader}><h1>Mis Vínculos</h1></div>
            {error && <p style={styles.error}>{error}</p>}
            
            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'clinics' ? 'active' : ''}`} onClick={() => setActiveTab('clinics')}>Clínicas</button>
                <button className={`tab-button ${activeTab === 'allies' ? 'active' : ''}`} onClick={() => setActiveTab('allies')}>Aliados</button>
            </nav>

            {activeTab === 'clinics' && (
                <div className="fade-in" style={{marginTop: '1.5rem'}}>
                    <section>
                        <h2 style={{ fontSize: '1.2rem' }}>Solicitudes Pendientes de Clínicas</h2>
                        {loading ? <p>Cargando...</p> : pendingClinics.length === 0 ? <p>No tienes solicitudes pendientes.</p> : (<div className="info-grid">{pendingClinics.map(p => <PartnershipCard key={p.id} partnership={p} isPending />)}</div>)}
                    </section>
                    <section style={{marginTop: '2rem'}}>
                        <h2 style={{ fontSize: '1.2rem' }}>Vínculos Activos con Clínicas</h2>
                        {loading ? <p>Cargando...</p> : activeClinics.length === 0 ? <p>No tienes vínculos activos.</p> : (<div className="info-grid">{activeClinics.map(p => <PartnershipCard key={p.id} partnership={p} />)}</div>)}
                    </section>
                </div>
            )}

            {activeTab === 'allies' && (
                <div className="fade-in" style={{marginTop: '1.5rem'}}>
                    <section>
                        <h2 style={{ fontSize: '1.2rem' }}>Solicitudes de Aliados</h2>
                        {loading ? <p>Cargando...</p> : pendingAllies.length === 0 ? <p>No tienes solicitudes pendientes de otros aliados.</p> : (<div className="info-grid">{pendingAllies.map(p => <AllyPartnershipCard key={p.id} partnership={p} isPending />)}</div>)}
                    </section>
                    <section style={{marginTop: '2rem'}}>
                        <h2 style={{ fontSize: '1.2rem' }}>Vínculos Activos con Aliados</h2>
                        {loading ? <p>Cargando...</p> : activeAllies.length === 0 ? <p>No tienes vínculos activos con otros aliados.</p> : (<div className="info-grid">{activeAllies.map(p => <AllyPartnershipCard key={p.id} partnership={p} />)}</div>)}
                    </section>
                </div>
            )}
        </div>
    );
};

export default AllyPartnershipsPage;