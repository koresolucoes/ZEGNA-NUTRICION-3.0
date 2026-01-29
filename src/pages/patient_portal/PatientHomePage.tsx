
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
        const { data } = await supabase.from('patient_journal').select('*').eq('person_id', person.id).order('entry_date', { ascending: false }).limit(10);
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
        if (sortedUniqueDates[0].getTime() === today.getTime() || sortedUniqueDates[0].getTime() === yesterday.getTime()) {
            currentStreak = 1;
            let lastDate = sortedUniqueDates[0];
            for (let i = 1; i < sortedUniqueDates.length; i++) {
                const currentDate = sortedUniqueDates[i];
                const expectedPreviousDate = new Date(lastDate);
                expectedPreviousDate.setDate(lastDate.getDate() - 1);
                if (currentDate.getTime() === expectedPreviousDate.getTime()) {
                    currentStreak++;
                    lastDate = currentDate;
                } else break;
            }
        }
        return currentStreak;
    }, [checkins, todayStr]);

    // --- Sub-Components ---
    
    const HeaderProfile: FC = () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    {new Date().getHours() < 12 ? 'Buenos días,' : 'Buenas tardes,'}
                </p>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-color)' }}>
                    {person.full_name.split(' ')[0]}
                </h1>
            </div>
            <div style={{ position: 'relative' }}>
                <img 
                    src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name}&radius=50`} 
                    alt="Profile" 
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
                />
                <span style={{
                    position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', 
                    backgroundColor: '#10B981', borderRadius: '50%', border: '2px solid var(--surface-color)'
                }}></span>
            </div>
        </div>
    );

    const QuickStatsRail: FC = () => (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', margin: '0 -1rem', paddingLeft: '1rem' }} className="hide-scrollbar">
            <div style={{ 
                minWidth: '130px', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
                <div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)' }}>{streak}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>Días de racha</p>
                </div>
            </div>

            <div style={{ 
                minWidth: '130px', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>⚖️</span>
                <div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)' }}>
                        {consultations.length > 0 ? consultations[consultations.length - 1].weight_kg : '-'} kg
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600 }}>Peso Actual</p>
                </div>
            </div>
            
             <div style={{ 
                minWidth: '130px', padding: '1rem', backgroundColor: 'var(--primary-color)', borderRadius: '16px', 
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)', color: 'white',
                display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
                <div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                        {upcomingAppointment ? new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'}) : 'Sin Cita'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Próxima Visita</p>
                </div>
            </div>
        </div>
    );

    const TodayFocusCard: FC = () => {
        // Calculate progress percentage based on completed meals/exercises
        // This is a visual estimation
        const hasBreakfast = !!todaysDietLog?.desayuno;
        const hasLunch = !!todaysDietLog?.comida;
        const hasDinner = !!todaysDietLog?.cena;
        const hasWorkout = !!todaysExerciseLog;
        const isWorkoutDone = !!todaysExerciseLog?.completed;
        const isDietDone = !!todaysDietLog?.completed;
        
        let totalTasks = 0;
        if(hasBreakfast) totalTasks++;
        if(hasLunch) totalTasks++;
        if(hasDinner) totalTasks++;
        if(hasWorkout) totalTasks++;
        
        // This is simplified. In a real app we'd track each meal completion individually.
        // For now, if diet is marked complete, all meals are done.
        let completedTasks = 0;
        if (isDietDone) completedTasks += (hasBreakfast ? 1 : 0) + (hasLunch ? 1 : 0) + (hasDinner ? 1 : 0);
        if (isWorkoutDone) completedTasks++;
        
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return (
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tu Enfoque de Hoy</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600 }}>{Math.round(progress)}% Completado</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div style={{ height: '8px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '4px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--primary-color)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                </div>

                {/* Task Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {todaysDietLog ? (
                        <div style={{ 
                            backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '20px', 
                            boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)',
                            position: 'relative', overflow: 'hidden'
                        }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                 <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                     <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '8px', borderRadius: '12px' }}>
                                         {ICONS.book}
                                     </div>
                                     <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Plan de Comidas</h4>
                                 </div>
                                 <button 
                                     onClick={() => !todaysDietLog.completed && handleMarkComplete(todaysDietLog)}
                                     disabled={!!updatingCompletion || todaysDietLog.completed}
                                     style={{
                                         background: todaysDietLog.completed ? '#10B981' : 'var(--surface-hover-color)',
                                         color: todaysDietLog.completed ? 'white' : 'var(--text-light)',
                                         border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                                         display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                         transition: 'all 0.2s'
                                     }}
                                 >
                                     {todaysDietLog.completed ? ICONS.check : <div style={{width: '16px', height: '16px', border: '2px solid currentColor', borderRadius: '4px'}}></div>}
                                 </button>
                             </div>
                             
                             <div style={{ paddingLeft: '3.5rem' }}>
                                 <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color)', lineHeight: 1.5 }}>
                                     {todaysDietLog.comida ? `Comida: ${todaysDietLog.comida.substring(0, 50)}...` : 'Consulta tu plan completo.'}
                                 </p>
                                 <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                     <button style={{ fontSize: '0.8rem', padding: '6px 12px', backgroundColor: 'var(--surface-hover-color)', border: 'none', borderRadius: '8px', color: 'var(--text-color)', fontWeight: 600 }}>
                                         Ver Menú Completo
                                     </button>
                                 </div>
                             </div>
                        </div>
                    ) : (
                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '20px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--border-color)' }}>
                            <p>No hay plan de comidas asignado para hoy.</p>
                        </div>
                    )}

                    {todaysExerciseLog && (
                         <div style={{ 
                            backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '20px', 
                            boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)'
                        }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                 <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                     <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '8px', borderRadius: '12px' }}>
                                         {ICONS.activity}
                                     </div>
                                     <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Entrenamiento</h4>
                                 </div>
                                 <button 
                                     onClick={() => !todaysExerciseLog.completed && handleMarkComplete(todaysExerciseLog)}
                                     disabled={!!updatingCompletion || todaysExerciseLog.completed}
                                     style={{
                                         background: todaysExerciseLog.completed ? '#F59E0B' : 'var(--surface-hover-color)',
                                         color: todaysExerciseLog.completed ? 'white' : 'var(--text-light)',
                                         border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                                         display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                         transition: 'all 0.2s'
                                     }}
                                 >
                                     {todaysExerciseLog.completed ? ICONS.check : <div style={{width: '16px', height: '16px', border: '2px solid currentColor', borderRadius: '4px'}}></div>}
                                 </button>
                             </div>
                             <div style={{ paddingLeft: '3.5rem' }}>
                                 <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color)' }}>
                                     {todaysExerciseLog.enfoque || 'Rutina General'}
                                 </p>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const QuickActionsGrid: FC = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
             <div 
                onClick={() => setEditingCheckin(todaysCheckin || { checkin_date: todayStr } as any)}
                className="card-hover"
                style={{
                    backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '16px', 
                    border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem'
                }}
            >
                <div style={{fontSize: '2rem'}}>📝</div>
                <span style={{fontSize: '0.9rem', fontWeight: 600}}>Diario</span>
            </div>
             <div 
                // Placeholder for future hydration tracker
                style={{
                    backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '16px', 
                    border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem',
                    opacity: 0.7
                }}
            >
                <div style={{fontSize: '2rem'}}>💧</div>
                <span style={{fontSize: '0.9rem', fontWeight: 600}}>Agua</span>
            </div>
        </div>
    );

    return (
        <div className="fade-in" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin.id ? editingCheckin : null} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}

            <HeaderProfile />
            
            <QuickStatsRail />
            
            <TodayFocusCard />
            
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Registro Rápido</h3>
            <QuickActionsGrid />

            {/* AI Meal Analyzer Card & Smart Journal */}
            {isAiEnabled && (
                <>
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ 
                            backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '20px', 
                            boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' 
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
                                <span style={{fontSize: '1.5rem'}}>📸</span>
                                <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700}}>Analizar Platillo</h3>
                            </div>
                            <MealImageAnalyzer 
                                todaysDietLog={todaysDietLog || null} 
                                clinicId={person.clinic_id} 
                                personId={person.id}
                                onEntrySaved={fetchJournal} // Refresh feed
                            />
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Diario de Comidas</h3>
                        <SmartJournalFeed entries={journalEntries} loading={loadingJournal} />
                    </div>
                </>
            )}
        </div>
    );
};

export default PatientHomePage;
