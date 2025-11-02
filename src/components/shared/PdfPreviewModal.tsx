import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface PdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    getHtmlContent: () => string;
    fileName: string;
}

const modalRoot = document.getElementById('modal-root');

const PdfPreviewModal: FC<PdfPreviewModalProps> = ({ isOpen, onClose, title, getHtmlContent, fileName }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const generatePdf = async () => {
            setLoading(true);
            setError(null);
            setPdfUrl(null);

            const htmlContent = getHtmlContent();

            try {
                const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        html: htmlContent,
                        filename: fileName
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falló la generación del PDF.');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        generatePdf();

        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, getHtmlContent, fileName]);

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '900px', height: '90vh'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{title}</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#525659' }}>
                    {loading && <p style={{color: 'white'}}>Generando PDF...</p>}
                    {error && <p style={{...styles.error, backgroundColor: 'var(--surface-color)'}}>{error}</p>}
                    {pdfUrl && !loading && (
                        <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={title}/>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                    <a href={pdfUrl || '#'} download={fileName} className="button" style={{textDecoration: 'none', pointerEvents: pdfUrl ? 'auto' : 'none', opacity: pdfUrl ? 1 : 0.5}}>
                        {ICONS.download} Descargar PDF
                    </a>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default PdfPreviewModal;
