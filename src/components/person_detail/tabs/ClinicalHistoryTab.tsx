
import React, { FC, useState, useMemo } from 'react';
import { Allergy, MedicalHistory, Medication, LifestyleHabits, TeamMember, ConsultationWithLabs } from '../../../types';
import AllergiesManager from '../../client_detail/AllergiesManager';
import MedicalHistoryManager from '../../client_detail/MedicalHistoryManager';
import MedicationsManager from '../../client_detail/MedicationsManager';
import LifestyleManager from '../../client_detail/LifestyleManager';
import { ConsultationsTab } from './ConsultationsTab';
import ProgressChart from '../../shared/ProgressChart';
import { styles } from '../../../constants';

interface ClinicalHistoryTabProps {
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    lifestyleHabits: LifestyleHabits | null;
    consultations: ConsultationWithLabs[]; // Added prop
    memberMap: Map<string, TeamMember>;
    onEditAllergy: (allergy: Allergy | null) => void;
    onEditMedicalHistory: (history: MedicalHistory | null) => void;
    onEditMedication: (medication: Medication | null) => void;
    onEditLifestyle: () => void;
    openModal: (action: 'deleteAllergy' | 'deleteMedicalHistory' | 'deleteMedication' | 'deleteConsultation', id: string, text: string) => void;
    onOpenSoapGenerator?: () => void;
}

export const ClinicalHistoryTab: FC<ClinicalHistoryTabProps> = ({
    allergies, medicalHistory, medications, lifestyleHabits, consultations, memberMap,
    onEditAllergy, onEditMedicalHistory, onEditMedication, onEditLifestyle, openModal, onOpenSoapGenerator
}) => {
    const [activeSubTab, setActiveSubTab] = useState('allergies');

    // Data for charts - Sorted
    const sortedConsultations = useMemo(() => {
        return [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
    }, [consultations]);

    // Slice to LAST 2 records for Medical History tab as requested to reduce noise
    const recentConsultations = useMemo(() => {
        if (sortedConsultations.length <= 2) return sortedConsultations;
        return sortedConsultations.slice(sortedConsultations.length - 2);
    }, [sortedConsultations]);

    const weightData = recentConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
    const imcData = recentConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));
    // No TA chart component yet, usually represented as text in list.

    // Full data for Habits tab (Glucose, etc)
    const glucoseData = sortedConsultations.filter(c => c.lab_results?.[0]?.glucose_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].glucose_mg_dl! }));
    const cholesterolData = sortedConsultations.filter(c => c.lab_results?.[0]?.cholesterol_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].cholesterol_mg_dl! }));
    const triglyceridesData = sortedConsultations.filter(c => c.lab_results?.[0]?.triglycerides_mg_dl != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].triglycerides_mg_dl! }));
    const hba1cData = sortedConsultations.filter(c => c.lab_results?.[0]?.hba1c != null).map(c => ({ date: c.consultation_date, value: c.lab_results[0].hba1c! }));


    return (
        <section className="fade-in" style={{ overflow: 'visible' }}>
            {/* Sub-navigation using Folder Tabs metaphor */}
            <div style={{...styles.tabContainer, paddingLeft: 0, marginBottom: '-1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} className="hide-scrollbar">
                <div style={{display: 'flex'}}>
                    {[
                        { key: 'allergies', label: 'Alergias' },
                        { key: 'medical', label: 'Historial Médico' },
                        { key: 'medications', label: 'Medicamentos' },
                        { key: 'lifestyle', label: 'Hábitos y Laboratorio' }
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
                {onOpenSoapGenerator && (
                    <button 
                        onClick={onOpenSoapGenerator}
                        style={{
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary-color)',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginBottom: '0.5rem',
                            marginRight: '1rem'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        Generar Nota Clínica
                    </button>
                )}
            </div>
            
            <div style={styles.nestedFolderContent}>
                
                {/* 1. ALERGIAS: Listado + Historial Consultas (Simplificado) */}
                {activeSubTab === 'allergies' && (
                    <div className="fade-in">
                        <AllergiesManager allergies={allergies} onAdd={() => onEditAllergy(null)} onEdit={onEditAllergy} onDelete={(id, name) => openModal('deleteAllergy', id, `¿Eliminar la alergia a "${name}"?`)} memberMap={memberMap} />
                        
                        <div style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                             <ConsultationsTab consultations={consultations} memberMap={memberMap} onAdd={() => {}} onEdit={() => {}} onView={() => {}} openModal={openModal as any} />
                        </div>
                    </div>
                )}

                {/* 2. HISTORIAL MÉDICO: Listado + Gráficas Peso/IMC (Últimos 2) + Consultas */}
                {activeSubTab === 'medical' && (
                    <div className="fade-in">
                        <MedicalHistoryManager history={medicalHistory} onAdd={() => onEditMedicalHistory(null)} onEdit={onEditMedicalHistory} onDelete={(id, name) => openModal('deleteMedicalHistory', id, `¿Eliminar el registro de "${name}"?`)} memberMap={memberMap} />
                        
                        <div style={{marginTop: '3rem'}}>
                            <h3 style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-color)'}}>Progreso Reciente (Últimas 2 visitas)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {weightData.length > 0 && <ProgressChart title="Peso" data={weightData} unit="kg" />}
                                {imcData.length > 0 && <ProgressChart title="IMC" data={imcData} unit="pts" />}
                            </div>
                             {weightData.length === 0 && <p style={{color: 'var(--text-light)', fontStyle: 'italic'}}>No hay suficientes datos recientes para graficar progreso.</p>}
                        </div>

                        <div style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                             <ConsultationsTab consultations={consultations} memberMap={memberMap} onAdd={() => {}} onEdit={() => {}} onView={() => {}} openModal={openModal as any} />
                        </div>
                    </div>
                )}

                {/* 3. MEDICAMENTOS: Solo Listado (Limpio) */}
                {activeSubTab === 'medications' && (
                    <div className="fade-in">
                        <MedicationsManager medications={medications} onAdd={() => onEditMedication(null)} onEdit={onEditMedication} onDelete={(id, name) => openModal('deleteMedication', id, `¿Eliminar el medicamento "${name}"?`)} memberMap={memberMap} />
                    </div>
                )}

                {/* 4. HÁBITOS: Listado + Gráficas Laboratorio (Glucosa, Colesterol, etc.) */}
                {activeSubTab === 'lifestyle' && (
                    <div className="fade-in">
                        <LifestyleManager habits={lifestyleHabits} onEdit={onEditLifestyle} memberMap={memberMap} />
                        
                        <div style={{marginTop: '3rem'}}>
                             <h3 style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-color)'}}>Biomarcadores de Laboratorio</h3>
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {glucoseData.length > 0 && <ProgressChart title="Glucosa" data={glucoseData} unit="mg/dl" />}
                                {cholesterolData.length > 0 && <ProgressChart title="Colesterol" data={cholesterolData} unit="mg/dl" />}
                                {triglyceridesData.length > 0 && <ProgressChart title="Triglicéridos" data={triglyceridesData} unit="mg/dl" />}
                                {hba1cData.length > 0 && <ProgressChart title="HbA1c" data={hba1cData} unit="%" />}
                            </div>
                            {glucoseData.length === 0 && cholesterolData.length === 0 && (
                                <p style={{color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem'}}>
                                    Registra resultados de laboratorio en las consultas para ver las gráficas.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
