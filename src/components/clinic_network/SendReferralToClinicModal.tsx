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
                const { error: requestError } = await supabase.from('referral_consent_requests').insert({
                    clinic_id: myClinic.id,
                    person_id: selectedPerson.id,
                    created_by_user_id: user.id,
                    receiving_clinic_id: receivingClinicId,
                    notes: notes,
                    patient_info: { name: selectedPerson.full_name, phone: selectedPerson.phone_number }
                });
                if (requestError) throw requestError;
                
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: selectedPerson.user_id,
                        title: 'Solicitud de Consentimiento',
                        body: `${myClinic?.name || 'Tu clínica'} solicita tu permiso para referirte. Revisa tu portal para más detalles.`
                    })
                }).catch(err => console.error("Failed to send consent request notification:", err));

                setSuccess(`¡Solicitud enviada al portal del paciente!`);
                setTimeout(onSuccess, 3000);
            } else {
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
                setSuccess(`¡Referido enviado con éxito!`);
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px', borderRadius: '16px', padding: 0, border: '1px solid var(--border-color)'}} className="fade-in">
                <div style={{...styles.modalHeader, borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', backgroundColor: 'var(--surface-color)'}}>
                    <h2 style={{...styles.modalTitle, fontSize: '1.25rem'}}>Enviar Referido</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, paddingTop: '2rem', paddingBottom: '2rem'}}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <div style={{marginBottom: '1.5rem'}}>
                        <label style={styles.label}>Destino (Clínica)</label>
                        <select value={receivingClinicId} onChange={e => setReceivingClinicId(e.target.value)} required style={{...styles.input, fontSize: '1rem', padding: '0.75rem'}}>
                            {partnerClinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div style={{marginBottom: '1.5rem'}}>
                        <label style={styles.label}>Paciente a Referir</label>
                        <div ref={searchContainerRef} style={{ position: 'relative' }}>
                            <input type="text" placeholder="Buscar paciente..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} autoComplete="off" style={{...styles.input, marginBottom: 0, padding: '0.75rem'}} />
                            {isDropdownOpen && filteredPersons.length > 0 && (
                                 <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                    {filteredPersons.map(p => (<div key={p.id} onClick={() => handleSelectPerson(p)} className="nav-item-hover" style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)'}}>{p.full_name}</div>))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <label style={styles.label}>Notas o Motivo</label>
                    <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} style={{...styles.input, resize: 'vertical', minHeight: '100px'}} placeholder="Ej: Paciente con diabetes tipo 2, requiere valoración..."></textarea>

                    {selectedPerson && !selectedPerson.user_id && (
                        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <input
                                id="manual_consent_clinic" type="checkbox"
                                checked={manualConsent}
                                onChange={e => setManualConsent(e.target.checked)}
                                required
                                style={{ marginTop: '4px', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="manual_consent_clinic" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400, color: 'var(--text-color)' }}>
                                Confirmo que he obtenido el <strong>consentimiento informado</strong> y por escrito del paciente para compartir sus datos personales con esta clínica.
                            </label>
                        </div>
                    )}
                </div>
                <div style={{...styles.modalFooter, backgroundColor: 'var(--surface-hover-color)', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', paddingBottom: '1.5rem'}}>
                    <button type="button" onClick={onClose} className="button-secondary" style={{padding: '0.75rem 1.5rem'}}>Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={loading || !!success || (selectedPerson && !selectedPerson.user_id && !manualConsent)}
                        style={{minWidth: '140px', padding: '0.75rem 1.5rem'}}
                        className="button-primary"
                    >
                        {loading ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
            </form>
        </div>,
    modalRoot);
};

export default SendReferralToClinicModal;
