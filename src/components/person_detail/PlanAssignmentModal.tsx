
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, PatientServicePlan } from '../../types';

interface PlanAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    person: Person;
    servicePlans: PatientServicePlan[];
}

const modalRoot = document.getElementById('modal-root');

const PlanAssignmentModal: FC<PlanAssignmentModalProps> = ({ isOpen, onClose, onSave, person, servicePlans }) => {
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedPlanId(person.current_plan_id || '');
    }, [person]);

    const handleAssignPlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const plan = servicePlans.find(p => p.id === selectedPlanId);
            if (!plan) throw new Error("Plan no seleccionado.");

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + plan.duration_days);

            const { error } = await supabase
                .from('persons')
                .update({
                    current_plan_id: selectedPlanId,
                    subscription_start_date: startDate.toISOString().split('T')[0],
                    subscription_end_date: endDate.toISOString().split('T')[0],
                })
                .eq('id', person.id);
            if (error) throw error;
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('persons')
                .update({
                    current_plan_id: null,
                    subscription_start_date: null,
                    subscription_end_date: null,
                })
                .eq('id', person.id);
            if (error) throw error;
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
            <div style={{ ...styles.modalContent, maxWidth: '600px', height: '85vh', display: 'flex', flexDirection: 'column' }} className="fade-in">
                
                <div style={{...styles.modalHeader, flexShrink: 0}}>
                    <h2 style={styles.modalTitle}>Gestionar Plan de Servicio</h2>
                    <button type="button" onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
                </div>

                <div style={{...styles.modalBody, flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--background-color)'}}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <p style={{marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-light)', fontSize: '0.95rem'}}>
                        Selecciona el plan para <strong>{person.full_name}</strong>.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {servicePlans.map(plan => {
                            const isSelected = selectedPlanId === plan.id;
                            const isCurrent = person.current_plan_id === plan.id;

                            return (
                                <div 
                                    key={plan.id} 
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className="card-hover"
                                    style={{
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'var(--surface-color)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    {isCurrent && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: '1rem',
                                            backgroundColor: '#10B981',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            ACTIVO
                                        </span>
                                    )}
                                    
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                        <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: isSelected ? 'var(--primary-color)' : 'var(--text-color)'}}>
                                            {plan.name}
                                        </h3>
                                        {isSelected && <div style={{backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'}}>✓</div>}
                                    </div>
                                    
                                    <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem'}}>
                                        <span style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)'}}>
                                            ${parseFloat(String(plan.price)).toFixed(0)}
                                        </span>
                                        <span style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                            / {plan.duration_days} días
                                        </span>
                                    </div>
                                    
                                    <div style={{fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem'}}>
                                        <span>📅 {plan.max_consultations ? `${plan.max_consultations} Citas` : 'Citas Ilimitadas'}</span>
                                        <span>✨ {plan.features && (plan.features as any).patient_portal_ai_enabled ? 'IA Incluida' : 'Sin IA'}</span>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {servicePlans.length === 0 && (
                            <div style={{textAlign: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-light)'}}>
                                No hay planes de servicio configurados.
                            </div>
                        )}
                    </div>
                </div>

                <div style={{...styles.modalFooter, flexShrink: 0, backgroundColor: 'var(--surface-color)'}}>
                    {person.current_plan_id && (
                        <button onClick={handleRemovePlan} className="button-danger" disabled={loading} style={{marginRight: 'auto', fontSize: '0.9rem', padding: '0.7rem 1rem'}}>
                            Quitar Plan
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="button-secondary" style={{fontSize: '0.9rem', padding: '0.7rem 1.5rem'}}>Cancelar</button>
                    <button 
                        onClick={handleAssignPlan} 
                        disabled={loading || !selectedPlanId || (selectedPlanId === person.current_plan_id)}
                        style={{minWidth: '120px', fontSize: '0.9rem', padding: '0.7rem 1.5rem'}}
                        className="button-primary"
                    >
                        {loading ? 'Guardando...' : 'Asignar Plan'}
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default PlanAssignmentModal;
