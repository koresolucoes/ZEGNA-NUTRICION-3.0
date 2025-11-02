import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Ally } from '../../types';

interface AllyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    ally: Ally;
}

const modalRoot = document.getElementById('modal-root');

const AllyDetailsModal: FC<AllyDetailsModalProps> = ({ isOpen, onClose, ally }) => {
    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                         <img
                            src={ally.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${ally.full_name || '?'}&radius=50`}
                            alt="avatar"
                            style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover'}}
                        />
                        <div>
                            <h2 style={{...styles.modalTitle, margin: 0}}>{ally.full_name}</h2>
                            <p style={{margin: '0.25rem 0 0 0', color: 'var(--primary-color)', fontWeight: 500}}>{ally.specialty}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {ally.biography && (
                        <div style={{marginBottom: '1.5rem'}}>
                            <h3 style={{fontSize: '1rem', color: 'var(--text-light)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>Biografía Profesional</h3>
                            <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{ally.biography}</p>
                        </div>
                    )}

                    <h3 style={{fontSize: '1.1rem', color: 'var(--primary-color)', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>Información de Contacto</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', fontSize: '0.9rem'}}>
                        {ally.phone_number && <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.phone}<span>{ally.phone_number}</span></div>}
                        {ally.office_address && <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.mapPin}<span>{ally.office_address}</span></div>}
                        {ally.contact_email && <a href={`mailto:${ally.contact_email}`} style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.send}<span>{ally.contact_email}</span></a>}
                        {ally.website && <a href={ally.website} target="_blank" rel="noopener noreferrer" style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{ICONS.link}<span>Sitio Web</span></a>}
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default AllyDetailsModal;
