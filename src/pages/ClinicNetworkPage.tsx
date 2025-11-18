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
    
    // --- Handlers ---
    const handlePartnershipRequest = async (clinicId: string) => {
        const { error } = await supabase.rpc('request_clinic_partnership', { p_responder_clinic_id: clinicId });
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
            // Clinics can delete referrals they are part of
            supabase.from('referrals').delete().eq('id', modal.data.id).then(({error}) => { if (error) setError(error.message) });
        }
        setModal({ type: null });
    };

    // --- Memoized Data for Tabs ---
    const directoryClinics = useMemo(() => allClinics.filter(c => c.id !== myClinic?.id && (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.address?.toLowerCase().includes(searchTerm.toLowerCase()))), [allClinics, myClinic, searchTerm]);
    const activePartnerships = useMemo(() => partnerships.filter(p => p.status === 'active'), [partnerships]);
    const pendingPartnerships = useMemo(() => partnerships.filter(p => p.status === 'pending' && p.responder_id === myClinic?.id), [partnerships, myClinic]);
    
    // --- Render Methods ---
    const StatusBadge: FC<{ status: string }> = ({ status }) => (
        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, border: '1px solid', textTransform: 'capitalize', ...{
            pending: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', borderColor: '#EAB308' },
            active: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' },
            accepted: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' },
            rejected: { backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderColor: 'var(--error-color)' },
            revoked: { backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderColor: 'var(--error-color)' },
        }[status] }}>{status}</span>
    );
    
    const actionButtonStyle: React.CSSProperties = {
        background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        padding: '0.5rem', borderRadius: '8px', flex: 1, fontSize: '0.75rem',
        textAlign: 'center', lineHeight: 1.2
    };

    const renderDirectory = () => (
        <>
            <div style={{...styles.filterBar, maxWidth: '500px'}}><div style={styles.searchInputContainer}><span style={styles.searchInputIcon}>🔍</span><input type="text" placeholder="Buscar por nombre o dirección..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.searchInput} /></div></div>
            <div className="info-grid">{directoryClinics.map(clinic => {
                 const partnership = partnerships.find(p => (p.requester_id === myClinic?.id && p.responder_id === clinic.id) || (p.requester_id === clinic.id && p.responder_id === myClinic?.id));
                 const status = partnership?.status;
                 const isMyRequest = partnership?.requester_id === myClinic?.id;
                 let actionButtons;

                 switch (status) {
                    case 'active':
                        actionButtons = (
                            <button onClick={() => setModal({ type: 'sendReferral', data: { receivingClinic: clinic } })} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.send}<span>Referir</span></button>
                        );
                        break;
                    case 'pending':
                        if (isMyRequest) {
                            actionButtons = <button disabled style={{...actionButtonStyle, opacity: 0.7}}>{ICONS.clock}<span>Pendiente</span></button>;
                        } else {
                            actionButtons = (
                                <>
                                    <button onClick={() => handlePartnershipUpdate(partnership!.id, 'active')} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.check}<span>Aceptar</span></button>
                                    <button onClick={() => handlePartnershipUpdate(partnership!.id, 'rejected')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.close}<span>Rechazar</span></button>
                                </>
                            );
                        }
                        break;
                    case 'revoked':
                    case 'rejected':
                        actionButtons = <button onClick={() => handlePartnershipRequest(clinic.id)} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.add}<span>Re-solicitar</span></button>;
                        break;
                    default: // no partnership
                        actionButtons = <button onClick={() => handlePartnershipRequest(clinic.id)} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.network}<span>Conectar</span></button>;
                        break;
                }

                return (
                    <div key={clinic.id} className="info-card" style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 0}}>
                        <div style={{padding: '1rem', flex: 1}}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <img src={clinic.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic.name?.charAt(0) || 'C'}&radius=50`} alt="logo" style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} />
                                <div style={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
                                    <h4 style={{ margin: 0, color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinic.name}</h4>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinic.address}</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.5rem' }}>
                            {actionButtons}
                            <button onClick={() => setModal({ type: 'viewDetails', data: clinic })} style={actionButtonStyle} className="nav-item-hover">
                                {ICONS.details}
                                <span>Detalles</span>
                            </button>
                        </div>
                    </div>
                )
            })}</div>
        </>
    );

    const renderPartnerships = () => (
        <>
            <h3 style={{fontSize: '1.2rem'}}>Solicitudes Pendientes</h3>
            {pendingPartnerships.length > 0 ? <div className="info-grid">{pendingPartnerships.map(p => <div key={p.id} className="info-card"><div><h4>{p.requester.name}</h4></div><div className="card-actions"><button onClick={() => handlePartnershipUpdate(p.id, 'active')}>Aceptar</button><button onClick={() => handlePartnershipUpdate(p.id, 'rejected')} className="button-secondary">Rechazar</button></div></div>)}</div> : <p>No hay solicitudes pendientes.</p>}
            <h3 style={{fontSize: '1.2rem', marginTop: '2rem'}}>Vínculos Activos</h3>
            {activePartnerships.length > 0 ? <div className="info-grid">{activePartnerships.map(p => { const otherClinic = p.requester_id === myClinic?.id ? p.responder : p.requester; return <div key={p.id} className="info-card"><div><h4>{otherClinic.name}</h4></div><div className="card-actions"><button onClick={() => setModal({ type: 'deletePartnership', data: p })} className="button-danger">Revocar</button></div></div> })}</div> : <p>No tienes vínculos activos.</p>}
        </>
    );
    
    const renderReferrals = (type: 'received' | 'sent') => {
        const referrals = type === 'received' ? receivedReferrals : sentReferrals;
        return (
            <div className="fade-in">
                <div style={{...styles.filterBar, maxWidth: '400px'}}>
                     <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar por paciente..." value={referralSearchTerm} onChange={e => setReferralSearchTerm(e.target.value)} style={styles.searchInput} />
                    </div>
                </div>
                {referrals.length > 0 ? (
                    <div className="info-grid">
                        {referrals.map(r => {
                            const partnerClinic = type === 'received' ? r.sending_clinic : r.receiving_clinic;
                            const patientInfo = r.patient_info as any;
                            const personData = (r as any).persons;
                            const age = patientInfo?.age || (personData?.birth_date ? calculateAge(personData.birth_date) : 'N/A');
                            const gender = patientInfo?.gender || (personData?.gender === 'male' ? 'Hombre' : personData?.gender === 'female' ? 'Mujer' : 'N/A');

                            return (
                                <div key={r.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch' }}>
                                    <div style={{ padding: '1rem', flex: 1 }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                            <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{patientInfo.name}</h4>
                                            <StatusBadge status={r.status} />
                                        </div>
                                        <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Tel:</strong> {patientInfo.phone || personData?.phone_number || '-'}</p>
                                        <p style={{margin: '0.25rem 0 0.75rem 0', fontSize: '0.9rem'}}><strong>{type === 'received' ? 'De:' : 'Para:'}</strong> {partnerClinic?.name || 'N/A'}</p>
                                        
                                        <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem'}}><em>{r.notes || 'Sin notas.'}</em></p>

                                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                            <span><strong>Edad:</strong> {age}</span>
                                            <span><strong>Género:</strong> {gender}</span>
                                            <span><strong>Objetivo:</strong> {personData?.health_goal || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                                        {type === 'received' && r.status === 'pending' && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); navigate('afiliado-form', { referralData: r }); }} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.check}<span>Aceptar</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleReferralStatusUpdate(r.id, 'rejected'); }} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.close}<span>Rechazar</span></button>
                                            </>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteReferral', data: r }); }} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Eliminar</span></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : <p>No se encontraron referidos con los filtros aplicados.</p>}
            </div>
        );
    };


    return (
        <div className="fade-in">
            {modal.type === 'sendReferral' && <SendReferralToClinicModal isOpen={true} onClose={() => setModal({ type: null, data: null })} onSuccess={() => { setModal({ type: null, data: null }); fetchData(); }} activePartners={activePartnerships} persons={persons} myClinic={myClinic!} initialClinic={modal.data?.receivingClinic} />}
            {modal.type === 'viewDetails' && <ClinicDetailsModal isOpen={true} onClose={() => setModal({type: null})} clinic={modal.data} />}
            {modal.type?.startsWith('delete') && <ConfirmationModal isOpen={true} onClose={() => setModal({type: null})} onConfirm={handleConfirm} title="Confirmar Acción" message={<p>¿Estás seguro? Esta acción no se puede deshacer.</p>} />}

            <div style={styles.pageHeader}><h1 style={{margin:0}}>Red de Clínicas</h1><button onClick={() => setModal({ type: 'sendReferral' })}>{ICONS.send} Enviar Referido</button></div>
            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>Directorio de Clínicas</button>
                <button className={`tab-button ${activeTab === 'partnerships' ? 'active' : ''}`} onClick={() => setActiveTab('partnerships')}>Mis Vínculos</button>
                <button className={`tab-button ${activeTab === 'received' ? 'active' : ''}`} onClick={() => setActiveTab('received')}>Referidos Recibidos</button>
                <button className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>Referidos Enviados</button>
            </nav>
            
            <div style={{marginTop: '1.5rem'}}>
                {loading && <SkeletonLoader type="card" count={6} />}
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
        </div>
    );
};

export default ClinicNetworkPage;