
import React, { FC, useState } from 'react';
import { Allergy, MedicalHistory, Medication, LifestyleHabits, TeamMember } from '../../../types';
import AllergiesManager from '../../client_detail/AllergiesManager';
import MedicalHistoryManager from '../../client_detail/MedicalHistoryManager';
import MedicationsManager from '../../client_detail/MedicationsManager';
import LifestyleManager from '../../client_detail/LifestyleManager';
import { styles } from '../../../constants';

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
    const [activeSubTab, setActiveSubTab] = useState('allergies');

    return (
        <section className="fade-in" style={{ overflow: 'visible' }}>
            {/* Sub-navigation using Folder Tabs metaphor */}
            <div style={{...styles.tabContainer, paddingLeft: 0, marginBottom: '-1px'}}>
                {[
                    { key: 'allergies', label: 'Alergias' },
                    { key: 'medical', label: 'Historial Médico' },
                    { key: 'medications', label: 'Medicamentos' },
                    { key: 'lifestyle', label: 'Hábitos' }
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
                {activeSubTab === 'allergies' && <AllergiesManager allergies={allergies} onAdd={() => onEditAllergy(null)} onEdit={onEditAllergy} onDelete={(id, name) => openModal('deleteAllergy', id, `¿Eliminar la alergia a "${name}"?`)} memberMap={memberMap} />}
                {activeSubTab === 'medical' && <MedicalHistoryManager history={medicalHistory} onAdd={() => onEditMedicalHistory(null)} onEdit={onEditMedicalHistory} onDelete={(id, name) => openModal('deleteMedicalHistory', id, `¿Eliminar el registro de "${name}"?`)} memberMap={memberMap} />}
                {activeSubTab === 'medications' && <MedicationsManager medications={medications} onAdd={() => onEditMedication(null)} onEdit={onEditMedication} onDelete={(id, name) => openModal('deleteMedication', id, `¿Eliminar el medicamento "${name}"?`)} memberMap={memberMap} />}
                {activeSubTab === 'lifestyle' && <LifestyleManager habits={lifestyleHabits} onEdit={onEditLifestyle} memberMap={memberMap} />}
            </div>
        </section>
    );
};
