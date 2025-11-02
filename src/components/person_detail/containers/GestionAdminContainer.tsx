import React, { FC, useState } from 'react';
// FIX: Added `import type { User } from '@supabase/supabase-js'` to resolve the error where the 'User' type was not found in the module.
import type { User } from '@supabase/supabase-js';
import { Person, AppointmentWithPerson, CareTeamMemberProfile, TeamMember, InternalNoteWithAuthor, File as PersonFile, PatientServicePlan } from '../../../types';
import { AppointmentsTab } from '../tabs/AppointmentsTab';
import { TeamTab } from '../tabs/TeamTab';
import { FilesTab } from '../tabs/FilesTab';
import { InfoTab } from '../tabs/InfoTab';

interface GestionAdminContainerProps {
    person: Person;
    servicePlans: PatientServicePlan[];
    appointments: AppointmentWithPerson[];
    careTeam: CareTeamMemberProfile[];
    allTeamMembers: TeamMember[];
    internalNotes: InternalNoteWithAuthor[];
    files: PersonFile[];
    user: User;
    isAdmin: boolean;
    memberMap: Map<string, TeamMember>;
    onTeamUpdate: () => void;
    onAddAppointment: () => void;
    onEditAppointment: (appt: AppointmentWithPerson) => void;
    onAddFile: () => void;
    onDeleteFile: (file: PersonFile) => void;
    onRegisterConsent: () => void;
    onRevokeConsent: () => void;
    onExportData: () => void;
    onUploadConsent: (file: File) => void;
    isUploadingConsent: boolean;
    onManagePlan: () => void;
    openModal: (action: any, id: string, text: string, filePath?: string) => void;
}

export const GestionAdminContainer: FC<GestionAdminContainerProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState('citas');

    const renderSubContent = () => {
        switch (activeSubTab) {
            case 'citas':
                return <AppointmentsTab 
                    appointments={props.appointments}
                    memberMap={props.memberMap}
                    onAdd={props.onAddAppointment}
                    onEdit={props.onEditAppointment}
                />;
            case 'equipo':
                return <TeamTab 
                    careTeam={props.careTeam}
                    allTeamMembers={props.allTeamMembers}
                    personId={props.person.id}
                    isAdmin={props.isAdmin}
                    onTeamUpdate={props.onTeamUpdate}
                    internalNotes={props.internalNotes}
                    user={props.user}
                />;
            case 'archivos':
                return <FilesTab 
                    files={props.files}
                    memberMap={props.memberMap}
                    onAdd={props.onAddFile}
                    onDelete={props.onDeleteFile}
                />;
            case 'info':
                return <InfoTab 
                    person={props.person}
                    servicePlans={props.servicePlans}
                    onRegisterConsent={props.onRegisterConsent}
                    onRevokeConsent={props.onRevokeConsent}
                    onExportData={props.onExportData}
                    onUploadConsent={props.onUploadConsent}
                    isUploadingConsent={props.isUploadingConsent}
                    openModal={props.openModal}
                    onManagePlan={props.onManagePlan}
                />;
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activeSubTab === 'citas' ? 'active' : ''}`} onClick={() => setActiveSubTab('citas')}>Citas</button>
                <button className={`sub-tab-button ${activeSubTab === 'equipo' ? 'active' : ''}`} onClick={() => setActiveSubTab('equipo')}>Equipo de Cuidado</button>
                <button className={`sub-tab-button ${activeSubTab === 'archivos' ? 'active' : ''}`} onClick={() => setActiveSubTab('archivos')}>Archivos</button>
                <button className={`sub-tab-button ${activeSubTab === 'info' ? 'active' : ''}`} onClick={() => setActiveSubTab('info')}>Información y Legal</button>
            </nav>
            {renderSubContent()}
        </div>
    );
};