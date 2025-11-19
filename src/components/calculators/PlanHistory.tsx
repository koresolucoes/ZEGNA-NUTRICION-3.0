
import React, { FC, useState } from 'react';
import { DietPlanHistoryItem } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import ConfirmationModal from '../shared/ConfirmationModal';

interface PlanHistoryProps {
    history: DietPlanHistoryItem[];
    onLoadPlan: (plan: DietPlanHistoryItem) => void;
    onDeletePlan: (planId: string) => void;
}

const PlanHistory: FC<PlanHistoryProps> = ({ history, onLoadPlan, onDeletePlan }) => {
    const [planToDelete, setPlanToDelete] = useState<DietPlanHistoryItem | null>(null);

    return (
        <div className="fade-in" style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
            {planToDelete && (
                <ConfirmationModal
                    isOpen={!!planToDelete}
                    onClose={() => setPlanToDelete(null)}
                    onConfirm={() => { onDeletePlan(planToDelete.id); setPlanToDelete(null); }}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar el plan para <strong>{planToDelete.person_name}</strong>?</p>}
                    confirmText="Sí, eliminar"
                />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-color)' }}>Historial de Planes</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Recupera cálculos guardados anteriormente.</p>
                </div>
            </div>

            {history.length > 0 ? (
                <div style={{...styles.tableContainer, borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'none'}}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={{backgroundColor: 'var(--surface-hover-color)'}}>
                                <th style={styles.th}>Nombre / Fecha</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Kcal</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Macros (P/L/HC)</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(plan => (
                                <tr key={plan.id} className="table-row-hover" style={{backgroundColor: 'var(--surface-color)'}}>
                                    <td style={styles.td}>
                                        <p style={{margin: 0, fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.95rem'}}>{plan.person_name || 'Sin nombre'}</p>
                                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>
                                            {new Date(plan.plan_date).toLocaleDateString('es-MX', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                                        </p>
                                    </td>
                                    <td style={{...styles.td, textAlign: 'right', fontWeight: 700, color: 'var(--text-color)', fontSize: '1rem'}}>{plan.totals.kcal.toFixed(0)}</td>
                                    <td style={{...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-light)', fontSize: '0.9rem'}}>
                                        {plan.totals.protein_g.toFixed(0)} / {plan.totals.lipid_g.toFixed(0)} / {plan.totals.carb_g.toFixed(0)} g
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button onClick={() => onLoadPlan(plan)} className="button-secondary" style={{padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                {ICONS.check} Cargar
                                            </button>
                                            <button onClick={() => setPlanToDelete(plan)} style={{...styles.iconButton, color: 'var(--error-color)', padding: '6px'}} title="Eliminar">
                                                {ICONS.delete}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                    <p>No hay historial disponible.</p>
                </div>
            )}
        </div>
    );
};

export default PlanHistory;
