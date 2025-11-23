
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
        },
        sat_product_code: '85101702',
        sat_unit_code: 'E48',
        sat_tax_object_code: '02'
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
                    patient_portal_ai_enabled: features.patient_portal_ai_enabled !== false,
                    gamification_enabled: features.gamification_enabled !== false,
                    file_storage_limit_mb: features.file_storage_limit_mb || 100,
                },
                sat_product_code: planToEdit.sat_product_code || '85101702',
                sat_unit_code: planToEdit.sat_unit_code || 'E48',
                sat_tax_object_code: planToEdit.sat_tax_object_code || '02'
            });
        } else {
            setFormData({
                name: '', duration_days: 30, description: '', max_consultations: '', price: '',
                features: { patient_portal_ai_enabled: true, gamification_enabled: true, file_storage_limit_mb: 100 },
                sat_product_code: '85101702',
                sat_unit_code: 'E48',
                sat_tax_object_code: '02'
            });
        }
    }, [planToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                sat_product_code: formData.sat_product_code,
                sat_unit_code: formData.sat_unit_code,
                sat_tax_object_code: formData.sat_tax_object_code
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '700px', borderRadius: '16px', padding: 0 }} className="fade-in">
                <div style={{...styles.modalHeader, borderBottom: 'none', paddingBottom: 0}}>
                    <h2 style={{...styles.modalTitle, fontSize: '1.5rem'}}>{planToEdit ? 'Editar Plan' : 'Crear Nuevo Plan'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, paddingTop: '1.5rem'}}>
                    {error && <div style={{...styles.error, marginBottom: '1.5rem'}}>{error}</div>}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Left Column: Basic Info */}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', marginTop: 0 }}>Información Básica</h3>
                            
                            <label htmlFor="plan-name" style={styles.label}>Nombre del Plan *</label>
                            <input id="plan-name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Ej: Plan Trimestral" required style={styles.input} />
                            
                            <label htmlFor="plan-description" style={styles.label}>Descripción Breve</label>
                            <textarea id="plan-description" name="description" value={formData.description} onChange={handleChange} rows={3} style={styles.input} />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                <div>
                                    <label htmlFor="plan-price" style={styles.label}>Precio *</label>
                                    <div style={{position: 'relative'}}>
                                        <span style={{position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)'}}>$</span>
                                        <input id="plan-price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required placeholder="0.00" style={{...styles.input, paddingLeft: '1.8rem'}} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="plan-duration" style={styles.label}>Duración (días) *</label>
                                    <input id="plan-duration" name="duration_days" type="number" value={formData.duration_days} onChange={handleChange} required style={styles.input} />
                                </div>
                            </div>

                            {/* New Fiscal Section */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {ICONS.briefcase} Datos Fiscales
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label htmlFor="sat_product_code" style={{...styles.label, fontSize: '0.8rem'}}>Clave Producto</label>
                                        <input id="sat_product_code" name="sat_product_code" type="text" value={formData.sat_product_code} onChange={handleChange} placeholder="85101702" style={{...styles.input, fontSize: '0.9rem', padding: '0.5rem'}} />
                                    </div>
                                    <div>
                                        <label htmlFor="sat_unit_code" style={{...styles.label, fontSize: '0.8rem'}}>Clave Unidad</label>
                                        <input id="sat_unit_code" name="sat_unit_code" type="text" value={formData.sat_unit_code} onChange={handleChange} placeholder="E48" style={{...styles.input, fontSize: '0.9rem', padding: '0.5rem'}} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label htmlFor="sat_tax_object_code" style={{...styles.label, fontSize: '0.8rem'}}>Objeto de Impuesto</label>
                                        <select id="sat_tax_object_code" name="sat_tax_object_code" value={formData.sat_tax_object_code} onChange={handleChange} style={{...styles.input, fontSize: '0.9rem', padding: '0.5rem'}}>
                                            <option value="01">01 - No objeto de impuesto</option>
                                            <option value="02">02 - Sí objeto de impuesto</option>
                                            <option value="03">03 - Sí objeto y no obligado al desglose</option>
                                            <option value="04">04 - Sí objeto y no causa impuesto</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Features & Limits */}
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', marginTop: 0 }}>Límites y Funciones</h3>
                            
                            <label htmlFor="max-consultations" style={styles.label}>Límite de Consultas</label>
                            <input id="max-consultations" name="max_consultations" type="number" value={formData.max_consultations} onChange={handleChange} placeholder="Dejar vacío para ilimitadas" style={styles.input} />
                            <small style={{display: 'block', marginTop: '-0.5rem', marginBottom: '1.5rem', color: 'var(--text-light)', fontSize: '0.8rem'}}>Número máximo de citas que el paciente puede agendar durante la vigencia del plan.</small>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                                    <label htmlFor="patient_portal_ai_enabled" style={{marginBottom: 0, fontWeight: 500, fontSize: '0.9rem'}}>Asistente IA</label>
                                    <label className="switch"><input id="patient_portal_ai_enabled" name="patient_portal_ai_enabled" type="checkbox" checked={formData.features.patient_portal_ai_enabled} onChange={handleFeatureChange} /><span className="slider round"></span></label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px' }}>
                                    <label htmlFor="gamification_enabled" style={{marginBottom: 0, fontWeight: 500, fontSize: '0.9rem'}}>Gamificación</label>
                                    <label className="switch"><input id="gamification_enabled" name="gamification_enabled" type="checkbox" checked={formData.features.gamification_enabled} onChange={handleFeatureChange} /><span className="slider round"></span></label>
                                </div>
                            </div>

                             <div style={{marginTop: '1.5rem'}}>
                                <label htmlFor="file_storage_limit_mb" style={styles.label}>Almacenamiento de Archivos (MB)</label>
                                <input id="file_storage_limit_mb" name="file_storage_limit_mb" type="number" value={formData.features.file_storage_limit_mb} onChange={handleFeatureChange} style={styles.input} />
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{...styles.modalFooter, backgroundColor: 'transparent', borderTop: 'none', paddingTop: 0, paddingBottom: '2rem'}}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading} style={{minWidth: '140px'}}>{loading ? 'Guardando...' : 'Guardar Plan'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ServicePlanFormModal;
