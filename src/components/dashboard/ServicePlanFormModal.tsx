import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { PatientServicePlan } from '../../types';

interface ServicePlanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    planToEdit: PatientServicePlan | null;
}

const modalRoot = document.getElementById('modal-root');

const ServicePlanFormModal: FC<ServicePlanFormModalProps> = ({ isOpen, onClose, onSave, planToEdit }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        name: '',
        duration_days: 30,
        description: '',
        max_consultations: '',
        price: '',
        features: {
            patient_portal_ai_enabled: true,
            gamification_enabled: true,
            file_storage_limit_mb: 100,
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (planToEdit) {
            const features = (planToEdit.features || {}) as any;
            setFormData({
                name: planToEdit.name,
                duration_days: planToEdit.duration_days,
                description: planToEdit.description || '',
                max_consultations: planToEdit.max_consultations?.toString() || '',
                price: String(planToEdit.price || ''),
                features: {
                    patient_portal_ai_enabled: features.patient_portal_ai_enabled !== false, // default true
                    gamification_enabled: features.gamification_enabled !== false, // default true
                    file_storage_limit_mb: features.file_storage_limit_mb || 100,
                }
            });
        } else {
            setFormData({
                name: '', duration_days: 30, description: '', max_consultations: '', price: '',
                features: { patient_portal_ai_enabled: true, gamification_enabled: true, file_storage_limit_mb: 100 }
            });
        }
    }, [planToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [name]: type === 'checkbox' ? checked : Number(value)
            }
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !formData.name.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const payload = {
                name: formData.name,
                duration_days: Number(formData.duration_days) || 0,
                description: formData.description,
                max_consultations: formData.max_consultations ? Number(formData.max_consultations) : null,
                price: parseFloat(formData.price) || 0,
                features: formData.features as unknown as Json,
            };

            if (planToEdit) {
                const { error } = await supabase
                    .from('patient_service_plans')
                    .update(payload)
                    .eq('id', planToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('patient_service_plans')
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{planToEdit ? 'Editar Plan de Servicio' : 'Nuevo Plan de Servicio'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="plan-name">Nombre del Plan*</label>
                    <input
                        id="plan-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: Plan Mensual, Paquete Trimestral"
                        required
                    />
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                        <div style={{flex: 1}}>
                            <label htmlFor="plan-duration">Duración (días)*</label>
                            <input
                                id="plan-duration"
                                name="duration_days"
                                type="number"
                                value={formData.duration_days}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div style={{flex: 1}}>
                            <label htmlFor="max-consultations">Nº Consultas</label>
                            <input
                                id="max-consultations"
                                name="max_consultations"
                                type="number"
                                value={formData.max_consultations}
                                onChange={handleChange}
                                placeholder="Ilimitado"
                            />
                        </div>
                         <div style={{flex: 1}}>
                            <label htmlFor="plan-price">Precio (MXN)*</label>
                            <input
                                id="plan-price"
                                name="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <label htmlFor="plan-description">Descripción (opcional)</label>
                    <textarea
                        id="plan-description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Ej: Incluye 4 consultas y acceso a la app."
                    />

                    <h3 style={{fontSize: '1.1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>Funcionalidades del Portal del Paciente</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                            <label htmlFor="patient_portal_ai_enabled" style={{marginBottom: 0, fontWeight: 500}}>Activar Asistente IA</label>
                            <label className="switch"><input id="patient_portal_ai_enabled" name="patient_portal_ai_enabled" type="checkbox" checked={formData.features.patient_portal_ai_enabled} onChange={handleFeatureChange} /><span className="slider round"></span></label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                            <label htmlFor="gamification_enabled" style={{marginBottom: 0, fontWeight: 500}}>Activar Sistema de Puntos</label>
                            <label className="switch"><input id="gamification_enabled" name="gamification_enabled" type="checkbox" checked={formData.features.gamification_enabled} onChange={handleFeatureChange} /><span className="slider round"></span></label>
                        </div>
                        <div>
                            <label htmlFor="file_storage_limit_mb">Límite de Almacenamiento (MB)</label>
                            <input id="file_storage_limit_mb" name="file_storage_limit_mb" type="number" value={formData.features.file_storage_limit_mb} onChange={handleFeatureChange} />
                        </div>
                    </div>
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

export default ServicePlanFormModal;