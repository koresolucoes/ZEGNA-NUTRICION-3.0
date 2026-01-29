
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
    const todaysCheckin = useMemo(() => checkins.find(c => c.checkin_date === todayStr), [checkins, todayStr]);

    const streak = useMemo(() => {
        if (checkins.length === 0) return 0;
        const uniqueDateStrings = [...new Set(checkins.map(c => c.checkin_date))];
        const sortedUniqueDates = uniqueDateStrings.map(dateStr => new Date((dateStr as string).replace(/-/g, '/'))).sort((a, b) => b.getTime() - a.getTime());
        if (sortedUniqueDates.length === 0) return 0;
        let currentStreak = 0;
        const today = new Date(todayStr.replace(/-/g, '/'));
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
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

    // Determines current meal based on time
    const getCurrentMeal = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'Desayuno';
        if (hour < 16) return 'Comida';
        return 'Cena';
    };
    const currentMealType = getCurrentMeal();

    const TimelineItem: FC<{ 
        time: string; 
        title: string; 
        content: string; 
        isActive?: boolean;
        isCompleted?: boolean;
        isLast?: boolean;
    }> = ({ time, title, content, isActive, isCompleted, isLast }) => (
        <div style={{ display: 'flex', position: 'relative' }}>
            {/* Timeline Line */}
            {!isLast && (
                <div style={{
                    position: 'absolute', left: '9px', top: '24px', bottom: '-24px', width: '2px',
                    backgroundColor: isActive ? 'var(--primary-color)' : 'var(--border-color)', 
                    opacity: isActive ? 1 : 0.5,
                    borderLeft: isActive ? 'none' : '2px dashed var(--border-color)',
                    transition: 'all 0.3s'
                }} />
            )}
            
            {/* Dot */}
            <div style={{
                width: '20px', height: '20px', borderRadius: '50%', 
                backgroundColor: isActive ? 'var(--primary-color)' : (isCompleted ? '#10B981' : 'var(--surface-color)'),
                border: `3px solid ${isActive ? 'var(--primary-light)' : (isCompleted ? '#D1FAE5' : 'var(--border-color)')}`,
                flexShrink: 0, zIndex: 2, marginRight: '1rem', marginTop: '2px',
                boxShadow: isActive ? '0 0 0 4px rgba(var(--primary-rgb), 0.2)' : 'none',
                transition: 'all 0.3s'
            }} />

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: '2rem' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem'}}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--text-color)' : 'var(--text-light)' }}>
                        {title}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 500 }}>{time}</span>
                </div>
                
                {isActive ? (
                    <div className="fade-in" style={{
                        marginTop: '0.75rem',
                        backgroundColor: 'white', borderRadius: '24px',
                        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                    }}>
                        <div style={{position: 'relative'}}>
                            {/* Camera / AI Analysis Widget embedded in timeline */}
                            <MealImageAnalyzer 
                                todaysDietLog={todaysDietLog || null} 
                                clinicId={person.clinic_id} 
                                personId={person.id}
                                onEntrySaved={fetchJournal} 
                            />
                        </div>
                        
                        <div style={{padding: '1.25rem'}}>
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '10px'}}>
                                    TU PLAN
                                </span>
                             </div>
                            <p style={{margin: '0 0 1rem 0', fontWeight: 600, fontSize: '1rem', color: 'var(--text-color)', lineHeight: 1.5}}>
                                {content || 'No asignado'}
                            </p>
                            
                            <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '1rem'}}>
                                <div style={{textAlign: 'center', flex: 1}}>
                                    <div style={{fontSize: '1.2rem'}}>🍞</div>
                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600}}>Carbos</span>
                                </div>
                                <div style={{textAlign: 'center', flex: 1, borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6'}}>
                                    <div style={{fontSize: '1.2rem'}}>🥩</div>
                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600}}>Proteína</span>
                                </div>
                                <div style={{textAlign: 'center', flex: 1}}>
                                    <div style={{fontSize: '1.2rem'}}>🥦</div>
                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600}}>Veg/Fruta</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        marginTop: '0.5rem', padding: '1rem', borderRadius: '16px',
                        backgroundColor: isCompleted ? '#F0FDFA' : 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        opacity: isCompleted ? 0.8 : 1,
                        transition: 'all 0.2s'
                    }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                            {content || 'Sin plan asignado'}
                        </p>
                        {isCompleted && (
                            <div style={{marginTop: '0.5rem', fontSize: '0.8rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                {ICONS.check} Completado
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fade-in" style={{ 
            maxWidth: '600px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', 
            minHeight: '100vh', backgroundColor: '#FAFAFA' 
        }}>
             {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            
            {/* Header: Today & Streak */}
            <div style={{
                backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: '1px solid var(--border-color)'
            }}>
                 <div>
                     <h1 style={{margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-color)'}}>Hoy</h1>
                     <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.95rem', textTransform: 'capitalize', fontWeight: 500}}>
                         {new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'short'})}
                     </p>
                 </div>
                 <div style={{
                     backgroundColor: '#FFF7ED', color: '#EA580C', padding: '0.6rem 1.2rem', 
                     borderRadius: '50px', fontWeight: 800, fontSize: '0.9rem', 
                     display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid #FFEDD5',
                     boxShadow: '0 4px 10px rgba(234, 88, 12, 0.1)'
                 }}>
                     <span style={{fontSize: '1.1rem'}}>🔥</span> {streak} Días
                 </div>
            </div>

            {/* Vertical Timeline */}
            <div style={{ paddingLeft: '0.5rem' }}>
                {todaysDietLog ? (
                    <>
                        <TimelineItem 
                            time="9:00 AM" 
                            title="Desayuno" 
                            content={todaysDietLog.desayuno || ''} 
                            isActive={currentMealType === 'Desayuno'}
                            isCompleted={todaysDietLog.completed} 
                        />
                        <TimelineItem 
                            time="2:00 PM" 
                            title="Comida" 
                            content={todaysDietLog.comida || ''} 
                            isActive={currentMealType === 'Comida'}
                            isCompleted={todaysDietLog.completed}
                        />
                        <TimelineItem 
                            time="8:00 PM" 
                            title="Cena" 
                            content={todaysDietLog.cena || ''} 
                            isActive={currentMealType === 'Cena'}
                            isCompleted={todaysDietLog.completed}
                            isLast
                        />
                         {/* Complete Day Button */}
                        {!todaysDietLog.completed && todaysDietLog.log_date === todayStr && (
                            <div style={{paddingLeft: '36px', marginTop: '1rem'}}>
                                <button 
                                    onClick={() => handleMarkComplete(todaysDietLog)} 
                                    disabled={!!updatingCompletion}
                                    className="button-primary"
                                    style={{width: '100%', padding: '1rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, boxShadow: '0 8px 20px rgba(var(--primary-rgb), 0.3)'}}
                                >
                                    {updatingCompletion === todaysDietLog.id ? 'Guardando...' : '✅ Cerrar Día'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '24px', backgroundColor: 'var(--surface-color)'}}>
                         <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>🍽️</div>
                        <p>No tienes plan asignado para hoy.</p>
                    </div>
                )}
            </div>
            
            {/* Journal Feed - Below Timeline */}
             {isAiEnabled && (
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Historial Visual</h2>
                        <button onClick={fetchJournal} style={{background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'}}>Ver Todo</button>
                    </div>
                    <SmartJournalFeed entries={journalEntries} loading={loadingJournal} />
                </div>
            )}
            
            {/* Daily Checkin Widget */}
            <div style={{ marginTop: '2rem' }}>
                 {!todaysCheckin ? (
                     <div style={{backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)'}}>
                        <DailyCheckinForm personId={person.id} onCheckinSaved={onDataRefresh} />
                     </div>
                 ) : (
                     <div style={{backgroundColor: '#ECFDF5', borderRadius: '24px', padding: '2rem', border: '1px solid #A7F3D0', textAlign: 'center', color: '#065F46'}}>
                         <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>🎉</div>
                         <h3 style={{margin: 0, fontSize: '1.3rem', fontWeight: 700}}>¡Registro Completado!</h3>
                         <p style={{margin: '0.5rem 0 0 0', fontSize: '1rem'}}>Has registrado tu ánimo y energía de hoy.</p>
                         <button onClick={() => setEditingCheckin(todaysCheckin)} style={{marginTop: '1.5rem', background: 'none', border: 'none', textDecoration: 'underline', color: '#059669', cursor: 'pointer', fontWeight: 600}}>Editar respuesta</button>
                     </div>
                 )}
            </div>

        </div>
    );
};

export default PatientHomePage;
