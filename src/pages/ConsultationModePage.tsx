
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
import ReportModal from '../components/ReportModal'; // Import ReportModal

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
    // Added files prop for RAG
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

// Helper to parse dates robustly across Safari/iOS/Windows
const safeParseDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    
    try {
        // 1. Handle YYYY-MM-DD explicitly to prevent timezone shifts (local midnight)
        if (dateStr.length === 10 && dateStr.includes('-') && !dateStr.includes(':')) {
            const parts = dateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }

        // 2. Fix SQL-like timestamps for Safari (replace space with T)
        // Safari fails on "2023-01-01 12:00:00", needs "2023-01-01T12:00:00"
        const safeStr = dateStr.replace(' ', 'T');
        const d = new Date(safeStr);

        // 3. Check for Invalid Date
        if (isNaN(d.getTime())) {
            console.warn('Fecha inválida detectada:', dateStr);
            return new Date(); // Fallback to now to prevent crash
        }
        return d;
    } catch (e) {
        console.error('Error parseando fecha:', e);
        return new Date();
    }
};

// Define Modal Component outside to prevent re-rendering flicker
// Z-Index updated to 2100 to appear above the Consultation Mode (2000)
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
    onDataRefresh, onExit, isMobile, setViewingConsultation, setViewingLog, setViewingDietLog, setViewingExerciseLog, clinic, subscription
}) => {
    
    const personName = person.full_name;
    const personBirthDate = person.birth_date;
    
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
            latestHba1c: latestLab?.hba1c
        };
    }, [consultations]);
    
    // Quick Forms State
    const [quickConsult, setQuickConsult] = useState({ weight_kg: '', height_cm: '' });
    const [quickLog, setQuickLog] = useState('');
    const [formLoading, setFormLoading] = useState<'consult' | 'log' | null>(null);
    const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [appointmentUpdateLoading, setAppointmentUpdateLoading] = useState(false);

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
    
    const handleQuickConsultSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormLoading('consult');
        setQuickSuccess(null);
        try {
            const w = quickConsult.weight_kg ? parseFloat(quickConsult.weight_kg) : null;
            const h = quickConsult.height_cm ? parseFloat(quickConsult.height_cm) : null;
            let imc = null;
            if (w && h) imc = parseFloat((w / ((h / 100) ** 2)).toFixed(2));

            await supabase.from('consultations').insert({
                person_id: person.id,
                consultation_date: new Date().toISOString().split('T')[0],
                weight_kg: w,
                height_cm: h,
                imc: imc,
                notes: 'Registro rápido desde Modo Consulta',
                nutritionist_id: (await supabase.auth.getUser()).data.user?.id
            });
            
            setQuickConsult({ weight_kg: '', height_cm: '' });
            onDataRefresh(true);
            setQuickSuccess('Medición registrada');
            setTimeout(() => setQuickSuccess(null), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setFormLoading(null);
        }
    };

    const handleQuickLogSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormLoading('log');
        try {
            await supabase.from('logs').insert({
                person_id: person.id,
                log_type: 'Nota Rápida',
                description: quickLog,
                created_by_user_id: (await supabase.auth.getUser()).data.user?.id
            });
            setQuickLog('');
            onDataRefresh(true);
        } catch (error) {
            console.error(error);
        } finally {
            setFormLoading(null);
        }
    };
    
    const updateAppointmentStatus = async (id: string, status: 'completed' | 'no-show' | 'cancelled') => {
        setAppointmentUpdateLoading(true);
        try {
             await supabase.from('appointments').update({ status }).eq('id', id);
             if (status === 'completed') {
                await supabase.rpc('award_points_for_consultation_attendance', {
                    p_person_id: person.id,
                    p_appointment_id: id
                });
             }
             onDataRefresh(true);
        } catch (e) {
            console.error(e);
        } finally {
            setAppointmentUpdateLoading(false);
        }
    };
    
    // --- TIMELINE LOGIC ---
    // Filters for Timeline
    const [timelineFilters, setTimelineFilters] = useState({ search: '', start: '', end: '' });

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
            // Construct context-aware prompt
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

            // RAG Support: Pass file URL if context has one
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
                    <button onClick={onExit} style={{backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600}}>
                        Finalizar Consulta
                    </button>
                </div>
            </div>

            {/* Main Layout - 3 Columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr 350px', overflow: 'hidden' }}>
                
                {/* 1. Left: Summary & Quick Actions */}
                {!isMobile && (
                    <div style={{ padding: '1rem', borderRight: '1px solid var(--border-color)', overflowY: 'auto', backgroundColor: 'var(--background-color)' }}>
                        <SummaryPanel 
                            person={person}
                            latestMetrics={latestMetrics}
                            relevantAppointment={sessionAppointment}
                            updateAppointmentStatus={updateAppointmentStatus}
                            appointmentUpdateLoading={appointmentUpdateLoading}
                            quickConsult={quickConsult}
                            setQuickConsult={setQuickConsult}
                            handleQuickConsultSubmit={handleQuickConsultSubmit}
                            formLoading={formLoading}
                            quickLog={quickLog}
                            setQuickLog={setQuickLog}
                            handleQuickLogSubmit={handleQuickLogSubmit}
                            sendContextToAi={handleContextSelection}
                            formatSummaryForAI={formatSummaryForAI}
                            calculateAge={calculateAge}
                            quickSuccess={quickSuccess}
                        />
                    </div>
                )}

                {/* 2. Center: Unified Timeline */}
                <div style={{ padding: '1rem', overflowY: 'auto', backgroundColor: 'var(--surface-active)', display: 'flex', flexDirection: 'column' }}>
                     <TimelinePanel 
                        timeline={timeline} 
                        timelineFilters={timelineFilters} 
                        setTimelineFilters={setTimelineFilters}
                        handleTimelineItemClick={handleTimelineItemClick}
                        sendContextToAi={handleContextSelection}
                        formatItemForAI={formatItemForAI}
                    />
                </div>

                {/* 3. Right: AI Assistant */}
                {!isMobile && (
                    <div style={{ borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column' }}>
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
        </div>
    );
};

export default ConsultationModePage;
