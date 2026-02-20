
import React, { FC, useState, useEffect, useMemo, useRef, FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, InternalNoteWithAuthor, DietPlanHistoryItem, AppointmentWithPerson, Clinic, ClinicSubscription, Plan, File as PersonFile } from '../types';
import CalculatorsPage from './CalculatorsPage';
import ConsultationInputPanel from '../components/consultation_mode/ConsultationInputPanel';
import PatientRecordsPanel from '../components/consultation_mode/PatientRecordsPanel';
import AiAssistantPanel from '../components/consultation_mode/AiAssistantPanel';
import AttachmentPreviewModal from '../components/modals/AttachmentPreviewModal';
import ConsultationDetailModal from '../components/modals/ConsultationDetailModal';
import LogDetailModal from '../components/modals/LogDetailModal';
import DietLogDetailModal from '../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../components/modals/ExerciseLogDetailModal';
import ReportModal from '../components/ReportModal';
import DietPlanViewer from '../components/DietPlanViewer';
import ExercisePlanViewer from '../components/ExercisePlanViewer';

interface AiMessage {
    role: 'user' | 'model';
    content: string;
    context?: { displayText: string; fullText: string; file_url?: string; } | null;
}

interface ConsultationModePageProps {
    person: Person;
    personType: 'client' | 'member';
    consultations: ConsultationWithLabs[];
    logs: Log[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    planHistory: DietPlanHistoryItem[];
    appointments: AppointmentWithPerson[];
    allergies?: Allergy[];
    medicalHistory?: MedicalHistory[];
    medications?: Medication[];
    lifestyleHabits?: LifestyleHabits | null;
    internalNotes?: InternalNoteWithAuthor[];
    files?: PersonFile[]; 
    onDataRefresh: (silent?: boolean) => void;
    onExit: () => void;
    isMobile: boolean;
    setViewingConsultation: (consultation: ConsultationWithLabs | null) => void;
    setViewingLog: (log: Log | null) => void;
    setViewingDietLog: (log: DietLog | null) => void;
    setViewingExerciseLog: (log: ExerciseLog | null) => void;
    clinic: Clinic | null;
    subscription: (ClinicSubscription & { plans: Plan | null }) | null;
}

// Helper to compare dates without time
const areDatesEqual = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

import ToolsModal from '../components/modals/ToolsModal';

const ConsultationModePage: FC<ConsultationModePageProps> = ({ 
    person, personType, consultations, logs, dietLogs, exerciseLogs, planHistory, appointments, allergies = [], medicalHistory = [], medications = [], lifestyleHabits, internalNotes, files = [],
    onDataRefresh, onExit, isMobile, setViewingConsultation, setViewingLog, setViewingDietLog, setViewingExerciseLog, clinic, subscription
}) => {
    
    const personName = person.full_name;
    
    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const hasAiFeature = useMemo(() => {
        return subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false;
    }, [subscription]);

    // Quick Forms State
    const [isToolsOpen, setIsToolsOpen] = useState(false);

    // AI Assistant State
    const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);
    const [selectedContext, setSelectedContext] = useState<{ displayText: string; fullText: string; file_url?: string; } | null>(null);

