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
            case 'moderada': return 'rgba(234, 179, 8, 0.1)'; // Yellow/Gold tint
            default: return 'var(--primary-light)';
        }
    };

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
                        const severityColor = getSeverityColor(item.severity);
                        const severityBg = getSeverityBg(item.severity);

                        return (
                            <div key={item.id} className="info-card" style={{ borderLeft: `4px solid ${severityColor}`, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                                        <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>{item.substance}</h4>
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            fontWeight: 600, 
                                            padding: '2px 8px', 
                                            borderRadius: '12px', 
                                            backgroundColor: severityBg, 
                                            color: severityColor,
                                            textTransform: 'uppercase'
                                        }}>
                                            {item.severity || 'Leve'}
                                        </span>
                                    </div>
                                    
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                        {item.type}
                                    </p>
                                    
                                    {item.notes && (
                                        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-color)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                            "{item.notes}"
                                        </p>
                                    )}

                                    {creator && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                            <img src={creator.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${creator.full_name || '?'}&radius=50`} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                                            <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>Reg: {creator.full_name?.split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                    <button onClick={() => onEdit(item)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                    <button onClick={() => onDelete(item.id, item.substance)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
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