
import React, { FC, useMemo, useState, useEffect } from 'react';
import { DietLog, ExerciseLog } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { useClinic } from '../../contexts/ClinicContext'; 
import { supabase } from '../../supabase'; 
import MealSwapModal from '../../components/patient_portal/MealSwapModal';
import MealImageAnalyzer from '../../components/patient_portal/MealImageAnalyzer';
import { createPortal } from 'react-dom';

const modalRoot = document.getElementById('modal-root');

interface MyPlansPageProps {
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    onDataRefresh: () => void;
}

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MyPlansPage: FC<MyPlansPageProps> = ({ dietLogs, exerciseLogs, onDataRefresh }) => {
    // Generate dates for current week/month view (simplified to +/- 3 days from today for UI)
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'food' | 'exercise'>('food');
    
    // Swap Modal State
    const [swappingMeal, setSwappingMeal] = useState<{ logId: string; column: string; content: string } | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    
    // Camera Upload State
    const [uploadingMeal, setUploadingMeal] = useState<{ type: string; log: DietLog } | null>(null);

    // Fetch clinic ID for AI (Using the dietLog relationship would be cleaner, but simple fetch works for now)
    useEffect(() => {
        if (dietLogs.length > 0) {
             const fetchClinic = async () => {
                 // Assuming dietLogs have person_id, we can find clinic. Or use context if available higher up.
                 // For now, let's grab it from the person table using one of the logs
                 const { data } = await supabase.from('persons').select('clinic_id').eq('id', dietLogs[0].person_id).single();
                 if (data) setClinicId(data.clinic_id);
             };
             fetchClinic();
        }
    }, [dietLogs]);

    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
        // Generate a 7-day window centered on today
        for (let i = -3; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const selectedLogDateStr = selectedDate.toISOString().split('T')[0];
    const currentDietLog = dietLogs.find(l => l.log_date === selectedLogDateStr);
    const currentExerciseLog = exerciseLogs.find(l => l.log_date === selectedLogDateStr);

    const handleSwapClick = (column: string, content: string) => {
        if (!currentDietLog) return;
        setSwappingMeal({
            logId: currentDietLog.id,
            column,
            content
        });
    };
    
    const handleCameraClick = (mealType: string) => {
        if (currentDietLog) {
            setUploadingMeal({ type: mealType, log: currentDietLog });
        }
    };

    // --- Sub-Components ---
    
    const CalendarStrip = () => (
        <div style={{ backgroundColor: 'white', padding: '1rem 0', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem 1rem 1.5rem'}}>
                <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)'}}>{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</h2>
                <div style={{display: 'flex', gap: '0.5rem', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '20px'}}>
                    <button onClick={() => setViewMode('food')} style={{padding: '6px 14px', borderRadius: '16px', border: 'none', backgroundColor: viewMode === 'food' ? '#10B981' : 'transparent', color: viewMode === 'food' ? 'white' : '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'}}>Alimentación</button>
                     <button onClick={() => setViewMode('exercise')} style={{padding: '6px 14px', borderRadius: '16px', border: 'none', backgroundColor: viewMode === 'exercise' ? '#10B981' : 'transparent', color: viewMode === 'exercise' ? 'white' : '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'}}>Ejercicio</button>
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.8rem', padding: '0 1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
                {calendarDays.map((date, i) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                        <div 
                            key={i} 
                            onClick={() => setSelectedDate(date)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                                minWidth: '45px', flexShrink: 0
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--primary-color)' : '#9CA3AF', marginBottom: '6px', fontWeight: 700 }}>{WEEKDAYS[date.getDay()]}</span>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                backgroundColor: isSelected ? '#111827' : (isToday ? '#F3F4F6' : 'transparent'),
                                color: isSelected ? 'white' : '#1F293B',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '1rem',
                                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                                transition: 'all 0.2s'
                            }}>
                                {date.getDate()}
                            </div>
                            {isSelected && <div style={{width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginTop: '6px'}}></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const MealVisualCard = ({ title, time, content, kCal, imageKeyword, mealColumn }: { title: string, time: string, content: string, kCal: string, imageKeyword: string, mealColumn: string }) => {
        if (!content) return null;
        
        return (
            <div style={{
                backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
                boxShadow: '0 15px 40px -10px rgba(0,0,0,0.08)', marginBottom: '2rem',
                position: 'relative', border: '1px solid var(--border-color)'
            }} className="fade-in">
                <div style={{height: '220px', position: 'relative', backgroundColor: '#E5E7EB'}}>
                    {/* Gradient Overlay */}
                    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%)', zIndex: 1}}></div>
                    
                    {/* Placeholder image */}
                    <img 
                        src={`https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80`} 
                        style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                        alt={title}
                    />
                    
                    {/* Kcal Badge */}
                    <div style={{
                        position: 'absolute', top: '1rem', left: '1rem', zIndex: 2,
                        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        padding: '6px 14px', borderRadius: '20px',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <span style={{color: '#F59E0B', fontSize: '1rem'}}>🔥</span>
                        <span style={{color: 'white', fontSize: '0.85rem', fontWeight: 700}}>{kCal} Kcal</span>
                    </div>
                    
                    {/* Upload Button */}
                    <button 
                        onClick={() => handleCameraClick(mealColumn)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem', zIndex: 2,
                            backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '50%',
                            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '1.2rem'
                        }}
                        title="Subir foto"
                    >
                        📷
                    </button>

                    {/* Title Overlay */}
                    <div style={{position: 'absolute', bottom: '1.5rem', left: '1.5rem', zIndex: 2, right: '1.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                            <div>
                                <p style={{color: '#D1D5DB', fontSize: '0.8rem', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'}}>{title}</p>
                                <h3 style={{color: 'white', fontSize: '1.4rem', margin: '4px 0 0 0', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>
                                    {content.split(',')[0].split(' ').slice(0, 3).join(' ')}...
                                </h3>
                            </div>
                            <span style={{color: 'white', fontSize: '0.9rem', fontWeight: 600, opacity: 0.9}}>{time}</span>
                        </div>
                    </div>
                </div>

                <div style={{padding: '1.5rem'}}>
                    <div style={{marginBottom: '1.5rem'}}>
                        <h4 style={{fontSize: '1rem', marginBottom: '0.5rem', color: '#1F2937', fontWeight: 700}}>Ingredientes</h4>
                        <p style={{color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6, margin: 0}}>{content}</p>
                    </div>

                    <div style={{display: 'flex', gap: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem'}}>
                        <div style={{flex: 1}}>
                            <p style={{fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase'}}>Proteína</p>
                            <p style={{fontWeight: 700, color: '#1F2937', margin: '2px 0 0 0', fontSize: '1.1rem'}}>25g</p>
                        </div>
                        <div style={{flex: 1}}>
                            <p style={{fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase'}}>Carbos</p>
                            <p style={{fontWeight: 700, color: '#1F2937', margin: '2px 0 0 0', fontSize: '1.1rem'}}>45g</p>
                        </div>
                        <div style={{flex: 1}}>
                            <p style={{fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase'}}>Grasas</p>
                            <p style={{fontWeight: 700, color: '#1F2937', margin: '2px 0 0 0', fontSize: '1.1rem'}}>10g</p>
                        </div>
                        <div style={{flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                             <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#10B981', color: 'white', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                            }}>✓</div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => handleSwapClick(mealColumn, content)}
                        style={{
                            width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '16px',
                            backgroundColor: '#10B981', color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem',
                            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'transform 0.1s'
                        }}
                    >
                        <span style={{fontSize: '1.2rem'}}>🔄</span> Intercambiar Opción
                    </button>
                </div>
            </div>
        );
    };
    
    const ExerciseRow = ({ name, sets }: { name: string, sets: string }) => (
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: 'white', borderRadius: '20px', marginBottom: '1rem', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.02)'}}>
            <div style={{width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#4B5563'}}>
                💪
            </div>
            <div style={{flex: 1}}>
                <h4 style={{margin: 0, fontSize: '1rem', color: '#1F2937', fontWeight: 700}}>{name}</h4>
                <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6B7280'}}>{sets}</p>
            </div>
            <div style={{border: '2px solid #E5E7EB', borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563'}}>
                0 kg
            </div>
        </div>
    );
    
    const CameraModal = () => (
        modalRoot ? createPortal(
            <div style={{...styles.modalOverlay, zIndex: 2000}}>
                <div style={{...styles.modalContent, maxWidth: '600px', padding: 0, borderRadius: '24px', overflow: 'hidden'}} className="fade-in">
                    <div style={{padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3 style={{margin: 0, fontSize: '1.1rem'}}>Subir Foto de Comida</h3>
                        <button onClick={() => setUploadingMeal(null)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                    </div>
                    <div>
                        <MealImageAnalyzer 
                            todaysDietLog={uploadingMeal?.log || null} 
                            clinicId={clinicId || ''} 
                            personId={uploadingMeal?.log.person_id || ''}
                            onEntrySaved={() => setUploadingMeal(null)}
                            fixedMealType={uploadingMeal?.type}
                        />
                    </div>
                </div>
            </div>,
            modalRoot
        ) : null
    );

    return (
        <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '100px' }}>
            <CalendarStrip />
            
            {uploadingMeal && clinicId && <CameraModal />}

            {swappingMeal && clinicId && (
                <MealSwapModal 
                    isOpen={true} 
                    onClose={() => setSwappingMeal(null)} 
                    onSuccess={() => { setSwappingMeal(null); onDataRefresh(); }}
                    clinicId={clinicId}
                    logId={swappingMeal.logId}
                    mealColumn={swappingMeal.column}
                    originalContent={swappingMeal.content}
                />
            )}
            
            <div className="fade-in" style={{ padding: '0 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                {viewMode === 'food' ? (
                    currentDietLog ? (
                        <>
                            <MealVisualCard title="Desayuno" time="8:00 AM" content={currentDietLog.desayuno || ''} kCal="450" imageKeyword="breakfast" mealColumn="desayuno" />
                            {currentDietLog.colacion_1 && <MealVisualCard title="Comida 1: Pre-Entreno" time="11:00 AM" content={currentDietLog.colacion_1} kCal="200" imageKeyword="healthy snack" mealColumn="colacion_1" />}
                            <MealVisualCard title="Comida" time="2:30 PM" content={currentDietLog.comida || ''} kCal="600" imageKeyword="healthy lunch" mealColumn="comida" />
                            {currentDietLog.colacion_2 && <MealVisualCard title="Colación 2" time="6:00 PM" content={currentDietLog.colacion_2} kCal="150" imageKeyword="nuts" mealColumn="colacion_2" />}
                            <MealVisualCard title="Cena" time="9:00 PM" content={currentDietLog.cena || ''} kCal="350" imageKeyword="healthy dinner" mealColumn="cena" />
                        </>
                    ) : (
                        <div style={{textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF', border: '2px dashed #E5E7EB', borderRadius: '24px'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>📅</div>
                            <p>No hay plan asignado para este día.</p>
                        </div>
                    )
                ) : (
                    <div>
                         <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.3rem', color: '#1F2937', fontWeight: 800}}>
                             Entrenamiento de Hoy 
                             <span style={{color: '#10B981', fontSize: '0.9rem', marginLeft: '0.75rem', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '12px'}}>
                                 {currentExerciseLog?.enfoque || 'Descanso'}
                             </span>
                         </h3>
                         
                         {currentExerciseLog && Array.isArray(currentExerciseLog.ejercicios) && currentExerciseLog.ejercicios.length > 0 ? (
                             (currentExerciseLog.ejercicios as any[]).map((ex, i) => (
                                 <ExerciseRow key={i} name={ex.nombre} sets={`${ex.series} series x ${ex.repeticiones}`} />
                             ))
                         ) : (
                             <div style={{textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}>
                                 <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>🧘</div>
                                 <h3 style={{margin: 0, fontSize: '1.2rem'}}>Día de Descanso</h3>
                                 <p style={{color: '#6B7280', margin: '0.5rem 0 0 0'}}>Recupérate y mantente activo con caminata ligera.</p>
                             </div>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPlansPage;
