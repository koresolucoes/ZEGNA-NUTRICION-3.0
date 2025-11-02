import React, { FC, useState } from 'react';
import { Allergy, MedicalHistory, Medication, LifestyleHabits, ConsultationWithLabs, Log, TeamMember } from '../../../types';
import { ClinicalHistoryTab } from '../tabs/ClinicalHistoryTab';
import { ConsultationsTab } from '../tabs/ConsultationsTab';
import { LogTab } from '../tabs/LogTab';

interface ExpedienteClinicoContainerProps {
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    lifestyleHabits: LifestyleHabits | null;
    consultations: ConsultationWithLabs[];
    logs: Log[];
    memberMap: Map<string, TeamMember>;
    onEditAllergy: (allergy: Allergy | null) => void;
    onEditMedicalHistory: (history: MedicalHistory | null) => void;
    onEditMedication: (medication: Medication | null) => void;
    onEditLifestyle: () => void;
    onAddConsultation: () => void;
    onEditConsultation: (id: string) => void;
    onViewConsultation: (consultation: ConsultationWithLabs) => void;
    onAddLog: () => void;
    onEditLog: (id: string) => void;
    onViewLog: (log: Log) => void;
    openModal: (action: any, id: string, text: string) => void;
}

export const ExpedienteClinicoContainer: FC<ExpedienteClinicoContainerProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState('historial');

    const renderSubContent = () => {
        switch (activeSubTab) {
            case 'historial':
                return <ClinicalHistoryTab 
                    allergies={props.allergies}
                    medicalHistory={props.medicalHistory}
                    medications={props.medications}
                    lifestyleHabits={props.lifestyleHabits}
                    memberMap={props.memberMap}
                    onEditAllergy={props.onEditAllergy}
                    onEditMedicalHistory={props.onEditMedicalHistory}
                    onEditMedication={props.onEditMedication}
                    onEditLifestyle={props.onEditLifestyle}
                    openModal={props.openModal}
                />;
            case 'consultas':
                return <ConsultationsTab 
                    consultations={props.consultations}
                    memberMap={props.memberMap}
                    onAdd={props.onAddConsultation}
                    onEdit={props.onEditConsultation}
                    onView={props.onViewConsultation}
                    openModal={props.openModal}
                />;
            case 'bitacora':
                return <LogTab 
                    logs={props.logs}
                    memberMap={props.memberMap}
                    onAdd={props.onAddLog}
                    onEdit={props.onEditLog}
                    onView={props.onViewLog}
                    openModal={props.openModal}
                />;
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activeSubTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveSubTab('historial')}>Historial Clínico</button>
                <button className={`sub-tab-button ${activeSubTab === 'consultas' ? 'active' : ''}`} onClick={() => setActiveSubTab('consultas')}>Consultas</button>
                <button className={`sub-tab-button ${activeSubTab === 'bitacora' ? 'active' : ''}`} onClick={() => setActiveSubTab('bitacora')}>Bitácora</button>
            </nav>
            {renderSubContent()}
        </div>
    );
};