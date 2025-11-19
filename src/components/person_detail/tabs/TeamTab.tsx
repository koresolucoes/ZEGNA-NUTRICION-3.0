import React, { FC, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { CareTeamMemberProfile, TeamMember, InternalNoteWithAuthor } from '../../../types';
import CareTeamManager from '../../client_detail/CareTeamManager';
import InternalNotesManager from '../../client_detail/InternalNotesManager';
import { styles } from '../../../constants';

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
        <section className="fade-in">
            {/* Sub-navigation using Folder Tabs metaphor */}
            <div style={{...styles.tabContainer, paddingLeft: 0, marginBottom: '-1px'}}>
                {[
                    { key: 'care_team', label: 'Equipo de Cuidado' },
                    { key: 'internal_notes', label: 'Notas Internas' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        style={activeSubTab === tab.key ? {...styles.folderTab, ...styles.folderTabActive} : styles.folderTab}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.nestedFolderContent}>
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