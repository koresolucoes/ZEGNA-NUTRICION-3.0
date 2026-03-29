
import React, { FC, useState, useEffect, useMemo, useRef, FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, InternalNoteWithAuthor, DietPlanHistoryItem, AppointmentWithPerson, Clinic, ClinicSubscription, Plan, File as PersonFile } from '../types';
import CalculatorsPage from './CalculatorsPage';
import SummaryPanel from '../components/consultation_mode/SummaryPanel';
import TimelinePanel from '../components/consultation_mode/TimelinePanel';
import AiAssistantPanel from '../components/consultation_mode/AiAssistantPanel';
import AttachmentPreviewModal from '../components/modals/AttachmentPreviewModal';
import ConsultationDetailModal from '../components/modals/ConsultationDetailModal';
import LogDetailModal from '../components/modals/LogDetailModal';
import DietLogDetailModal from '../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../components/modals/ExerciseLogDetailModal';
import ReportModal from '../components/ReportModal';
import PatientSummaryModal from '../components/consultation_mode/PatientSummaryModal';
import PrescriptionBuilderModal from '../components/consultation_mode/PrescriptionBuilderModal';
import SoapGeneratorModal from '../components/consultation_mode/SoapGeneratorModal';
import DietPlanner from '../components/calculators/DietPlanner';
import ExercisePlanGenerator from '../components/ExercisePlanGenerator';

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
    nutritionistProfile: any;
}

const areDatesEqual = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

const safeParseDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    try {
        if (dateStr.length === 10 && dateStr.includes('-') && !dateStr.includes(':')) {
            const parts = dateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }
        const safeStr = dateStr.replace(' ', 'T');
        const d = new Date(safeStr);
        if (isNaN(d.getTime())) return new Date();
        return d;
    } catch (e) {
        return new Date();
    }
};

