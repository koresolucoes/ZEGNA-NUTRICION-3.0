
import React, { FC, useMemo, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest, PatientJournalEntry } from '../../types';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
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
    onNavigate: (view: string) => void;
    onOpenAiChat: () => void;
}> = ({ user, person, dietLogs, exerciseLogs, checkins, consultations, appointments, servicePlans, onDataRefresh, isMobile, isAiEnabled, onNavigate, onOpenAiChat }) => {
    
    const [editingCheckin, setEditingCheckin] = useState<DailyCheckin | null>(null);
    const [deletingCheckin, setDeletingCheckin] = useState<DailyCheckin | null>(null);
    const [updatingCompletion, setUpdatingCompletion] = useState<string | null>(null);
    const [completionError, setCompletionError] = useState<string | null>(null);
    const [pendingConsents, setPendingConsents] = useState<PopulatedReferralConsentRequest[]>([]);
    const [viewingConsent, setViewingConsent] = useState<PopulatedReferralConsentRequest | null>(null);
    const [uploadingMealType, setUploadingMealType] = useState<string | null>(null);
    const [weather, setWeather] = useState<{ temp: number | null, condition: string, icon: string }>({ temp: null, condition: 'Cargando...', icon: '...' });
    
    // Journal State
    const [journalEntries, setJournalEntries] = useState<PatientJournalEntry[]>([]);
    const [loadingJournal, setLoadingJournal] = useState(true);

    // Weather Fetch Effect
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await response.json();
                const { temperature_2m, weather_code } = data.current;
                
                let condition = 'Soleado';
                let icon = '☀️';
                
                // Simple WMO Code Mapping
                if (weather_code >= 1 && weather_code <= 3) { condition = 'Nublado'; icon = '⛅'; }
                else if (weather_code >= 45 && weather_code <= 48) { condition = 'Niebla'; icon = '🌫️'; }
                else if (weather_code >= 51 && weather_code <= 67) { condition = 'Lluvia'; icon = '🌧️'; }
                else if (weather_code >= 71) { condition = 'Nieve'; icon = '❄️'; }
                else if (weather_code >= 95) { condition = 'Tormenta'; icon = '⚡'; }

                setWeather({ temp: Math.round(temperature_2m), condition, icon });
            } catch (err) {
                console.error("Weather fetch failed", err);
                setWeather({ temp: 24, condition: 'Despejado (Est.)', icon: '☀️' });
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                (err) => {
                    console.warn("Geolocation denied/error", err);
                    setWeather({ temp: 25, condition: 'General', icon: '☀️' });
                }
            );
        } else {
             setWeather({ temp: 25, condition: 'General', icon: '☀️' });
        }
    }, []);

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

    // --- Calorie Progress Logic ---
    const calorieStats = useMemo(() => {
        let totalCalories = 2000; // Default goal
        let completedCalories = 0;
        
        // Approximate calculation based on meals eaten (if marked) or time of day for visualization
        if (todaysDietLog?.completed) {
            completedCalories = totalCalories;
        } else {
             const hour = new Date().getHours();
             if (hour > 8) completedCalories += totalCalories * 0.2; // Breakfast
             if (hour > 14) completedCalories += totalCalories * 0.4; // Lunch
             if (hour > 20) completedCalories += totalCalories * 0.3; // Dinner
        }
        
        const percentage = Math.min(100, (completedCalories / totalCalories) * 100);
        return { total: totalCalories, current: Math.round(completedCalories), percentage };
    }, [todaysDietLog]);

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

    // --- Visual Components ---

    const CircularProgress = ({ percentage, current, total }: { percentage: number, current: number, total: number }) => {
        const radius = 50;
        const stroke = 10;
        const normalizedRadius = radius - stroke * 2;
        const circumference = normalizedRadius * 2 * Math.PI;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ position: 'relative', width: radius * 2, height: radius * 2 }}>
                    <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                            stroke="#e5e7eb"
                            strokeWidth={stroke}
                            fill="transparent"
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                        />
                        <circle
                            stroke="#3B82F6"
                            strokeWidth={stroke}
                            strokeDasharray={circumference + ' ' + circumference}
                            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                            strokeLinecap="round"
                            fill="transparent"
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                        />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1F2937' }}>{Math.round(percentage)}%</span>
                    </div>
                </div>
                <div>
                     <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>Consumidas</p>
                     <p style={{ margin: '0.2rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
                         {current} <span style={{fontSize: '0.9rem', color: '#9CA3AF', fontWeight: 500}}>/ {total} kcal</span>
                     </p>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>Buen ritmo 👍</p>
                </div>
            </div>
        );
    };

    const ShortcutButton = ({ icon, label, onClick, color }: { icon: string, label: string, onClick: () => void, color: string }) => (
        <button 
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '1rem', borderRadius: '16px', border: 'none',
                backgroundColor: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                cursor: 'pointer', minWidth: '90px', transition: 'transform 0.1s'
            }}
            className="nav-item-hover"
        >
            <div style={{
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: `${color}15`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
            }}>
                {icon}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#4B5563', fontWeight: 600 }}>{label}</span>
        </button>
    );

    const PlanCard = ({ title, subtitle, image, onClick, color = 'var(--primary-color)' }: { title: string, subtitle: string, image: string, onClick: () => void, color?: string }) => (
        <div 
            onClick={onClick}
            style={{
                borderRadius: '20px', overflow: 'hidden', position: 'relative', height: '180px',
                cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', flex: '1', minWidth: '260px'
            }}
            className="card-hover"
        >
            <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
                position: 'absolute', inset: 0, 
                background: `linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0) 60%)` 
            }} />
            <div style={{ position: 'absolute', bottom: '1.2rem', left: '1.2rem', right: '1.2rem' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{subtitle}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: 700 }}>{title}</h3>
                    <div style={{ backgroundColor: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>➜</div>
                </div>
            </div>
        </div>
    );

    // Get images for cards based on time of day - Updated with reliable URLs
    const getMealImage = () => {
        const h = new Date().getHours();
        if (h < 11) return "https://images.unsplash.com/photo-1493770348161-369560ae357d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"; // Breakfast
        if (h < 16) return "https://images.unsplash.com/photo-1543353071-087f9bcbd111?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"; // Lunch
        return "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"; // Dinner
    };

    return (
        <div className="fade-in" style={{ 
            maxWidth: '800px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', 
            minHeight: '100vh', backgroundColor: '#FAFAFA' 
        }}>
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}
            {uploadingMealType && <CameraModal />}

            {/* HEADER: Greeting & Weather */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1F2937' }}>
                        Hola, {person.full_name.split(' ')[0]}
                    </h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '1rem' }}>
                        Bienvenido de nuevo 👋
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{weather.icon}</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{weather.temp !== null ? `${weather.temp}°C` : '--'}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>{weather.condition}</p>
                    </div>
                </div>
            </div>

            {/* CALORIE PROGRESS CARD */}
            <div style={{ 
                backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '2rem',
                border: '1px solid #F3F4F6'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700}}>Resumen del Día</h3>
                    <span style={{fontSize: '0.8rem', color: '#6B7280'}}>{new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                </div>
                
                <CircularProgress 
                    percentage={calorieStats.percentage} 
                    current={calorieStats.current} 
                    total={calorieStats.total} 
                />
            </div>

            {/* SHORTCUTS SCROLL */}
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }} className="hide-scrollbar">
                <ShortcutButton icon="📷" label="Subir Foto" onClick={() => setUploadingMealType('Comida')} color="#8B5CF6" />
                <ShortcutButton icon="📝" label="Diario" onClick={() => setEditingCheckin(todaysCheckin || { checkin_date: todayStr, person_id: person.id } as any)} color="#F59E0B" />
                <ShortcutButton icon="💬" label="Chat IA" onClick={onOpenAiChat} color="#10B981" />
                <ShortcutButton icon="📋" label="Ver Planes" onClick={() => onNavigate('plans')} color="#3B82F6" />
            </div>

            {/* TODAYS PLAN CARDS */}
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Tu Plan de Hoy</h3>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', marginBottom: '3rem' }}>
                <PlanCard 
                    title={todaysDietLog ? 'Ver Comidas' : 'Sin Plan'} 
                    subtitle="Alimentación" 
                    image={getMealImage()}
                    onClick={() => onNavigate('plans')}
                    color="#F59E0B"
                />
                <PlanCard 
                    title={todaysExerciseLog ? (todaysExerciseLog.enfoque || 'Rutina') : 'Descanso'} 
                    subtitle="Ejercicio" 
                    // Using reliable exercise image
                    image="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                    onClick={() => onNavigate('plans')}
                    color="#3B82F6"
                />
            </div>

            {/* COMPLETE BUTTONS IF AVAILABLE */}
            {(todaysDietLog || todaysExerciseLog) && (
                 <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {todaysDietLog && !todaysDietLog.completed && (
                         <button 
                            onClick={() => handleMarkComplete(todaysDietLog)}
                            disabled={!!updatingCompletion}
                            style={{width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'}}
                        >
                            {updatingCompletion === todaysDietLog.id ? 'Guardando...' : '✅ Marcar Comidas Completas'}
                        </button>
                    )}
                     {todaysExerciseLog && !todaysExerciseLog.completed && (
                         <button 
                            onClick={() => handleMarkComplete(todaysExerciseLog)}
                            disabled={!!updatingCompletion}
                            style={{width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'}}
                        >
                            {updatingCompletion === todaysExerciseLog.id ? 'Guardando...' : '💪 Marcar Ejercicio Completo'}
                        </button>
                    )}
                 </div>
            )}
        </div>
    );
};

export default PatientHomePage;
