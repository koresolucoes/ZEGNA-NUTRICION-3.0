import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Log } from '../../types';
import AttachmentPreviewModal from './AttachmentPreviewModal';

interface Attachment {
    name: string;
    url: string;
    type: string;
}

interface LogDetailModalProps {
    log: Log;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const LogDetailModal: FC<LogDetailModalProps> = ({ log, onClose }) => {
    const [previewingAttachment, setPreviewingAttachment] = useState<Attachment | null>(null);
    if (!modalRoot) return null;

    const logTime = log.log_time;
    // FIX: Cast through `unknown` to resolve type mismatch between Supabase `Json` and `Attachment[]`.
    const attachments = (log.attachments as unknown as Attachment[] | null) || [];

    const modalContent = (
         <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        Detalle de Bitácora
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <h3 style={{...styles.detailCardTitle, color: 'var(--primary-dark)'}}>
                        {log.log_type}
                    </h3>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '0.25rem'}}>
                        {new Date(logTime || log.created_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                    <p style={{margin: '1.5rem 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6}}>
                        {log.description}
                    </p>
                    {attachments.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={styles.detailGroupTitle}>Archivos Adjuntos</h4>
                             <div className="info-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'}}>
                                {attachments.map((att, index) => (
                                    <button key={index} onClick={() => setPreviewingAttachment(att)} className="action-card" style={{flexDirection: 'row', justifyContent: 'flex-start', padding: '1rem', gap: '1rem'}}>
                                        {ICONS.file}
                                        <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{att.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                 <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
            {previewingAttachment && (
                <AttachmentPreviewModal 
                    attachment={previewingAttachment}
                    onClose={() => setPreviewingAttachment(null)}
                />
            )}
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default LogDetailModal;