

import React, { FC, useState, useEffect, useMemo, useRef, FormEvent, ReactNode } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Person, ConsultationWithLabs, Log, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, InternalNoteWithAuthor, DietPlanHistoryItem, AppointmentWithPerson, Clinic, ClinicSubscription, Plan } from '../types';
import CalculatorsPage from './CalculatorsPage';
import SummaryPanel from '../components/consultation_mode/SummaryPanel';
import TimelinePanel from '../components/consultation_mode/TimelinePanel';
import AiAssistantPanel from '../components/consultation_mode/AiAssistantPanel';

interface AiMessage {
    role: 'user' | 'model';
    content: string;
    context?: { displayText: string; fullText: string; } | null;
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
    onDataRefresh: () => void;
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

const ConsultationModePage: FC<ConsultationModePageProps> = ({ 
    person, personType, consultations, logs, dietLogs, exerciseLogs, planHistory, appointments, allergies = [], medicalHistory = [], medications = [], lifestyleHabits, internalNotes, 
    onDataRefresh, onExit, isMobile, setViewingConsultation, setViewingLog, setViewingDietLog, setViewingExerciseLog, clinic, subscription
}) => {
    
    const personName = person.full_name;
    const personBirthDate = person.birth_date;
    
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
            if (sessionAppointment && (sessionAppointment.status === 'checked-in' || sessionAppointment.status === 'called')) {
                const { error } = await supabase
                    .from('appointments')
                    .update({ status: 'in-consultation' })
                    .eq('id', sessionAppointment.id);

                if (error) {
                    console.error("Failed to update appointment status to 'in-consultation'", error);
                } else {
                    onDataRefresh();
                }
            }
        };
        startConsultation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionAppointment?.id, onDataRefresh]);

    const latestMetrics = useMemo(() => {
        if (!consultations || consultations.length === 0) return { hasAnyData: false };

        const findFirstValue = (key: 'weight_kg' | 'height_cm') => {
            return consultations.find(c => c[key] != null)?.[key] ?? null;
        };

        const findFirstLabValue = (key: 'glucose_mg_dl' | 'cholesterol_mg_dl' | 'triglycerides_mg_dl' | 'hba1c') => {
            for (const c of consultations) {
                const lab_results = c.lab_results;
                if (lab_results && lab_results.length > 0 && lab_results[0][key] != null) {
                    return lab_results[0][key];
                }
            }
            return null;
        };

        const latestWeight = findFirstValue('weight_kg');
        const latestHeight = findFirstValue('height_cm');
        const latestGlucose = findFirstLabValue('glucose_mg_dl');
        const latestCholesterol = findFirstLabValue('cholesterol_mg_dl');
        const latestTriglycerides = findFirstLabValue('triglycerides_mg_dl');
        const latestHba1c = findFirstLabValue('hba1c');
        const hasAnyData = !!(latestWeight || latestHeight || latestGlucose || latestCholesterol || latestTriglycerides || latestHba1c);

        return { latestWeight, latestHeight, latestGlucose, latestCholesterol, latestTriglycerides, latestHba1c, hasAnyData };
    }, [consultations]);

    const [activeMobileTab, setActiveMobileTab] = useState('summary');

    // Quick Add Form States
    const [quickConsult, setQuickConsult] = useState({ weight_kg: '', height_cm: '' });
    const [quickLog, setQuickLog] = useState('');
    const [formLoading, setFormLoading] = useState<'consult' | 'log' | null>(null);
    const [appointmentUpdateLoading, setAppointmentUpdateLoading] = useState(false);

    // AI Assistant States
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [aiContext, setAiContext] = useState<{ displayText: string; fullText: string; } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);

    // New states for tools modal and timeline filters
    const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
    const [timelineFilters, setTimelineFilters] = useState({ search: '', start: '', end: '' });


    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const calculateAge = (birthDate: string | null | undefined) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
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
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            const weight = quickConsult.weight_kg ? parseFloat(quickConsult.weight_kg) : null;
            const height = quickConsult.height_cm ? parseFloat(quickConsult.height_cm) : null;
            let imc: number | null = null;
            if (weight && height) imc = parseFloat((weight / ((height / 100) ** 2)).toFixed(2));

            await supabase.from('consultations').insert({
                person_id: person.id,
                consultation_date: new Date().toISOString().split('T')[0],
                weight_kg: weight, height_cm: height, imc,
                nutritionist_id: session.user.id,
            });
            setQuickConsult({ weight_kg: '', height_cm: '' });
            onDataRefresh();
        } catch (error) { console.error("Error saving quick consult:", error); }
        finally { setFormLoading(null); }
    };

    const handleQuickLogSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!quickLog.trim()) return;
        setFormLoading('log');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");
            
            const payload = {
                person_id: person.id,
                log_type: 'Nota de Consulta',
                description: quickLog,
                created_by_user_id: session.user.id,
                log_time: new Date().toISOString(),
            };

            await supabase.from('logs').insert(payload);
            setQuickLog('');
            onDataRefresh();
        } catch (error) { console.error("Error saving quick log:", error); }
        finally { setFormLoading(null); }
    };

    const timeline = useMemo(() => {
        const combined = [
            ...consultations.map(c => ({ ...c, type: 'consultation', date: new Date(c.consultation_date) })),
            ...logs.map(l => ({ ...l, type: 'log', date: new Date(l.log_time! || l.created_at) })),
            ...dietLogs.map(d => ({ ...d, type: 'diet', date: new Date(d.log_date) })),
            ...exerciseLogs.map(e => ({ ...e, type: 'exercise', date: new Date(e.log_date) })),
            ...planHistory.map(p => ({ ...p, type: 'diet_plan_history', date: new Date(p.created_at) })),
        ];
        const sorted = combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        if (!timelineFilters.search && !timelineFilters.start && !timelineFilters.end) {
            return sorted;
        }

        const searchLower = timelineFilters.search.toLowerCase();
        const startDate = timelineFilters.start ? new Date(timelineFilters.start + 'T00:00:00') : null;
        const endDate = timelineFilters.end ? new Date(timelineFilters.end + 'T23:59:59') : null;

        return sorted.filter(item => {
            const itemDate = new Date(item.date);
            itemDate.setUTCHours(12,0,0,0); // Normalize date for comparison

            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;

            if (searchLower) {
                let contentToSearch = '';
                switch (item.type) {
                    case 'consultation': contentToSearch = `consulta ${item.notes || ''} ${item.weight_kg || ''}`; break;
                    case 'log': contentToSearch = `${item.log_type || ''} ${item.description || ''}`; break;
                    case 'diet': contentToSearch = `plan alimenticio ${item.desayuno || ''} ${item.comida || ''} ${item.cena || ''}`; break;
                    case 'exercise':
                        const exercises = (item.ejercicios as any[] || []).map(e => e.nombre).join(' ');
                        contentToSearch = `rutina ${item.enfoque || ''} ${exercises}`; break;
                    case 'diet_plan_history': contentToSearch = `plan calculado ${(item as DietPlanHistoryItem).person_name || ''}`; break;
                }
                if (!contentToSearch.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            return true;
        });
    }, [consultations, logs, dietLogs, exerciseLogs, planHistory, timelineFilters]);

    const handleTimelineItemClick = (item: any) => {
        switch (item.type) {
            case 'consultation':
                setViewingConsultation(item);
                break;
            case 'log':
                setViewingLog(item);
                break;
            case 'diet':
                setViewingDietLog(item as DietLog);
                break;
            case 'exercise':
                setViewingExerciseLog(item as ExerciseLog);
                break;
            default:
                console.warn("Unknown timeline item type:", item.type);
        }
    };
    
    const relevantAppointment = useMemo(() => {
        if (!appointments || appointments.length === 0) return null;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const todaysScheduledAppointment = appointments
            .filter(a => {
                const startTime = new Date(a.start_time);
                return a.status === 'scheduled' && startTime >= todayStart && startTime < todayEnd;
            })
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

        return todaysScheduledAppointment || null;
    }, [appointments]);

    const updateAppointmentStatus = async (appointmentId: string, status: 'completed' | 'no-show' | 'cancelled') => {
        setAppointmentUpdateLoading(true);
        const { error } = await supabase
            .from('appointments')
            .update({ status: status })
            .eq('id', appointmentId);
        
        if (error) {
            console.error("Error updating appointment status:", error);
        } else {
            onDataRefresh();
        }
        setAppointmentUpdateLoading(false);
    };

    // --- AI CONTEXT HELPERS ---
    const formatDate = (date: Date) => date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

    const sendContextToAi = (context: { displayText: string; fullText: string; }) => {
        setAiContext(context);
        setUserInput('');
        aiInputRef.current?.focus();
    };

    const formatSummaryForAI = () => {
        let summary = `Resumen del Paciente: ${personName}, ${calculateAge(personBirthDate)} años. Objetivo: ${person.health_goal || 'N/A'}.`;
        if (allergies.length > 0) summary += ` Alergias: ${allergies.map(a => a.substance).join(', ')}.`;
        if (medicalHistory.length > 0) summary += ` Condiciones: ${medicalHistory.map(h => h.condition).join(', ')}.`;
        if (latestMetrics.hasAnyData) {
            summary += ` Últimos datos registrados:`;
            if (latestMetrics.latestWeight) summary += ` Peso ${latestMetrics.latestWeight}kg.`;
            if (latestMetrics.latestHeight) summary += ` Altura ${latestMetrics.latestHeight}cm.`;
            if (latestMetrics.latestGlucose) summary += ` Glucosa ${latestMetrics.latestGlucose}mg/dl.`;
        }
        return {
            displayText: 'Resumen del Paciente',
            fullText: summary
        };
    };

    const formatItemForAI = (item: any) => {
        let displayText = '';
        let fullText = '';
        switch (item.type) {
            case 'consultation':
                displayText = `Consulta ${formatDate(item.date)}`;
                fullText = `Consulta (${formatDate(item.date)}): Peso ${item.weight_kg ?? '-'}kg, IMC ${item.imc ?? '-'}. Notas: ${item.notes || 'N/A'}`;
                break;
            case 'log':
                 displayText = `Bitácora ${formatDate(item.date)}`;
                fullText = `Bitácora (${formatDate(item.date)}): Tipo: ${item.log_type}. Desc: "${item.description}"`;
                break;
            case 'diet':
                 displayText = `Dieta ${formatDate(item.date)}`;
                fullText = `Plan Alimenticio (${formatDate(item.date)}): ${['desayuno', 'comida', 'cena'].map(m => item[m] ? `${m.charAt(0).toUpperCase()}${m.slice(1)}: ${item[m]}` : '').filter(Boolean).join('. ')}`;
                break;
            case 'exercise':
                displayText = `Rutina ${formatDate(item.date)}`;
                const exercises = item.ejercicios as any[];
                fullText = `Rutina (${formatDate(item.date)}): Enfoque: ${item.enfoque}. Ejercicios: ${exercises.length > 0 ? exercises.map(ex => ex.nombre).join(', ') : 'Descanso'}`;
                break;
        }
        return { displayText, fullText };
    };

    const handleAiSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || aiLoading) return;
        
        const userMessage: AiMessage = {
            role: 'user',
            content: userInput,
            context: aiContext,
        };

        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setAiContext(null);
        setAiLoading(true);

        try {
            const lastConsultationAI = consultations[0];
            const contextForPrompt = userMessage.context ? userMessage.context.fullText : 'No se proporcionó contexto específico para esta pregunta.';
            
            let systemInstruction = `Eres un asistente experto en nutrición. Analiza el siguiente contexto clínico de un paciente y responde la pregunta del nutriólogo. Sé conciso y profesional.
            ---
            CONTEXTO GENERAL DEL PACiente:
            - Nombre: ${personName}
            - Edad: ${calculateAge(personBirthDate)} años
            - Objetivo Principal: ${person.health_goal || 'No especificado'}
            - Alergias: ${allergies.length > 0 ? allergies.map(a => a.substance).join(', ') : 'Ninguna registrada'}
            - Condiciones Médicas: ${medicalHistory.length > 0 ? medicalHistory.map(h => h.condition).join(', ') : 'Ninguna registrada'}
            - Medicamentos: ${medications.length > 0 ? medications.map(m => m.name).join(', ') : 'Ninguno registrado'}
            ${lastConsultationAI ? `- Última Consulta (${new Date(lastConsultationAI.consultation_date).toLocaleDateString()}): Peso ${lastConsultationAI.weight_kg}kg, IMC ${lastConsultationAI.imc}` : ''}
            ---
            CONTEXTO ESPECÍFICO PARA ESTA PREGUNTA:
            ${contextForPrompt}
            ---`;
            
            const apiResponse = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic?.id,
                    contents: `PREGUNTA DEL NUTRIÓLOGO: ${userMessage.content}`,
                    config: { systemInstruction: systemInstruction }
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `Error from server: ${apiResponse.statusText}`);
            }
            const data = await apiResponse.json();
            setMessages(prev => [...prev, { role: 'model', content: data.text }]);

        } catch (err) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, { role: 'model', content: "Lo siento, no pude procesar tu solicitud. Inténtalo de nuevo." }]);
        } finally {
            setAiLoading(false);
        }
    };
    
    const ToolsModal: FC<{ onClose: () => void; children: ReactNode }> = ({ onClose, children }) => (
        <div style={{ ...styles.modalOverlay, zIndex: 1100, padding: isMobile ? '0.5rem' : '2rem', backdropFilter: 'blur(5px)' }}>
            <div style={{ ...styles.modalContent, width: '95%', maxWidth: '1400px', height: isMobile ? '95vh' : '90vh' }}>
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

    // FIX: Remove unused and erroneous handleFinishConsultation function. The onExit prop from the parent component handles this logic correctly.

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--background-color)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            {isToolsModalOpen && (
                <ToolsModal onClose={() => setIsToolsModalOpen(false)}>
                    <CalculatorsPage isMobile={isMobile} initialPersonToLoad={person} />
                </ToolsModal>
            )}
            <header style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', color: 'var(--primary-color)' }}>Modo Consulta: {personName}</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setIsToolsModalOpen(true)} className="button-secondary">{ICONS.calculator} Herramientas</button>
                    <button onClick={onExit} className="button-danger">Finalizar</button>
                </div>
            </header>

            <main style={isMobile 
                ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } 
                : { flex: 1, display: 'flex', gap: '1rem', padding: '1rem', overflow: 'hidden' }}
            >
                {isMobile ? (
                    <>
                        <nav className="tabs" style={{ padding: '0 0.5rem', flexShrink: 0 }}>
                            <button className={`tab-button ${activeMobileTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveMobileTab('summary')}>Resumen</button>
                            <button className={`tab-button ${activeMobileTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveMobileTab('timeline')}>Timeline</button>
                            <button className={`tab-button ${activeMobileTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveMobileTab('ai')}>Asistente</button>
                        </nav>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {activeMobileTab === 'summary' && <SummaryPanel person={person} latestMetrics={latestMetrics} relevantAppointment={relevantAppointment} updateAppointmentStatus={updateAppointmentStatus} appointmentUpdateLoading={appointmentUpdateLoading} quickConsult={quickConsult} setQuickConsult={setQuickConsult} handleQuickConsultSubmit={handleQuickConsultSubmit} formLoading={formLoading} quickLog={quickLog} setQuickLog={setQuickLog} handleQuickLogSubmit={handleQuickLogSubmit} sendContextToAi={sendContextToAi} formatSummaryForAI={formatSummaryForAI} calculateAge={calculateAge} />}
                            {activeMobileTab === 'timeline' && <TimelinePanel timeline={timeline} timelineFilters={timelineFilters} setTimelineFilters={setTimelineFilters} handleTimelineItemClick={handleTimelineItemClick} sendContextToAi={sendContextToAi} formatItemForAI={formatItemForAI} />}
                            {activeMobileTab === 'ai' && (
                                hasAiFeature ? (
                                    <AiAssistantPanel messages={messages} aiLoading={aiLoading} chatEndRef={chatEndRef} handleAiSubmit={handleAiSubmit} aiContext={aiContext} setAiContext={setAiContext} userInput={userInput} setUserInput={setUserInput} aiInputRef={aiInputRef} />
                                ) : (
                                    <div style={{ ...styles.detailCard, margin: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                                        <div style={styles.detailCardBody}>
                                            <span style={{ fontSize: '2rem' }}>{ICONS.sparkles}</span>
                                            <h3 style={{ ...styles.detailCardTitle, marginTop: '1rem' }}>Asistente IA no disponible</h3>
                                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Actualiza tu plan para usar esta función.</p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <aside style={{ width: '25%', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                            <SummaryPanel person={person} latestMetrics={latestMetrics} relevantAppointment={relevantAppointment} updateAppointmentStatus={updateAppointmentStatus} appointmentUpdateLoading={appointmentUpdateLoading} quickConsult={quickConsult} setQuickConsult={setQuickConsult} handleQuickConsultSubmit={handleQuickConsultSubmit} formLoading={formLoading} quickLog={quickLog} setQuickLog={setQuickLog} handleQuickLogSubmit={handleQuickLogSubmit} sendContextToAi={sendContextToAi} formatSummaryForAI={formatSummaryForAI} calculateAge={calculateAge} />
                        </aside>
                        <section style={{ flex: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                           <TimelinePanel timeline={timeline} timelineFilters={timelineFilters} setTimelineFilters={setTimelineFilters} handleTimelineItemClick={handleTimelineItemClick} sendContextToAi={sendContextToAi} formatItemForAI={formatItemForAI} />
                        </section>
                        <aside style={{ width: '30%', display: 'flex' }}>
                            {hasAiFeature ? (
                                <AiAssistantPanel messages={messages} aiLoading={aiLoading} chatEndRef={chatEndRef} handleAiSubmit={handleAiSubmit} aiContext={aiContext} setAiContext={setAiContext} userInput={userInput} setUserInput={setUserInput} aiInputRef={aiInputRef} />
                            ) : (
                                <div style={{ ...styles.detailCard, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={styles.detailCardBody}>
                                        <span style={{ fontSize: '2rem' }}>{ICONS.sparkles}</span>
                                        <h3 style={{ ...styles.detailCardTitle, marginTop: '1rem' }}>Asistente con IA</h3>
                                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Esta funcionalidad no está incluida en tu plan actual. Actualiza para usar el asistente IA durante tus consultas.</p>
                                    </div>
                                </div>
                            )}
                        </aside>
                    </>
                )}
            </main>
        </div>
    );
}

export default ConsultationModePage;