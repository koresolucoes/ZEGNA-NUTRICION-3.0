import React, { FC, useState } from 'react';
// FIX: Use unified `CareTeamMemberProfile` and `TeamMember` types
import { CareTeamMemberProfile, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import CareTeamManagementModal from './CareTeamManagementModal';

interface CareTeamManagerProps {
    careTeam: CareTeamMemberProfile[];
    allTeamMembers: TeamMember[];
    // FIX: Changed prop name from `clientId` to `personId` for consistency.
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
                    // FIX: Pass the renamed `personId` prop to the modal.
                    personId={personId}
                />
            )}
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Equipo de Cuidado</h3>
                {isAdmin && <button onClick={() => setIsModalOpen(true)}>{ICONS.edit} Gestionar Equipo</button>}
            </div>
            {careTeam.length > 0 ? (
                <div className="info-grid">
                    {careTeam.map(member => {
                        const profile = member.team_members_with_profiles;
                        if (!profile) return null;
                        
                        return (
                            <div key={member.id} className="info-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <img 
                                        src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || '?'}&radius=50`} 
                                        alt="avatar" 
                                        style={{width: '48px', height: '48px', borderRadius: '50%'}} 
                                    />
                                    <div>
                                        <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{profile.full_name || 'Usuario'}</h4>
                                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>
                                            {member.role_in_team || 'Miembro del equipo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p>No se ha asignado un equipo de cuidado para este paciente.</p>
            )}
        </div>
    );
};

export default CareTeamManager;