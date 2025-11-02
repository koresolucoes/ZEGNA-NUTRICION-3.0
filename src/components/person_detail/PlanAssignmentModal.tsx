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
    
    const selectedPlanDetails = servicePlans.find(p => p.id === selectedPlanId);

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalContent, maxWidth: '500px' }}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Gestionar Plan de Servicio</h2>
                    <button type="button" onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <p>Asigna, cambia o remueve el plan de servicio para <strong>{person.full_name}</strong>.</p>
                    
                    <label htmlFor="service_plan_select">Plan de Servicio</label>
                    <select id="service_plan_select" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
                        <option value="">-- Sin Plan --</option>
                        {servicePlans.map(plan => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.duration_days} días)
                            </option>
                        ))}
                    </select>

                    {selectedPlanDetails && (
                        <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                            <p style={{margin: 0}}><strong>Duración:</strong> {selectedPlanDetails.duration_days} días</p>
                            <p style={{margin: '0.25rem 0'}}><strong>Consultas:</strong> {selectedPlanDetails.max_consultations || 'Ilimitadas'}</p>
                            <p style={{margin: '0.25rem 0'}}><strong>Precio:</strong> ${parseFloat(String(selectedPlanDetails.price)).toFixed(2)}</p>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    {person.current_plan_id && (
                        <button onClick={handleRemovePlan} className="button-danger" disabled={loading}>Quitar Plan Actual</button>
                    )}
                    <button onClick={handleAssignPlan} disabled={loading || !selectedPlanId || selectedPlanId === person.current_plan_id}>
                        {loading ? 'Guardando...' : 'Asignar Plan'}
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default PlanAssignmentModal;
