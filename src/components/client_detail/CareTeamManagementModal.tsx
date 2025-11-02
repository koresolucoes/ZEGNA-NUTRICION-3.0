import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
// FIX: Use unified `CareTeamMemberProfile` and `TeamMember` types
import { TeamMember, CareTeamMemberProfile } from '../../types';

interface CareTeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    allTeamMembers: TeamMember[];
    currentCareTeam: CareTeamMemberProfile[];
    // FIX: Renamed prop to `personId` for consistency with unified schema.
    personId: string;
}

const modalRoot = document.getElementById('modal-root');

type SelectedMember = {
    userId: string;
    role: string;
}

const CareTeamManagementModal: FC<CareTeamManagementModalProps> = ({ isOpen, onClose, onSave, allTeamMembers, currentCareTeam, personId }) => {
    const [selectedMembers, setSelectedMembers] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialMap = new Map<string, string>();
        currentCareTeam.forEach(member => {
            if (member.user_id) {
                initialMap.set(member.user_id, member.role_in_team || '');
            }
        });
        setSelectedMembers(initialMap);
    }, [currentCareTeam]);

    const handleToggleMember = (userId: string) => {
        const newMap = new Map(selectedMembers);
        if (newMap.has(userId)) {
            newMap.delete(userId);
        } else {
            newMap.set(userId, 'Nutricionista'); // Default role
        }
        setSelectedMembers(newMap);
    };

    const handleRoleChange = (userId: string, role: string) => {
        const newMap = new Map(selectedMembers);
        newMap.set(userId, role);
        setSelectedMembers(newMap);
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // FIX: Use the unified 'care_team' table and 'person_id' column.
            // Delete all existing entries for this person
            const { error: deleteError } = await supabase
                .from('care_team')
                .delete()
                .eq('person_id', personId);

            if (deleteError) throw deleteError;

            // Insert the new team members
            if (selectedMembers.size > 0) {
                const insertPayload = Array.from(selectedMembers.entries()).map(([userId, role]) => ({
                    person_id: personId,
                    user_id: userId,
                    role_in_team: role,
                }));

                const { error: insertError } = await supabase
                    .from('care_team')
                    .insert(insertPayload);
                
                if (insertError) throw insertError;
            }
            
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Gestionar Equipo de Cuidado</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <p>Selecciona los miembros de tu clínica que colaborarán en el seguimiento de este paciente.</p>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {allTeamMembers.map(member => {
                            const isSelected = member.user_id && selectedMembers.has(member.user_id);
                            return (
                                <li key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface-hover-color)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        id={`member-${member.user_id}`} 
                                        checked={!!isSelected}
                                        onChange={() => member.user_id && handleToggleMember(member.user_id)}
                                        style={{ width: '20px', height: '20px', margin: 0 }}
                                    />
                                    <label htmlFor={`member-${member.user_id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
                                        <img src={member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${member.full_name || '?'}&radius=50`} alt="avatar" style={{width: '40px', height: '40px', borderRadius: '50%'}} />
                                        <div>
                                            <p style={{margin: 0, fontWeight: 500}}>{member.full_name || 'Usuario'}</p>
                                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)'}}>{member.role}</p>
                                        </div>
                                    </label>
                                    {isSelected && member.user_id && (
                                        <input 
                                            type="text" 
                                            placeholder="Rol en el equipo" 
                                            value={selectedMembers.get(member.user_id) || ''}
                                            onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                            style={{ margin: 0, width: '150px' }}
                                            onClick={e => e.stopPropagation()} // Prevent label click
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Equipo'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default CareTeamManagementModal;