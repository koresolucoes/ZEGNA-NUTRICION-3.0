
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

// Helper to get images based on meal type
const getMealImage = (type: string) => {
    switch(type) {
        case 'desayuno': return "https://images.unsplash.com/photo-1533089862017-ec326aa0538b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Pancakes/Juice
        case 'colacion_1': return "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Fruit
        case 'comida': return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Healthy Bowl
        case 'colacion_2': return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Salad/Snack
        case 'cena': return "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Plated Dinner
        default: return "https://images.unsplash.com/photo-1543353071-873f17a7a088?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80";
    }
};

const getExerciseImage = (focus: string = "") => {
    const f = focus.toLowerCase();
    if (f.includes('cardio') || f.includes('correr')) return "https://images.unsplash.com/photo-1538805060512-e2196156e312?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80";
    if (f.includes('fuerza') || f.includes('pesas') || f.includes('superior') || f.includes('inferior')) return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80";
    if (f.includes('yoga') || f.includes('flexibilidad')) return "https://images.unsplash.com/photo-1544367563-12123d896889?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80";
    return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"; // Default Gym
};


const MyPlansPage: FC<MyPlansPageProps> = ({ dietLogs, exerciseLogs, onDataRefresh }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'food' | 'exercise'>('food');
    
    // Swap Modal State
    const [swappingItem, setSwappingItem] = useState<{ logId: string; column: string; content: string; type: 'food' | 'exercise'; table: 'diet_logs' | 'exercise_logs' } | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    
    // Camera Upload State
    const [uploadingMeal, setUploadingMeal] = useState<{ type: string; log: DietLog } | null>(null);

    useEffect(() => {
        if (dietLogs.length > 0) {
             const fetchClinic = async () => {
                 const { data } = await supabase.from('persons').select('clinic_id').eq('id', dietLogs[0].person_id).single();
                 if (data) setClinicId(data.clinic_id);
             };
             fetchClinic();
        }
    }, [dietLogs]);

    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
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

    const handleSwapFood = (column: string, content: string) => {
        if (!currentDietLog) return;
        setSwappingItem({
            logId: currentDietLog.id,
            column,
            content,
            type: 'food',
            table: 'diet_logs'
        });
    };
    
    const handleSwapExercise = (content: string) => {
        if (!currentExerciseLog) return;
        setSwappingItem({
            logId: currentExerciseLog.id,
            column: 'enfoque', // We swap the focus/description for simple exercise changes
            content,
            type: 'exercise',
            table: 'exercise_logs'
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
                     <button onClick={() => setViewMode('exercise')} style={{padding: '6px 14px', borderRadius: '16px', border: 'none', backgroundColor: viewMode === 'exercise' ? '#3B82F6' : 'transparent', color: viewMode === 'exercise' ? 'white' : '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'}}>Ejercicio</button>
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

    const VisualCard = ({ 
        title, time, content, badgeText, badgeIcon, imageUrl, onSwap, onCamera, swapColor = '#10B981', type = 'food' 
    }: { title: string, time: string, content: string, badgeText: string, badgeIcon: string, imageUrl: string, onSwap: () => void, onCamera?: () => void, swapColor?: string, type?: 'food' | 'exercise' }) => {
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
                    
                    <img 
                        src={imageUrl} 
                        style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                        alt={title}
                    />
                    
                    {/* Badge */}
                    <div style={{
                        position: 'absolute', top: '1rem', left: '1rem', zIndex: 2,
                        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        padding: '6px 14px', borderRadius: '20px',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <span style={{color: '#F59E0B', fontSize: '1rem'}}>{badgeIcon}</span>
                        <span style={{color: 'white', fontSize: '0.85rem', fontWeight: 700}}>{badgeText}</span>
                    </div>
                    
                    {/* Upload Button (Only for food) */}
                    {onCamera && (
                        <button 
                            onClick={onCamera}
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
                    )}

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
                        <h4 style={{fontSize: '1rem', marginBottom: '0.5rem', color: '#1F2937', fontWeight: 700}}>{type === 'food' ? 'Ingredientes' : 'Detalles'}</h4>
                        <p style={{color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6, margin: 0}}>{content}</p>
                    </div>

                    {type === 'food' && (
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
                        </div>
                    )}
                    
                    <button 
                        onClick={onSwap}
                        style={{
                            width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '16px',
                            backgroundColor: swapColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem',
                            boxShadow: `0 8px 20px ${swapColor}40`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'transform 0.1s'
                        }}
                    >
                        <span style={{fontSize: '1.2rem'}}>🔄</span> Intercambiar {type === 'exercise' ? 'Rutina' : 'Opción'}
                    </button>
                </div>
            </div>
        );
    };
    
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

            {swappingItem && clinicId && (
                <MealSwapModal 
                    isOpen={true} 
                    onClose={() => setSwappingItem(null)} 
                    onSuccess={() => { setSwappingItem(null); onDataRefresh(); }}
                    clinicId={clinicId}
                    logId={swappingItem.logId}
                    mealColumn={swappingItem.column}
                    originalContent={swappingItem.content}
                    type={swappingItem.type}
                    tableName={swappingItem.table}
                />
            )}
            
            <div className="fade-in" style={{ padding: '0 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                {viewMode === 'food' ? (
                    currentDietLog ? (
                        <>
                            <VisualCard title="Desayuno" time="8:00 AM" content={currentDietLog.desayuno || ''} badgeText="450 Kcal" badgeIcon="🔥" imageUrl={getMealImage('desayuno')} onSwap={() => handleSwapFood('desayuno', currentDietLog.desayuno || '')} onCamera={() => handleCameraClick('desayuno')} />
                            {currentDietLog.colacion_1 && <VisualCard title="Comida 1" time="11:00 AM" content={currentDietLog.colacion_1} badgeText="200 Kcal" badgeIcon="🔥" imageUrl={getMealImage('colacion_1')} onSwap={() => handleSwapFood('colacion_1', currentDietLog.colacion_1 || '')} onCamera={() => handleCameraClick('colacion_1')} />}
                            <VisualCard title="Comida" time="2:30 PM" content={currentDietLog.comida || ''} badgeText="600 Kcal" badgeIcon="🔥" imageUrl={getMealImage('comida')} onSwap={() => handleSwapFood('comida', currentDietLog.comida || '')} onCamera={() => handleCameraClick('comida')} />
                            {currentDietLog.colacion_2 && <VisualCard title="Colación 2" time="6:00 PM" content={currentDietLog.colacion_2} badgeText="150 Kcal" badgeIcon="🔥" imageUrl={getMealImage('colacion_2')} onSwap={() => handleSwapFood('colacion_2', currentDietLog.colacion_2 || '')} onCamera={() => handleCameraClick('colacion_2')} />}
                            <VisualCard title="Cena" time="9:00 PM" content={currentDietLog.cena || ''} badgeText="350 Kcal" badgeIcon="🔥" imageUrl={getMealImage('cena')} onSwap={() => handleSwapFood('cena', currentDietLog.cena || '')} onCamera={() => handleCameraClick('cena')} />
                        </>
                    ) : (
                        <div style={{textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF', border: '2px dashed #E5E7EB', borderRadius: '24px'}}>
                            <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>📅</div>
                            <p>No hay plan asignado para este día.</p>
                        </div>
                    )
                ) : (
                    <div>
                         {currentExerciseLog ? (
                             <>
                                <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.3rem', color: '#1F2937', fontWeight: 800}}>
                                    Objetivo: <span style={{color: '#3B82F6'}}>{currentExerciseLog.enfoque || 'General'}</span>
                                </h3>
                                
                                <VisualCard 
                                    title="Rutina Principal" 
                                    time="60 min" 
                                    content={currentExerciseLog.enfoque || 'Entrenamiento del día'} 
                                    badgeText="Fuerza/Cardio" 
                                    badgeIcon="💪" 
                                    imageUrl={getExerciseImage(currentExerciseLog.enfoque || '')} 
                                    onSwap={() => handleSwapExercise(currentExerciseLog.enfoque || '')}
                                    swapColor="#3B82F6"
                                    type="exercise"
                                />

                                {Array.isArray(currentExerciseLog.ejercicios) && currentExerciseLog.ejercicios.length > 0 && (
                                    <div style={{marginTop: '2rem'}}>
                                        <h4 style={{fontSize: '1.1rem', marginBottom: '1rem', color: '#374151', fontWeight: 700}}>Detalle de Ejercicios</h4>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                            {(currentExerciseLog.ejercicios as any[]).map((ex, i) => (
                                                <div key={i} style={{backgroundColor: 'white', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #F3F4F6'}}>
                                                    <div style={{width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800}}>{i+1}</div>
                                                    <div style={{flex: 1}}>
                                                        <h5 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1F2937'}}>{ex.nombre}</h5>
                                                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6B7280'}}>{ex.series} series x {ex.repeticiones}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                             </>
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
