import React, { FC, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Ally } from '../../types';

interface SendReferralToAllyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    receivingAlly: Ally;
}

const modalRoot = document.getElementById('modal-root');

const SendReferralToAllyModal: FC<SendReferralToAllyModalProps> = ({ isOpen, onClose, onSuccess, receivingAlly }) => {
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen || !modalRoot) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!receivingAlly.id || !patientName || !notes) {
            setError("Por favor, completa el nombre del paciente y el motivo del referido.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: rpcError } = await supabase.rpc('send_referral_from_ally_to_ally', {
                p_receiving_ally_id: receivingAlly.id,
                p_patient_info: { name: patientName, phone: patientPhone },
                p_notes: notes,
            });
            if (rpcError) throw rpcError;

            setSuccess(`¡Referido para ${patientName} enviado con éxito a ${receivingAlly.full_name}!`);
            setTimeout(() => {
                onSuccess();
            }, 2500);

        } catch (err: any) {
            setError(`Error al enviar el referido: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Referir Paciente a {receivingAlly.full_name}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}

                    <label htmlFor="patient_name">Nombre del Paciente*</label>
                    <input id="patient_name" type="text" value={patientName} onChange={e => setPatientName(e.target.value)} required />

                    <label htmlFor="patient_phone">Teléfono del Paciente</label>
                    <input id="patient_phone" type="tel" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
                    
                    <label htmlFor="notes">Motivo del Referido / Notas*</label>
                    <textarea id="notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Solicito valoración por posible desgarre muscular en hombro derecho..." required></textarea>
                    
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <input
                            id="consent_given" type="checkbox"
                            checked={consentGiven}
                            onChange={e => setConsentGiven(e.target.checked)}
                            required
                            style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                        />
                        <label htmlFor="consent_given" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400 }}>
                            Confirmo que he obtenido el consentimiento informado y por escrito del paciente para compartir su información con este colaborador.
                        </label>
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !!success || !consentGiven}>{loading ? 'Enviando...' : 'Enviar Referido'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default SendReferralToAllyModal;