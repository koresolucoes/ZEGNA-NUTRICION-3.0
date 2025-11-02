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
        <section className="fade-in">
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activeSubTab === 'care_team' ? 'active' : ''}`} onClick={() => setActiveSubTab('care_team')}>Equipo de Cuidado</button>
                <button className={`sub-tab-button ${activeSubTab === 'internal_notes' ? 'active' : ''}`} onClick={() => setActiveSubTab('internal_notes')}>Notas de Equipo</button>
            </nav>
            {activeSubTab === 'care_team' && <CareTeamManager careTeam={careTeam} allTeamMembers={allTeamMembers} personId={personId} isAdmin={isAdmin} onTeamUpdate={onTeamUpdate} />}
            {activeSubTab === 'internal_notes' && <InternalNotesManager notes={internalNotes} teamMembers={allTeamMembers} personId={personId} onNoteAdded={onTeamUpdate} user={user} />}
        </section>
    );
};