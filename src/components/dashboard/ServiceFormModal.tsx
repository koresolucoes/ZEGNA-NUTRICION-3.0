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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="service-name">Nombre del Servicio*</label>
                    <input id="service-name" name="name" type="text" value={formData.name} onChange={handleChange} required />
                    
                    <label htmlFor="service-price">Precio*</label>
                    <input id="service-price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />

                    <label htmlFor="service-description">Descripción (opcional)</label>
                    <textarea id="service-description" name="description" value={formData.description} onChange={handleChange} rows={3} />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ServiceFormModal;