import React, { FC } from 'react';
import { Medication, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface MedicationsManagerProps {
    medications: Medication[];
    onAdd: () => void;
    onEdit: (medication: Medication) => void;
    onDelete: (id: string, name: string) => void;
    memberMap: Map<string, TeamMember>;
}

const MedicationsManager: FC<MedicationsManagerProps> = ({ medications, onAdd, onEdit, onDelete, memberMap }) => {
    return (
        <div className="fade-in">
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Medicamentos y Suplementos</h3>
                <button onClick={onAdd}>{ICONS.add} Agregar</button>
            </div>
            {medications.length > 0 ? (
                <div className="info-grid">
                    {medications.map(item => {
                        const creator = item.created_by_user_id ? memberMap.get(item.created_by_user_id) : null;
                        return (
                            <div key={item.id} className="info-card" style={{display: 'flex', flexDirection: 'column'}}>
                                <div style={{ flex: 1 }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                        <div style={{color: 'var(--primary-color)'}}>💊</div>
                                        <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>{item.name}</h4>
                                    </div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                        <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem', borderRadius: '6px'}}>
                                            <span style={{fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600, display: 'block'}}>Dosis</span>
                                            <span style={{fontSize: '0.9rem', fontWeight: 500}}>{item.dosage || '-'}</span>
                                        </div>
                                        <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem', borderRadius: '6px'}}>
                                            <span style={{fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600, display: 'block'}}>Frecuencia</span>
                                            <span style={{fontSize: '0.9rem', fontWeight: 500}}>{item.frequency || '-'}</span>
                                        </div>
                                    </div>

                                    {item.notes && (
                                        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                            "{item.notes}"
                                        </p>
                                    )}
                                     
                                     {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span>{creator.full_name || 'Usuario'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button onClick={() => onEdit(item)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.name)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '8px'}}>
                    <p>No hay medicamentos registrados.</p>
                </div>
            )}
        </div>
    );
};

export default MedicationsManager;