
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Clinic, Person, PopulatedClinicPartnership, PopulatedReferral } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ClinicDetailsModal from '../components/ally_portal/ClinicDetailsModal';
import SendReferralToClinicModal from '../components/clinic_network/SendReferralToClinicModal';
import SkeletonLoader from '../components/shared/SkeletonLoader';
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

const ClinicNetworkPage: FC<{ navigate: (page: string, context?: any) => void; }> = ({ navigate }) => {
    const { clinic: myClinic } = useClinic();
    const [activeTab, setActiveTab] = useState('directory');
    
    // Data states
    const [allClinics, setAllClinics] = useState<Clinic[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [partnerships, setPartnerships] = useState<PopulatedClinicPartnership[]>([]);
    const [receivedReferrals, setReceivedReferrals] = useState<PopulatedReferral[]>([]);
    const [sentReferrals, setSentReferrals] = useState<PopulatedReferral[]>([]);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<{ type: 'sendReferral' | 'viewDetails' | 'deletePartnership' | 'deleteReferral' | null; data?: any }>({ type: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [referralSearchTerm, setReferralSearchTerm] = useState('');
    const [debouncedReferralSearchTerm, setDebouncedReferralSearchTerm] = useState('');
    const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading'>>({});

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedReferralSearchTerm(referralSearchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [referralSearchTerm]);

    const fetchData = useCallback(async () => {
        if (!myClinic) return;
        setLoading(true); setError(null);
        try {
            let receivedQuery = supabase.from('referrals').select('*, sending_clinic:clinics!referrals_sending_clinic_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('receiving_clinic_id', myClinic.id);
            let sentQuery = supabase.from('referrals').select('*, receiving_clinic:clinics!referrals_receiving_clinic_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('sending_clinic_id', myClinic.id);

            if (debouncedReferralSearchTerm) {
                const searchTermFilter = `%${debouncedReferralSearchTerm}%`;
                receivedQuery = receivedQuery.ilike('patient_info->>name', searchTermFilter);
                sentQuery = sentQuery.ilike('patient_info->>name', searchTermFilter);
            }

            const [clinicsRes, personsRes, partnershipsRes, receivedRes, sentRes] = await Promise.all([
                supabase.from('clinics').select('*').order('name'),
                supabase.from('persons').select('id, full_name, phone_number, user_id').eq('clinic_id', myClinic.id).order('full_name'),
                supabase.from('clinic_clinic_partnerships').select('*, requester:clinics!requester_id(*), responder:clinics!responder_id(*)').or(`requester_id.eq.${myClinic.id},responder_id.eq.${myClinic.id}`),
                receivedQuery.order('created_at', { ascending: false }),
                sentQuery.order('created_at', { ascending: false })
            ]);
            
            const errors = [clinicsRes.error, personsRes.error, partnershipsRes.error, receivedRes.error, sentRes.error].filter(Boolean);
            if (errors.length > 0) throw errors[0];
            
            setAllClinics(clinicsRes.data as unknown as Clinic[] || []);
            setPersons(personsRes.data as unknown as Person[] || []);
            setPartnerships(partnershipsRes.data as any || []);
            setReceivedReferrals(receivedRes.data as any || []);
            setSentReferrals(sentRes.data as any || []);

        } catch (err: any) { 
            setError(err.message);
        } finally { 
            setLoading(false); 
        }
    }, [myClinic, debouncedReferralSearchTerm]);

    useEffect(() => {
        if (!myClinic) return;
        fetchData();
        const channel = supabase.channel(`clinic-network-changes-${myClinic.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_clinic_partnerships' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [myClinic, fetchData]);
    
    const handlePartnershipRequest = async (clinicId: string) => {
        setRequestStatus(prev => ({...prev, [clinicId]: 'loading'}));
        const { error } = await supabase.rpc('request_clinic_partnership', { p_responder_clinic_id: clinicId });
        setRequestStatus(prev => ({...prev, [clinicId]: 'idle'}));
        if (error) setError(error.message);
    };

    const handlePartnershipUpdate = async (partnershipId: string, status: 'active' | 'rejected' | 'revoked') => {
        const { error } = await supabase.rpc('update_clinic_partnership_status', { p_partnership_id: partnershipId, p_new_status: status });
        if (error) setError(error.message);
    };
    
    const handleReferralStatusUpdate = async (referralId: string, status: 'accepted' | 'rejected') => {
        if (!myClinic) return;
        const { error } = await supabase.rpc('update_referral_status', { p_referral_id: referralId, p_new_status: status, p_clinic_id: myClinic.id });
        if (error) setError(error.message);
    };

    const handleConfirm = () => {
        if (modal.type === 'deletePartnership') {
            handlePartnershipUpdate(modal.data.id, 'revoked');
        } else if (modal.type === 'deleteReferral') {
            supabase.from('referrals').delete().eq('id', modal.data.id).then(({error}) => { if (error) setError(error.message) });
        }
        setModal({ type: null });
    };

    const directoryClinics = useMemo(() => allClinics.filter(c => c.id !== myClinic?.id && (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.address?.toLowerCase().includes(searchTerm.toLowerCase()))), [allClinics, myClinic, searchTerm]);
    const activePartnerships = useMemo(() => partnerships.filter(p => p.status === 'active'), [partnerships]);
    const pendingPartnerships = useMemo(() => partnerships.filter(p => p.status === 'pending' && p.responder_id === myClinic?.id), [partnerships, myClinic]);
    
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
             {status === 'active' ? 'Activo' : status === 'pending' ? 'Pendiente' : status === 'revoked' ? 'Revocado' : status}
        </span>
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

    const renderDirectory = () => (
        <>
            <div style={{...styles.filterBar, marginBottom: '2rem', padding: 0, border: 'none', background: 'transparent', boxShadow: 'none'}}>
                <div style={{...styles.searchInputContainer, maxWidth: '100%'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar clínica..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{
                            ...styles.searchInput, 
                            backgroundColor: 'var(--surface-color)', 
                            borderColor: 'var(--border-color)', 
                            borderRadius: '12px', 
                            paddingLeft: '2.5rem',
                            height: '50px',
                            fontSize: '1rem'
                        }} 
                    />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {directoryClinics.map(clinic => {
                 const partnership = partnerships.find(p => (p.requester_id === myClinic?.id && p.responder_id === clinic.id) || (p.requester_id === clinic.id && p.responder_id === myClinic?.id));
                 const status = partnership?.status;
                 const isMyRequest = partnership?.requester_id === myClinic?.id;
                 const isLoading = requestStatus[clinic.id] === 'loading';
                 
                 // Define actions based on status
                 const renderActions = () => {
                    if (status === 'active') {
                        return (
                            <button onClick={() => setModal({ type: 'sendReferral', data: { receivingClinic: clinic } })} style={actionButtonStyle(true)}>
                                {ICONS.send} Referir
                            </button>
                        );
                    } else if (status === 'pending') {
                        return (
                            <button disabled style={{...actionButtonStyle(), opacity: 0.7, cursor: 'default', backgroundColor: 'var(--surface-hover-color)'}}>
                                {isMyRequest ? 'Enviada' : 'Pendiente'}
                            </button>
                        );
                    } else {
                        return (
                             <button onClick={() => handlePartnershipRequest(clinic.id)} disabled={isLoading} style={actionButtonStyle(true)}>
                                {isLoading ? '...' : (status === 'revoked' || status === 'rejected' ? 'Reconectar' : 'Conectar')}
                            </button>
                        );
                    }
                 };

                return (
                    <CatalogCard
                        key={clinic.id}
                        title={clinic.name}
                        subtitle={clinic.address || 'Ubicación no disponible'}
                        description={clinic.email ? `Contacto: ${clinic.email}` : undefined}
                        avatarSrc={clinic.logo_url}
                        avatarSeed={clinic.name}
                        headerGradientSeed={clinic.name}
                        overlayBadge={status === 'active' ? 'VINCULADO' : undefined}
                        actions={
                            <>
                                <button onClick={() => setModal({ type: 'viewDetails', data: clinic })} style={actionButtonStyle()}>
                                    {ICONS.details} Detalles
                                </button>
                                {renderActions()}
                            </>
                        }
                    />
                )
            })}
            </div>
        </>
    );

    const renderPartnerships = () => (
        <div style={{display: 'flex', flexDirection: 'column', gap: '3rem'}}>
            {pendingPartnerships.length > 0 && (
                <div>
                    <h3 style={{fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{fontSize: '1.5rem'}}>🔔</span> Solicitudes Recibidas
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {pendingPartnerships.map(p => (
                            <div key={p.id} style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
                                <span style={{fontWeight: 700, fontSize: '1.1rem'}}>{p.requester.name}</span>
                                <div style={{display: 'flex', gap: '0.75rem'}}>
                                    <button onClick={() => handlePartnershipUpdate(p.id, 'active')} className="button-primary" style={{padding: '0.6rem 1.2rem', fontSize: '0.9rem'}}>Aceptar</button>
                                    <button onClick={() => handlePartnershipUpdate(p.id, 'rejected')} className="button-secondary" style={{padding: '0.6rem 1.2rem', fontSize: '0.9rem', color: 'var(--error-color)', borderColor: 'var(--error-color)'}}>Rechazar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h3 style={{fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-color)'}}>Vínculos Activos</h3>
                {activePartnerships.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {activePartnerships.map(p => { 
                            const otherClinic = p.requester_id === myClinic?.id ? p.responder : p.requester; 
                            return (
                                <CatalogCard
                                    key={p.id}
                                    title={otherClinic.name}
                                    subtitle="Clínica Aliada"
                                    description={otherClinic.email || undefined}
                                    avatarSrc={otherClinic.logo_url}
                                    avatarSeed={otherClinic.name}
                                    headerGradientSeed={otherClinic.name}
                                    overlayBadge="VINCULADO"
                                    actions={
                                        <>
                                             <button onClick={() => setModal({ type: 'sendReferral', data: { receivingClinic: otherClinic } })} style={actionButtonStyle(true)}>
                                                {ICONS.send} Referir
                                            </button>
                                            <button onClick={() => setModal({ type: 'deletePartnership', data: p })} style={{...actionButtonStyle(), color: 'var(--error-color)', borderColor: 'transparent'}}>
                                                {ICONS.delete} Revocar
                                            </button>
                                        </>
                                    }
                                />
                            )
                        })}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                        <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.network}</div>
                        <p style={{fontSize: '1.1rem'}}>No tienes vínculos activos.</p>
                        <button onClick={() => setActiveTab('directory')} style={{marginTop: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600}}>Explorar Directorio →</button>
                    </div>
                )}
            </div>
        </div>
    );
    
    // Referrals section remains largely the same style but within the new container
    const renderReferrals = (type: 'received' | 'sent') => {
        const referrals = type === 'received' ? receivedReferrals : sentReferrals;
        return (
            <div className="fade-in">
                <div style={{...styles.filterBar, maxWidth: '400px', marginBottom: '2rem', padding: 0, border: 'none', background: 'transparent', boxShadow: 'none'}}> 
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar por paciente..." value={referralSearchTerm} onChange={e => setReferralSearchTerm(e.target.value)} style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '12px', paddingLeft: '2.5rem', height: '50px', fontSize: '1rem'}} />
                    </div>
                </div>
                {referrals.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {referrals.map(r => {
                            const partnerClinic = type === 'received' ? r.sending_clinic : r.receiving_clinic;
                            const patientInfo = r.patient_info as any;
                            const personData = (r as any).persons;
                            const age = patientInfo?.age || (personData?.birth_date ? calculateAge(personData.birth_date) : 'N/A');

                            return (
                                <div key={r.id} className="card-hover" style={{
                                    backgroundColor: 'var(--surface-color)', borderRadius: '16px', padding: '0',
                                    display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
                                }}>
                                    <div style={{padding: '1.5rem'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{patientInfo.name}</h4>
                                            <StatusBadge status={r.status} />
                                        </div>
                                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>{age}</p>
                                        
                                        <div style={{marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid var(--border-color)'}}>
                                            <p style={{margin: '0 0 0.5rem 0'}}><strong>{type === 'received' ? 'De:' : 'Para:'}</strong> {partnerClinic?.name || 'N/A'}</p>
                                            <p style={{margin: 0, fontStyle: 'italic', color: 'var(--text-light)'}}>"{r.notes || 'Sin notas.'}"</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', backgroundColor: 'var(--surface-hover-color)', borderTop: '1px solid var(--border-color)', padding: '0.75rem', gap: '0.5rem' }}>
                                        {type === 'received' && r.status === 'pending' ? (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); navigate('client-form', { referralData: r }); }} style={actionButtonStyle(true)}>
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
                ) : (
                     <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                        <p style={{fontSize: '1.1rem'}}>No se encontraron referidos.</p>
                    </div>
                )}
            </div>
        );
    };

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

    return (
        <div className="fade-in" style={{paddingBottom: '4rem'}}>
            {modal.type === 'sendReferral' && <SendReferralToClinicModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); fetchData(); }} activePartners={activePartnerships} persons={persons} myClinic={myClinic!} initialClinic={modal.data?.receivingClinic} />}
            {modal.type === 'viewDetails' && <ClinicDetailsModal isOpen={true} onClose={() => setModal({type: null})} clinic={modal.data} />}
            {modal.type?.startsWith('delete') && <ConfirmationModal isOpen={true} onClose={() => setModal({type: null})} onConfirm={handleConfirm} title="Confirmar Acción" message={<p>¿Estás seguro? Esta acción no se puede deshacer.</p>} />}

            <div style={{...styles.pageHeader, marginBottom: '2.5rem'}}>
                <div>
                    <h1 style={{margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px'}}>Red de Clínicas</h1>
                    <p style={{margin: 0, color: 'var(--text-light)'}}>Colabora y gestiona referidos con otras instituciones.</p>
                </div>
                <button onClick={() => setModal({ type: 'sendReferral' })} className="button-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '12px'}}>
                    {ICONS.send} Enviar Referido
                </button>
            </div>
            
            <div style={{display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem'}}>
                <TabButton id="directory" label="Directorio Global" active={activeTab === 'directory'} />
                <TabButton id="partnerships" label="Mis Vínculos" active={activeTab === 'partnerships'} />
                <TabButton id="received" label="Recibidos" active={activeTab === 'received'} />
                <TabButton id="sent" label="Enviados" active={activeTab === 'sent'} />
            </div>
            
            {loading && <SkeletonLoader type="card" count={3} />}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                <>
                    {activeTab === 'directory' && renderDirectory()}
                    {activeTab === 'partnerships' && renderPartnerships()}
                    {activeTab === 'received' && renderReferrals('received')}
                    {activeTab === 'sent' && renderReferrals('sent')}
                </>
            )}
        </div>
    );
};

export default ClinicNetworkPage;
