import React, { FC } from 'react';
import { MedicalHistory, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface MedicalHistoryManagerProps {
    history: MedicalHistory[];
    onAdd: () => void;
    onEdit: (item: MedicalHistory) => void;
    onDelete: (id: string, name: string) => void;
    memberMap: Map<string, TeamMember>;
}

const MedicalHistoryManager: FC<MedicalHistoryManagerProps> = ({ history, onAdd, onEdit, onDelete, memberMap }) => {
    return (
        <div className="fade-in">
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Historial Médico</h3>
                <button onClick={onAdd}>{ICONS.add} Agregar Registro</button>
            </div>
            {history.length > 0 ? (
                <div className="info-grid">
                    {history.map(item => {
                        const creator = item.created_by_user_id ? memberMap.get(item.created_by_user_id) : null;
                        return (
                            <div key={item.id} className="info-card">
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>{item.condition}</h4>
                                    {item.diagnosis_date && (
                                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                            <strong>Fecha:</strong> {new Date(item.diagnosis_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                        </p>
                                    )}
                                    {item.notes && (
                                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                            {item.notes}
                                        </p>
                                    )}
                                     {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>{creator.full_name || creator.user_id}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => onEdit(item)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.condition)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p>No hay registros en el historial médico de este paciente.</p>
            )}
        </div>
    );
};

export default MedicalHistoryManager;
