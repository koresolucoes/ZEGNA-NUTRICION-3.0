import React, { FC, useState } from 'react';
import { CareTeamMemberProfile, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import CareTeamManagementModal from './CareTeamManagementModal';

interface CareTeamManagerProps {
    careTeam: CareTeamMemberProfile[];
    allTeamMembers: TeamMember[];
    personId: string;
    isAdmin: boolean;
    onTeamUpdate: () => void;
}

const CareTeamManager: FC<CareTeamManagerProps> = ({ careTeam, allTeamMembers, personId, isAdmin, onTeamUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="fade-in">
            {isModalOpen && (
                <CareTeamManagementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => {
                        setIsModalOpen(false);
                        onTeamUpdate();
                    }}
                    allTeamMembers={allTeamMembers}
                    currentCareTeam={careTeam}
                    personId={personId}
                />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Miembros Asignados</h3>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>
                        {ICONS.settings} Gestionar Equipo
                    </button>
                )}
            </div>

            {careTeam.length > 0 ? (
                <div className="info-grid">
                    {careTeam.map(member => {
                        const profile = member.team_members_with_profiles;
                        if (!profile) return null;
                        
                        return (
                            <div key={member.id} className="info-card" style={{padding: '1rem', flexDirection: 'row', alignItems: 'center', gap: '1rem'}}>
                                <img 
                                    src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || '?'}&radius=50`} 
                                    alt="avatar" 
                                    style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-hover-color)'}} 
                                />
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem' }}>{profile.full_name || 'Usuario'}</h4>
                                    <span style={{ 
                                        display: 'inline-block', 
                                        marginTop: '0.25rem', 
                                        fontSize: '0.8rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        backgroundColor: 'var(--primary-light)', 
                                        color: 'var(--primary-dark)',
                                        fontWeight: 600
                                    }}>
                                        {member.role_in_team || 'Colaborador'}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                    <p>No se ha asignado un equipo de cuidado específico para este paciente.</p>
                    {isAdmin && <button onClick={() => setIsModalOpen(true)} className="button-secondary" style={{marginTop: '1rem'}}>Asignar Miembros</button>}
                </div>
            )}
        </div>
    );
};

export default CareTeamManager;