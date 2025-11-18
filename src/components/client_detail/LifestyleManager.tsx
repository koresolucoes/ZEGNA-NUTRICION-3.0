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
    const updater = habits?.updated_by_user_id ? memberMap.get(habits.updated_by_user_id) : null;
    
    const MetricCard: FC<{ label: string; value: string | number; icon: string; color?: string }> = ({ label, value, icon, color = 'var(--text-color)' }) => (
        <div style={{ backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: color }}>{value}</span>
        </div>
    );

    return (
        <div className="fade-in">
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Hábitos de Estilo de Vida</h3>
                <button onClick={onEdit}>{ICONS.edit} {habits ? 'Editar' : 'Registrar'}</button>
            </div>
            
            {habits ? (
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                        <MetricCard 
                            label="Sueño" 
                            value={habits.sleep_hours_avg ? `${habits.sleep_hours_avg} hrs` : '-'} 
                            icon="😴" 
                        />
                        <MetricCard 
                            label="Estrés" 
                            value={habits.stress_level ? `${habits.stress_level}/5` : '-'} 
                            icon="😰"
                            color={habits.stress_level && habits.stress_level > 3 ? 'var(--error-color)' : 'var(--primary-color)'}
                        />
                        <MetricCard 
                            label="Agua" 
                            value={habits.water_intake_liters_avg ? `${habits.water_intake_liters_avg} L` : '-'} 
                            icon="💧" 
                            color="var(--primary-color)"
                        />
                         <MetricCard 
                            label="Fuma" 
                            value={habits.smokes ? 'Sí' : 'No'} 
                            icon="🚬" 
                            color={habits.smokes ? 'var(--error-color)' : 'var(--text-color)'}
                        />
                        <MetricCard 
                            label="Alcohol" 
                            value={habits.alcohol_frequency || 'Nunca'} 
                            icon="🍷" 
                        />
                    </div>
                    
                     {updater && habits.updated_at && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span>Actualizado por</span>
                            <img src={updater.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${updater.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                            <span>{updater.full_name} el {new Date(habits.updated_at).toLocaleDateString('es-MX')}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '8px'}}>
                    <p>No hay hábitos registrados.</p>
                    <button onClick={onEdit} className="button-secondary" style={{marginTop: '1rem'}}>Registrar ahora</button>
                </div>
            )}
        </div>
    );
};

export default LifestyleManager;