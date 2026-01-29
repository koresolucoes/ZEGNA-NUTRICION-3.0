
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
    const [viewingConsent, setViewingConsent] = useState<PopulatedReferralConsentRequest | null>(null);
    const [uploadingMealType, setUploadingMealType] = useState<string | null>(null);
    const [waterIntake, setWaterIntake] = useState(0); // Local state for demo purposes
    
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
        // Retrieve daily water if stored (simulated for UI consistency with image)
        const savedWater = localStorage.getItem(`water_${getLocalDateString(new Date())}`);
        if (savedWater) setWaterIntake(parseInt(savedWater));
    }, []);

    const handleAddWater = () => {
        const newValue = waterIntake + 1;
        setWaterIntake(newValue);
        localStorage.setItem(`water_${getLocalDateString(new Date())}`, newValue.toString());
    };

    const handleConfirmDelete = async () => {
        if (!deletingCheckin) return;
        const { error } = await supabase.from('daily_checkins').delete().eq('id', deletingCheckin.id);
        if (error) console.error("Error deleting checkin:", error);
        else onDataRefresh();
        setDeletingCheckin(null);
    };

    const todayStr = getLocalDateString(new Date());
    const todaysDietLog = dietLogs.find(log => log.log_date === todayStr);

    // --- UI Logic for the New Design ---

    // 1. Calculate Next Meal
    const getNextMeal = () => {
        const hour = new Date().getHours();
        if (hour < 10) return { label: 'Desayuno', time: '08:00', key: 'desayuno' };
        if (hour < 13) return { label: 'Colación', time: '11:00', key: 'colacion_1' };
        if (hour < 16) return { label: 'Almuerzo', time: '14:00', key: 'comida' };
        if (hour < 19) return { label: 'Colación', time: '17:00', key: 'colacion_2' };
        return { label: 'Cena', time: '20:00', key: 'cena' };
    };
    const nextMeal = getNextMeal();

    // 2. Mock Data for the Circular Chart (In a real app, calculate from DietLog vs Goal)
    // Assuming a goal of 2000kcal
    const dailyGoal = 2000;
    const consumed = todaysDietLog ? (
        (todaysDietLog.desayuno ? 400 : 0) + 
        (todaysDietLog.comida ? 600 : 0) + 
        (todaysDietLog.cena ? 350 : 0) + 
        (todaysDietLog.colacion_1 ? 150 : 0) +
        (todaysDietLog.colacion_2 ? 150 : 0)
    ) : 0;
    const remaining = dailyGoal - consumed;
    const percentage = Math.min(100, Math.max(0, (consumed / dailyGoal) * 100));
    
    // Steps (Mock or from Exercise Log if exists)
    const steps = 4500; // Placeholder

    const CameraModal = () => (
        modalRoot ? createPortal(
            <div style={{...styles.modalOverlay, zIndex: 2000}}>
                <div style={{...styles.modalContent, maxWidth: '600px', padding: 0, borderRadius: '24px', overflow: 'hidden'}} className="fade-in">
                    <div style={{padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3 style={{margin: 0, fontSize: '1.1rem'}}>Subir Foto</h3>
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

    // --- Modern Styles ---
    const modernStyles = {
        container: {
            padding: '1.5rem',
            backgroundColor: '#F9FAFB', // Very light gray background
            minHeight: '100vh',
            fontFamily: "'Inter', sans-serif",
            maxWidth: '500px',
            margin: '0 auto',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        avatar: {
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            objectFit: 'cover' as const,
            border: '2px solid #10B981', // Green accent
        },
        greeting: {
            fontSize: '0.85rem',
            color: '#16A34A', // Green text
            fontWeight: 600,
            marginBottom: '2px',
        },
        name: {
            fontSize: '1.2rem',
            fontWeight: 800,
            color: '#1F2937',
            lineHeight: 1,
        },
        headerRight: {
            display: 'flex',
            gap: '12px',
        },
        iconBtn: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
        },
        sectionTitle: {
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '0.5rem',
        },
        dateSubtitle: {
            color: '#16A34A',
            fontSize: '1rem',
            fontWeight: 500,
            marginBottom: '2rem',
        },
        circularCard: {
            backgroundColor: '#FFFFFF',
            borderRadius: '32px',
            padding: '2rem',
            textAlign: 'center' as const,
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.08)',
            marginBottom: '1.5rem',
            position: 'relative' as const,
        },
        circularProgress: {
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: `conic-gradient(#10B981 ${percentage * 3.6}deg, #E5E7EB 0deg)`,
            margin: '0 auto 2rem auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative' as const,
        },
        innerCircle: {
            width: '190px',
            height: '190px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
        },
        flameIcon: {
            fontSize: '2rem',
            color: '#10B981',
            marginBottom: '0.5rem',
        },
        caloriesValue: {
            fontSize: '2.5rem',
            fontWeight: 900,
            color: '#111827',
            lineHeight: 1,
        },
        caloriesLabel: {
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#6B7280',
            letterSpacing: '1px',
            marginTop: '0.25rem',
        },
        statsRow: {
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: '1px solid #F3F4F6',
            paddingTop: '1.5rem',
        },
        statItem: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '6px',
        },
        statDot: (color: string) => ({
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
        }),
        statLabel: {
            fontSize: '0.8rem',
            color: '#6B7280',
            fontWeight: 600,
        },
        statValue: {
            fontSize: '1rem',
            fontWeight: 800,
            color: '#1F2937',
        },
        cardsGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
        },
        smallCard: {
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '1.25rem',
            boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: 'space-between',
            height: '160px',
        },
        cardIconBg: (color: string) => ({
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            marginBottom: '0.5rem',
        }),
        cardLabel: {
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#16A34A',
            marginBottom: '0.25rem',
        },
        cardValue: {
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#1F2937',
        },
        progressBarBg: {
            width: '100%',
            height: '6px',
            backgroundColor: '#F3F4F6',
            borderRadius: '3px',
            marginTop: 'auto',
        },
        progressBarFill: (percent: number, color: string) => ({
            width: `${percent}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '3px',
        }),
        waterGlass: (active: boolean) => ({
            fontSize: '1.5rem',
            opacity: active ? 1 : 0.3,
            cursor: 'pointer',
            transition: 'transform 0.2s',
        }),
        nextMealCard: {
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            position: 'relative' as const,
            marginBottom: '5rem', // Space for bottom actions
        },
        mealImage: {
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover' as const,
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        },
        mealInfo: {
            flex: 1,
        },
        nextMealLabel: {
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#16A34A',
            letterSpacing: '1px',
            textTransform: 'uppercase' as const,
            marginBottom: '0.25rem',
        },
        mealName: {
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#1F2937',
            marginBottom: '0.25rem',
        },
        mealTime: {
            fontSize: '1rem',
            color: '#6B7280',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        actionOverlay: {
            position: 'fixed' as const,
            bottom: '90px', // Above nav bar
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none' as const, // Let clicks pass through except buttons
            zIndex: 100,
        },
        mainFab: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#16A34A', // Primary Green
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 8px 20px rgba(22, 163, 74, 0.4)',
            border: '4px solid #FFFFFF',
            cursor: 'pointer',
            pointerEvents: 'auto' as const,
        },
        cameraButton: {
            position: 'absolute' as const,
            bottom: '20px',
            backgroundColor: '#1F2937',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            pointerEvents: 'auto' as const,
        },
        seeOptionsLink: {
            textAlign: 'center' as const,
            marginTop: '1.5rem',
            color: '#16A34A',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            paddingBottom: '2rem'
        }
    };

    return (
        <div className="fade-in" style={modernStyles.container}>
            {uploadingMealType && <CameraModal />}
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar tu registro del día?</p>} confirmText="Sí, eliminar" />}
            {viewingConsent && <ConsentRequestModal isOpen={!!viewingConsent} request={viewingConsent} onClose={() => setViewingConsent(null)} onDecision={onDataRefresh} />}

            {/* HEADER */}
            <div style={modernStyles.header}>
                <div style={modernStyles.headerLeft}>
                    <img 
                        src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name}&radius=50`} 
                        alt="Profile" 
                        style={modernStyles.avatar} 
                    />
                    <div>
                        <div style={modernStyles.greeting}>Bienvenido de nuevo</div>
                        <div style={modernStyles.name}>{person.full_name.split(' ')[0]}</div>
                    </div>
                </div>
                <div style={modernStyles.headerRight}>
                    <button style={modernStyles.iconBtn}>☀️</button>
                    <button style={modernStyles.iconBtn} onClick={() => onDataRefresh()}>🔔</button>
                </div>
            </div>

            {/* TITLE */}
            <h1 style={modernStyles.sectionTitle}>Tu día en un vistazo</h1>
            <p style={modernStyles.dateSubtitle}>
                Hoy, {new Date().toLocaleDateString('es-MX', {day: 'numeric', month: 'long'})}
            </p>

            {/* CIRCULAR SUMMARY CARD */}
            <div style={modernStyles.circularCard}>
                <div style={modernStyles.circularProgress}>
                    <div style={modernStyles.innerCircle}>
                        <div style={modernStyles.flameIcon}>🔥</div>
                        <div style={modernStyles.caloriesValue}>{remaining}</div>
                        <div style={modernStyles.caloriesLabel}>KCAL RESTANTES</div>
                    </div>
                </div>

                <div style={modernStyles.statsRow}>
                    <div style={modernStyles.statItem}>
                        <div style={{display:'flex', alignItems: 'center', gap: '6px'}}>
                            <div style={modernStyles.statDot('#10B981')}></div>
                            <span style={modernStyles.statLabel}>Calorías</span>
                        </div>
                        <span style={modernStyles.statValue}>{percentage.toFixed(0)}%</span>
                    </div>
                    <div style={modernStyles.statItem}>
                        <div style={{display:'flex', alignItems: 'center', gap: '6px'}}>
                            <div style={modernStyles.statDot('#3B82F6')}></div>
                            <span style={modernStyles.statLabel}>Pasos</span>
                        </div>
                        <span style={modernStyles.statValue}>{steps.toLocaleString()}</span>
                    </div>
                    <div style={modernStyles.statItem}>
                        <div style={{display:'flex', alignItems: 'center', gap: '6px'}}>
                            <div style={modernStyles.statDot('#F59E0B')}></div>
                            <span style={modernStyles.statLabel}>Agua</span>
                        </div>
                        <span style={modernStyles.statValue}>{(waterIntake * 0.25).toFixed(1)}L</span>
                    </div>
                </div>
            </div>

            {/* MIDDLE CARDS GRID */}
            <div style={modernStyles.cardsGrid}>
                {/* Protein Card */}
                <div style={modernStyles.smallCard}>
                    <div>
                        <div style={modernStyles.cardIconBg('#FEF3C7')}>🥚</div>
                        <div style={modernStyles.cardLabel}>Proteína</div>
                        <div style={modernStyles.cardValue}>85g</div>
                    </div>
                    <div style={modernStyles.progressBarBg}>
                        <div style={modernStyles.progressBarFill(65, '#F59E0B')}></div>
                    </div>
                </div>

                {/* Hydration Card */}
                <div style={modernStyles.smallCard}>
                    <div>
                        <div style={modernStyles.cardIconBg('#E0F2FE')}>💧</div>
                        <div style={modernStyles.cardLabel}>Hidratación</div>
                    </div>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px'}}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} onClick={handleAddWater} style={modernStyles.waterGlass(i <= waterIntake)}>🥤</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NEXT MEAL CARD */}
            <div style={modernStyles.nextMealCard}>
                 <img 
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" 
                    alt="Food" 
                    style={modernStyles.mealImage}
                 />
                 <div style={modernStyles.mealInfo}>
                     <div style={modernStyles.nextMealLabel}>PRÓXIMA COMIDA</div>
                     <div style={modernStyles.mealName}>{nextMeal.label}</div>
                     <div style={modernStyles.mealTime}>
                         <span>🕒</span> {nextMeal.time}
                     </div>
                 </div>
            </div>

            {/* OVERLAY ACTION BUTTONS */}
            <div style={modernStyles.actionOverlay}>
                {/* Camera AI Button */}
                <div 
                    style={{...modernStyles.cameraButton, left: '20px', bottom: '110px'}} 
                    onClick={() => setUploadingMealType(nextMeal.key)}
                >
                    <span>📷</span> Cámara AI
                </div>
                
                {/* Main FAB */}
                <div style={modernStyles.mainFab} onClick={() => setUploadingMealType(null)}>
                    +
                </div>
            </div>

            <div style={modernStyles.seeOptionsLink} onClick={() => onDataRefresh()}>
                Ver Opciones ➔
            </div>
            
        </div>
    );
};

export default PatientHomePage;
