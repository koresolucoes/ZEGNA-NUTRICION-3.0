import React, { FC, useState } from 'react';
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
    // FIX: The onEdit functions now accept null to handle the "add" case, where no item is passed.
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
    const [activeSubTab, setActiveSubTab] = useState('allergies');

    return (
        <section className="fade-in">
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activeSubTab === 'allergies' ? 'active' : ''}`} onClick={() => setActiveSubTab('allergies')}>Alergias</button>
                <button className={`sub-tab-button ${activeSubTab === 'medical' ? 'active' : ''}`} onClick={() => setActiveSubTab('medical')}>Historial Médico</button>
                <button className={`sub-tab-button ${activeSubTab === 'medications' ? 'active' : ''}`} onClick={() => setActiveSubTab('medications')}>Medicamentos</button>
                <button className={`sub-tab-button ${activeSubTab === 'lifestyle' ? 'active' : ''}`} onClick={() => setActiveSubTab('lifestyle')}>Hábitos de Vida</button>
            </nav>
            {/* FIX: Changed the onAdd prop to call the onEdit function with null, signaling a new item should be created. */}
            {activeSubTab === 'allergies' && <AllergiesManager allergies={allergies} onAdd={() => onEditAllergy(null)} onEdit={onEditAllergy} onDelete={(id, name) => openModal('deleteAllergy', id, `¿Eliminar la alergia a "${name}"?`)} memberMap={memberMap} />}
            {activeSubTab === 'medical' && <MedicalHistoryManager history={medicalHistory} onAdd={() => onEditMedicalHistory(null)} onEdit={onEditMedicalHistory} onDelete={(id, name) => openModal('deleteMedicalHistory', id, `¿Eliminar el registro de "${name}"?`)} memberMap={memberMap} />}
            {activeSubTab === 'medications' && <MedicationsManager medications={medications} onAdd={() => onEditMedication(null)} onEdit={onEditMedication} onDelete={(id, name) => openModal('deleteMedication', id, `¿Eliminar el medicamento "${name}"?`)} memberMap={memberMap} />}
            {activeSubTab === 'lifestyle' && <LifestyleManager habits={lifestyleHabits} onEdit={onEditLifestyle} memberMap={memberMap} />}
        </section>
    );
};