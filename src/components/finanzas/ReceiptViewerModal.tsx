import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { PopulatedPayment, Clinic } from '../../types';

interface ReceiptViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: PopulatedPayment;
    clinic: Clinic;
}

const modalRoot = document.getElementById('modal-root');

// This function now generates a full, self-contained HTML string.
// This is more robust as it doesn't depend on the DOM rendering cycle.
const getReceiptHtml = (payment: PopulatedPayment, clinic: Clinic): string => {
    const paymentMethodText = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia',
        other: 'Otro'
    }[payment.payment_method] || 'No especificado';
    
    // Using direct hex codes for colors to ensure compatibility with the PDF generator.
    const primaryColor = '#3B82F6';

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #333; margin: 0; padding: 0; background-color: white; }
                .container { padding: 40px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .title { font-size: 28px; font-weight: bold; color: ${primaryColor}; margin: 0; }
                .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; font-size: 14px; }
                .section-title { font-size: 14px; font-weight: bold; color: ${primaryColor}; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
                .item-table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 14px; }
                .item-table th { background-color: #f2f2f2; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
                .item-table td { padding: 10px; border-bottom: 1px solid #eee; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div>
                        <h1 class="title">RECIBO DE PAGO</h1>
                        <p style="margin: 0;">Recibo N°: ${payment.id.substring(0, 8).toUpperCase()}</p>
                        <p style="margin: 0;">Fecha: ${new Date(payment.payment_date).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</p>
                    </div>
                    <div style="text-align: right;">
                        ${clinic.logo_url ? `<img src="${clinic.logo_url}" alt="Logo" style="max-width: 150px; max-height: 70px; margin-bottom: 10px;" />` : ''}
                        <h2 style="margin: 0; font-size: 18px;">${clinic.name}</h2>
                        <p style="margin: 0; font-size: 12px;">${clinic.address || ''}</p>
                        <p style="margin: 0; font-size: 12px;">${clinic.phone_number || ''}</p>
                    </div>
                </div>
                <div class="details">
                    <div>
                        <h3 class="section-title">RECIBO PARA</h3>
                        <p style="margin: 0;"><strong>${payment.persons?.full_name || 'Cliente General'}</strong></p>
                    </div>
                    <div>
                        <h3 class="section-title">MÉTODO DE PAGO</h3>
                        <p style="margin: 0; text-transform: capitalize;">${paymentMethodText}</p>
                    </div>
                </div>
                <table class="item-table">
                    <thead>
                        <tr>
                            <th style="width: 60%;">Descripción</th>
                            <th style="text-align: right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${payment.services?.name || 'Servicios Varios'}</td>
                            <td style="text-align: right;">$${parseFloat(String(payment.amount)).toFixed(2)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align: right; font-weight: bold; border-top: 2px solid #333;">TOTAL</td>
                            <td style="text-align: right; font-weight: bold; border-top: 2px solid #333;">$${parseFloat(String(payment.amount)).toFixed(2)} MXN</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="footer">
                    <p>Agradecemos su preferencia.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

const ReceiptViewerModal: FC<ReceiptViewerModalProps> = ({ isOpen, onClose, payment, clinic }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        
        const generatePdf = async () => {
            setLoading(true);
            setError(null);
            setPdfUrl(null);
            
            // Generate the HTML string directly
            const htmlContent = getReceiptHtml(payment, clinic);
            
            try {
                const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        html: htmlContent,
                        filename: `Recibo_${payment.persons?.full_name?.replace(/\s/g, '_') || 'pago'}.pdf`
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

        // Cleanup function
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
        // The dependency array now correctly reflects what's needed to generate the PDF
    }, [isOpen, payment, clinic]);


    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '900px', height: '90vh'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Vista Previa del Recibo</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#525659' }}>
                    {loading && <p>Generando PDF...</p>}
                    {error && <p style={styles.error}>{error}</p>}
                    {pdfUrl && !loading && (
                        <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Vista Previa del Recibo"/>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                    <a href={pdfUrl || '#'} download={`Recibo_${payment.persons?.full_name?.replace(/\s/g, '_') || 'pago'}.pdf`} className="button" style={{textDecoration: 'none', pointerEvents: pdfUrl ? 'auto' : 'none', opacity: pdfUrl ? 1 : 0.5}}>
                        {ICONS.download} Descargar PDF
                    </a>
                </div>
            </div>
        </div>
    , modalRoot);
};

export default ReceiptViewerModal;