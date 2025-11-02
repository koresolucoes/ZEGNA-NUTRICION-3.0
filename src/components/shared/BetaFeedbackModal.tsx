import React, { FC, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';

interface BetaFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const BetaFeedbackModal: FC<BetaFeedbackModalProps> = ({ isOpen, onClose }) => {
    const { clinic } = useClinic();
    const [feedbackType, setFeedbackType] = useState('Sugerencia de Mejora');
    const [message, setMessage] = useState('');
    const [canContact, setCanContact] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Por favor, escribe tu feedback.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");
            
            const { error: dbError } = await supabase.from('beta_feedback').insert({
                user_id: user.id,
                clinic_id: clinic?.id || null,
                feedback_type: feedbackType,
                message: message,
                contact_allowed: canContact,
            });

            if (dbError) throw dbError;
            
            setSuccess('¡Muchas gracias! Tu feedback ha sido enviado con éxito.');
            setTimeout(() => {
                onClose();
                // Reset form for next time
                setMessage('');
                setFeedbackType('Sugerencia de Mejora');
                setSuccess(null);
            }, 2500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{ ...styles.modalContent, maxWidth: '600px' }} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Enviar Feedback (Beta)</h2>
                    <button type="button" onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <p style={{marginTop: 0, color: 'var(--text-light)'}}>
                        Tus comentarios son muy valiosos para mejorar Zegna Nutrición.
                    </p>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}

                    <label htmlFor="feedback-type">Tipo de Feedback</label>
                    <select id="feedback-type" value={feedbackType} onChange={e => setFeedbackType(e.target.value)}>
                        <option>Sugerencia de Mejora</option>
                        <option>Reporte de Error</option>
                        <option>Me gusta esto</option>
                        <option>Otro</option>
                    </select>

                    <label htmlFor="feedback-message">Tu Mensaje</label>
                    <textarea 
                        id="feedback-message" 
                        rows={6}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Describe tu sugerencia o el problema que encontraste de la forma más detallada posible."
                        required
                    />

                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <input
                            id="can-contact" type="checkbox"
                            checked={canContact}
                            onChange={e => setCanContact(e.target.checked)}
                            style={{ marginTop: '4px', flexShrink: 0, width: '16px', height: '16px' }}
                        />
                        <label htmlFor="can-contact" style={{ ...styles.label, marginBottom: 0, fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 400 }}>
                            Permito que el equipo de Zegna me contacte a mi correo para dar seguimiento a este feedback.
                        </label>
                    </div>

                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !!success}>{loading ? 'Enviando...' : 'Enviar Feedback'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default BetaFeedbackModal;