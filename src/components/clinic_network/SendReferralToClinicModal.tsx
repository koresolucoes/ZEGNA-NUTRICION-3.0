import React, { FC, useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, PopulatedClinicPartnership, Clinic } from '../../types';

interface SendReferralToClinicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    activePartners: PopulatedClinicPartnership[];
    persons: Person[];
    myClinic: Clinic;
    initialClinic?: Clinic;
}

const modalRoot = document.getElementById('modal-root');

const SendReferralToClinicModal: FC<SendReferralToClinicModalProps> = ({ isOpen, onClose, onSuccess, activePartners, persons, myClinic, initialClinic }) => {
    const [receivingClinicId, setReceivingClinicId] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [manualConsent, setManualConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    
    const partnerClinics = useMemo(() => {
        return activePartners.map(p => p.requester_id === myClinic.id ? p.responder : p.requester);
    }, [activePartners, myClinic]);

    const selectedPerson = useMemo(() => persons.find(p => p.id === selectedPersonId), [persons, selectedPersonId]);

    useEffect(() => {
        if (initialClinic) {
            setReceivingClinicId(initialClinic.id);
        } else if (partnerClinics.length > 0 && !receivingClinicId) {
            setReceivingClinicId(partnerClinics[0].id);
        }
    }, [partnerClinics, receivingClinicId, initialClinic]);
    
     useEffect(() => {
        setManualConsent(false);
    }, [selectedPersonId]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) { setIsDropdownOpen(false); } };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen || !modalRoot) return null;
    
    const filteredPersons = persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleSelectPerson = (person: Person) => {
        setSelectedPersonId(person.id);
        setSearchTerm(person.full_name);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!receivingClinicId || !selectedPersonId) {
            setError("Por favor, selecciona una clínica y un paciente.");
            return;
        }
        if (!selectedPerson) {
            setError("Paciente no válido."); return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");

            if (selectedPerson.user_id) {
                // Patient has a portal account, send consent request.
                const { error: requestError } = await supabase.from('referral_consent_requests').insert({
                    clinic_id: myClinic.id,
                    person_id: selectedPerson.id,
                    created_by_user_id: user.id,
                    receiving_clinic_id: receivingClinicId,
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
                        body: `${myClinic?.name || 'Tu clínica'} solicita tu permiso para referirte. Revisa tu portal para más detalles.`
                    })
                }).catch(err => console.error("Failed to send consent request notification:", err));

                setSuccess(`¡Solicitud de consentimiento enviada al portal de ${selectedPerson.full_name}!`);
                setTimeout(onSuccess, 3000);
            } else {
                // Patient does not have a portal account, require manual consent confirmation.
                if (!manualConsent) {
                    throw new Error("Debe confirmar que ha obtenido el consentimiento por escrito del paciente.");
                }
                const { error: rpcError } = await supabase.rpc('send_referral_from_clinic_to_clinic', {
                    p_receiving_clinic_id: receivingClinicId,
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

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={styles.modalContent} className="fade-in">
                <div style={styles.modalHeader}><h2 style={styles.modalTitle}>Enviar Referido a Clínica</h2><button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button></div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    <label>Enviar a Clínica*</label>
                    <select value={receivingClinicId} onChange={e => setReceivingClinicId(e.target.value)} required>
                        {partnerClinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <label htmlFor="person-search-referral">Seleccionar Paciente*</label>
                    <div ref={searchContainerRef} style={{ position: 'relative' }}>
                        <input id="person-search-referral" type="text" placeholder="Buscar paciente o afiliado..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoComplete="off" />
                        {isDropdownOpen && filteredPersons.length > 0 && (
                             <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-hover-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                                {filteredPersons.map(p => (<div key={p.id} onClick={() => handleSelectPerson(p)} className="nav-item-hover" style={{padding: '0.75rem 1rem', cursor: 'pointer'}}>{p.full_name}</div>))}
                            </div>
                        )}
                    </div>
                    
                    <label>Motivo del Referido / Notas</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}></textarea>

                    {selectedPerson && !selectedPerson.user_id && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                                id="manual_consent_clinic" type="checkbox"
                                checked={manualConsent}
                                onChange={e => setManualConsent(e.target.checked)}
                                required
                                style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                            />
                            <label htmlFor="manual_consent_clinic" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400 }}>
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
        </div>,
    modalRoot);
};

export default SendReferralToClinicModal;
