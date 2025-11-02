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
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Planes Dietéticos Guardados</h2>
            </div>
            {planHistory.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={{...styles.table, fontSize: '0.9rem'}}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Nombre / Fecha</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Kcal</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Proteína (g)</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Lípidos (g)</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Carbs (g)</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planHistory.map(plan => (
                                <tr key={plan.id} className="table-row-hover">
                                    <td style={styles.td}>
                                        <p style={{margin: 0, fontWeight: 600}}>{plan.person_name}</p>
                                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(plan.created_at).toLocaleDateString('es-MX')}</p>
                                    </td>
                                    <td style={{...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)'}}>{plan.totals.kcal.toFixed(0)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.protein_g.toFixed(1)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.lipid_g.toFixed(1)}</td>
                                    <td style={{...styles.td, textAlign: 'right'}}>{plan.totals.carb_g.toFixed(1)}</td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button onClick={() => navigate('calculators', { planToLoad: plan })} className="button-secondary" style={{padding: '8px 12px'}}>Cargar</button>
                                            <button onClick={() => openModal('deletePlanHistory', plan.id, `¿Eliminar el plan "${plan.person_name}"?`)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <p>No hay planes guardados para esta persona. Ve a la sección de "Herramientas" para crear uno.</p>
            )}
        </section>
    );
};