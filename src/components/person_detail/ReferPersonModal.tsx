import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, PopulatedPartnership, ConsultationWithLabs } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface ReferPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    person: Person;
    lastConsultation: ConsultationWithLabs | null;
    activePartners: PopulatedPartnership[];
}

const modalRoot = document.getElementById('modal-root');

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

const ReferPersonModal: FC<ReferPersonModalProps> = ({ isOpen, onClose, onSuccess, person, lastConsultation, activePartners }) => {
    const { clinic } = useClinic();
    const [receivingAllyId, setReceivingAllyId] = useState('');
    const [notes, setNotes] = useState('');
    const [manualConsent, setManualConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (activePartners.length > 0 && !receivingAllyId) {
            setReceivingAllyId(activePartners[0].ally_id);
        }
    }, [activePartners, receivingAllyId]);

    if (!isOpen || !modalRoot) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !receivingAllyId) {
            setError("Por favor, selecciona un colaborador.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");
            
            const patient_info = {
                name: person.full_name,
                phone: person.phone_number,
                age: calculateAge(person.birth_date),
                gender: person.gender === 'male' ? 'Hombre' : person.gender === 'female' ? 'Mujer' : 'No especificado',
                health_goal: person.health_goal,
                last_weight: lastConsultation?.weight_kg,
                last_imc: lastConsultation?.imc,
            };

            if (person.user_id) {
                // Patient is a portal user, create a consent request
                const { error: requestError } = await supabase.from('referral_consent_requests').insert({
                    clinic_id: clinic.id,
                    person_id: person.id,
                    created_by_user_id: user.id,
                    receiving_ally_id: receivingAllyId,
                    notes: notes,
                    patient_info: patient_info
                });

                if (requestError) throw requestError;

                // Send push notification to patient
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: person.user_id,
                        title: 'Solicitud de Consentimiento',
                        body: `${clinic?.name || 'Tu clínica'} solicita tu permiso para referirte. Revisa tu portal para más detalles.`
                    })
                }).catch(err => console.error("Failed to send consent request notification:", err));


                setSuccess(`¡Solicitud de consentimiento enviada al portal de ${person.full_name}! El referido se enviará una vez que lo apruebe.`);
                setTimeout(onSuccess, 3000);

            } else {
                // Patient is not a portal user. Send referral directly after confirming written consent.
                if (!manualConsent) {
                    throw new Error("Debe confirmar que ha obtenido el consentimiento por escrito del paciente.");
                }
                const { error: rpcError } = await supabase.rpc('send_referral_to_ally', {
                    p_clinic_id: clinic.id,
                    p_receiving_ally_id: receivingAllyId,
                    p_patient_info: patient_info,
                    p_notes: notes,
                    p_person_id: person.id,
                });
                if (rpcError) throw rpcError;
                setSuccess(`¡Referido para ${person.full_name} enviado con éxito!`);
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Referir a {person.full_name}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}

                    <label>Enviar a Colaborador*</label>
                    <select value={receivingAllyId} onChange={e => setReceivingAllyId(e.target.value)} required>
                        {activePartners.map(p => <option key={p.ally_id} value={p.ally_id}>{p.allies.full_name} ({p.allies.specialty})</option>)}
                    </select>
                    
                    <label>Motivo del Referido / Notas</label>
                    <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Solicito valoración por posible desgarre muscular en hombro derecho..."></textarea>
                    
                     {!person.user_id && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <input
                                id="manual_consent_given_person" type="checkbox"
                                checked={manualConsent}
                                onChange={e => setManualConsent(e.target.checked)}
                                required
                                style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                            />
                            <label htmlFor="manual_consent_given_person" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400 }}>
                                Confirmo que he obtenido el consentimiento informado y por escrito del paciente para compartir su información.
                            </label>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={loading || !!success || (!person.user_id && !manualConsent)}
                    >
                        {loading ? 'Enviando...' : (!person.user_id ? 'Enviar Referido' : 'Enviar Solicitud de Consentimiento')}
                    </button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ReferPersonModal;
