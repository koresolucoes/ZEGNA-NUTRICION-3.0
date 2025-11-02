import React, { FC, useState, useEffect, useCallback, FormEvent, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { PopulatedPartnership, PopulatedReferral, Ally, Person } from '../types';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { useClinic } from '../contexts/ClinicContext';
import AllyDetailsModal from '../components/collaborators/AllyDetailsModal';

// --- MODAL PARA ENVIAR REFERIDO ---
const SendReferralModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activePartners: PopulatedPartnership[];
    persons: Person[];
}> = ({ isOpen, onClose, onSuccess, activePartners, persons }) => {
    const { clinic } = useClinic();
    const [receivingAllyId, setReceivingAllyId] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [manualConsent, setManualConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Search functionality for persons
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    
    const selectedPerson = useMemo(() => persons.find(p => p.id === selectedPersonId), [persons, selectedPersonId]);

    useEffect(() => {
        if (activePartners.length > 0 && !receivingAllyId) {
            setReceivingAllyId(activePartners[0].ally_id);
        }
    }, [activePartners, receivingAllyId]);
    
     useEffect(() => {
        setManualConsent(false);
    }, [selectedPersonId]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;
    
    const filteredPersons = persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleSelectPerson = (person: Person) => {
        setSelectedPersonId(person.id);
        setSearchTerm(person.full_name);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !receivingAllyId || !selectedPersonId) {
            setError("Por favor, selecciona un colaborador y un paciente.");
            return;
        }
        if (!selectedPerson) {
            setError("Paciente seleccionado no válido.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");

            if (selectedPerson.user_id) {
                // Patient is a portal user, create a consent request.
                const { error: requestError } = await supabase.from('referral_consent_requests').insert({
                    clinic_id: clinic.id,
                    person_id: selectedPerson.id,
                    created_by_user_id: user.id,
                    receiving_ally_id: receivingAllyId,
                    notes: notes,
                    patient_info: { name: selectedPerson.full_name, phone: selectedPerson.phone_number }
                });

                if (requestError) throw requestError;
                
                // Send push notification to patient
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: selectedPerson.user_id,
                        title: 'Solicitud de Consentimiento',
                        body: `${clinic?.name || 'Tu clínica'} solicita tu permiso para referirte. Revisa tu portal para más detalles.`
                    })
                }).catch(err => console.error("Failed to send consent request notification:", err));

                setSuccess(`¡Solicitud de consentimiento enviada al portal de ${selectedPerson.full_name}!`);
                setTimeout(onSuccess, 3000);

            } else {
                // Patient is not a portal user. Send referral directly after confirming written consent.
                if (!manualConsent) {
                    throw new Error("Debe confirmar que ha obtenido el consentimiento por escrito del paciente.");
                }
                 const { error: rpcError } = await supabase.rpc('send_referral_to_ally', {
                    p_clinic_id: clinic.id,
                    p_receiving_ally_id: receivingAllyId,
                    p_patient_info: { name: selectedPerson.full_name, phone: selectedPerson.phone_number },
                    p_notes: notes,
                    p_person_id: selectedPerson.id,
                });
                if (rpcError) throw rpcError;
                setSuccess(`¡Referido para ${selectedPerson.full_name} enviado con éxito!`);
                setTimeout(onSuccess, 2500);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={styles.modalContent} className="fade-in">
                <div style={styles.modalHeader}><h2 style={styles.modalTitle}>Enviar Referido</h2><button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button></div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    <label>Enviar a Colaborador*</label>
                    <select value={receivingAllyId} onChange={e => setReceivingAllyId(e.target.value)} required>
                        {activePartners.map(p => <option key={p.ally_id} value={p.ally_id}>{p.allies.full_name} ({p.allies.specialty})</option>)}
                    </select>

                    <label htmlFor="person-search-referral">Seleccionar Paciente*</label>
                    <div ref={searchContainerRef} style={{ position: 'relative' }}>
                        <input
                            id="person-search-referral"
                            type="text"
                            placeholder="Buscar paciente o afiliado..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                            autoComplete="off"
                        />
                        {isDropdownOpen && filteredPersons.length > 0 && (
                             <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-hover-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                                {filteredPersons.map(p => (
                                    <div key={p.id} onClick={() => handleSelectPerson(p)} className="nav-item-hover" style={{padding: '0.75rem 1rem', cursor: 'pointer'}}>
                                        {p.full_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <label>Motivo del Referido / Notas</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                     {selectedPerson && !selectedPerson.user_id && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                                id="manual_consent_given" type="checkbox"
                                checked={manualConsent}
                                onChange={e => setManualConsent(e.target.checked)}
                                required
                                style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                            />
                            <label htmlFor="manual_consent_given" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400 }}>
                                Confirmo que he obtenido el consentimiento informado y por escrito del paciente para compartir su información.
                            </label>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={loading || !!success || (selectedPerson && !selectedPerson.user_id && !manualConsent)}
                    >
                        {loading ? 'Enviando...' : (selectedPerson && !selectedPerson.user_id ? 'Enviar Referido' : 'Enviar Solicitud de Consentimiento')}
                    </button>
                </div>
            </form>
        </div>
    );
};

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

// --- PÁGINA PRINCIPAL DE COLABORADORES ---
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
    const [modal, setModal] = useState<{ type: 'deletePartnership' | 'deleteReferral' | 'send' | null; data?: any }>({ type: null });
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
            // Base queries with added 'persons' relation
            let receivedQuery = supabase.from('referrals').select('*, sending_ally:allies!referrals_sending_ally_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('receiving_clinic_id', clinic.id).order('created_at', { ascending: false });
            let sentQuery = supabase.from('referrals').select('*, receiving_ally:allies!referrals_receiving_ally_id_fkey(*), persons!referrals_person_id_fkey(*)').eq('sending_clinic_id', clinic.id).order('created_at', { ascending: false });

            // Apply search filter if present
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
            
            setPersons(personsRes.data || []);
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
        if (modal.type === 'deletePartnership') {
            handleRevokePartnership();
        } else if (modal.type === 'deleteReferral') {
            handleDeleteReferral();
        }
    };

    const statusStyles: { [key: string]: React.CSSProperties } = {
        pending: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', borderColor: '#EAB308' },
        active: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' },
        accepted: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' },
        rejected: { backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderColor: 'var(--error-color)' },
        revoked: { backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderColor: 'var(--error-color)' },
    };
    const StatusBadge: FC<{ status: string }> = ({ status }) => (
        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, border: '1px solid', textTransform: 'capitalize', ...statusStyles[status] }}>{status}</span>
    );
    
    const actionButtonStyle: React.CSSProperties = {
        background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        padding: '0.5rem', borderRadius: '8px', flex: 1, fontSize: '0.75rem',
        textAlign: 'center', lineHeight: 1.2
    };

    // --- RENDER METHODS FOR TABS ---
    const renderCollaborators = () => (
        <div className="info-grid">
            {partnerships.map(p => (
                <div key={p.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch' }}>
                    <div style={{ padding: '1rem', flex: 1 }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                            <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                <img src={p.allies.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${p.allies.full_name}&radius=50`} alt="Avatar" style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover'}} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>{p.allies.full_name}</h4>
                                    <p style={{margin: 0, fontSize: '0.9rem'}}>{p.allies.specialty}</p>
                                </div>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>
                         <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem'}}><em>{p.allies.biography || 'Sin biografía.'}</em></p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                        {p.status === 'active' && (
                            <>
                                <button onClick={() => setModal({ type: 'send', data: p })} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.send}<span>Referir</span></button>
                                <button onClick={() => setViewingAlly(p.allies)} style={actionButtonStyle} className="nav-item-hover">{ICONS.details}<span>Detalles</span></button>
                                <button onClick={() => handleUpdatePartnershipStatus(p.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Revocar</span></button>
                            </>
                        )}
                        {p.status === 'pending' && (
                             <>
                                <button onClick={() => setViewingAlly(p.allies)} style={actionButtonStyle} className="nav-item-hover">{ICONS.details}<span>Detalles</span></button>
                                <button onClick={() => handleUpdatePartnershipStatus(p.id, 'revoked')} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Cancelar</span></button>
                            </>
                        )}
                         {(p.status === 'revoked' || p.status === 'rejected') && (
                            <>
                                <button onClick={() => setViewingAlly(p.allies)} style={actionButtonStyle} className="nav-item-hover">{ICONS.details}<span>Detalles</span></button>
                                <button onClick={() => handleRequestPartnership(p.ally_id)} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.add}<span>Re-solicitar</span></button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderDirectory = () => {
        const filteredAllies = directoryAllies.filter(ally => 
            ally.full_name?.toLowerCase().includes(searchDirectoryTerm.toLowerCase()) ||
            ally.specialty?.toLowerCase().includes(searchDirectoryTerm.toLowerCase())
        );
        return (
            <div className="fade-in">
                <div style={{...styles.filterBar, maxWidth: '500px'}}>
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input type="text" placeholder="Buscar por nombre o especialidad..." value={searchDirectoryTerm} onChange={e => setSearchDirectoryTerm(e.target.value)} style={styles.searchInput} />
                    </div>
                </div>
                 {filteredAllies.length > 0 ? (
                    <div className="info-grid">
                        {filteredAllies.map(ally => (
                            <div key={ally.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch' }}>
                                 <div style={{ padding: '1rem', flex: 1 }}>
                                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                        <img src={ally.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${ally.full_name || '?'}&radius=50`} alt="Avatar del colaborador" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}/>
                                        <div>
                                            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>{ally.full_name}</h4>
                                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>{ally.specialty}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                        {ally.phone_number && <span style={{display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.phone}{ally.phone_number}</span>}
                                        {ally.office_address && <span style={{display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.mapPin}{ally.office_address}</span>}
                                        {ally.website && <a href={ally.website} target="_blank" rel="noopener noreferrer" style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.link}Sitio Web</a>}
                                    </div>
                                     {ally.biography && <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}><em>{ally.biography}</em></p>}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem', borderTop: '1px solid var(--border-color)', gap: '0.25rem' }}>
                                    <button onClick={() => handleRequestPartnership(ally.id)} disabled={requestedAllyIds.has(ally.id)} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">
                                        {requestedAllyIds.has(ally.id) ? <>{ICONS.clock}<span>Pendiente</span></> : <>{ICONS.network}<span>Conectar</span></>}
                                    </button>
                                     <button onClick={() => setViewingAlly(ally)} style={actionButtonStyle} className="nav-item-hover">{ICONS.details}<span>Detalles</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p>No se encontraron nuevos colaboradores. ¡Invita a uno para empezar a crecer tu red!</p>}
            </div>
        );
    }

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
                            const partner = type === 'received' ? r.sending_ally : r.receiving_ally;
                            const patientInfo = r.patient_info as any;
                            const personData = r.persons;
                            const age = patientInfo?.age || (personData?.birth_date ? calculateAge(personData.birth_date) : 'N/A');
                            const gender = patientInfo?.gender || (personData?.gender === 'male' ? 'Hombre' : personData?.gender === 'female' ? 'Mujer' : 'N/A');
                            
                            return (
                            <div key={r.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, alignItems: 'stretch' }}>
                                <div style={{ padding: '1rem', flex: 1 }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                        <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{patientInfo.name}</h4>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    <p style={{margin: '0.25rem 0', fontSize: '0.9rem'}}><strong>Tel:</strong> {patientInfo.phone || '-'}</p>
                                    <p style={{margin: '0.25rem 0 0.75rem 0', fontSize: '0.9rem'}}><strong>{type === 'received' ? 'De:' : 'Para:'}</strong> {partner?.full_name || 'N/A'}</p>
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
                                            <button onClick={(e) => { e.stopPropagation(); handleAcceptReferral(r); }} style={{...actionButtonStyle, color: 'var(--primary-color)'}} className="nav-item-hover">{ICONS.check}<span>Aceptar</span></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleReferralStatusUpdate(r.id, 'rejected'); }} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.close}<span>Rechazar</span></button>
                                        </>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteReferral', data: r }); }} style={{...actionButtonStyle, color: 'var(--error-color)'}} className="nav-item-hover">{ICONS.delete}<span>Eliminar</span></button>
                                </div>
                            </div>
                        )})}
                    </div>
                ) : <p>No se encontraron referidos con los filtros aplicados.</p>}
            </div>
        );
    };

    return (
        <div className="fade-in">
            {viewingAlly && <AllyDetailsModal isOpen={!!viewingAlly} onClose={() => setViewingAlly(null)} ally={viewingAlly} />}
            {modal.type === 'send' && <SendReferralModal isOpen={true} onClose={() => setModal({ type: null })} onSuccess={() => { setModal({ type: null }); fetchData(); }} activePartners={partnerships.filter(p => p.status === 'active')} persons={persons} />}
            {modal.type?.startsWith('delete') && <ConfirmationModal 
                isOpen={true} 
                onClose={() => setModal({type: null})} 
                onConfirm={handleConfirm} 
                title="Confirmar Acción" 
                message={modal.type === 'deletePartnership' 
                    ? <p>¿Seguro que quieres revocar la asociación con <strong>{modal.data?.allies?.full_name}</strong>? Ya no podrán enviarse referidos.</p>
                    : <p>¿Seguro que quieres eliminar este referido? Esta acción es irreversible.</p>
                }
            />}

            <div style={styles.pageHeader}>
                <h1>Red de Colaboradores</h1>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setModal({type: 'send'})} className="button-secondary">{ICONS.send} Enviar Referido</button>
                    <button onClick={onAddCollaborator}>{ICONS.add} Invitar por Correo</button>
                </div>
            </div>

            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'collaborators' ? 'active' : ''}`} onClick={() => setActiveTab('collaborators')}>Mis Colaboradores</button>
                <button className={`tab-button ${activeTab === 'directory' ? 'active' : ''}`} onClick={() => setActiveTab('directory')}>Directorio de Aliados</button>
                <button className={`tab-button ${activeTab === 'received' ? 'active' : ''}`} onClick={() => setActiveTab('received')}>Referidos Recibidos</button>
                <button className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>Referidos Enviados</button>
            </nav>
            
            <div className="fade-in" style={{marginTop: '1.5rem'}}>
                {loading && <p>Cargando datos...</p>}
                {error && <p style={styles.error}>{error}</p>}
                {!loading && !error && (
                    <>
                        {activeTab === 'collaborators' && (partnerships.length > 0 ? renderCollaborators() : <p>No has invitado a ningún colaborador. ¡Explora el directorio o invita a uno para empezar!</p>)}
                        {activeTab === 'directory' && renderDirectory()}
                        {activeTab === 'received' && renderReferrals('received')}
                        {activeTab === 'sent' && renderReferrals('sent')}
                    </>
                )}
            </div>
        </div>
    );
};

export default CollaboratorsPage;