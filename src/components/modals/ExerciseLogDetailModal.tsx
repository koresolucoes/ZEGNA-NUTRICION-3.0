
import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ExerciseLog } from '../../types';

interface ExerciseLogDetailModalProps {
    log: ExerciseLog;
    onClose: () => void;
    zIndex?: number;
    onMarkComplete?: () => void;
    isMarking?: boolean;
}

const modalRoot = document.getElementById('modal-root');

const ExerciseLogDetailModal: FC<ExerciseLogDetailModalProps> = ({ log, onClose, zIndex = 1050, onMarkComplete, isMarking }) => {
    if (!modalRoot) return null;

    const exercises = (log.ejercicios as any[] || []);

    const modalContent = (
         <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        Rutina de Ejercicio del Día
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <h3 style={{...styles.detailCardTitle, color: 'var(--primary-dark)'}}>
                        {new Date(log.log_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h3>
                    <p style={{margin: '0.25rem 0 1.5rem 0', fontWeight: 600}}>
                       Enfoque: {log.enfoque || 'General'}
                    </p>
                    
                    {log.completed && (
                        <div style={{marginBottom: '1rem', padding: '0.5rem 1rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600}}>
                            {ICONS.check} Rutina Completada
                        </div>
                    )}

                    {exercises.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                            {exercises.map((ex: any, index: number) => (
                                <li key={index} style={{ marginBottom: '1rem' }}>
                                    <strong>{ex.nombre}</strong>
                                    <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                        {ex.series} de {ex.repeticiones}, con {ex.descanso} de descanso.
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Día de descanso o actividad de baja intensidad.</p>
                    )}
                </div>
                 <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                    {!log.completed && onMarkComplete && (
                         <button 
                            onClick={onMarkComplete} 
                            className="button-primary"
                            disabled={isMarking}
                        >
                            {isMarking ? 'Guardando...' : 'Marcar como Completada'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default ExerciseLogDetailModal;
