
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
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Historial Médico</h3>
                <button onClick={onAdd} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>{ICONS.add} Agregar</button>
            </div>

            {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.map(item => {
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
                                borderLeft: '4px solid var(--primary-color)'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-color)', fontSize: '1rem', fontWeight: 600 }}>{item.condition}</h4>
                                    </div>
                                    
                                    {item.diagnosis_date && (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0', color: 'var(--text-light)', fontSize: '0.85rem'}}>
                                            <span>{ICONS.calendar}</span>
                                            <span>{new Date(item.diagnosis_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</span>
                                        </div>
                                    )}
                                    
                                    {item.notes && (
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', lineHeight: 1.5 }}>
                                            {item.notes}
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
                                    <button onClick={() => onDelete(item.id, item.condition)} style={{ ...styles.iconButton, backgroundColor: 'var(--surface-color)', color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '8px'}}>
                    <p>No hay registros en el historial médico.</p>
                </div>
            )}
        </div>
    );
};

export default MedicalHistoryManager;
