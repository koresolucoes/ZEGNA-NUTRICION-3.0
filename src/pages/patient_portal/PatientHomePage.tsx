import React, { FC, useMemo, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest } from '../../types';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
import DailyCheckinForm from '../../components/patient_portal/DailyCheckinForm';
import ConsentRequestModal from '../../components/patient_portal/ConsentRequestModal';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

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

    const getStreakMessage = (streak: number) => {
      if (streak > 30) {
        return { icon: '🔥', text: `¡Racha de FUEGO! Estás ganando 50 puntos por cada registro.`, color: 'var(--error-color)' };
      }
      if (streak > 21) {
        return { icon: '🚀', text: `¡Increíble! Tu racha ahora te da 30 puntos por registro.`, color: 'var(--accent-color)' };
      }
      if (streak > 14) {
        return { icon: '🏆', text: `¡Excelente! Tu racha te da 20 puntos por registro.`, color: 'var(--primary-color)' };
      }
      if (streak > 7) {
        return { icon: '👍', text: `¡Sigue así! Tu racha ahora te da 10 puntos por registro.`, color: 'var(--primary-color)' };
      }
      if (streak > 1) {
        return { icon: '🔥', text: `¡Tienes una racha de ${streak} días! Sigue así para ganar puntos extra.` };
      }
      return null;
    };
    
    const streakMessage = getStreakMessage(streak);

    const { usedConsultations, maxConsultations } = useMemo(() => {
        const plan = servicePlans.find(p => p.id === person.current_plan_id);
        if (plan && person.subscription_start_date && person.subscription_end_date) {
            const startDate = person.subscription_start_date; // 'YYYY-MM-DD'
            const endDate = person.subscription_end_date;   // 'YYYY-MM-DD'

             const used = appointments.filter(a => {
                const isConsumingStatus = ['scheduled', 'completed', 'in-consultation', 'called', 'checked-in'].includes(a.status);
                if (!isConsumingStatus) return false;

                const apptDate = a.start_time.substring(0, 10); // Extract 'YYYY-MM-DD' from timestamp
                return apptDate >= startDate && apptDate <= endDate;
            }).length;

            return { usedConsultations: used, maxConsultations: plan.max_consultations };
        }
        return { usedConsultations: 0, maxConsultations: null };
    }, [person, servicePlans, appointments]);
    
    // Gamification progress bar logic
    const { progressPercent, pointsToNextLevel } = useMemo(() => {
        const points = person.gamification_points || 0;
        const ranks = { 'Novato': 0, 'Bronce': 100, 'Plata': 300, 'Oro': 600, 'Platino': 1000 };
        const currentRank = person.gamification_rank || 'Novato';
        const currentRankPoints = ranks[currentRank as keyof typeof ranks];
        
        let nextRankPoints;
        if (points < 100) nextRankPoints = 100;
        else if (points < 300) nextRankPoints = 300;
        else if (points < 600) nextRankPoints = 600;
        else if (points < 1000) nextRankPoints = 1000;
        else nextRankPoints = Infinity;

        if (nextRankPoints === Infinity) {
            return { progressPercent: 100, pointsToNextLevel: 0 };
        }

        const pointsInCurrentRank = points - currentRankPoints;
        const pointsForNextRank = nextRankPoints - currentRankPoints;
        const progress = pointsForNextRank > 0 ? (pointsInCurrentRank / pointsForNextRank) * 100 : 100;

        return {
            progressPercent: Math.min(progress, 100),
            pointsToNextLevel: Math.max(0, nextRankPoints - points)
        };
    }, [person.gamification_points, person.gamification_rank]);

    // Simulate loading if data isn't ready, though PatientPortalLayout handles initial load.
    const isLoading = !person;

    return (
        <div className="fade-in">
             {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Estás seguro de que quieres eliminar tu registro del día {new Date((deletingCheckin.checkin_date as string).replace(/-/g, '/')).toLocaleDateString('es-MX', {dateStyle: 'long'})}?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            
            {pendingConsents.length > 0 && (
                 <div className="widget-card" style={{marginBottom: '1.5rem', border: `2px solid var(--accent-color)`}}>
                    <div className="widget-header">
                        <h2 className="widget-title" style={{color: 'var(--accent-color)'}}>{ICONS.send} Solicitudes Pendientes</h2>
                    </div>
                    <div className="widget-body">
                        {pendingConsents.map(req => (
                            <div key={req.id}>
                                <p>Tu clínica te solicita permiso para referirte con otro profesional. Por favor, revisa los detalles.</p>
                                <button onClick={() => setViewingConsent(req)}>Revisar Solicitud</button>
                            </div>
                        ))}
                    </div>
                 </div>
            )}

            <p style={{color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '2rem'}}>Aquí puedes dar seguimiento a tu progreso y consultar tus planes.</p>
            
            <div className="patient-portal-grid">
                {/* Main Content Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="widget-card">
                        <div className="widget-header">
                            <h2 className="widget-title">Tu Plan de Hoy</h2>
                            <span style={{fontSize: '0.9rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                {ICONS.calendar}
                                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <div className="widget-body">
                            {isLoading ? <SkeletonLoader type="list" count={3} /> : (
                                <>
                                    {completionError && <p style={{...styles.error, marginTop: '-1rem', marginBottom: '1rem'}}>{completionError}</p>}
                                    <h3 style={{fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.5rem'}}>Plan Alimenticio</h3>
                                    {dietLogToShow ? (
                                        <div style={{border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px'}}>
                                            <p style={{margin: '0 0 0.5rem 0'}}><strong>Desayuno:</strong> {dietLogToShow.desayuno || 'N/A'}</p>
                                            <p style={{margin: '0 0 0.5rem 0'}}><strong>Comida:</strong> {dietLogToShow.comida || 'N/A'}</p>
                                            <p style={{margin: '0'}}><strong>Cena:</strong> {dietLogToShow.cena || 'N/A'}</p>
                                            {dietLogToShow.log_date === todayStr && !dietLogToShow.completed && (
                                                 <button onClick={() => handleMarkComplete(dietLogToShow)} disabled={updatingCompletion === dietLogToShow.id} style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--accent-color)'}}>
                                                    {updatingCompletion === dietLogToShow.id ? '...' : '✅ Completado'}
                                                </button>
                                            )}
                                        </div>
                                    ) : <p>No hay plan asignado.</p>}
                                    
                                    <h3 style={{fontSize: '1rem', color: 'var(--primary-color)', margin: '1.5rem 0 0.5rem 0'}}>Rutina de Ejercicio</h3>
                                    {exerciseLogToShow ? (
                                        <div style={{border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px'}}>
                                            <p style={{margin: 0}}><strong>Enfoque:</strong> {exerciseLogToShow.enfoque || 'General'}</p>
                                            {exerciseLogToShow.log_date === todayStr && !exerciseLogToShow.completed && (
                                                 <button onClick={() => handleMarkComplete(exerciseLogToShow)} disabled={updatingCompletion === exerciseLogToShow.id} style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--accent-color)'}}>
                                                    {updatingCompletion === exerciseLogToShow.id ? '...' : '✅ Completado'}
                                                </button>
                                            )}
                                        </div>
                                    ) : <p>No hay rutina asignada.</p>}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="widget-card">
                        <div className="widget-header"><h2 className="widget-title">{ICONS.sparkles} Análisis de Platillos con IA</h2></div>
                        <div className="widget-body">
                            {isAiEnabled ? (
                                <MealImageAnalyzer todaysDietLog={todaysDietLog || null} />
                            ) : (
                                <div style={{textAlign: 'center', padding: '1rem'}}>
                                    <p style={{color: 'var(--text-light)'}}>Esta função não está disponível no seu plano atual.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Right Sidebar Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="widget-card">
                         <div className="widget-header"><h2 className="widget-title">Tu Progreso</h2></div>
                         <div className="widget-body">
                             {isLoading ? <SkeletonLoader type="widget" count={1} /> : (
                                 <div style={{textAlign: 'center', padding: '1rem 0'}}>
                                    <p style={{fontSize: '3rem', margin: '0'}}>{person.gamification_rank === 'Oro' ? '🥇' : person.gamification_rank === 'Plata' ? '🥈' : '🥉'}</p>
                                    <h3 style={{margin: 0, color: 'var(--text-light)', fontSize: '1.5rem', fontWeight: 600}}>{person.gamification_rank || 'Novato'}</h3>
                                    <p style={{margin: '0.25rem 0 1rem 0', fontWeight: 700, fontSize: '2.5rem'}}>{person.gamification_points || 0} <span style={{fontSize: '1rem', color: 'var(--text-light)'}}>puntos</span></p>
                                    
                                    <div className="progress-bar-bg">
                                        <div className="progress-bar-fill" style={{width: `${progressPercent}%`}}></div>
                                    </div>
                                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                         {pointsToNextLevel > 0 ? `Te faltan ${pointsToNextLevel} pontos para o próximo nível.` : 'Você alcançou o nível máximo!'}
                                    </p>
                                    {streakMessage && (
                                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', fontWeight: 500, color: streakMessage.color || 'var(--text-color)' }}>
                                            {streakMessage.icon} {streakMessage.text}
                                        </p>
                                    )}
                                 </div>
                             )}
                         </div>
                    </div>
                     <div className="widget-card">
                        <div className="widget-header"><h2 className="widget-title">Mi Registro Diario</h2></div>
                        <div className="widget-body">
                            {todaysCheckin ? (
                                <div>
                                    <p style={{ marginTop: 0, color: 'var(--text-light)', fontStyle: 'italic' }}>¡Gracias por registrar tu día!</p>
                                    <p style={{margin: '0.5rem 0'}}><strong>Ánimo:</strong> {'⭐'.repeat(todaysCheckin.mood_rating || 0)}</p>
                                    <p style={{margin: '0.5rem 0'}}><strong>Energía:</strong> {'⚡'.repeat(todaysCheckin.energy_level_rating || 0)}</p>
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                                        <button className="button-secondary" onClick={() => setEditingCheckin(todaysCheckin)} style={{flex: 1}}>Editar</button>
                                        <button className="button-danger" onClick={() => setDeletingCheckin(todaysCheckin)} style={{flex: 1}}>Eliminar</button>
                                    </div>
                                </div>
                            ) : (
                                <DailyCheckinForm personId={person.id} onCheckinSaved={onDataRefresh} />
                            )}
                        </div>
                    </div>
                    <div className="widget-card">
                        <div className="widget-header"><h2 className="widget-title">Estado de tu Plan</h2></div>
                        <div className="widget-body" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                             {isLoading ? <SkeletonLoader type="list" count={3} /> : (
                                <>
                                     <div>
                                        <h4 style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 500, margin: '0 0 0.25rem 0'}}>Plan Actual</h4>
                                        <p style={{margin: 0, fontWeight: 600}}>{servicePlans.find(p => p.id === person.current_plan_id)?.name || 'Sin plan'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 500, margin: '0 0 0.25rem 0'}}>Vence el</h4>
                                        <p style={{margin: 0, fontWeight: 600}}>{person.subscription_end_date ? new Date(person.subscription_end_date.replace(/-/g, '/')).toLocaleDateString('es-MX', {dateStyle: 'long'}) : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 500, margin: '0 0 0.25rem 0'}}>Consultas Usadas</h4>
                                        <p style={{margin: 0, fontWeight: 600}}>{usedConsultations} de {maxConsultations !== null ? maxConsultations : '∞'}</p>
                                    </div>
                                </>
                             )}
                        </div>
                    </div>
                     <div className="widget-card">
                         <div className="widget-header"><h2 className="widget-title">Próxima Cita</h2></div>
                         <div className="widget-body">
                            {upcomingAppointment ? (
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>{upcomingAppointment.title}</h3>
                                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-light)' }}>
                                        {new Date(upcomingAppointment.start_time).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                                    </p>
                                </div>
                            ) : (
                                <p>No hay citas próximas.</p>
                            )}
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default PatientHomePage;
