import React, { FC } from 'react';
import { Allergy, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface AllergiesManagerProps {
    allergies: Allergy[];
    onAdd: () => void;
    onEdit: (allergy: Allergy) => void;
    onDelete: (id: string, name: string) => void;
    memberMap: Map<string, TeamMember>;
}

const AllergiesManager: FC<AllergiesManagerProps> = ({ allergies, onAdd, onEdit, onDelete, memberMap }) => {
    return (
        <div className="fade-in">
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Alergias e Intolerancias</h3>
                <button onClick={onAdd}>{ICONS.add} Agregar</button>
            </div>
            {allergies.length > 0 ? (
                <div className="info-grid">
                    {allergies.map(item => {
                        const creator = item.created_by_user_id ? memberMap.get(item.created_by_user_id) : null;
                        return (
                            <div key={item.id} className="info-card">
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>{item.substance}</h4>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                        <strong>Tipo:</strong> {item.type}
                                    </p>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                        <strong>Severidad:</strong> {item.severity || 'No especificada'}
                                    </p>
                                    {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>{creator.full_name || creator.user_id}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => onEdit(item)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.substance)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p>No se han registrado alergias o intolerancias para este paciente.</p>
            )}
        </div>
    );
};

export default AllergiesManager;
