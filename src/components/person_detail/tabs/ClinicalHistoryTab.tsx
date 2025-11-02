import React, { FC } from 'react';
import { Allergy, MedicalHistory, Medication, LifestyleHabits, TeamMember } from '../../../types';
import AllergiesManager from '../../client_detail/AllergiesManager';
import MedicalHistoryManager from '../../client_detail/MedicalHistoryManager';
import MedicationsManager from '../../client_detail/MedicationsManager';
import LifestyleManager from '../../client_detail/LifestyleManager';

interface ClinicalHistoryTabProps {
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    lifestyleHabits: LifestyleHabits | null;
    memberMap: Map<string, TeamMember>;
    onEditAllergy: (allergy: Allergy | null) => void;
    onEditMedicalHistory: (history: MedicalHistory | null) => void;
    onEditMedication: (medication: Medication | null) => void;
    onEditLifestyle: () => void;
    openModal: (action: 'deleteAllergy' | 'deleteMedicalHistory' | 'deleteMedication', id: string, text: string) => void;
}

export const ClinicalHistoryTab: FC<ClinicalHistoryTabProps> = ({
    allergies, medicalHistory, medications, lifestyleHabits, memberMap,
    onEditAllergy, onEditMedicalHistory, onEditMedication, onEditLifestyle, openModal
}) => {

    return (
        <section className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <AllergiesManager 
                allergies={allergies} 
                onAdd={() => onEditAllergy(null)} 
                onEdit={onEditAllergy} 
                onDelete={(id, name) => openModal('deleteAllergy', id, `¿Eliminar la alergia a "${name}"?`)} 
                memberMap={memberMap} 
            />
            <MedicalHistoryManager 
                history={medicalHistory} 
                onAdd={() => onEditMedicalHistory(null)} 
                onEdit={onEditMedicalHistory} 
                onDelete={(id, name) => openModal('deleteMedicalHistory', id, `¿Eliminar el registro de "${name}"?`)} 
                memberMap={memberMap} 
            />
            <MedicationsManager 
                medications={medications} 
                onAdd={() => onEditMedication(null)} 
                onEdit={onEditMedication} 
                onDelete={(id, name) => openModal('deleteMedication', id, `¿Eliminar el medicamento "${name}"?`)} 
                memberMap={memberMap} 
            />
            <LifestyleManager 
                habits={lifestyleHabits} 
                onEdit={onEditLifestyle} 
                memberMap={memberMap} 
            />
        </section>
    );
};