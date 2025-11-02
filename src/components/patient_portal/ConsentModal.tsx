import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface ConsentModalProps {
    personName: string;
    onAccept: () => Promise<void>;
    onLogout: () => Promise<void>;
}

const modalRoot = document.getElementById('modal-root');

const ConsentModal: FC<ConsentModalProps> = ({ personName, onAccept, onLogout }) => {
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        setLoading(true);
        await onAccept();
        setLoading(false);
    };
    
    const handleLogout = async () => {
        setLoading(true);
        await onLogout();
        // The page will reload after logout, so no need to setLoading(false)
    };

    if (!modalRoot) return null;

    return createPortal(
        <div style={{ ...styles.modalOverlay, zIndex: 2000 }}>
            <div style={{ ...styles.modalContent, maxWidth: '600px' }} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Actualización de Términos y Consentimiento</h2>
                </div>
                <div style={styles.modalBody}>
                    <p>Hola, <strong>{personName}</strong>. Para continuar usando el portal, necesitamos que revises y aceptes nuestro Aviso de Privacidad y los términos de tratamiento de tus datos personales, de acuerdo con la ley.</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid var(--border-color)`, padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--background-color)', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        <h4>Resumen del Consentimiento</h4>
                        <p>Al hacer clic en "Aceptar", confirmas que:</p>
                        <ul>
                            <li>Has recibido y estás de acuerdo con el Aviso de Privacidad.</li>
                            <li>Consientes el tratamiento de tus datos personales y sensibles (como datos de salud) para los fines de tu tratamiento nutricional.</li>
                            <li>Entiendes que puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) en cualquier momento.</li>
                        </ul>
                        <p>Tu privacidad es muy importante para nosotros. Puedes solicitar el aviso de privacidad completo a tu nutriólogo.</p>
                    </div>
                </div>
                <div style={{ ...styles.modalFooter, justifyContent: 'space-between' }}>
                    <button onClick={handleLogout} className="button-secondary" disabled={loading}>
                        Cerrar Sesión
                    </button>
                    <button onClick={handleAccept} disabled={loading}>
                        {loading ? 'Guardando...' : 'Aceptar y Continuar'}
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ConsentModal;