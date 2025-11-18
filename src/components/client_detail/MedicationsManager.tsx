
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Medicamentos y Suplementos</h3>
                <button onClick={onAdd} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.add} Agregar</button>
            </div>
            
            {medications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {medications.map(item => {
                        const creator = item.created_by_user_id ? memberMap.get(item.created_by_user_id) : null;
                        return (
                             <div key={item.id} style={{ 
                                backgroundColor: 'var(--surface-hover-color)', 
                                borderRadius: '8px', 
                                padding: '1rem', 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '1rem',
                                border: '1px solid var(--border-color)',
                                borderLeft: '4px solid #8B5CF6'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                        <div style={{color: '#8B5CF6'}}>💊</div>
                                        <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem', fontWeight: 600 }}>{item.name}</h4>
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
                                        <div style={{backgroundColor: 'var(--surface-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                                            <span style={{fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600, marginRight: '0.5rem'}}>Dosis:</span>
                                            <span style={{fontSize: '0.85rem', fontWeight: 500}}>{item.dosage || '-'}</span>
                                        </div>
                                        <div style={{backgroundColor: 'var(--surface-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                                            <span style={{fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600, marginRight: '0.5rem'}}>Frecuencia:</span>
                                            <span style={{fontSize: '0.85rem', fontWeight: 500}}>{item.frequency || '-'}</span>
                                        </div>
                                    </div>

                                    {item.notes && (
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                            "{item.notes}"
                                        </p>
                                    )}
                                     
                                     {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '16px', height: '16px', borderRadius: '50%'}} />
                                            <span>{creator.full_name?.split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => onEdit(item)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)'}} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.name)} style={{ ...styles.iconButton, backgroundColor: 'var(--surface-color)', color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
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
