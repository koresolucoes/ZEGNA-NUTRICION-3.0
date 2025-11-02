import React, { FC, useState } from 'react';
// FIX: Corrected the import path for DietPlanHistoryItem from a page component to the central types file.
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
        <div className="fade-in">
            {planToDelete && (
                <ConfirmationModal
                    isOpen={!!planToDelete}
                    onClose={() => setPlanToDelete(null)}
                    onConfirm={() => {
                        onDeletePlan(planToDelete.id);
                        setPlanToDelete(null);
                    }}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar el plan para <strong>{planToDelete.person_name}</strong> del {new Date(planToDelete.plan_date).toLocaleDateString()}?</p>}
                    confirmText="Sí, eliminar"
                />
            )}
            <div style={{...styles.pageHeader, border: 'none', padding: 0, marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Historial de Planes Guardados</h2>
            </div>

            {history.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={{...styles.table, fontSize: '0.9rem'}}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Nombre del Plan / Paciente</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Kcal</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Proteína (g)</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Lípidos (g)</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Carbs (g)</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(plan => (
                                <tr key={plan.id} className="table-row-hover">
                                    <td style={styles.td}>{plan.person_name}</td>
                                    <td style={styles.td}>{new Date(plan.plan_date).toLocaleDateString('es-MX')}</td>
                                    <td style={{...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)'}}>{plan.totals.kcal.toFixed(0)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.protein_g.toFixed(1)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.lipid_g.toFixed(1)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.carb_g.toFixed(1)}</td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button onClick={() => onLoadPlan(plan)} className="button-secondary" style={{padding: '8px 12px'}}>Cargar</button>
                                            <button onClick={() => setPlanToDelete(plan)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No has guardado ningún plan dietético todavía. Ve al "Planificador Dietético" para crear y guardar uno.</p>
            )}
        </div>
    );
};

export default PlanHistory;