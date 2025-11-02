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
                .order('name');
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

    return (
        <div className="fade-in" style={{ maxWidth: '900px' }}>
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

            <section>
                <h2>Gestionar Planes de Servicio para Pacientes</h2>
                <p style={{color: 'var(--text-light)', maxWidth: '800px'}}>
                    Los Planes de Servicio te permiten definir paquetes para tus pacientes. Al asignar un plan a un paciente, puedes controlar la duración de su acceso, el número de consultas incluidas y qué funcionalidades del Portal del Paciente estarán activas.
                </p>

                <button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} style={{margin: '1.5rem 0'}}>
                    {ICONS.add} Nuevo Plan de Servicio
                </button>

                {loading && <p>Cargando planes...</p>}
                {error && <p style={styles.error}>{error}</p>}
                
                {!loading && plans.length > 0 && (
                    <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                        {plans.map(plan => {
                            const features = (plan.features as any) || {};
                            return (
                                <div key={plan.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{flex: 1}}>
                                        <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-color)'}}>{plan.name}</h4>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 1rem 0'}}>
                                            <p style={{margin: 0, fontSize: '1.1rem', fontWeight: 600}}>{plan.duration_days} días</p>
                                            <p style={{margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)'}}>${(plan.price || 0).toFixed(2)}</p>
                                        </div>
                                        <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)', minHeight: '2.5em'}}>{plan.description || 'Sin descripción.'}</p>

                                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                                {ICONS.check}
                                                <span>{plan.max_consultations ? `${plan.max_consultations} consultas` : 'Consultas ilimitadas'}</span>
                                            </div>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: features.patient_portal_ai_enabled !== false ? 'var(--text-color)' : 'var(--text-light)' }}>
                                                {features.patient_portal_ai_enabled !== false ? ICONS.sparkles : ICONS.close}
                                                <span>Asistente IA del Portal</span>
                                            </div>
                                             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: features.gamification_enabled !== false ? 'var(--text-color)' : 'var(--text-light)' }}>
                                                {features.gamification_enabled !== false ? '🏆' : ICONS.close}
                                                <span>Sistema de Puntos</span>
                                            </div>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                                {ICONS.file}
                                                <span>{features.file_storage_limit_mb || 100} MB de almacenamiento</span>
                                            </div>
                                        </div>

                                    </div>
                                    <div className="card-actions" style={{opacity: 1, justifyContent: 'flex-end', paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                                        <button onClick={() => handleEdit(plan)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                        <button onClick={() => setDeletingPlan(plan)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {!loading && plans.length === 0 && (
                    <p>No has creado ningún plan de servicio.</p>
                )}
            </section>
        </div>
    );
};

export default ServicePlansManagement;