const ToolsModal: FC<{ onClose: () => void; children: ReactNode; isMobile: boolean }> = ({ onClose, children, isMobile }) => (
    <div style={{ ...styles.modalOverlay, zIndex: 2100, padding: isMobile ? '0.5rem' : '2rem', backdropFilter: 'blur(5px)' }}>
        <div style={{ ...styles.modalContent, width: '95%', maxWidth: '1400px', height: isMobile ? '95vh' : '90vh' }} className="fade-in">
            <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Herramientas y Calculadoras</h2>
                <button onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
            </div>
            <div style={{ ...styles.modalBody, display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    </div>
);

const ConsultationModePage: FC<ConsultationModePageProps> = ({ 
    person, personType, consultations, logs, dietLogs, exerciseLogs, planHistory, appointments, allergies = [], medicalHistory = [], medications = [], lifestyleHabits, internalNotes, files = [],
    onDataRefresh, onExit, isMobile, setViewingConsultation, setViewingLog, setViewingDietLog, setViewingExerciseLog, clinic, subscription, nutritionistProfile
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

    const sessionAppointment = useMemo(() => {
        if (!appointments || appointments.length === 0) return null;
        const now = new Date();
        const inProgress = appointments.find(a => ['in-consultation', 'called'].includes(a.status) && areDatesEqual(new Date(a.start_time), now));
        if (inProgress) return inProgress;

        const checkedIn = appointments
            .filter(a => a.status === 'checked-in' && areDatesEqual(new Date(a.start_time), now))
            .sort((a, b) => new Date(a.check_in_time!).getTime() - new Date(b.check_in_time!).getTime())[0];
        
        return checkedIn || null;
    }, [appointments]);

    useEffect(() => {
        const startConsultation = async () => {
            if (sessionAppointment && sessionAppointment.status === 'checked-in') {
                await supabase.from('appointments').update({ status: 'in-consultation' }).eq('id', sessionAppointment.id);
                onDataRefresh(true);
            }
        };
        startConsultation();
    }, [sessionAppointment, onDataRefresh]);

    // Data for Summary Panel
    const latestMetrics = useMemo(() => {
        const sortedConsults = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
        const latest = sortedConsults[sortedConsults.length - 1];
        
        const latestWeight = latest?.weight_kg;
        const latestHeight = latest?.height_cm;
        const latestLab = latest?.lab_results?.[0];
        
        return {
            hasAnyData: !!latest,
            latestWeight,
            latestHeight,
            latestGlucose: latestLab?.glucose_mg_dl,
            latestCholesterol: latestLab?.cholesterol_mg_dl,
            latestTriglycerides: latestLab?.triglycerides_mg_dl,
            latestHba1c: latestLab?.hba1c,
            height_cm: latestHeight,
            weight_kg: latestWeight
        };
    }, [consultations]);
    
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isPatientSummaryOpen, setIsPatientSummaryOpen] = useState(false);
    const [isPrescriptionBuilderOpen, setIsPrescriptionBuilderOpen] = useState(false);
    const [isSoapGeneratorOpen, setIsSoapGeneratorOpen] = useState(false);

    // Data for Planners
    const [equivalentsData, setEquivalentsData] = useState<any[]>([]);
    const [knowledgeResources, setKnowledgeResources] = useState<any[]>([]);

    useEffect(() => {
        const fetchPlannerData = async () => {
            if (!clinic) return;
            try {
                const [eqRes, krRes] = await Promise.all([
                    supabase.from('food_equivalents').select('*'),
                    supabase.from('knowledge_base_resources').select('*').eq('clinic_id', clinic.id)
                ]);
                if (eqRes.data) setEquivalentsData(eqRes.data);
                if (krRes.data) setKnowledgeResources(krRes.data);
            } catch (err) {
                console.error("Error fetching planner data:", err);
            }
        };
        fetchPlannerData();
    }, [clinic]);

    // AI Assistant State
    const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);
    
    // Context Selection State (For RAG)
    const [selectedContext, setSelectedContext] = useState<{ displayText: string; fullText: string; file_url?: string; } | null>(null);

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

    const handleGenerateSoapNote = async (subjectiveData: any) => {
        setAiLoading(true);
        setIsSoapGeneratorOpen(false);

        const context = formatSummaryForAI().fullText;
        const prompt = `
Genera una Nota Clínica con formato SOAP (Subjetivo, Objetivo, Análisis, Plan) para este paciente.
Usa un tono profesional, médico y narrativo.

DATOS SUBJETIVOS (Proporcionados por el paciente):
- Apetito: ${subjectiveData.appetite}
- Energía: ${subjectiveData.energy_level}
- Sueño: ${subjectiveData.sleep_hours} horas, Calidad ${subjectiveData.sleep_quality}
- Digestión: ${subjectiveData.digestive_issues}
- Agua: ${subjectiveData.water_intake}
- Estrés: ${subjectiveData.stress_level}
- Actividad Física: ${subjectiveData.exercise_frequency}
- Cambios Recientes: ${subjectiveData.recent_changes}
- Síntomas: ${subjectiveData.symptoms}

DATOS OBJETIVOS (Del expediente):
${context}

INSTRUCCIONES:
1. Redacta el apartado SUBJETIVO integrando los datos de arriba en un párrafo coherente.
2. Redacta el apartado OBJETIVO con los datos antropométricos y bioquímicos disponibles.
3. Redacta el ANÁLISIS con un breve diagnóstico nutricional basado en los datos.
4. Redacta el PLAN con recomendaciones generales.
5. NO uses markdown con negritas excesivas, usa un formato limpio de texto.
`;

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic?.id,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: {
                        systemInstruction: "Eres un asistente clínico experto. Genera notas SOAP precisas y profesionales.",
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error contacting AI');

            setAiMessages(prev => [...prev, 
                { role: 'user', content: "Generar Nota SOAP basada en cuestionario." },
                { role: 'model', content: data.text }
            ]);
        } catch (error: any) {
            setAiMessages(prev => [...prev, { role: 'model', content: `Error al generar nota: ${error.message}` }]);
        } finally {
            setAiLoading(false);
        }
    };
    
    // --- TIMELINE LOGIC ---
    const [timelineFilters, setTimelineFilters] = useState({ search: '', start: '', end: '' });
    const [centerView, setCenterView] = useState<'timeline' | 'diet' | 'exercise'>('timeline');

    const timeline = useMemo(() => {
        const combined = [
            ...consultations.map(c => ({ ...c, type: 'consultation', date: safeParseDate(c.consultation_date) })),
            ...logs.map(l => ({ ...l, type: 'log', date: safeParseDate(l.log_time || l.created_at) })),
            ...dietLogs.map(d => ({ ...d, type: 'diet', date: safeParseDate(d.log_date) })), 
            ...exerciseLogs.map(e => ({ ...e, type: 'exercise', date: safeParseDate(e.log_date) })),
            ...planHistory.map(p => ({ ...p, type: 'diet_plan_history', date: safeParseDate(p.created_at) })), 
        ];
        
        return combined
            .filter(item => {
                if (timelineFilters.search) {
                    const searchLower = timelineFilters.search.toLowerCase();
                    const desc = (item as any).description || (item as any).notes || (item as any).log_type || '';
                    if (!desc.toLowerCase().includes(searchLower)) return false;
                }
                return true;
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [consultations, logs, dietLogs, exerciseLogs, planHistory, timelineFilters]);

    const handleTimelineItemClick = (item: any) => {
        if (item.type === 'consultation') setViewingConsultation(item);
        else if (item.type === 'log') setViewingLog(item);
        else if (item.type === 'diet') setViewingDietLog(item);
        else if (item.type === 'exercise') setViewingExerciseLog(item);
    };

    // --- AI Logic ---
    const handleContextSelection = (context: { displayText: string; fullText: string; file_url?: string; }) => {
        setSelectedContext(context);
        aiInputRef.current?.focus();
    };

    const formatSummaryForAI = () => {
        let summary = `Paciente: ${person.full_name}\nEdad: ${calculateAge(person.birth_date)}\nObjetivo: ${person.health_goal || 'No definido'}\n\n`;
        if (latestMetrics.hasAnyData) {
            summary += `Últimas Mediciones:\nPeso: ${latestMetrics.latestWeight || 'N/A'} kg\nIMC: ${latestMetrics.latestWeight && latestMetrics.latestHeight ? (latestMetrics.latestWeight / ((latestMetrics.latestHeight/100)**2)).toFixed(1) : 'N/A'}\n`;
            if (latestMetrics.latestGlucose) summary += `Glucosa: ${latestMetrics.latestGlucose} mg/dL\n`;
        }
        if (allergies.length > 0) summary += `\nAlergias: ${allergies.map(a => a.substance).join(', ')}`;
        return { displayText: `Resumen General de ${person.full_name}`, fullText: summary };
    };
    
    const formatItemForAI = (item: any) => {
        let text = '';
        let display = '';
        if (item.type === 'consultation') {
            display = `Consulta ${item.date.toLocaleDateString()}`;
            text = `Consulta del ${item.date.toLocaleDateString()}:\nPeso: ${item.weight_kg}kg, IMC: ${item.imc}\nNotas: ${item.notes || 'Sin notas'}\n`;
            if (item.lab_results && item.lab_results.length > 0) {
                text += `Laboratorios: Glucosa ${item.lab_results[0].glucose_mg_dl || '-'}, Colesterol ${item.lab_results[0].cholesterol_mg_dl || '-'}`;
            }
        } else if (item.type === 'log') {
             display = `Nota ${item.date.toLocaleDateString()}`;
             text = `Nota (${item.log_type}) del ${item.date.toLocaleDateString()}:\n${item.description}`;
        } else if (item.type === 'diet') {
             display = `Dieta ${item.date.toLocaleDateString()}`;
             text = `Plan Alimenticio del ${item.date.toLocaleDateString()}:\nDesayuno: ${item.desayuno}\nComida: ${item.comida}\nCena: ${item.cena}`;
        }
        return { displayText: display, fullText: text };
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

    // --- Flying Animation Logic ---
    const [flyingItem, setFlyingItem] = useState<{x: number, y: number, content: string, fullContext: any} | null>(null);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (flyingItem) {
            // Wait a tick to ensure render, then animate
            requestAnimationFrame(() => setAnimating(true));
            
            const timer = setTimeout(() => {
                handleContextSelection(flyingItem.fullContext);
                setAnimating(false);
                setFlyingItem(null);
            }, 800); 
            return () => clearTimeout(timer);
        }
    }, [flyingItem]);

    const handleSaveData = async (type: string, data: any, sourceRect?: DOMRect) => {
        try {
            let contextText = '';
            let contextDisplay = '';

            if (type === 'allergy') {
                const { error } = await supabase.from('allergies_intolerances').insert({
                    person_id: person.id,
                    substance: data.substance,
                    severity: data.severity,
                    type: 'Alergia',
                    notes: 'Agregado desde Modo Consulta'
                });
                if (error) throw error;
                contextDisplay = `Alergia: ${data.substance}`;
                contextText = `Nueva alergia registrada: ${data.substance} (${data.severity})`;
            } else if (type === 'medication') {
                const { error } = await supabase.from('medications').insert({
                    person_id: person.id,
                    name: data.name,
                    dosage: data.dosage,
                    frequency: data.frequency,
                    notes: data.notes
                });
                if (error) throw error;
                contextDisplay = `Medicamento: ${data.name}`;
                contextText = `Nuevo medicamento registrado: ${data.name}, Dosis: ${data.dosage}, Frecuencia: ${data.frequency}, Notas: ${data.notes || ''}`;
            } else if (type === 'condition') {
                let conditionToSave = data.condition;
                if (data.has_condition === 'No') {
                    conditionToSave = `Niega ${data.label_type}`;
                } else if (!conditionToSave || conditionToSave.trim() === '') {
                    conditionToSave = data.label_type || 'Condición no especificada';
                }

                const { error } = await supabase.from('medical_history').insert({
                    person_id: person.id,
                    condition: conditionToSave,
                    diagnosis_date: new Date().toISOString().split('T')[0],
                    notes: data.notes
                });
                if (error) throw error;
                contextDisplay = `Condición: ${conditionToSave}`;
                contextText = `Nueva condición registrada: ${conditionToSave}. Notas: ${data.notes}`;
            } else if (type === 'metrics') {
                if (data.gender !== person.gender) {
                    await supabase.from('persons').update({ gender: data.gender }).eq('id', person.id);
                }
                const today = new Date().toISOString().split('T')[0];
                const { data: existingConsult } = await supabase.from('consultations')
                    .select('id')
                    .eq('person_id', person.id)
                    .eq('consultation_date', today)
                    .single();

                if (existingConsult) {
                    await supabase.from('consultations').update({
                        weight_kg: data.weight_kg,
                        height_cm: data.height_cm
                    }).eq('id', existingConsult.id);
                } else {
                    await supabase.from('consultations').insert({
                        person_id: person.id,
                        consultation_date: today,
                        weight_kg: data.weight_kg,
                        height_cm: data.height_cm,
                        notes: 'Registro desde panel resumen'
                    });
                }
                contextDisplay = `Mediciones Actualizadas`;
                contextText = `Mediciones actualizadas: Peso ${data.weight_kg}kg, Estatura ${data.height_cm}cm, Sexo ${data.gender}`;
            } else if (type === 'notes') {
                await supabase.from('persons').update({ notes: data.notes }).eq('id', person.id);
                contextDisplay = `Notas Actualizadas`;
                contextText = `Notas del paciente actualizadas: ${data.notes}`;
            } else if (type === 'birth_date') {
                await supabase.from('persons').update({ birth_date: data.birth_date }).eq('id', person.id);
                contextDisplay = `Fecha Nacimiento Actualizada`;
                contextText = `Fecha de nacimiento actualizada: ${data.birth_date}`;
            } else if (type === 'goal') {
                await supabase.from('persons').update({ health_goal: data.health_goal }).eq('id', person.id);
                contextDisplay = `Objetivo Actualizado`;
                contextText = `Objetivo de salud actualizado: ${data.health_goal}`;
            }

            onDataRefresh(true);
            
            if (sourceRect) {
                setFlyingItem({
                    x: sourceRect.left + (sourceRect.width / 2),
                    y: sourceRect.top + (sourceRect.height / 2),
                    content: contextDisplay,
                    fullContext: { displayText: contextDisplay, fullText: contextText }
                });
            }

        } catch (error) {
            console.error("Error saving data:", error);
            alert("Error al guardar los datos. Por favor intente de nuevo.");
        }
    };

    return (
        <div className="fade-in" style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'var(--background-color)', zIndex: 2000, 
            display: 'flex', flexDirection: 'column' 
        }}>
            {flyingItem && createPortal(
                <div style={{
                    position: 'fixed',
                    left: animating ? '83%' : `${flyingItem.x}px`,
                    top: animating ? '50%' : `${flyingItem.y}px`,
                    transform: 'translate(-50%, -50%) scale(' + (animating ? 0.5 : 1) + ')',
                    opacity: animating ? 0 : 1,
                    transition: 'all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                }}>
                    {flyingItem.content}
                </div>,
                document.body
            )}

            {isSoapGeneratorOpen && (
                <SoapGeneratorModal 
                    isOpen={isSoapGeneratorOpen} 
                    onClose={() => setIsSoapGeneratorOpen(false)} 
                    onGenerate={handleGenerateSoapNote}
                    person={person}
                    loading={aiLoading}
                />
            )}

            {isToolsOpen && (
                <ToolsModal onClose={() => setIsToolsOpen(false)} isMobile={isMobile}>
                    <CalculatorsPage 
                        isMobile={isMobile} 
                        initialPersonToLoad={person} 
                        customModalZIndex={2200}
                    />
                </ToolsModal>
            )}

            {isPatientSummaryOpen && (
                <PatientSummaryModal
                    person={person}
                    clinic={clinic}
                    nutritionistProfile={nutritionistProfile}
                    metrics={latestMetrics}
                    prescriptions={medications}
                    onClose={() => setIsPatientSummaryOpen(false)}
                />
            )}

            {isPrescriptionBuilderOpen && (
                <PrescriptionBuilderModal
                    personId={person.id}
                    onClose={() => setIsPrescriptionBuilderOpen(false)}
                    onSave={() => onDataRefresh(true)}
                />
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
                    <span className="animate-pulse" style={{fontSize: '1rem', fontFamily: 'monospace', color: 'var(--text-light)', fontWeight: 600}}>{formatTime(elapsedTime)}</span>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setIsPrescriptionBuilderOpen(true)} className="button-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#E0F2FE', color: '#0284C7', borderColor: '#BAE6FD'}}>
                        {ICONS.file} Crear Receta
                    </button>
                    <button onClick={() => setIsPatientSummaryOpen(true)} className="button-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC'}}>
                        {ICONS.download} Resumen Paciente
                    </button>
                    <button onClick={() => setIsToolsOpen(true)} className="button-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        {ICONS.calculator} Herramientas
                    </button>
                    <button onClick={onExit} style={{backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600}}>
                        Finalizar Consulta
                    </button>
                </div>
            </div>

            {/* Main Layout - 3 Columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', overflow: 'hidden', gap: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)' }}>
                
                {/* 1. Left: Summary & Quick Actions */}
                {!isMobile && (
                    <div style={{ overflow: 'hidden', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <SummaryPanel 
                            person={person}
                            latestMetrics={latestMetrics}
                            allergies={allergies}
                            medications={medications}
                            medicalHistory={medicalHistory}
                            sendContextToAi={handleContextSelection}
                            formatSummaryForAI={formatSummaryForAI}
                            onSaveData={handleSaveData}
                        />
                    </div>
                )}

                {/* 2. Center: Unified Tools */}
                <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--background-color)', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                    
                    {/* Tool 1: Timeline */}
                    <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '400px', flexShrink: 0 }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-hover-color)' }}>
                            {ICONS.calendar} Historial del Paciente
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <TimelinePanel 
                                person={person}
                                timeline={timeline} 
                                timelineFilters={timelineFilters} 
                                setTimelineFilters={setTimelineFilters}
                                handleTimelineItemClick={handleTimelineItemClick}
                                sendContextToAi={handleContextSelection}
                                formatItemForAI={formatItemForAI}
                            />
                        </div>
                    </div>

                    {/* Tool 2: Diet Planner */}
                    <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-hover-color)' }}>
                            {ICONS.diet} Plan Alimenticio
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <DietPlanner 
                                equivalentsData={equivalentsData}
                                persons={[person]}
                                isMobile={isMobile}
                                onPlanSaved={() => {
                                    onDataRefresh(true);
                                }}
                                initialPlan={null}
                                clearInitialPlan={() => {}}
                                knowledgeResources={knowledgeResources}
                                customModalZIndex={2200}
                            />
                        </div>
                    </div>

                    {/* Tool 3: Exercise Planner */}
                    <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-hover-color)' }}>
                            {ICONS.activity} Plan Entrenamiento
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <ExercisePlanGenerator 
                                person={person}
                                lastConsultation={consultations[0] || null}
                                onClose={() => {}}
                                onPlanSaved={() => {
                                    onDataRefresh(true);
                                }}
                                isInline={true}
                            />
                        </div>
                    </div>

                </div>

                {/* 3. Right: AI Assistant */}
                {!isMobile && (
                    <div id="ai-panel-container" style={{ overflow: 'hidden', backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
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
                            onOpenSoapGenerator={() => setIsSoapGeneratorOpen(true)}
                         />
                    </div>
                )}
            </div>
            
            {isMobile && (
                <div style={{padding: '1rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)'}}>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Vista móvil simplificada. Usa una tablet o escritorio para la experiencia completa.</p>
                </div>
            )}
        </div>
    );
};

export default ConsultationModePage;
