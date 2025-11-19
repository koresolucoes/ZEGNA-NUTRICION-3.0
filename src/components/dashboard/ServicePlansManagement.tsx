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
                .order('price', { ascending: true });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ 
                width: '20px', height: '20px', borderRadius: '50%', 
                backgroundColor: included ? 'var(--primary-light)' : 'var(--surface-hover-color)', 
                color: included ? 'var(--primary-color)' : 'var(--text-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
            }}>
                {included ? '✓' : '✕'}
            </div>
            <span style={{ color: included ? 'var(--text-color)' : 'var(--text-light)', textDecoration: included ? 'none' : 'line-through', opacity: included ? 1 : 0.7 }}>
                {label}
            </span>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
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

             {/* Hero Header */}
             <div style={{textAlign: 'center', marginBottom: '3rem', padding: '2.5rem', background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--surface-hover-color) 100%)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
                <h1 style={{fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem 0'}}>Planes de Suscripción</h1>
                <p style={{color: 'var(--text-light)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto'}}>
                    Diseña paquetes atractivos para fidelizar a tus pacientes. Configura duración, límites y acceso a la app.
                </p>
                <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifySelf: 'center', justifyContent: 'center'}}>
                     <button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} className="button-primary" style={{padding: '0.8rem 1.5rem', borderRadius: '12px', fontSize: '1rem'}}>
                        {ICONS.add} Crear Nuevo Plan
                    </button>
                </div>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)'}}>Cargando planes...</div>}
            {error && <p style={styles.error}>{error}</p>}
            
            {!loading && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                    gap: '2rem',
                    alignItems: 'stretch'
                }}>
                    {plans.map((plan, index) => {
                        const features = (plan.features as any) || {};
                        // Optional: Highlight the middle plan or expensive plan if we wanted logic
                        const isHighlight = false; 

                        return (
                            <div key={plan.id} className="card-hover" style={{ 
                                backgroundColor: 'var(--surface-color)', 
                                borderRadius: '24px', 
                                border: isHighlight ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                display: 'flex', 
                                flexDirection: 'column', 
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)'
                            }}>
                                {index === 1 && plans.length >= 3 && (
                                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))'}}></div>
                                )}

                                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-color)' }}>{plan.name}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', minHeight: '3em', lineHeight: 1.5 }}>{plan.description || 'Sin descripción'}</p>
                                    
                                    <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-1px' }}>
                                            ${(plan.price || 0).toFixed(0)}
                                        </span>
                                        <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem', fontWeight: 500 }}>/ {plan.duration_days} días</span>
                                    </div>

                                    <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '1rem' }}>BENEFICIOS</p>
                                        <FeatureItem label={plan.max_consultations ? `${plan.max_consultations} consultas incluidas` : 'Consultas ilimitadas'} included={true} />
                                        <FeatureItem label="Asistente IA en Portal" included={features.patient_portal_ai_enabled !== false} />
                                        <FeatureItem label="Sistema de Puntos (Gamificación)" included={features.gamification_enabled !== false} />
                                        <FeatureItem label={`${features.file_storage_limit_mb || 100} MB Almacenamiento`} included={true} />
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    padding: '1.5rem 2rem', 
                                    backgroundColor: 'var(--surface-hover-color)', 
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    gap: '1rem'
                                }}>
                                    <button onClick={() => handleEdit(plan)} style={{ flex: 1, justifyContent: 'center', borderRadius: '10px' }} className="button-secondary">
                                        Editar
                                    </button>
                                    <button onClick={() => setDeletingPlan(plan)} style={{ padding: '0.8rem', color: 'var(--error-color)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', borderRadius: '10px', cursor: 'pointer' }}>
                                        {ICONS.delete}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    
                    {!loading && plans.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)' }}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>{ICONS.briefcase}</div>
                            <p>No has creado ningún plan de servicio. ¡Crea el primero para fidelizar a tus pacientes!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicePlansManagement;