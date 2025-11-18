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
    const [formData, setFormData] = useState({ name: '', description: '', price: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (serviceToEdit) {
            setFormData({
                name: serviceToEdit.name,
                description: serviceToEdit.description || '',
                price: String(serviceToEdit.price),
            });
        } else {
            setFormData({ name: '', description: '', price: '' });
        }
    }, [serviceToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px', borderRadius: '16px', padding: '0'}} className="fade-in">
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

                    <div>
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