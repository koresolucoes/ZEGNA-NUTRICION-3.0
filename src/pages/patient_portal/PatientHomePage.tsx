
import React, { FC, useMemo, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest, PatientJournalEntry } from '../../types';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
import DailyCheckinForm from '../../components/patient_portal/DailyCheckinForm';
import ConsentRequestModal from '../../components/patient_portal/ConsentRequestModal';
import SmartJournalFeed from '../../components/patient_portal/SmartJournalFeed';

const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const PatientHomePage: FC<{ 
    user: User; 
    person: Person;
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    checkins: DailyCheckin[];
    consultations: ConsultationWithLabs[];
    appointments: AppointmentWithPerson[];
    servicePlans: PatientServicePlan[];
    onDataRefresh: () => void;
    isMobile: boolean;
    isAiEnabled: boolean;
}> = ({ user, person, dietLogs, exerciseLogs, checkins, consultations, appointments, servicePlans, onDataRefresh, isMobile, isAiEnabled }) => {
    
    const [editingCheckin, setEditingCheckin] = useState<DailyCheckin | null>(null);
    const [deletingCheckin, setDeletingCheckin] = useState<DailyCheckin | null>(null);
    const [updatingCompletion, setUpdatingCompletion] = useState<string | null>(null);
    const [completionError, setCompletionError] = useState<string | null>(null);
    const [pendingConsents, setPendingConsents] = useState<PopulatedReferralConsentRequest[]>([]);
    const [viewingConsent, setViewingConsent] = useState<PopulatedReferralConsentRequest | null>(null);
    
    // Journal State
    const [journalEntries, setJournalEntries] = useState<PatientJournalEntry[]>([]);
    const [loadingJournal, setLoadingJournal] = useState(true);

    const fetchJournal = useCallback(async () => {
        setLoadingJournal(true);
        const { data } = await supabase.from('patient_journal').select('*').eq('person_id', person.id).order('entry_date', { ascending: false }).limit(5);
        setJournalEntries((data as PatientJournalEntry[]) || []);
        setLoadingJournal(false);
    }, [person.id]);

    useEffect(() => {
        fetchJournal();
    }, [fetchJournal]);

    useEffect(() => {
        const fetchConsents = async () => {
            const { data, error } = await supabase
                .from('referral_consent_requests')
                .select('*, clinics!referral_consent_requests_clinic_id_fkey(name), receiving_ally:allies!referral_consent_requests_receiving_ally_id_fkey(full_name, specialty), receiving_clinic:clinics!referral_consent_requests_receiving_clinic_id_fkey(name)')
                .eq('person_id', person.id)
                .eq('status', 'pending');
            
            if (error) {
                console.error("Error fetching pending consents:", error);
            } else {
                setPendingConsents(data as any[] || []);
            }
        };

        fetchConsents();
    }, [person.id]);

    const handleConfirmDelete = async () => {
        if (!deletingCheckin) return;
        const { error } = await supabase.from('daily_checkins').delete().eq('id', deletingCheckin.id);
        if (error) console.error("Error deleting checkin:", error);
        else onDataRefresh();
        setDeletingCheckin(null);
    };

    const handleMarkComplete = async (log: DietLog | ExerciseLog) => {
        const isDietLog = 'desayuno' in log;
        const logType = isDietLog ? 'diet' : 'exercise';
        
        setUpdatingCompletion(log.id);
        setCompletionError(null);
    
        try {
            const { error } = await supabase.rpc('award_points_for_completed_plan', {
                p_log_id: log.id,
                p_log_type: logType
            });
    
            if (error) {
                if (error.message.includes('This activity has already been marked as complete.')) {
                    throw new Error('Esta actividad ya ha sido marcada como completada.');
                }
                throw error;
            }
            onDataRefresh();
        } catch (err: any) {
            console.error(`Error marking ${logType} log complete:`, err);
            setCompletionError(`Error: ${err.message}`);
        } finally {
            setUpdatingCompletion(null);
        }
    };

    const todayStr = getLocalDateString(new Date());
    const todaysDietLog = dietLogs.find(log => log.log_date === todayStr);
    const todaysExerciseLog = exerciseLogs.find(log => log.log_date === todayStr);
    const todaysCheckin = useMemo(() => checkins.find(c => c.checkin_date === todayStr), [checkins, todayStr]);

    const upcomingAppointment = useMemo(() => {
        const now = new Date();
        return appointments
            .filter(a => new Date(a.start_time) >= now && a.status === 'scheduled')
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
    }, [appointments]);

    const streak = useMemo(() => {
        if (checkins.length === 0) return 0;
        const uniqueDateStrings = [...new Set(checkins.map(c => c.checkin_date))];
        const sortedUniqueDates = uniqueDateStrings.map(dateStr => new Date((dateStr as string).replace(/-/g, '/'))).sort((a, b) => b.getTime() - a.getTime());
        if (sortedUniqueDates.length === 0) return 0;
        let currentStreak = 0;
        const today = new Date(todayStr.replace(/-/g, '/'));
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        // Check if user checked in today or yesterday to keep streak alive
        const lastCheckinDate = sortedUniqueDates[0];
        const isToday = lastCheckinDate.toDateString() === today.toDateString();
        const isYesterday = lastCheckinDate.toDateString() === yesterday.toDateString();

        if (isToday || isYesterday) {
            currentStreak = 1;
            let currentDateCheck = lastCheckinDate;
            
            for (let i = 1; i < sortedUniqueDates.length; i++) {
                const prevDate = sortedUniqueDates[i];
                const expectedDate = new Date(currentDateCheck);
                expectedDate.setDate(currentDateCheck.getDate() - 1);
                
                if (prevDate.toDateString() === expectedDate.toDateString()) {
                    currentStreak++;
                    currentDateCheck = prevDate;
                } else {
                    break;
                }
            }
        }
        return currentStreak;
    }, [checkins, todayStr]);

    const { progressPercent, pointsToNextLevel, currentRankPoints } = useMemo(() => {
        const points = person.gamification_points || 0;
        const ranks = { 'Novato': 0, 'Bronce': 100, 'Plata': 300, 'Oro': 600, 'Platino': 1000 };
        const currentRank = person.gamification_rank || 'Novato';
        const currentRankStart = ranks[currentRank as keyof typeof ranks];
        
        let nextRankPoints;
        if (points < 100) nextRankPoints = 100;
        else if (points < 300) nextRankPoints = 300;
        else if (points < 600) nextRankPoints = 600;
        else if (points < 1000) nextRankPoints = 1000;
        else nextRankPoints = Infinity;

        if (nextRankPoints === Infinity) {
            return { progressPercent: 100, pointsToNextLevel: 0, currentRankPoints: points };
        }

        const pointsInCurrentRank = points - currentRankStart;
        const pointsForNextRank = nextRankPoints - currentRankStart;
        const progress = pointsForNextRank > 0 ? (pointsInCurrentRank / pointsForNextRank) * 100 : 100;

        return {
            progressPercent: Math.min(progress, 100),
            pointsToNextLevel: Math.max(0, nextRankPoints - points),
            currentRankPoints: points
        };
    }, [person.gamification_points, person.gamification_rank]);

    const currentPlan = servicePlans.find(p => p.id === person.current_plan_id);

    // -- Modern Card Component --
    const Card: FC<{ children: React.ReactNode, className?: string, title?: string, icon?: React.ReactNode, action?: React.ReactNode, style?: React.CSSProperties }> = ({ children, className, title, icon, action, style }) => (
        <div className={`fade-in ${className || ''}`} style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', // Softer, modern shadow
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            transition: 'transform 0.2s ease-in-out',
            ...style
        }}>
             {title && (
                 <div style={{padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)'}}>
                    <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        {icon && <span style={{color: 'var(--primary-color)', fontSize: '1.3rem', display: 'flex'}}>{icon}</span>}
                        {title}
                    </h2>
                    {action}
                </div>
             )}
            <div style={{padding: '1.5rem', flex: 1}}>
                {children}
            </div>
        </div>
    );
    
    const PlanItem: FC<{ label: string, content: string, emoji: string }> = ({ label, content, emoji }) => (
         <div style={{marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
            <div style={{minWidth: '24px', textAlign: 'center', fontSize: '1.1rem', marginTop: '2px'}}>{emoji}</div>
            <div>
                <span style={{color: 'var(--text-light)', fontWeight: 600, fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{label}</span>
                <span style={{color: 'var(--text-color)', fontSize: '0.95rem', lineHeight: 1.4}}>{content || 'Sin asignar'}</span>
            </div>
        </div>
    );

    return (
        <div className="fade-in">
             {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            
            {/* Header Section */}
            <div style={{marginBottom: '2rem', paddingLeft: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                 <div>
                    <p style={{color: 'var(--text-light)', margin: 0, fontSize: '0.95rem', fontWeight: 500}}>Hoy es {new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
                    <h1 style={{margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 800, color: 'var(--text-color)'}}>Hola, {person.full_name.split(' ')[0]} 👋</h1>
                 </div>
                 {/* Only show "Next Appt" chip on Desktop header, mobile has its own card */}
                 {!isMobile && upcomingAppointment && (
                     <div style={{backgroundColor: 'var(--surface-color)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow)'}}>
                         <div style={{fontSize: '1.5rem'}}>📅</div>
                         <div>
                             <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase'}}>Próxima Cita</p>
                             <p style={{margin: 0, fontSize: '0.9rem', fontWeight: 600}}>{new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'})} - {new Date(upcomingAppointment.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                         </div>
                     </div>
                 )}
            </div>

            {/* Main Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                gap: '1.5rem', 
                alignItems: 'start' 
            }}>
                
                {/* 1. HERO: Gamification & Status - Full Width */}
                <div style={{ gridColumn: '1 / -1' }}>
                     <Card className="mb-6" style={{padding: 0, border: 'none', overflow: 'hidden'}}>
                        <div style={{
                            padding: isMobile ? '1.5rem' : '2.5rem', 
                            background: 'linear-gradient(120deg, #1e293b 0%, #0f172a 100%)', 
                            position: 'relative', 
                            overflow: 'hidden', 
                            color: 'white', 
                            borderRadius: '20px',
                            boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.5)'
                        }}>
                             {/* Background decorations */}
                             <div style={{position: 'absolute', top: '-20%', right: '-5%', fontSize: '15rem', opacity: 0.05, transform: 'rotate(15deg)', userSelect: 'none'}}>🏆</div>
                             <div style={{position: 'absolute', bottom: '-40%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%'}}></div>

                            <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', gap: '1.5rem', position: 'relative', zIndex: 1}}>
                                <div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                                        <span style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase'}}>Nivel {person.gamification_rank || 'Novato'}</span>
                                        <span style={{fontSize: '0.8rem', opacity: 0.8}}>Sigue así 💪</span>
                                    </div>
                                    <h2 style={{margin: '0', fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: 800, lineHeight: 1, color: '#38BDF8', textShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'}}>{currentRankPoints} <span style={{fontSize: '1rem', color: 'white', fontWeight: 500, opacity: 0.8}}>pts</span></h2>
                                </div>
                                
                                <div style={{display: 'flex', gap: '1rem', width: isMobile ? '100%' : 'auto'}}>
                                     <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(5px)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'}}>
                                         <div style={{fontSize: '1.5rem', marginBottom: '0.25rem'}}>🔥</div>
                                         <div style={{fontSize: '1.2rem', fontWeight: 700}}>{streak}</div>
                                         <div style={{fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase'}}>Días Racha</div>
                                     </div>
                                     <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(5px)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'}}>
                                         <div style={{fontSize: '1.5rem', marginBottom: '0.25rem'}}>🎯</div>
                                         <div style={{fontSize: '1.2rem', fontWeight: 700}}>{pointsToNextLevel}</div>
                                         <div style={{fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase'}}>Para Subir</div>
                                     </div>
                                </div>
                            </div>
                            
                            <div style={{position: 'relative', zIndex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600}}>
                                     <span>Progreso de Nivel</span>
                                     <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div style={{height: '8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden'}}>
                                    <div style={{height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #38BDF8, #2DD4BF)', borderRadius: '4px', transition: 'width 1s ease', boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'}}></div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 2. Left Column: Daily Plan (Diet/Exercise) */}
                <div style={{ gridColumn: isMobile ? '1' : 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card 
                        title="Tu Plan de Hoy" 
                        icon={ICONS.calendar} 
                        action={completionError ? <span style={{fontSize:'0.8rem', color:'var(--error-color)'}}>Error al guardar</span> : null}
                    >
                        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                             {/* Diet Section */}
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                     <h4 style={{margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px'}}>ALIMENTACIÓN</h4>
                                     {todaysDietLog?.completed && <span style={{fontSize: '0.8rem', color: '#10B981', fontWeight: 700}}>✅ Completado</span>}
                                </div>
                                
                                {todaysDietLog ? (
                                    <div style={{backgroundColor: 'var(--background-color)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                        <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem'}}>
                                            <div>
                                                <PlanItem emoji="🌅" label="Desayuno" content={todaysDietLog.desayuno || ''} />
                                                <PlanItem emoji="🥗" label="Comida" content={todaysDietLog.comida || ''} />
                                            </div>
                                            <div>
                                                <PlanItem emoji="🌙" label="Cena" content={todaysDietLog.cena || ''} />
                                                {todaysDietLog.colacion_1 && <PlanItem emoji="🍎" label="Snack AM" content={todaysDietLog.colacion_1} />}
                                                {todaysDietLog.colacion_2 && <PlanItem emoji="🥜" label="Snack PM" content={todaysDietLog.colacion_2} />}
                                            </div>
                                        </div>
                                        
                                        {!todaysDietLog.completed && todaysDietLog.log_date === todayStr && (
                                            <button 
                                                onClick={() => handleMarkComplete(todaysDietLog)} 
                                                disabled={!!updatingCompletion}
                                                className="button-primary"
                                                style={{width: '100%', marginTop: '1.5rem', padding: '0.9rem', borderRadius: '10px', fontSize: '1rem', fontWeight: 700}}
                                            >
                                                {updatingCompletion === todaysDietLog.id ? 'Guardando...' : '✅ Marcar Alimentación Completada'}
                                            </button>
                                        )}
                                        {todaysDietLog.completed && (
                                            <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                                <span>✅</span> ¡Plan de hoy completado!
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{padding: '2rem', textAlign: 'center', backgroundColor: 'var(--background-color)', borderRadius: '12px', color: 'var(--text-light)', border: '1px dashed var(--border-color)'}}>
                                        <p>No tienes plan de alimentación asignado para hoy.</p>
                                    </div>
                                )}
                            </div>

                            {/* Exercise Section */}
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                     <h4 style={{margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px'}}>EJERCICIO</h4>
                                     {todaysExerciseLog?.completed && <span style={{fontSize: '0.8rem', color: '#10B981', fontWeight: 700}}>✅ Completado</span>}
                                </div>
                                {todaysExerciseLog ? (
                                    <div style={{backgroundColor: 'var(--background-color)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                        <p style={{margin: '0 0 1rem 0', fontWeight: 600, fontSize: '1.1rem'}}>{todaysExerciseLog.enfoque || 'Rutina General'}</p>
                                        
                                        {!todaysExerciseLog.completed && todaysExerciseLog.log_date === todayStr && (
                                            <button 
                                                onClick={() => handleMarkComplete(todaysExerciseLog)} 
                                                disabled={!!updatingCompletion}
                                                className="button-secondary"
                                                style={{width: '100%', padding: '0.9rem', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, border: '1px solid var(--primary-color)', color: 'var(--primary-color)'}}
                                            >
                                                {updatingCompletion === todaysExerciseLog.id ? 'Guardando...' : '💪 Marcar Rutina Completada'}
                                            </button>
                                        )}
                                        {todaysExerciseLog.completed && (
                                            <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                                <span>✅</span> ¡Rutina completada!
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--background-color)', borderRadius: '12px', color: 'var(--text-light)', border: '1px solid var(--border-color)'}}>
                                        <p style={{margin: 0}}>Día de descanso o actividad libre.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Meal AI Analyzer - Visible/Hidden based on Plan */}
                    {isAiEnabled && (
                        <Card title="Analizar Platillo con IA" icon={ICONS.sparkles}>
                             <MealImageAnalyzer 
                                todaysDietLog={todaysDietLog || null} 
                                clinicId={person.clinic_id} 
                                personId={person.id}
                                onEntrySaved={fetchJournal} // Refresh feed
                            />
                        </Card>
                    )}
                </div>

                {/* 3. Right Column: Daily Check-in & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card title="Registro Diario" icon={ICONS.edit}>
                        {todaysCheckin ? (
                            <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '1rem 0'}}>
                                <div style={{width: '80px', height: '80px', margin: '0 auto 1.5rem auto', backgroundColor: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #D1FAE5'}}>
                                    <span style={{fontSize: '2.5rem', color: '#059669'}}>✓</span>
                                </div>
                                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-color)'}}>¡Todo Listo!</h3>
                                <p style={{margin: '0 0 2rem 0', color: 'var(--text-light)', fontSize: '0.95rem'}}>Registro completado por hoy.</p>
                                
                                <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem'}}>
                                    <div style={{textAlign: 'center'}}>
                                        <span style={{fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px'}}>ÁNIMO</span>
                                        <span style={{fontSize: '1.2rem', fontWeight: 700, color: '#2DD4BF'}}>{todaysCheckin.mood_rating}/5</span>
                                    </div>
                                    <div style={{width: '1px', backgroundColor: 'var(--border-color)'}}></div>
                                    <div style={{textAlign: 'center'}}>
                                        <span style={{fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px'}}>ENERGÍA</span>
                                        <span style={{fontSize: '1.2rem', fontWeight: 700, color: '#F59E0B'}}>{todaysCheckin.energy_level_rating}/5</span>
                                    </div>
                                </div>
                                <button onClick={() => setEditingCheckin(todaysCheckin)} className="button-secondary" style={{width: '100%', padding: '0.8rem', fontSize: '0.9rem'}}>Editar Registro</button>
                            </div>
                        ) : (
                            <div style={{padding: '0.5rem 0'}}>
                                <DailyCheckinForm personId={person.id} onCheckinSaved={onDataRefresh} />
                            </div>
                        )}
                    </Card>
                    
                    {/* Only show on Mobile here if not in header */}
                    {isMobile && upcomingAppointment && (
                        <Card title="Próxima Cita" icon={ICONS.clock}>
                            <div style={{textAlign: 'center', padding: '1rem 0'}}>
                                <p style={{fontSize: '3rem', margin: '0 0 0.5rem 0'}}>📅</p>
                                <p style={{fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', margin: 0}}>{new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'})}</p>
                                <p style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)', margin: '0.5rem 0'}}>{new Date(upcomingAppointment.start_time).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</p>
                                <p style={{color: 'var(--text-light)', fontSize: '0.9rem', margin: 0}}>{upcomingAppointment.title}</p>
                            </div>
                        </Card>
                    )}

                     <Card title="Tu Membresía" icon={ICONS.briefcase}>
                        <div style={{padding: '0.5rem 0'}}>
                             <div style={{marginBottom: '1.5rem'}}>
                                <p style={{margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'}}>PLAN ACTUAL</p>
                                <p style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)'}}>{currentPlan?.name || 'Básico'}</p>
                             </div>
                             
                             {person.subscription_end_date && (
                                 <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                     <span style={{fontSize: '1.2rem'}}>⏳</span>
                                     <div>
                                         <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Vence el</p>
                                         <p style={{margin: 0, fontWeight: 600, color: 'var(--text-color)'}}>
                                             {new Date(person.subscription_end_date.replace(/-/g, '/')).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', year: 'numeric'})}
                                         </p>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </Card>
                </div>

            </div>
            
            {/* Journal Section - Full Width at bottom */}
            {isAiEnabled && (
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{fontSize: '1.8rem'}}>📸</span> Diario de Comidas
                        </h2>
                        <button className="button-secondary" onClick={fetchJournal} style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}>Actualizar</button>
                    </div>
                    <SmartJournalFeed entries={journalEntries} loading={loadingJournal} />
                </div>
            )}
        </div>
    );
};

export default PatientHomePage;
