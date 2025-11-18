
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
    
    const getSeverityColor = (severity: string | null) => {
        switch(severity?.toLowerCase()) {
            case 'severa': return 'var(--error-color)';
            case 'moderada': return 'var(--accent-color)';
            default: return 'var(--primary-color)'; // Leve
        }
    };

    const getSeverityBg = (severity: string | null) => {
         switch(severity?.toLowerCase()) {
            case 'severa': return 'var(--error-bg)';
            case 'moderada': return 'rgba(234, 179, 8, 0.1)'; 
            default: return 'var(--primary-light)';
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Listado de Alergias</h3>
                <button onClick={onAdd} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.add} Agregar</button>
            </div>
            
            {allergies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {allergies.map(item => {
                        const creator = item.created_by_user_id ? memberMap.get(item.created_by_user_id) : null;
                        const severityColor = getSeverityColor(item.severity);
                        const severityBg = getSeverityBg(item.severity);

                        return (
                            <div key={item.id} style={{ 
                                backgroundColor: 'var(--surface-hover-color)', 
                                borderRadius: '8px', 
                                padding: '1rem', 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '1rem',
                                border: '1px solid var(--border-color)',
                                borderLeft: `4px solid ${severityColor}`
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem'}}>
                                        <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem', fontWeight: 600 }}>{item.substance}</h4>
                                        <span style={{ 
                                            fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', 
                                            backgroundColor: severityBg, color: severityColor, textTransform: 'uppercase'
                                        }}>
                                            {item.severity || 'Leve'}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>{item.type}</p>
                                    
                                    {item.notes && (
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', fontStyle: 'italic' }}>
                                            "{item.notes}"
                                        </p>
                                    )}
                                    
                                    {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '16px', height: '16px', borderRadius: '50%'}} />
                                            <span>Registrado por: {creator.full_name?.split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => onEdit(item)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)'}} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.substance)} style={{ ...styles.iconButton, backgroundColor: 'var(--surface-color)', color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '8px'}}>
                    <p>No hay alergias registradas.</p>
                </div>
            )}
        </div>
    );
};

export default AllergiesManager;
