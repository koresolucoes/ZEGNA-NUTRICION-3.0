
import React, { FC, useMemo, useState, useEffect } from 'react';
// FIX: In Supabase v2, User is exported via `import type`.
import type { User } from '@supabase/supabase-js';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest } from '../../types';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
import DailyCheckinForm from '../../components/patient_portal/DailyCheckinForm';
import ConsentRequestModal from '../../components/patient_portal/ConsentRequestModal';

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
    const mostRecentDietLog = dietLogs[0] || null;
    const dietLogToShow = todaysDietLog || mostRecentDietLog;

    const todaysExerciseLog = exerciseLogs.find(log => log.log_date === todayStr);
    const mostRecentExerciseLog = exerciseLogs[0] || null;
    const exerciseLogToShow = todaysExerciseLog || mostRecentExerciseLog;
    
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

    // -- Custom Components --
    const Card: FC<{ children: React.ReactNode, className?: string, title?: string, icon?: React.ReactNode, subHeader?: React.ReactNode }> = ({ children, className, title, icon, subHeader }) => (
        <div className={`fade-in ${className || ''}`} style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
             {title && (
                 <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)'}}>
                    <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        {icon && <span style={{color: 'var(--primary-color)', fontSize: '1.3rem'}}>{icon}</span>}
                        {title}
                    </h2>
                    {subHeader}
                </div>
             )}
            <div style={{padding: '1.5rem', flex: 1}}>
                {children}
            </div>
        </div>
    );
    
    const PlanItem: FC<{ label: string, content: string, color?: string }> = ({ label, content, color }) => (
         <div style={{marginBottom: '1rem'}}>
            <span style={{color: color || 'var(--primary-color)', fontWeight: 600, display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>{label}</span>
            <span style={{color: 'var(--text-color)', lineHeight: 1.5, display: 'block'}}>{content || 'N/A'}</span>
        </div>
    );

    return (
        <div className="fade-in">
             {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            
            <div style={{marginBottom: '2rem', paddingLeft: '0.5rem'}}>
                 <p style={{color: 'var(--text-light)', margin: 0, fontSize: '0.95rem'}}>Bienvenido de nuevo,</p>
                 <h1 style={{margin: '0.25rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-color)'}}>{person.full_name.split(' ')[0]}</h1>
                 <h2 style={{margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-light)'}}>Tu Panel de Control</h2>
            </div>

            {/* Dashboard Grid Layout - Mobile First */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                gap: '1.5rem', 
                alignItems: 'start' 
            }}>
                
                {/* 1. Gamification Header - Full Width */}
                <div style={{ gridColumn: '1 / -1' }}>
                     <Card className="mb-6">
                        <div style={{padding: '2rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', position: 'relative', overflow: 'hidden', color: 'white', borderRadius: '12px'}}>
                             {/* Background decoration */}
                             <div style={{position: 'absolute', top: '-20%', right: '-10%', fontSize: '12rem', opacity: 0.05, transform: 'rotate(15deg)'}}>🏆</div>

                            <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', gap: '1rem', position: 'relative', zIndex: 1}}>
                                <div>
                                    <p style={{margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.8, fontWeight: 700}}>NIVEL ACTUAL</p>
                                    <h2 style={{margin: '0.5rem 0 0 0', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, color: '#38BDF8'}}>{person.gamification_rank || 'Novato'}</h2>
                                </div>
                                <div style={{textAlign: isMobile ? 'left' : 'right'}}>
                                    <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px'}}>PUNTOS TOTALES</p>
                                    <p style={{margin: '0.25rem 0 0 0', fontSize: '2.5rem', fontWeight: 700}}>{currentRankPoints}</p>
                                </div>
                            </div>
                            
                            <div style={{position: 'relative', zIndex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.75rem', fontWeight: 600}}>
                                     <span>Progreso de Nivel</span>
                                     <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div style={{height: '12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem'}}>
                                    <div style={{height: '100%', width: `${progressPercent}%`, backgroundColor: '#38BDF8', borderRadius: '6px', transition: 'width 1s ease', boxShadow: '0 0 15px rgba(56, 189, 248, 0.6)'}}></div>
                                </div>
                                
                                <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                     <span style={{display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600}}>
                                         <span style={{fontSize: '1.2rem'}}>🔥</span> 
                                         {streak} días de racha
                                     </span>
                                     <span style={{opacity: 0.9}}>{pointsToNextLevel > 0 ? `Faltan ${pointsToNextLevel} pts para subir` : '¡Has alcanzado el máximo nivel!'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 2. Daily Plan (Diet/Exercise) - Spans 2 columns on desktop */}
                <div style={{ gridColumn: isMobile ? '1' : 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card title="Tu Plan de Hoy" icon={ICONS.calendar} subHeader={<span style={{fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'capitalize'}}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}</span>}>
                         {completionError && <p style={{...styles.error, marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem'}}>{completionError}</p>}
                         
                         <div style={{marginBottom: '2rem'}}>
                            <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>ALIMENTACIÓN</h4>
                            {dietLogToShow ? (
                                <div style={{backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                    <PlanItem label="Desayuno" content={dietLogToShow.desayuno || ''} />
                                    <PlanItem label="Comida" content={dietLogToShow.comida || ''} />
                                    <PlanItem label="Cena" content={dietLogToShow.cena || ''} />
                                    
                                    {dietLogToShow.log_date === todayStr && !dietLogToShow.completed && (
                                         <button 
                                            onClick={() => handleMarkComplete(dietLogToShow)} 
                                            disabled={!!updatingCompletion}
                                            className="button-primary"
                                            style={{width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '1rem', fontWeight: 700}}
                                        >
                                            {updatingCompletion === dietLogToShow.id ? 'Guardando...' : 'Marcar Completado'}
                                        </button>
                                    )}
                                    {dietLogToShow.completed && (
                                        <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                            <span>✅</span> ¡Plan de hoy completado!
                                        </div>
                                    )}
                                </div>
                            ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic', fontSize: '1rem'}}>No hay plan asignado para hoy.</p>}
                        </div>

                        <div>
                            <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>EJERCICIO</h4>
                            {exerciseLogToShow ? (
                                 <div style={{backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                     <p style={{margin: 0, fontSize: '1rem', fontWeight: 500}}>{exerciseLogToShow.enfoque || 'Rutina General'}</p>
                                      {exerciseLogToShow.log_date === todayStr && !exerciseLogToShow.completed && (
                                         <button onClick={() => handleMarkComplete(exerciseLogToShow)} disabled={updatingCompletion === exerciseLogToShow.id} className="button-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '1rem', fontWeight: 700 }}>
                                            {updatingCompletion === exerciseLogToShow.id ? '...' : 'Marcar Completado'}
                                        </button>
                                    )}
                                     {exerciseLogToShow.completed && (
                                        <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                            <span>✅</span> ¡Rutina completada!
                                        </div>
                                    )}
                                 </div>
                            ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic', fontSize: '1rem'}}>Día de descanso.</p>}
                        </div>
                    </Card>

                    {/* Meal Analysis Card - Visible mostly on mobile or if space allows */}
                    <Card title="Análisis de Platillo con IA" icon={ICONS.sparkles}>
                        {isAiEnabled ? (
                            <MealImageAnalyzer todaysDietLog={todaysDietLog || null} />
                        ) : (
                             <div style={{textAlign: 'center', padding: '1rem', color: 'var(--text-light)', fontSize: '0.9rem'}}>
                                 Función no disponible en tu plan.
                             </div>
                        )}
                    </Card>
                </div>

                {/* 3. Right Column: Daily Check-in & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card title="Registro Diario" icon={ICONS.edit}>
                        {todaysCheckin ? (
                            <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '1rem 0'}}>
                                <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✅</div>
                                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-color)'}}>¡Día Registrado!</h3>
                                <p style={{margin: '0 0 2rem 0', color: 'var(--text-light)', fontSize: '1rem'}}>Gracias por tu constancia.</p>
                                
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px'}}>
                                    <div>
                                        <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px'}}>ÁNIMO</span>
                                        <span style={{fontSize: '1.5rem', color: '#2DD4BF'}}>{'⭐'.repeat(todaysCheckin.mood_rating || 0)}</span>
                                    </div>
                                    <div>
                                        <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px'}}>ENERGÍA</span>
                                        <span style={{fontSize: '1.5rem', color: '#F59E0B'}}>{'⚡'.repeat(todaysCheckin.energy_level_rating || 0)}</span>
                                    </div>
                                </div>
                                <button onClick={() => setEditingCheckin(todaysCheckin)} className="button-secondary" style={{width: '100%', padding: '0.8rem', fontSize: '1rem'}}>Editar Registro</button>
                            </div>
                        ) : (
                            <div style={{padding: '0.5rem 0'}}>
                                <DailyCheckinForm personId={person.id} onCheckinSaved={onDataRefresh} />
                            </div>
                        )}
                    </Card>
                    
                     <Card title="Próxima Cita" icon={ICONS.clock}>
                        <div style={{padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
                            {upcomingAppointment ? (
                                <div>
                                    <p style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'capitalize'}}>
                                        {new Date(upcomingAppointment.start_time).toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'})}
                                    </p>
                                    <div style={{fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-color)', lineHeight: 1, marginBottom: '1rem'}}>
                                        {new Date(upcomingAppointment.start_time).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    <p style={{margin: 0, fontSize: '1rem', color: 'var(--text-light)'}}>{upcomingAppointment.title}</p>
                                </div>
                            ) : (
                                <div>
                                    <p style={{color: 'var(--text-light)', margin: 0, fontSize: '1rem'}}>No tienes citas programadas.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                     <Card title="Tu Membresía" icon={ICONS.briefcase}>
                        <div style={{padding: '0.5rem'}}>
                             <p style={{margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'}}>Plan Actual</p>
                             <p style={{margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>{currentPlan?.name || 'Sin Plan Activo'}</p>
                             
                             {person.subscription_end_date && (
                                 <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', alignItems: 'center'}}>
                                     <span style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>Vence el</span>
                                     <span style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)'}}>
                                         {new Date(person.subscription_end_date.replace(/-/g, '/')).toLocaleDateString('es-MX')}
                                     </span>
                                 </div>
                             )}
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default PatientHomePage;
