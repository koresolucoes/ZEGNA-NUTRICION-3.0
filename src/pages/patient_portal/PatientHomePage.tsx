
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
import { createPortal } from 'react-dom';

const modalRoot = document.getElementById('modal-root');

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
    const [uploadingMealType, setUploadingMealType] = useState<string | null>(null); // For handling camera modal
    
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

    // Determines current meal based on time to highlight active
    const getCurrentMeal = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'Desayuno';
        if (hour < 14) return 'Colación 1';
        if (hour < 17) return 'Comida';
        if (hour < 20) return 'Colación 2';
        return 'Cena';
    };
    const currentMealType = getCurrentMeal();
    
    // Meal Configuration for displaying all slots
    const MEAL_SLOTS = [
        { key: 'desayuno', label: 'Desayuno', time: '8:00 AM' },
        { key: 'colacion_1', label: 'Colación 1', time: '11:00 AM' },
        { key: 'comida', label: 'Comida', time: '2:00 PM' },
        { key: 'colacion_2', label: 'Colación 2', time: '5:00 PM' },
        { key: 'cena', label: 'Cena', time: '8:00 PM' },
    ];

    const TimelineItem: FC<{ 
        time: string; 
        title: string; 
        content: string; 
        isActive?: boolean;
        isCompleted?: boolean;
        isLast?: boolean;
        onCameraClick?: () => void;
    }> = ({ time, title, content, isActive, isCompleted, isLast, onCameraClick }) => (
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
                
                <div style={{
                    marginTop: '0.5rem', padding: '1rem', borderRadius: '16px',
                    backgroundColor: isCompleted ? '#F0FDFA' : (isActive ? 'white' : 'var(--surface-color)'),
                    border: isActive ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    opacity: isCompleted || isActive ? 1 : 0.9,
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: 1.5, flex: 1 }}>
                            {content || <span style={{fontStyle: 'italic', color: 'var(--text-light)', fontSize: '0.9rem'}}>Sin plan asignado</span>}
                        </p>
                        
                        {isAiEnabled && (
                            <button 
                                onClick={onCameraClick}
                                style={{
                                    background: 'var(--surface-hover-color)', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '50%', 
                                    width: '36px', height: '36px', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    fontSize: '1.2rem', cursor: 'pointer', marginLeft: '0.75rem'
                                }}
                                title="Subir foto"
                            >
                                📷
                            </button>
                        )}
                    </div>
                    
                    {isCompleted && (
                        <div style={{marginTop: '0.5rem', fontSize: '0.8rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                            {ICONS.check} Completado
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const CameraModal = () => (
        modalRoot ? createPortal(
            <div style={{...styles.modalOverlay, zIndex: 2000}}>
                <div style={{...styles.modalContent, maxWidth: '600px', padding: 0, borderRadius: '24px', overflow: 'hidden'}} className="fade-in">
                    <div style={{padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3 style={{margin: 0, fontSize: '1.1rem'}}>Subir {uploadingMealType}</h3>
                        <button onClick={() => setUploadingMealType(null)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                    </div>
                    <div>
                        <MealImageAnalyzer 
                            todaysDietLog={todaysDietLog || null} 
                            clinicId={person.clinic_id} 
                            personId={person.id}
                            onEntrySaved={() => { fetchJournal(); setUploadingMealType(null); }}
                            fixedMealType={uploadingMealType}
                        />
                    </div>
                </div>
            </div>,
            modalRoot
        ) : null
    );

    return (
        <div className="fade-in" style={{ 
            maxWidth: '600px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', 
            minHeight: '100vh', backgroundColor: '#FAFAFA' 
        }}>
             {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            {uploadingMealType && <CameraModal />}
            
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

            {/* Vertical Timeline - Render ALL slots */}
            <div style={{ paddingLeft: '0.5rem' }}>
                {MEAL_SLOTS.map((slot, index) => {
                    const content = todaysDietLog ? (todaysDietLog as any)[slot.key] : '';
                    return (
                        <TimelineItem 
                            key={slot.key}
                            time={slot.time}
                            title={slot.label}
                            content={content}
                            isActive={currentMealType === slot.label}
                            isCompleted={todaysDietLog?.completed}
                            isLast={index === MEAL_SLOTS.length - 1}
                            onCameraClick={() => setUploadingMealType(slot.key)}
                        />
                    );
                })}
                
                {/* Complete Day Button */}
                {todaysDietLog && !todaysDietLog.completed && todaysDietLog.log_date === todayStr && (
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
            </div>
            
            {/* Journal Feed - Below Timeline */}
             {isAiEnabled && (
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
