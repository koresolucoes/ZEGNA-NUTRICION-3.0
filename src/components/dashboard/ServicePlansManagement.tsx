import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { PatientServicePlan } from '../../types';
import ConfirmationModal from '../shared/ConfirmationModal';
import ServicePlanFormModal from './ServicePlanFormModal';

const ServicePlansManagement: FC = () => {
    const { clinic } = useClinic();
    const [plans, setPlans] = useState<PatientServicePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PatientServicePlan | null>(null);
    const [deletingPlan, setDeletingPlan] = useState<PatientServicePlan | null>(null);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('patient_service_plans')
                .select('*')
                .eq('clinic_id', clinic.id)
                .order('price', { ascending: true }); // Order by price typically makes sense for plans
            if (error) throw error;
            setPlans(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (plan: PatientServicePlan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setEditingPlan(null);
        fetchData();
    };

    const handleDeleteConfirm = async () => {
        if (!deletingPlan) return;
        const { error } = await supabase.from('patient_service_plans').delete().eq('id', deletingPlan.id);
        if (error) {
            setError(`Error al eliminar: ${error.message}`);
        } else {
            fetchData();
        }
        setDeletingPlan(null);
    };

    const FeatureItem: FC<{ label: string; included: boolean }> = ({ label, included }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ 
                color: included ? 'var(--primary-color)' : 'var(--text-light)', 
                fontSize: '1.1rem', 
                opacity: included ? 1 : 0.5 
            }}>
                {included ? '✓' : '×'}
            </span>
            <span style={{ color: included ? 'var(--text-color)' : 'var(--text-light)', textDecoration: included ? 'none' : 'line-through' }}>
                {label}
            </span>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
            {isModalOpen && (
                <ServicePlanFormModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingPlan(null); }}
                    onSave={handleSaveSuccess}
                    planToEdit={editingPlan}
                />
            )}
            {deletingPlan && (
                <ConfirmationModal
                    isOpen={!!deletingPlan}
                    onClose={() => setDeletingPlan(null)}
                    onConfirm={handleDeleteConfirm}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar el plan "<strong>{deletingPlan.name}</strong>"?</p>}
                />
            )}

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Planes de Servicio</h2>
                <p style={{ color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                    Diseña paquetes atractivos para tus pacientes. Configura la duración, límites de consultas y acceso a funcionalidades exclusivas de la app.
                </p>
                <button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} className="button-primary" style={{ marginTop: '2rem' }}>
                    {ICONS.add} Crear Nuevo Plan
                </button>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>Cargando planes...</div>}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '2rem',
                    alignItems: 'stretch'
                }}>
                    {plans.map(plan => {
                        const features = (plan.features as any) || {};
                        return (
                            <div key={plan.id} style={{ 
                                backgroundColor: 'var(--surface-color)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--border-color)',
                                display: 'flex', 
                                flexDirection: 'column', 
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                position: 'relative',
                                overflow: 'hidden'
                            }} className="card-hover">
                                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)' }}>{plan.name}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', minHeight: '3em' }}>{plan.description || 'Sin descripción'}</p>
                                    
                                    <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                                            ${(plan.price || 0).toFixed(0)}
                                        </span>
                                        <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem' }}>/ {plan.duration_days} días</span>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '1rem' }}>INCLUYE</p>
                                        <FeatureItem label={plan.max_consultations ? `${plan.max_consultations} consultas incluidas` : 'Consultas ilimitadas'} included={true} />
                                        <FeatureItem label="Asistente IA en Portal" included={features.patient_portal_ai_enabled !== false} />
                                        <FeatureItem label="Sistema de Puntos (Gamificación)" included={features.gamification_enabled !== false} />
                                        <FeatureItem label={`${features.file_storage_limit_mb || 100} MB Almacenamiento`} included={true} />
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    padding: '1.25rem 2rem', 
                                    backgroundColor: 'var(--surface-hover-color)', 
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    gap: '1rem'
                                }}>
                                    <button onClick={() => handleEdit(plan)} style={{ flex: 1, justifyContent: 'center' }} className="button-secondary">
                                        Editar
                                    </button>
                                    <button onClick={() => setDeletingPlan(plan)} style={{ padding: '0.6rem', color: 'var(--error-color)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} className="button-secondary">
                                        {ICONS.delete}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    
                    {!loading && plans.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)' }}>
                            <p>No has creado ningún plan de servicio. ¡Crea el primero para fidelizar a tus pacientes!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicePlansManagement;