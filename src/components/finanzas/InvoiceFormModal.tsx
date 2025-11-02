
import React, { FC, useState, useEffect, FormEvent, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { PopulatedPayment } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

const modalRoot = document.getElementById('modal-root');

// Catálogo de Usos de CFDI según el SAT
const allCfdiUses = [
    { code: 'D01', description: 'Honorarios médicos, dentales y gastos hospitalarios.', type: 'fisica' },
    { code: 'G03', description: 'Gastos en general', type: 'ambos' },
    { code: 'G01', description: 'Adquisición de mercancías', type: 'ambos' },
    { code: 'S01', description: 'Sin efectos fiscales', type: 'ambos' },
    { code: 'G02', description: 'Devoluciones, descuentos o bonificaciones', type: 'ambos' },
    { code: 'I01', description: 'Construcciones', type: 'ambos' },
    { code: 'I08', description: 'Otra maquinaria y equipo', type: 'ambos' },
    { code: 'CP01', description: 'Pagos', type: 'ambos' },
];

// Regímenes de Personas Físicas (simplificado)
const regimenesPersonaFisica = ['605', '606', '608', '611', '612', '614', '615', '616', '621', '625', '626'];
// Catálogo de Regímenes Fiscales para el selector
const fiscalRegimes = [
    {
        label: 'Personas Físicas',
        options: [
            { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
            { code: '612', name: 'Actividades Empresariales y Profesionales' },
            { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
            { code: '614', name: 'Ingresos por intereses' },
            { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
            { code: '616', name: 'Sin obligaciones fiscales' },
        ]
    },
    {
        label: 'Personas Morales',
        options: [
            { code: '601', name: 'General de Ley Personas Morales' },
            { code: '603', name: 'Grupo de Sociedades' },
            { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
        ]
    }
];

interface InvoiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    payment: PopulatedPayment;
}

const InvoiceFormModal: FC<InvoiceFormModalProps> = ({ isOpen, onClose, onSuccess, payment }) => {
    const { clinic } = useClinic();
    const [personFiscalData, setPersonFiscalData] = useState({
        rfc: '',
        fiscal_address: '',
        fiscal_regime: '',
    });
    const [cfdiUse, setCfdiUse] = useState('G03');
    const [filteredCfdiUses, setFilteredCfdiUses] = useState(allCfdiUses);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (payment.persons) {
            setPersonFiscalData({
                rfc: payment.persons.rfc || '',
                fiscal_address: payment.persons.fiscal_address || '',
                fiscal_regime: payment.persons.fiscal_regime || '',
            });
        }
    }, [payment]);
    
    // Efecto para filtrar los usos de CFDI según el régimen fiscal
    useEffect(() => {
        const regime = personFiscalData.fiscal_regime;
        const isPersonaFisica = regimenesPersonaFisica.includes(regime);
        
        let validUses;
        if (isPersonaFisica) {
            // Personas físicas pueden usar D01, G03, etc.
            validUses = allCfdiUses.filter(u => u.type === 'ambos' || u.type === 'fisica');
            setCfdiUse(prev => prev === 'D01' || !validUses.some(u => u.code === prev) ? 'D01' : prev);
        } else {
            // Personas morales no pueden usar deducciones personales como D01
            validUses = allCfdiUses.filter(u => u.type === 'ambos');
            setCfdiUse(prev => prev === 'G03' || !validUses.some(u => u.code === prev) ? 'G03' : prev);
        }
        setFilteredCfdiUses(validUses);

    }, [personFiscalData.fiscal_regime]);


    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPersonFiscalData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateInvoice = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!personFiscalData.rfc || !personFiscalData.fiscal_address || !personFiscalData.fiscal_regime) {
            setError('Todos los datos fiscales del receptor son obligatorios.');
            setLoading(false);
            return;
        }

        try {
            // Llamar a la función serverless que ahora se encarga de todo.
            const response = await fetch('/api/generate-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_id: payment.id,
                    cfdi_use: cfdiUse,
                    ...personFiscalData,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falló la generación de la factura.');
            
            setSuccess(`Factura generada con éxito. UUID: ${result.uuid}`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleGenerateInvoice} style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generar Factura (CFDI 4.0)</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}

                    <h3 style={{fontSize: '1.1rem', color: 'var(--primary-color)'}}>Datos del Receptor</h3>
                    <p>Verifica y completa los datos fiscales del paciente. Los cambios se guardarán en su expediente.</p>
                    
                    <label htmlFor="rfc">RFC*</label>
                    <input id="rfc" name="rfc" type="text" value={personFiscalData.rfc} onChange={handleDataChange} required />
                    
                    <label htmlFor="fiscal_regime">Régimen Fiscal del Receptor*</label>
                    <select id="fiscal_regime" name="fiscal_regime" value={personFiscalData.fiscal_regime} onChange={handleDataChange} required>
                        <option value="" disabled>-- Selecciona un régimen --</option>
                        {fiscalRegimes.map(group => (
                            <optgroup key={group.label} label={group.label}>
                                {group.options.map(option => (
                                    <option key={option.code} value={option.code}>
                                        ({option.code}) {option.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>

                    <label htmlFor="fiscal_address">Domicilio Fiscal (con Código Postal)*</label>
                    <textarea 
                        id="fiscal_address" 
                        name="fiscal_address" 
                        value={personFiscalData.fiscal_address} 
                        onChange={handleDataChange} 
                        rows={3} 
                        placeholder="Calle, Número, Colonia, Ciudad, Estado, Código Postal"
                        required 
                    />
                    <small style={{display: 'block', marginTop: '-0.75rem', color: 'var(--text-light)', fontSize: '0.8rem'}}>
                        Importante: Asegúrate de que la dirección incluya el Código Postal correcto que tienes registrado en el SAT.
                    </small>

                    <h3 style={{fontSize: '1.1rem', color: 'var(--primary-color)', marginTop: '2rem'}}>Detalles de la Factura</h3>
                    <p><strong>Servicio:</strong> {payment.services?.name || 'Varios'}</p>
                    <p><strong>Monto Total:</strong> ${parseFloat(String(payment.amount)).toFixed(2)} MXN (IVA exento)</p>
                    
                    <label htmlFor="cfdiUse">Uso del CFDI*</label>
                    <select id="cfdiUse" value={cfdiUse} onChange={e => setCfdiUse(e.target.value)} required>
                        {filteredCfdiUses.map(use => (
                            <option key={use.code} value={use.code}>({use.code}) {use.description}</option>
                        ))}
                    </select>

                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading || !!success}>
                        {loading ? 'Generando...' : 'Generar Factura'}
                    </button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default InvoiceFormModal;
