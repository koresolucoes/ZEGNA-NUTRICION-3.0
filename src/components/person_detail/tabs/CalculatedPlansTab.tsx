
import React, { FC } from 'react';
import { DietPlanHistoryItem } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';

interface CalculatedPlansTabProps {
    planHistory: DietPlanHistoryItem[];
    navigate: (page: string, context: any) => void;
    openModal: (action: 'deletePlanHistory', id: string, text: string) => void;
}

export const CalculatedPlansTab: FC<CalculatedPlansTabProps> = ({ planHistory, navigate, openModal }) => {
    return (
        <section className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Planes Calculados (Historial)</h3>
                <button onClick={() => navigate('calculators', {})} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.calculator} Ir al Calculador</button>
            </div>

            {planHistory.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={{...styles.table, fontSize: '0.9rem'}}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Nombre / Fecha</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Kcal</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Macros (P/L/HC)</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planHistory.map(plan => (
                                <tr key={plan.id} className="table-row-hover">
                                    <td style={styles.td}>
                                        <p style={{margin: 0, fontWeight: 600, color: 'var(--primary-color)'}}>{plan.person_name}</p>
                                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(plan.created_at).toLocaleDateString('es-MX', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</p>
                                    </td>
                                    <td style={{...styles.td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '1rem'}}>{plan.totals.kcal.toFixed(0)}</td>
                                    <td style={{...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-light)'}}>
                                        {plan.totals.protein_g.toFixed(0)} / {plan.totals.lipid_g.toFixed(0)} / {plan.totals.carb_g.toFixed(0)} g
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button onClick={() => navigate('calculators', { planToLoad: plan })} className="button-secondary" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                                                {ICONS.check} Cargar
                                            </button>
                                            <button onClick={() => openModal('deletePlanHistory', plan.id, `¿Eliminar el plan "${plan.person_name}"?`)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">
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
                 <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                     <p>No hay planes guardados.</p>
                 </div>
            )}
        </section>
    );
};
