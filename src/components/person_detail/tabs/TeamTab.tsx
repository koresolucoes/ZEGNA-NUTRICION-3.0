
import React, { FC, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { CareTeamMemberProfile, TeamMember, InternalNoteWithAuthor } from '../../../types';
import CareTeamManager from '../../client_detail/CareTeamManager';
import InternalNotesManager from '../../client_detail/InternalNotesManager';

interface TeamTabProps {
    careTeam: CareTeamMemberProfile[];
    allTeamMembers: TeamMember[];
    personId: string;
    isAdmin: boolean;
    onTeamUpdate: () => void;
    internalNotes: InternalNoteWithAuthor[];
    user: User;
}

export const TeamTab: FC<TeamTabProps> = ({
    careTeam, allTeamMembers, personId, isAdmin, onTeamUpdate, internalNotes, user
}) => {
    const [activeSubTab, setActiveSubTab] = useState('care_team');

    return (
        <section className="fade-in" style={{ overflow: 'visible' }}>
            {/* Sub-navigation Pill Bar */}
            <div style={{
                backgroundColor: 'var(--surface-hover-color)',
                borderRadius: '14px',
                padding: '0.35rem',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem',
                display: 'inline-flex',
                gap: '0.5rem'
            }}>
                {[
                    { key: 'care_team', label: '👥 Equipo de Cuidado' },
                    { key: 'internal_notes', label: '📝 Notas Internas' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        style={{
                            fontSize: '0.8rem',
                            fontWeight: activeSubTab === tab.key ? 700 : 500,
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            minHeight: '36px',
                            backgroundColor: activeSubTab === tab.key ? 'var(--surface-color)' : 'transparent',
                            color: activeSubTab === tab.key ? 'var(--primary-color)' : 'var(--text-light)',
                            boxShadow: activeSubTab === tab.key ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ paddingTop: '0.5rem' }}>
                {activeSubTab === 'care_team' && (
                    <CareTeamManager 
                        careTeam={careTeam} 
                        allTeamMembers={allTeamMembers} 
                        personId={personId} 
                        isAdmin={isAdmin} 
                        onTeamUpdate={onTeamUpdate} 
                    />
                )}
                {activeSubTab === 'internal_notes' && (
                    <InternalNotesManager 
                        notes={internalNotes} 
                        teamMembers={allTeamMembers} 
                        personId={personId} 
                        onNoteAdded={onTeamUpdate} 
                        user={user} 
                    />
                )}
            </div>
        </section>
    );
};
