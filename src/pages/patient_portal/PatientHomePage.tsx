
import React, { FC, useMemo, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest, PatientJournalEntry } from '../../types';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { supabase, Json } from '../../supabase';
import { styles } from '../../constants';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
import ConsentRequestModal from '../../components/patient_portal/ConsentRequestModal';
import SmartJournalFeed from '../../components/patient_portal/SmartJournalFeed';
import { createPortal } from 'react-dom';
import DailyCheckinForm from '../../components/patient_portal/DailyCheckinForm';

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
    
    // Weather State
    const [weather, setWeather] = useState<{ temp: number | null, condition: string, icon: string, location: string }>({ temp: null, condition: 'Cargando...', icon: '...', location: 'Localizando...' });
    const [geoError, setGeoError] = useState<string | null>(null);

    // Journal State
    const [journalEntries, setJournalEntries] = useState<PatientJournalEntry[]>([]);
    const [loadingJournal, setLoadingJournal] = useState(true);

    // Wearable Mock State (Simulated connection status from localStorage for demo continuity)
    const [wearableStats, setWearableStats] = useState({ steps: 0, connected: false });

    // --- REAL WEATHER IMPLEMENTATION ---
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                // Using Open-Meteo (Free, No API Key required for demo)
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
                const data = await response.json();
                
                if (!data.current) throw new Error("No weather data");

                const { temperature_2m, weather_code, is_day } = data.current;
                
                // WMO Weather Code Mapping (Improved for accuracy)
                let condition = 'Despejado';
                let icon = is_day ? '☀️' : '🌙';
                
                if (weather_code === 0) { condition = 'Despejado'; icon = is_day ? '☀️' : '🌙'; }
                else if (weather_code >= 1 && weather_code <= 3) { condition = 'Nublado'; icon = '☁️'; }
                else if (weather_code >= 45 && weather_code <= 48) { condition = 'Niebla'; icon = '🌫️'; }
                else if ((weather_code >= 51 && weather_code <= 67) || (weather_code >= 80 && weather_code <= 82)) { condition = 'Lluvia'; icon = '🌧️'; }
                else if ((weather_code >= 71 && weather_code <= 77) || (weather_code >= 85 && weather_code <= 86)) { condition = 'Nieve'; icon = '❄️'; }
                else if (weather_code >= 95) { condition = 'Tormenta'; icon = '⚡'; }

                // Reverse Geocoding (Using a free reliable API or fallback)
                let locationName = 'Tu Ubicación';
                try {
                    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
                    const geoData = await geoRes.json();
                    if (geoData.city || geoData.locality) {
                        locationName = geoData.city || geoData.locality;
                    }
                } catch(e) { /* Ignore reverse geocoding error */ }

                setWeather({ temp: Math.round(temperature_2m), condition, icon, location: locationName });
            } catch (err) {
                console.error("Weather fetch failed", err);
                setWeather({ temp: null, condition: 'No disponible', icon: '❓', location: 'Error de conexión' });
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                    setGeoError(null);
                },
                (error) => {
                    console.warn("Geolocation Error:", error);
                    setGeoError("Permiso denegado");
                    setWeather({ temp: 24, condition: 'General', icon: '🌤️', location: 'Ubicación General' }); // Fallback
                }
            );
        } else {
            setGeoError("No soportado");
             setWeather({ temp: 24, condition: 'General', icon: '🌤️', location: 'Ubicación General' });
        }
        
        // Check local storage for wearable simulation
        const appleConnected = localStorage.getItem('apple_health_connected') === 'true';
        const googleConnected = localStorage.getItem('google_fit_connected') === 'true';
        if (appleConnected || googleConnected) {
            setWearableStats({ steps: 8432, connected: true });
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

    const handleToggleMealCompletion = async (log: DietLog, mealType: string) => {
        if (!log) return;
        setUpdatingCompletion(mealType); // Use mealType as loading indicator key
        setCompletionError(null);

        try {
            // Get current completed meals from JSON (or init empty array)
            const currentCompleted = (log.completed_meals as string[]) || [];
            let newCompleted: string[];

            if (currentCompleted.includes(mealType)) {
                // Remove if already present
                newCompleted = currentCompleted.filter(m => m !== mealType);
            } else {
                // Add if not present
                newCompleted = [...currentCompleted, mealType];
            }
            
            // Check if ALL assigned meals are now complete
            const assignedMeals = ['desayuno', 'colacion_1', 'comida', 'colacion_2', 'cena'].filter(
                k => log[k as keyof DietLog] // Filter keys that have content
            );
            
            // If all assigned meals are in the new completed list, mark whole log as complete
            const allComplete = assignedMeals.every(m => newCompleted.includes(m));

            // Update DB
            // Cast to Json to satisfy Supabase type
            const { error } = await supabase
                .from('diet_logs')
                .update({ 
                    completed_meals: newCompleted as unknown as Json,
                    completed: allComplete // Auto-update legacy boolean
                })
                .eq('id', log.id);

            if (error) throw error;
            
            // Trigger gamification points if fully completed and wasn't before
            if (allComplete && !log.completed) {
                await supabase.rpc('award_points_for_completed_plan', {
                    p_log_id: log.id,
                    p_log_type: 'diet'
                });
            }

            onDataRefresh();
        } catch (err: any) {
            console.error("Error toggling meal:", err);
            setCompletionError("Error al guardar.");
        } finally {
            setUpdatingCompletion(null);
        }
    };

    const handleMarkCompleteExercise = async (log: ExerciseLog) => {
        const logType = 'exercise';
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
        
        // Approximate calorie distribution
        const weights: {[key: string]: number} = {
            'desayuno': 0.25,
            'comida': 0.35,
            'cena': 0.25,
            'colacion_1': 0.075,
            'colacion_2': 0.075
        };

        if (todaysDietLog) {
            const completedMeals = (todaysDietLog.completed_meals as string[]) || [];
            
            // Only count existing meals
            let assignedTotalWeight = 0;
            const existingMeals = Object.keys(weights).filter(k => todaysDietLog[k as keyof DietLog]);
            
            existingMeals.forEach(meal => {
                assignedTotalWeight += weights[meal];
                if (completedMeals.includes(meal)) {
                    completedCalories += totalCalories * weights[meal];
                }
            });
            
            // Normalize to 100% if some meals are missing
            if (assignedTotalWeight > 0 && assignedTotalWeight < 1) {
                 // Scale factor
                 const factor = 1 / assignedTotalWeight;
                 completedCalories = completedCalories * factor;
            }
            
            // Fallback for legacy 'completed' boolean if json is empty
            if (todaysDietLog.completed && completedMeals.length === 0) {
                 completedCalories = totalCalories;
            }
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
                     <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>Consumidas (Est.)</p>
                     <p style={{ margin: '0.2rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
                         {current} <span style={{fontSize: '0.9rem', color: '#9CA3AF', fontWeight: 500}}>/ {total} kcal</span>
                     </p>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>Basado en tus marcas 👍</p>
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

    const PlanItem: FC<{ label: string, content: string, mealType?: string, log?: DietLog }> = ({ label, content, mealType, log }) => {
        if (!content) return null;
        const isCompleted = log && mealType ? ((log.completed_meals as string[]) || []).includes(mealType) : false;
        
        return (
            <div style={{marginBottom: '1rem', display: 'flex', alignItems: 'start', gap: '0.75rem'}}>
                {mealType && log ? (
                    <div 
                        onClick={() => handleToggleMealCompletion(log, mealType)}
                        style={{
                            width: '24px', height: '24px', borderRadius: '8px', 
                            border: `2px solid ${isCompleted ? '#10B981' : '#D1D5DB'}`,
                            backgroundColor: isCompleted ? '#10B981' : 'transparent',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', marginTop: '2px', flexShrink: 0,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isCompleted && <span style={{fontSize: '0.9rem', fontWeight: 800}}>✓</span>}
                        {updatingCompletion === mealType && <span style={{fontSize: '0.6rem'}}>...</span>}
                    </div>
                ) : null}
                <div>
                    <span style={{color: 'var(--primary-color)', fontWeight: 600, display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>{label}</span>
                    <span style={{color: isCompleted ? '#6B7280' : 'var(--text-color)', lineHeight: 1.5, display: 'block', textDecoration: isCompleted ? 'line-through' : 'none'}}>{content}</span>
                </div>
            </div>
        );
    };

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

    const WearableCard = () => (
        <div 
            onClick={() => onNavigate('progress')}
            className="card-hover"
            style={{
                backgroundColor: 'white', borderRadius: '24px', padding: '1rem 1.5rem',
                boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)', marginBottom: '1.5rem',
                border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer'
            }}
        >
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: wearableStats.connected ? 'linear-gradient(135deg, #F43F5E, #FB7185)' : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', color: wearableStats.connected ? 'white' : '#9CA3AF'
                }}>
                    {wearableStats.connected ? '⌚' : '🔗'}
                </div>
                <div>
                    <h4 style={{margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)'}}>
                        {wearableStats.connected ? 'Apple Watch / Google Fit' : 'Conectar Dispositivo'}
                    </h4>
                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>
                        {wearableStats.connected ? `${wearableStats.steps.toLocaleString()} pasos hoy` : 'Sincroniza tus pasos y actividad'}
                    </p>
                </div>
            </div>
            {wearableStats.connected ? (
                <div style={{color: '#10B981', fontWeight: 700, fontSize: '0.9rem'}}>ON</div>
            ) : (
                <div style={{color: 'var(--primary-color)', fontSize: '1.2rem'}}>➜</div>
            )}
        </div>
    );

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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '1.5rem' }}>{weather.icon}</span>
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{weather.temp !== null ? `${weather.temp}°C` : '--'}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>{weather.condition}</p>
                        </div>
                    </div>
                    {geoError && <span style={{fontSize: '0.65rem', color: 'var(--error-color)'}}>{geoError}</span>}
                    {weather.location && !geoError && <span style={{fontSize: '0.65rem', color: '#9CA3AF'}}>📍 {weather.location}</span>}
                </div>
            </div>

            {/* CALORIE PROGRESS CARD */}
            <div style={{ 
                backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '1.5rem',
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
            
            {/* WEARABLE CARD */}
            <WearableCard />

            {/* SHORTCUTS SCROLL */}
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }} className="hide-scrollbar">
                <ShortcutButton icon="📷" label="Subir Foto" onClick={() => setUploadingMealType('Comida')} color="#8B5CF6" />
                <ShortcutButton icon="📝" label="Diario" onClick={() => setEditingCheckin(todaysCheckin || { checkin_date: todayStr, person_id: person.id } as any)} color="#F59E0B" />
                <ShortcutButton icon="💬" label="Chat IA" onClick={onOpenAiChat} color="#10B981" />
                <ShortcutButton icon="📋" label="Ver Planes" onClick={() => onNavigate('plans')} color="#3B82F6" />
                <ShortcutButton icon="📂" label="Archivos" onClick={() => onNavigate('files')} color="#6366F1" />
            </div>

            {/* Daily Plan with Individual Checkboxes */}
            <Card title="Tu Plan de Hoy" icon={ICONS.calendar} className="mb-6">
                {completionError && <p style={{...styles.error, marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem'}}>{completionError}</p>}
                
                <div style={{marginBottom: '2rem'}}>
                    <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>ALIMENTACIÓN</h4>
                    {todaysDietLog ? (
                        <div style={{backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                            <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1rem', fontStyle: 'italic'}}>Marca cada comida al completarla:</p>
                            <PlanItem label="Desayuno" content={todaysDietLog.desayuno || ''} mealType="desayuno" log={todaysDietLog} />
                            <PlanItem label="Colación" content={todaysDietLog.colacion_1 || ''} mealType="colacion_1" log={todaysDietLog} />
                            <PlanItem label="Comida" content={todaysDietLog.comida || ''} mealType="comida" log={todaysDietLog} />
                            <PlanItem label="Colación" content={todaysDietLog.colacion_2 || ''} mealType="colacion_2" log={todaysDietLog} />
                            <PlanItem label="Cena" content={todaysDietLog.cena || ''} mealType="cena" log={todaysDietLog} />
                            
                            {todaysDietLog.completed && (
                                <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                    <span>✅</span> ¡Plan de hoy completado!
                                </div>
                            )}
                        </div>
                    ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic', fontSize: '1rem'}}>No hay plan asignado para hoy.</p>}
                </div>

                <div>
                    <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 800, letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>EJERCICIO</h4>
                    {todaysExerciseLog ? (
                            <div style={{backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                <p style={{margin: 0, fontSize: '1rem', fontWeight: 500}}>{todaysExerciseLog.enfoque || 'Rutina General'}</p>
                                {todaysExerciseLog.log_date === todayStr && !todaysExerciseLog.completed && (
                                    <button onClick={() => handleMarkCompleteExercise(todaysExerciseLog)} disabled={updatingCompletion === todaysExerciseLog.id} className="button-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '1rem', fontWeight: 700 }}>
                                    {updatingCompletion === todaysExerciseLog.id ? '...' : 'Marcar Completado'}
                                </button>
                            )}
                                {todaysExerciseLog.completed && (
                                <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                    <span>✅</span> ¡Rutina completada!
                                </div>
                            )}
                            </div>
                    ) : <p style={{color: 'var(--text-light)', fontStyle: 'italic', fontSize: '1rem'}}>Día de descanso.</p>}
                </div>
            </Card>

            {/* Daily Check-in */}
             <Card title="Registro Diario" icon={ICONS.edit} className="mb-6">
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
            
            {/* Journal Section - Full Width at bottom */}
            {isAiEnabled && (
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Diario de Comidas</h2>
                        <button className="button-secondary" onClick={fetchJournal}>Actualizar</button>
                    </div>
                    <SmartJournalFeed entries={journalEntries} loading={loadingJournal} />
                </div>
            )}
        </div>
    );
};

export default PatientHomePage;
