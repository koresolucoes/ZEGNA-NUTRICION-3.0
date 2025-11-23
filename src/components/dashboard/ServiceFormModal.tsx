
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { Service } from '../../types';

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    serviceToEdit: Service | null;
}

const modalRoot = document.getElementById('modal-root');

const ServiceFormModal: FC<ServiceFormModalProps> = ({ isOpen, onClose, onSave, serviceToEdit }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({ 
        name: '', 
        description: '', 
        price: '',
        sat_product_code: '85101702',
        sat_unit_code: 'E48',
        sat_tax_object_code: '02'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (serviceToEdit) {
            setFormData({
                name: serviceToEdit.name,
                description: serviceToEdit.description || '',
                price: String(serviceToEdit.price),
                sat_product_code: serviceToEdit.sat_product_code || '85101702',
                sat_unit_code: serviceToEdit.sat_unit_code || 'E48',
                sat_tax_object_code: serviceToEdit.sat_tax_object_code || '02'
            });
        } else {
            setFormData({ 
                name: '', 
                description: '', 
                price: '',
                sat_product_code: '85101702',
                sat_unit_code: 'E48',
                sat_tax_object_code: '02'
            });
        }
    }, [serviceToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !formData.name.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                sat_product_code: formData.sat_product_code,
                sat_unit_code: formData.sat_unit_code,
                sat_tax_object_code: formData.sat_tax_object_code
            };

            if (serviceToEdit) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', serviceToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert({
                        ...payload,
                        clinic_id: clinic.id,
                    });
                if (error) throw error;
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '550px', borderRadius: '16px', padding: '0'}} className="fade-in">
                <div style={{...styles.modalHeader, borderBottom: 'none', paddingBottom: '0'}}>
                    <h2 style={{...styles.modalTitle, fontSize: '1.5rem'}}>{serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>
                
                <div style={{...styles.modalBody, paddingTop: '1.5rem'}}>
                    {error && <div style={{...styles.error, marginBottom: '1.5rem'}}>{error}</div>}
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="service-name" style={styles.label}>Nombre del Servicio</label>
                        <input 
                            id="service-name" 
                            name="name" 
                            type="text" 
                            value={formData.name} 
                            onChange={handleChange} 
                            placeholder="Ej: Consulta Inicial, Seguimiento..." 
                            required 
                            autoFocus
                            style={{...styles.input, fontSize: '1.1rem', padding: '1rem'}}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="service-price" style={styles.label}>Precio (MXN)</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontWeight: 600 }}>$</span>
                            <input 
                                id="service-price" 
                                name="price" 
                                type="number" 
                                step="0.01" 
                                value={formData.price} 
                                onChange={handleChange} 
                                required 
                                placeholder="0.00"
                                style={{...styles.input, paddingLeft: '2.5rem', fontSize: '1.1rem'}}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="service-description" style={styles.label}>Descripción (Opcional)</label>
                        <textarea 
                            id="service-description" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows={3} 
                            placeholder="Detalles sobre qué incluye este servicio."
                            style={{...styles.input, resize: 'vertical'}}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {ICONS.briefcase} Datos Fiscales (SAT)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label htmlFor="sat_product_code" style={styles.label}>Clave Producto</label>
                                <input id="sat_product_code" name="sat_product_code" type="text" value={formData.sat_product_code} onChange={handleChange} placeholder="85101702" style={styles.input} />
                            </div>
                            <div>
                                <label htmlFor="sat_unit_code" style={styles.label}>Clave Unidad</label>
                                <input id="sat_unit_code" name="sat_unit_code" type="text" value={formData.sat_unit_code} onChange={handleChange} placeholder="E48" style={styles.input} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label htmlFor="sat_tax_object_code" style={styles.label}>Objeto de Impuesto</label>
                                <select id="sat_tax_object_code" name="sat_tax_object_code" value={formData.sat_tax_object_code} onChange={handleChange} style={styles.input}>
                                    <option value="01">01 - No objeto de impuesto</option>
                                    <option value="02">02 - Sí objeto de impuesto</option>
                                    <option value="03">03 - Sí objeto y no obligado al desglose</option>
                                    <option value="04">04 - Sí objeto y no causa impuesto</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{...styles.modalFooter, backgroundColor: 'transparent', borderTop: 'none', paddingTop: 0, paddingBottom: '2rem'}}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading} style={{minWidth: '120px'}}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ServiceFormModal;
