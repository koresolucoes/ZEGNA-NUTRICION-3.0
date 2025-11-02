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
        return <p>No hay rutinas de ejercicio disponibles.</p>;
    }

    return (
        <div className="info-grid">
            {exerciseLogs.map(log => (
                <div key={log.id} className="info-card info-card-clickable">
                    <div style={{ flex: 1 }} onClick={() => onViewDetails && onViewDetails(log)}>
                         <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {log.completed && <span style={{color: 'var(--primary-color)'}} title="Completado">✅</span>}
                            {new Date(log.log_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })}
                        </h4>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>
                           Enfoque: {log.enfoque || 'General'}
                        </p>
                    </div>
                    <div className="card-actions">
                        {onEdit && (
                            <button onClick={(e) => { e.stopPropagation(); onEdit(log); }} style={{...styles.iconButton}} title="Editar día">{ICONS.edit}</button>
                        )}
                        {onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(log.id); }} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar día">{ICONS.delete}</button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExercisePlanViewer;