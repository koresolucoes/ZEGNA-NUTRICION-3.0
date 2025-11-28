
import React, { FC, useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { PopulatedPartnership, PopulatedReferral, Ally, Person } from '../types';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { useClinic } from '../contexts/ClinicContext';
import AllyDetailsModal from '../components/collaborators/AllyDetailsModal';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import SendReferralToAllyModal from '../components/ally_portal/SendReferralToAllyModal';
import CatalogCard from '../components/shared/CatalogCard';


const calculateAge = (birthDate: string | null | undefined): string => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate.replace(/-/g, '/'));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return `${age} años`;
};

const CollaboratorsPage: FC<{ isMobile: boolean; onAddCollaborator: () => void; onAcceptReferral: (referralData: PopulatedReferral) => void; }> = ({ isMobile, onAddCollaborator, onAcceptReferral }) => {
    const { clinic } = useClinic();
    const [activeTab, setActiveTab] = useState('collaborators');
    
    // Data states
    const [persons, setPersons] = useState<Person[]>([]);
    const [partnerships, setPartnerships] = useState<PopulatedPartnership[]>([]);
    const [directoryAllies, setDirectoryAllies] = useState<Ally[]>([]);
    const [receivedReferrals, setReceivedReferrals] = useState<PopulatedReferral[]>([]);
    const [sentReferrals, setSentReferrals] = useState<PopulatedReferral[]>([]);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<{ type: 'deletePartnership' | 'deleteReferral' | 'send' | 'sendModal' | null; data?: any }>({ type: null });
    const [searchDirectoryTerm, setSearchDirectoryTerm] = useState('');
    const [requestedAllyIds, setRequestedAllyIds] = useState<Set<string>>(new Set());
    const [referralSearchTerm, setReferralSearchTerm] = useState('');
    const [debouncedReferralSearchTerm, setDebouncedReferralSearchTerm] = useState('');
    const [viewingAlly, setViewingAlly] = useState<Ally | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedReferralSearchTerm(referralSearchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [referralSearchTerm]);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true); setError(null);
        try {
            let receivedQuery = supabase.from('referrals').select('*, sending_ally:allies!referrals_sending_ally_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('receiving_clinic_id', clinic.id).order('created_at', { ascending: false });
            let sentQuery = supabase.from('referrals').select('*, receiving_ally:allies!referrals_receiving_ally_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('sending_clinic_id', clinic.id).order('created_at', { ascending: false });

            if (debouncedReferralSearchTerm) {
                const searchTerm = `%${debouncedReferralSearchTerm}%`;
                receivedQuery = receivedQuery.ilike('patient_info->>name', searchTerm);
                sentQuery = sentQuery.ilike('patient_info->>name', searchTerm);
            }

            const [partnershipsRes, receivedRes, sentRes, personsRes] = await Promise.all([
                supabase.from('clinic_ally_partnerships').select('*, allies(*)').eq('clinic_id', clinic.id).order('created_at', { ascending: false }),
                receivedQuery,
                sentQuery,
                supabase.from('persons').select('id, full_name, phone_number, user_id').eq('clinic_id', clinic.id).order('full_name'),
            ]);
            const errors = [partnershipsRes.error, receivedRes.error, sentRes.error, personsRes.error].filter(Boolean);
            if (errors.length > 0) throw errors[0];
            
            setPersons(personsRes.data as unknown as Person[] || []);
            const currentPartnerships: PopulatedPartnership[] = partnershipsRes.data || [];
            setPartnerships(currentPartnerships);
            
            const newRequestedAllyIds = new Set(currentPartnerships.filter(p => p.status === 'pending' && p.ally_id).map(p => p.ally_id!));
            setRequestedAllyIds(newRequestedAllyIds);

            const partneredAllyIds = currentPartnerships.map(p => p.ally_id).filter(Boolean);
            if (partneredAllyIds.length > 0) {
                 const { data: unpartneredAllies, error: alliesError } = await supabase
                    .from('allies')
                    .select('*')
                    .not('id', 'in', `(${partneredAllyIds.join(',')})`);
                if (alliesError) throw alliesError;
                setDirectoryAllies(unpartneredAllies || []);
            } else {
                 const { data: allAllies, error: alliesError } = await supabase.from('allies').select('*');
                 if (alliesError) throw alliesError;
                 setDirectoryAllies(allAllies || []);
            }

            setReceivedReferrals(receivedRes.data as any || []);
            setSentReferrals(sentRes.data as any || []);
        } catch (err: any) { 
            setError(err.message);
        } finally { 
            setLoading(false); 
        }
    }, [clinic, debouncedReferralSearchTerm]);

    useEffect(() => {
        if (!clinic) return;
        fetchData();
        const channel = supabase.channel(`collaborators-page-changes-${clinic.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_ally_partnerships' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'allies' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [clinic, fetchData]);

    const handleRevokePartnership = async () => {
        if (modal.type !== 'deletePartnership' || !modal.data) return;
        const { error } = await supabase.from('clinic_ally_partnerships').delete().eq('id', modal.data.id);
        if (error) setError(error.message);
        setModal({ type: null });
    };

    const handleDeleteReferral = async () => {
        if (modal.type !== 'deleteReferral' || !modal.data) return;
        const { error } = await supabase.from('referrals').delete().eq('id', modal.data.id);
        if (error) setError(error.message);
        setModal({ type: null });
    };

    const handleReferralStatusUpdate = async (referralId: string, status: 'accepted' | 'rejected') => {
        if (!clinic) return;
        const { error } = await supabase.rpc('update_referral_status', { p_referral_id: referralId, p_new_status: status, p_clinic_id: clinic.id });
        if (error) setError(error.message);
    };

    const handleAcceptReferral = (referral: PopulatedReferral) => {
        onAcceptReferral(referral);
    };

    const handleRequestPartnership = async (allyId: string) => {
        if (!clinic) return;
        setRequestedAllyIds(prev => new Set(prev).add(allyId));
        const { error } = await supabase.rpc('request_partnership_with_ally', { p_clinic_id: clinic.id, p_ally_id: allyId });
        if (error) {
            setError(`Error al enviar solicitud: ${error.message}`);
            setRequestedAllyIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(allyId);
                return newSet;
            });
        }
    }
    
    const handleUpdatePartnershipStatus = async (partnershipId: string, newStatus: 'active' | 'revoked') => {
        const { error } = await supabase
            .from('clinic_ally_partnerships')
            .update({ status: newStatus })
            .eq('id', partnershipId);
        if (error) setError(`Error al actualizar estado: ${error.message}`);
    };

    const handleConfirm = () => {
        if (modal.type === 'deletePartnership') handleRevokePartnership();
        else if (modal.type === 'deleteReferral') handleDeleteReferral();
    };
    
    const StatusBadge: FC<{ status: string }> = ({ status }) => (
         <span style={{ 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            textTransform: 'capitalize', 
            backgroundColor: status === 'active' ? 'rgba(16, 185, 129, 0.2)' : status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: status === 'active' ? '#10B981' : status === 'pending' ? '#F59E0B' : '#EF4444',
            border: `1px solid ${status === 'active' ? 'rgba(16, 185, 129, 0.3)' : status === 'pending' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
             {status === 'active' ? 'Activo' : status === 'pending' ? 'Pendiente' : status}
        </span>
    );

    const TabButton = ({ id, label, active }: { id: string, label: string, active: boolean }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                backgroundColor: active ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                color: active ? '#ffffff' : 'var(--text-light)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: active ? '0 4px 12px rgba(56, 189, 248, 0.3)' : 'none',
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

    // --- Renderers ---
    const renderCollaborators = () => (
        <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {partnerships.map(p => (
                <CatalogCard
                    key={p.id}
                    title={p.allies.full_name}
                    subtitle={p.allies.specialty}
                    description={p.allies.biography || 'Sin biografía.'}
                    avatarSrc={p.allies.avatar_url}
                    avatarSeed={p.allies.full_name}
                    headerGradientSeed={p.allies.full_name}
                    overlayBadge={p.status === 'active' ? 'VINCULADO' : p.status.toUpperCase()}
                    onImageClick={() => setViewingAlly(p.allies)}
                    actions={
                        <>
                            {p.status === 'active' && (
                                <button onClick={() => setModal({ type: 'sendModal', data: p })} style={actionButtonStyle(true)}>
                                    {ICONS.send} Referir
                                </button>
                            )}
                            <button onClick={() => setViewingAlly(p.allies)} style={actionButtonStyle()}>
                                {ICONS.details} Detalles
                            </button>
                            {p.status === 'active' && (
                                <button onClick={() => handleUpdatePartnershipStatus(p.id, 'revoked')} style={{...actionButtonStyle(), color: 'var(--error-color)'}} title="Revocar">
                                    {ICONS.delete}
                                </button>
                            )}
                        </>
                    }
                >
                    <div style={{marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--primary-color)'}}>
                        {p.allies.phone_number && <span title={p.allies.phone_number}>{ICONS.phone}</span>}
                        {p.allies.website && <span title={p.allies.website}>{ICONS.link}</span>}
                        {p.allies.contact_email && <span title={p.allies.contact_email}>{ICONS.send}</span>}
                    </div>
                </CatalogCard>
            ))}
        </div>
    );

    const renderDirectory = () => {
        const filteredAllies = directoryAllies.filter(ally => ally.full_name?.toLowerCase().includes(searchDirectoryTerm.toLowerCase()) || ally.specialty?.toLowerCase().includes(searchDirectoryTerm.toLowerCase()));
        return (
            <>
                <div style={{...styles.filterBar, maxWidth: '500px', marginBottom: '2rem', padding: 0, border: 'none', background: 'transparent', boxShadow: 'none'}}>
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar..." value={searchDirectoryTerm} onChange={e => setSearchDirectoryTerm(e.target.value)} style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '12px', paddingLeft: '2.5rem', height: '50px', fontSize: '1rem'}} />
                    </div>
                </div>
                 <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredAllies.map(ally => (
                        <CatalogCard
                            key={ally.id}
                            title={ally.full_name}
                            subtitle={ally.specialty}
                            description={ally.office_address || undefined}
                            avatarSrc={ally.avatar_url}
                            avatarSeed={ally.full_name}
                            headerGradientSeed={ally.full_name}
                            onImageClick={() => setViewingAlly(ally)}
                            actions={
                                <>
                                    <button onClick={() => handleRequestPartnership(ally.id)} disabled={requestedAllyIds.has(ally.id)} style={actionButtonStyle(true)}>
                                        {requestedAllyIds.has(ally.id) ? 'Pendiente' : 'Conectar'}
                                    </button>
                                    <button onClick={() => setViewingAlly(ally)} style={actionButtonStyle()}>
                                        {ICONS.details} Detalles
                                    </button>
                                </>
                            }
                        />
                    ))}
                </div>
            </>
        );
    }

    const renderReferrals = (type: 'received' | 'sent') => {
        const referrals = type === 'received' ? receivedReferrals : sentReferrals;
        return (
            <>
                <div style={{...styles.filterBar, maxWidth: '400px', marginBottom: '2rem', padding: 0, border: 'none', background: 'transparent', boxShadow: 'none'}}> 
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar..." value={referralSearchTerm} onChange={e => setReferralSearchTerm(e.target.value)} style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '12px', paddingLeft: '2.5rem', height: '50px', fontSize: '1rem'}} />
                    </div>
                </div>
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {referrals.map(r => {
                        const partner = type === 'received' ? r.sending_ally : r.receiving_ally;
                        const patientInfo = r.patient_info as any;
                        
                        // Using standard card style for referrals as they are transactions, not catalog items
                        // But maintaining consistent styling
                        return (
                            <div key={r.id} className="card-hover" style={{
                                backgroundColor: 'var(--surface-color)',
                                borderRadius: '16px',
                                padding: '0',
                                display: 'flex',
                                flexDirection: 'column',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                position: 'relative',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                overflow: 'hidden'
                            }}>
                                <div style={{padding: '1.5rem'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{patientInfo.name}</h4>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>{type === 'received' ? 'De: ' : 'Para: '}{partner?.full_name || 'N/A'}</p>
                                        </div>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    
                                     <div style={{marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid var(--border-color)'}}>
                                        <p style={{margin: 0, fontStyle: 'italic', color: 'var(--text-light)'}}>"{r.notes || 'Sin notas.'}"</p>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    backgroundColor: 'var(--surface-hover-color)',
                                    borderTop: '1px solid var(--border-color)',
                                    padding: '0.75rem',
                                    gap: '0.5rem'
                                }}>
                                    {type === 'received' && r.status === 'pending' ? (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); handleAcceptReferral(r); }} style={actionButtonStyle(true)}>
                                                {ICONS.check} Aceptar
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleReferralStatusUpdate(r.id, 'rejected'); }} style={{...actionButtonStyle(), color: 'var(--error-color)'}}>
                                                {ICONS.close} Rechazar
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteReferral', data: r }); }} style={{...actionButtonStyle(), color: 'var(--text-light)'}}>
                                            {ICONS.delete} Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        );
    };

    return (
        <div className="fade-in" style={{paddingBottom: '2rem'}}>
            {viewingAlly && <AllyDetailsModal isOpen={!!viewingAlly} onClose={() => setViewingAlly(null)} ally={viewingAlly} />}
            {modal.type === 'sendModal' && <SendReferralToAllyModal isOpen={true} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); fetchData(); }} receivingAlly={modal.data.allies} />}
            {modal.type?.startsWith('delete') && <ConfirmationModal isOpen={true} onClose={() => setModal({type: null})} onConfirm={handleConfirm} title="Confirmar Acción" message={<p>¿Estás seguro? Esta acción no se puede deshacer.</p>} />}

            <div style={{...styles.pageHeader, marginBottom: '2.5rem'}}>
                <div>
                    <h1 style={{margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px'}}>Mis Colaboradores</h1>
                    <p style={{margin: 0, color: 'var(--text-light)'}}>Conecta con profesionales y expande tu red de cuidado.</p>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={onAddCollaborator} className="button-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '12px'}}>
                        {ICONS.add} Invitar
                    </button>
                </div>
            </div>

            <div style={{display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem'}}>
                <TabButton id="collaborators" label="Mis Vínculos" active={activeTab === 'collaborators'} />
                <TabButton id="directory" label="Directorio" active={activeTab === 'directory'} />
                <TabButton id="received" label="Recibidos" active={activeTab === 'received'} />
                <TabButton id="sent" label="Enviados" active={activeTab === 'sent'} />
            </div>
            
            {loading && <SkeletonLoader type="card" count={4} />}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                <>
                    {activeTab === 'collaborators' && (partnerships.length > 0 ? renderCollaborators() : <p>No tienes colaboradores conectados.</p>)}
                    {activeTab === 'directory' && renderDirectory()}
                    {activeTab === 'received' && renderReferrals('received')}
                    {activeTab === 'sent' && renderReferrals('sent')}
                </>
            )}
        </div>
    );
};

export default CollaboratorsPage;
