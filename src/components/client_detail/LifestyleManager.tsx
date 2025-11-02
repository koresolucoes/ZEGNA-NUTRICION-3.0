import React, { FC } from 'react';
import { LifestyleHabits, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface LifestyleManagerProps {
    habits: LifestyleHabits | null;
    onEdit: () => void;
    memberMap: Map<string, TeamMember>;
}

const LifestyleManager: FC<LifestyleManagerProps> = ({ habits, onEdit, memberMap }) => {
    const detailItemStyle: React.CSSProperties = { marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' };
    const lastItemStyle: React.CSSProperties = { ...detailItemStyle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 };
    const updater = habits?.updated_by_user_id ? memberMap.get(habits.updated_by_user_id) : null;
    
    return (
        <div className="fade-in">
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Hábitos de Estilo de Vida</h3>
                <button onClick={onEdit}>{ICONS.edit} {habits ? 'Editar' : 'Registrar'}</button>
            </div>
            {habits ? (
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={detailItemStyle}>
                        <h4 style={styles.detailGroupTitle}>Horas de Sueño (promedio)</h4>
                        <p style={{margin: 0}}>{habits.sleep_hours_avg ? `${habits.sleep_hours_avg} horas` : '-'}</p>
                    </div>
                    <div style={detailItemStyle}>
                        <h4 style={styles.detailGroupTitle}>Nivel de Estrés (1-5)</h4>
                        <p style={{margin: 0}}>{habits.stress_level || '-'}</p>
                    </div>
                    <div style={detailItemStyle}>
                        <h4 style={styles.detailGroupTitle}>Consumo de Agua (promedio)</h4>
                        <p style={{margin: 0}}>{habits.water_intake_liters_avg ? `${habits.water_intake_liters_avg} litros` : '-'}</p>
                    </div>
                    <div style={detailItemStyle}>
                        <h4 style={styles.detailGroupTitle}>Fumador</h4>
                        <p style={{margin: 0}}>{habits.smokes ? 'Sí' : 'No'}</p>
                    </div>
                    <div style={lastItemStyle}>
                        <h4 style={styles.detailGroupTitle}>Frecuencia de Alcohol</h4>
                        <p style={{margin: 0}}>{habits.alcohol_frequency || '-'}</p>
                    </div>
                     {updater && habits.updated_at && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>Última act. por:</span>
                            <img src={updater.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${updater.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                            <span>{updater.full_name || updater.user_id}</span>
                            <span>el {new Date(habits.updated_at).toLocaleDateString('es-MX')}</span>
                        </div>
                    )}
                </div>
            ) : (
                <p>No se han registrado los hábitos de estilo de vida de este paciente.</p>
            )}
        </div>
    );
};

export default LifestyleManager;