    // Modals State
    const [viewingPlan, setViewingPlan] = useState<DietPlanHistoryItem | null>(null);
    const [viewingExercisePlan, setViewingExercisePlan] = useState<any | null>(null); // Type properly if available

    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate.replace(/-/g, '/'));
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age}`;
    };

    // --- Actions ---

    const handleSync = () => {
        const history = medicalHistory[0] || {};
        const summary = `
            Paciente: ${person.full_name}
            Edad: ${calculateAge(person.birth_date)}
            Embarazo: ${history.condition_pregnancy ? 'Sí' : 'No'}
            Medicamentos: ${medications.map(m => m.name).join(', ')}
            Alergias: ${allergies.map(a => a.substance).join(', ')}
            Padecimiento: ${history.family_history || 'Ninguno'}
            Estatura: ${history.height_cm || '-'} cm
            Peso: ${history.weight_kg || '-'} kg
            Grupo Sanguíneo: ${person.blood_type || '-'}
            Objetivos: ${person.health_goal || 'No definidos'}
            Notas: ${person.notes || '-'}
        `;
        
        setSelectedContext({
            displayText: `Contexto Sincronizado de ${person.full_name}`,
            fullText: summary
        });
    };

    const handleUpdatePerson = async (updates: Partial<Person>) => {
        try {
            await supabase.from('persons').update(updates).eq('id', person.id);
            onDataRefresh(true);
        } catch (error) {
            console.error('Error updating person:', error);
        }
    };

    const handleUpdateMedicalHistory = async (updates: Partial<MedicalHistory>) => {
        try {
            if (medicalHistory.length > 0) {
                await supabase.from('medical_history').update(updates).eq('id', medicalHistory[0].id);
            } else {
                await supabase.from('medical_history').insert({ person_id: person.id, ...updates });
            }
            onDataRefresh(true);
        } catch (error) {
            console.error('Error updating medical history:', error);
        }
    };

    const handleAddAllergy = async () => {
        // Placeholder: In a real app, this would open a modal or prompt
        const substance = prompt("Ingrese la sustancia de la alergia:");
        if (substance) {
            await supabase.from('allergies_intolerances').insert({ person_id: person.id, substance, reaction: 'N/A' });
            onDataRefresh(true);
        }
    };

    const handleAddMedication = async () => {
        const name = prompt("Ingrese el nombre del medicamento:");
        if (name) {
            await supabase.from('medications').insert({ person_id: person.id, name, dosage: 'N/A', frequency: 'N/A' });
            onDataRefresh(true);
        }
    };

    const handleAddCondition = async () => {
        const condition = prompt("Ingrese el padecimiento:");
        if (condition) {
             // Assuming family_history is used for conditions in this simplified model, or update a specific field
             await handleUpdateMedicalHistory({ family_history: condition });
        }
    };

    const handleAiSubmit = async (e: FormEvent | string) => {
        if (typeof e !== 'string') e.preventDefault();
        const text = typeof e === 'string' ? e : aiInput;
        if (!text.trim()) return;

        if (!hasAiFeature) {
            setAiMessages(prev => [...prev, { role: 'user', content: text }, { role: 'model', content: "La función de Asistente IA no está disponible en tu plan actual. Actualiza a Pro o Business para desbloquearla." }]);
            setAiInput('');
            setSelectedContext(null);
            return;
        }

        const newUserMessage: AiMessage = { role: 'user', content: text, context: selectedContext };
        setAiMessages(prev => [...prev, newUserMessage]);
        setAiInput('');
        setSelectedContext(null);
        setAiLoading(true);

        try {
            const contextText = selectedContext ? `\n\nCONTEXTO ADJUNTO:\n${selectedContext.fullText}\n\n` : '';
            
            const historyForModel = aiMessages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.context ? `[Contexto: ${msg.context.fullText}]\n${msg.content}` : msg.content }]
            }));
            
            const currentMessagePart: any = {
                role: 'user',
                parts: [{ text: `${contextText}${text}` }]
            };
            
            const payload: any = {
                 clinic_id: clinic?.id,
                 contents: [...historyForModel, currentMessagePart],
                 config: {
                     systemInstruction: `Eres un asistente clínico experto ayudando a un nutriólogo. Sé conciso, profesional y usa terminología médica adecuada. Basa tus respuestas en el contexto proporcionado sobre el paciente ${person.full_name}.`,
                 }
            };

            if (selectedContext?.file_url) {
                payload.file_url = selectedContext.file_url;
            }

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error contacting AI');

            setAiMessages(prev => [...prev, { role: 'model', content: data.text }]);
        } catch (error: any) {
            setAiMessages(prev => [...prev, { role: 'model', content: `Error: ${error.message}` }]);
        } finally {
            setAiLoading(false);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- Render ---

    return (
        <div className="fade-in" style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'var(--background-color)', zIndex: 2000, 
            display: 'flex', flexDirection: 'column' 
        }}>
            {isToolsOpen && (
                <ToolsModal onClose={() => setIsToolsOpen(false)} isMobile={isMobile}>
                    <CalculatorsPage 
                        isMobile={isMobile} 
                        initialPersonToLoad={person} 
                        // IMPORTANT: Pass a very high z-index to be above the Tools Modal (2100)
                        customModalZIndex={2200}
                    />
                </ToolsModal>
            )}

            {/* Header */}
            <div style={{ 
                height: '60px', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem'}}>EN CONSULTA</div>
                    <h2 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>{personName}</h2>
                    <span style={{fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--text-light)'}}>{formatTime(elapsedTime)}</span>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setIsToolsOpen(true)} className="button-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        {ICONS.calculator} Herramientas
                    </button>
                    <button onClick={onExit} style={{backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600}}>
                        Finalizar Consulta
                    </button>
                </div>
            </div>

            {/* Main Layout - 3 Columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '30% 35% 35%', overflow: 'hidden' }}>
                
                {/* 1. Left: Active Capture */}
                {!isMobile && (
                    <ConsultationInputPanel 
                        person={person}
                        medicalHistory={medicalHistory}
                        allergies={allergies}
                        medications={medications}
                        onSync={handleSync}
                        onUpdatePerson={handleUpdatePerson}
                        onUpdateMedicalHistory={handleUpdateMedicalHistory}
                        onAddAllergy={handleAddAllergy}
                        onAddMedication={handleAddMedication}
                        onAddCondition={handleAddCondition}
                    />
                )}

                {/* 2. Center: Patient Records */}
                <div style={{ overflowY: 'auto', backgroundColor: 'var(--surface-active)' }}>
                    <PatientRecordsPanel 
                        person={person}
                        consultations={consultations}
                        dietPlan={planHistory.length > 0 ? planHistory[0] : null}
                        exercisePlan={null} // Pass real exercise plan if available
                        onViewPlan={() => planHistory.length > 0 && setViewingPlan(planHistory[0])}
                        onViewExercise={() => {}}
                        onViewConsultation={setViewingConsultation}
                        onAudit={() => {}}
                    />
                </div>

                {/* 3. Right: AI Assistant */}
                {!isMobile && (
                    <div style={{ backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column' }}>
                         <AiAssistantPanel 
                            messages={aiMessages}
                            aiLoading={aiLoading}
                            chatEndRef={chatEndRef}
                            handleAiSubmit={handleAiSubmit}
                            aiContext={selectedContext}
                            setAiContext={setSelectedContext}
                            userInput={aiInput}
                            setUserInput={setAiInput}
                            aiInputRef={aiInputRef}
                            personName={personName}
                         />
                    </div>
                )}
            </div>
            
            {/* Mobile Tabs if needed, or just hide AI/Left panel on mobile for MVP simplification */}
            {isMobile && (
                <div style={{padding: '1rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)'}}>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Vista móvil simplificada. Usa una tablet o escritorio para la experiencia completa.</p>
                </div>
            )}

            {/* Modals */}
            {viewingPlan && (
                <div style={{...styles.modalOverlay, zIndex: 2200}}>
                    <div style={{...styles.modalContent, width: '90%', height: '90%', maxWidth: '1000px'}}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Plan de Alimentación</h2>
                            <button onClick={() => setViewingPlan(null)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                        </div>
                        <div style={{...styles.modalBody, padding: 0}}>
                            <DietPlanViewer plan={viewingPlan} onClose={() => setViewingPlan(null)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationModePage;
