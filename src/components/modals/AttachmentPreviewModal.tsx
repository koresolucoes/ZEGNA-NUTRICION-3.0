import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface Attachment {
    name: string;
    url: string;
    type: string;
}

interface AttachmentPreviewModalProps {
    attachment: Attachment | null;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const AttachmentPreviewModal: FC<AttachmentPreviewModalProps> = ({ attachment, onClose }) => {
    if (!modalRoot || !attachment) return null;

    const modalContent = (
         <div style={{...styles.modalOverlay, zIndex: 1010 }}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '800px', height: '80vh' }} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        {attachment.name}
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1}}>
                    {attachment.type.startsWith('image/') ? (
                        <img src={attachment.url} alt={attachment.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                    ) : attachment.type === 'application/pdf' ? (
                        <iframe 
                            src={attachment.url} 
                            title={attachment.name} 
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    ) : (
                        <div style={{textAlign: 'center', padding: '2rem'}}>
                             <p style={{marginBottom: '1.5rem'}}>No hay una vista previa disponible para este tipo de archivo.</p>
                             <a href={attachment.url} download={attachment.name} target="_blank" rel="noopener noreferrer" className="button">
                                {ICONS.file} Descargar Archivo
                             </a>
                        </div>
                    )}
                </div>
                 <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default AttachmentPreviewModal;