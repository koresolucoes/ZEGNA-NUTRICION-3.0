import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { PopulatedReferralConsentRequest } from '../../types';

interface ConsentRequestModalProps {
    isOpen: boolean;
    request: PopulatedReferralConsentRequest;
    onClose: () => void;
    onDecision: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ConsentRequestModal: FC<ConsentRequestModalProps> = ({ isOpen, request, onClose, onDecision }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [consentChecked, setConsentChecked] = useState(false);

    if (!isOpen || !modalRoot) return null;

    const sourceClinic = request.clinics?.name || 'Tu clínica';
    const destinationName = request.receiving_ally?.full_name || request.receiving_clinic?.name || 'un profesional';
    const destinationSpecialty = request.receiving_ally?.specialty;
    const patientInfo = request.patient_info as any || {};

    const handleDecision = async (decision: 'approved' | 'rejected') => {
        setLoading(true);
        setError(null);
        try {
            if (decision === 'approved' && !consentChecked) {
                throw new Error("Debes marcar la casilla para dar tu consentimiento.");
            }

            const rpcName = decision === 'approved' ? 'approve_referral_request' : 'reject_referral_request';
            
            const { error: rpcError } = await supabase.rpc(rpcName, {
                p_request_id: request.id
            });
            
            if (rpcError) {
                // The new error will come from the RPC, so the message might be more user-friendly.
                throw new Error(rpcError.message);
            }
            
            onDecision();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalContent, maxWidth: '600px' }} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Solicitud de Consentimiento</h2>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <p><strong>{sourceClinic}</strong> solicita tu permiso para compartir parte de tu información con otro profesional para continuar con tu cuidado.</p>
                    
                    <div style={{ backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px' }}>
                        <h3 style={{ color: 'var(--primary-color)', margin: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Detalles de la Referencia</h3>
                        
                        <div style={styles.detailGroup}>
                            <h4 style={styles.detailGroupTitle}>Se te referirá con:</h4>
                            <p style={{ margin: 0, fontWeight: 600 }}>{destinationName}</p>
                            {destinationSpecialty && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>{destinationSpecialty}</p>}
                        </div>

                        <div style={styles.detailGroup}>
                            <h4 style={styles.detailGroupTitle}>Motivo de la referencia:</h4>
                            <p style={{ margin: 0, fontStyle: 'italic' }}>"{request.notes || 'No se especificó un motivo.'}"</p>
                        </div>
                        
                        <div style={styles.detailGroup}>
                            <h4 style={styles.detailGroupTitle}>La información que se compartirá incluye:</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                                {Object.entries(patientInfo).map(([key, value]) => (
                                    <li key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <input
                            id="consent_check" type="checkbox"
                            checked={consentChecked}
                            onChange={e => setConsentChecked(e.target.checked)}
                            style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                        />
                        <label htmlFor="consent_check" style={{ ...styles.label, marginBottom: 0, fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 400 }}>
                            He leído los detalles y doy mi consentimiento expreso para que mi información sea compartida para esta referencia en particular.
                        </label>
                    </div>

                </div>
                <div style={styles.modalFooter}>
                    <button onClick={() => handleDecision('rejected')} className="button-secondary" disabled={loading}>Rechazar</button>
                    <button onClick={() => handleDecision('approved')} disabled={loading || !consentChecked}>Aceptar y Enviar Referido</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ConsentRequestModal;