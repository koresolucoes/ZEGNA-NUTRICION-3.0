
import React, { FC } from 'react';
import { DietLog } from '../types';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';

const DietPlanViewer: FC<{ 
    dietLogs: DietLog[]; 
    onEdit?: (log: DietLog) => void;
    onViewDetails?: (log: DietLog) => void;
    onDelete?: (logId: string) => void;
}> = ({ dietLogs, onEdit, onViewDetails, onDelete }) => {
    if (!dietLogs || dietLogs.length === 0) {
        return <p style={{textAlign: 'center', color: 'var(--text-light)', padding: '2rem'}}>No hay planes alimenticios disponibles.</p>;
    }

    const MealRow = ({ label, content }: { label: string, content: string | null }) => {
        if (!content) return null;
        return (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-light)', width: '70px', textAlign: 'right', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-color)' }}>{content}</span>
            </div>
        );
    };

    return (
        <div className="info-grid">
            {dietLogs.map(log => {
                const date = new Date(log.log_date);
                const weekday = date.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'UTC' });
                const dayNumber = date.toLocaleDateString('es-MX', { day: 'numeric', timeZone: 'UTC' });

                return (
                    <div key={log.id} className="info-card relative" onClick={() => onViewDetails && onViewDetails(log)} style={{ cursor: 'pointer', padding: '0' }}>
                         {/* Header */}
                        <div style={{ 
                            padding: '1rem', 
                            borderBottom: '1px solid var(--border-color)', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            backgroundColor: 'var(--surface-hover-color)'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'var(--surface-color)', borderRadius: '8px', padding: '4px 8px', border: '1px solid var(--border-color)'
                                }}>
                                    <span style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-light)'}}>{weekday.substring(0, 3)}</span>
                                    <span style={{fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)'}}>{dayNumber}</span>
                                </div>
                                {log.completed && <span style={{fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}>{ICONS.check} Completado</span>}
                            </div>
                            
                            {/* Actions Top Right */}
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {onEdit && (
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(log); }} style={{...styles.iconButton, padding: '6px'}} title="Editar">
                                        {ICONS.edit}
                                    </button>
                                )}
                                {onDelete && (
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(log.id); }} style={{...styles.iconButton, color: 'var(--error-color)', padding: '6px'}} title="Eliminar">
                                        {ICONS.delete}
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div style={{ padding: '1rem' }}>
                            <MealRow label="Desayuno" content={log.desayuno} />
                            <MealRow label="Colación" content={log.colacion_1} />
                            <MealRow label="Comida" content={log.comida} />
                            <MealRow label="Colación" content={log.colacion_2} />
                            <MealRow label="Cena" content={log.cena} />
                            
                            {!log.desayuno && !log.comida && !log.cena && (
                                <p style={{margin: 0, color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.9rem', padding: '1rem', textAlign: 'center'}}>
                                    Día de descanso o sin registro.
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DietPlanViewer;
