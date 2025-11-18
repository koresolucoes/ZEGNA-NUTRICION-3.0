
import React, { FC } from 'react';
import { ExerciseLog } from '../types';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';

const ExercisePlanViewer: FC<{ 
    exerciseLogs: ExerciseLog[]; 
    onEdit?: (log: ExerciseLog) => void;
    onViewDetails?: (log: ExerciseLog) => void;
    onDelete?: (logId: string) => void;
}> = ({ exerciseLogs, onEdit, onViewDetails, onDelete }) => {
    if (!exerciseLogs || exerciseLogs.length === 0) {
        return <p style={{textAlign: 'center', color: 'var(--text-light)', padding: '2rem'}}>No hay rutinas de ejercicio disponibles.</p>;
    }

    return (
        <div className="info-grid">
            {exerciseLogs.map(log => {
                 const date = new Date(log.log_date);
                 const weekday = date.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'UTC' });
                 const dayNumber = date.toLocaleDateString('es-MX', { day: 'numeric', timeZone: 'UTC' });
                 // Safe cast
                 const exercises = (log.ejercicios as any[] || []);

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
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem' }}>{log.enfoque || 'General'}</h4>
                                    {log.completed && <span style={{fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600}}>{ICONS.check} Completado</span>}
                                </div>
                            </div>

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
                            {exercises.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                                    {exercises.slice(0, 4).map((ex: any, i: number) => (
                                        <li key={i} style={{marginBottom: '0.25rem'}}>
                                            <span style={{fontWeight: 500}}>{ex.nombre}</span>
                                            <span style={{color: 'var(--text-light)'}}> - {ex.series}x{ex.repeticiones}</span>
                                        </li>
                                    ))}
                                    {exercises.length > 4 && <li style={{listStyle: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', marginTop: '0.5rem'}}>+ {exercises.length - 4} ejercicios más...</li>}
                                </ul>
                            ) : (
                                <p style={{margin: 0, color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.9rem'}}>Día de descanso o cardio ligero.</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ExercisePlanViewer;
