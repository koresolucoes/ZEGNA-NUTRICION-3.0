
import React, { FC, useMemo, useState, useEffect } from 'react';
import { DietLog, ExerciseLog } from '../../types';
import DietPlanViewer from '../../components/DietPlanViewer';
import ExercisePlanViewer from '../../components/ExercisePlanViewer';
import DietLogDetailModal from '../../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../../components/modals/ExerciseLogDetailModal';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import { supabase } from '../../supabase';

interface MyPlansPageProps {
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    onDataRefresh: () => void;
}

interface PlanBatch<T> {
    id: string;
    createdAt: Date;
    logs: T[];
    startDate: Date;
    endDate: Date;
    daysCount: number;
    isNewest: boolean;
}

// Configuración visual para las comidas
const MEAL_STYLES: Record<string, { label: string, icon: string, color: string, bg: string }> = {
    desayuno: { label: 'Desayuno', icon: '☕', color: '#F59E0B', bg: '#FFFBEB' }, // Amber
    colacion_1: { label: 'Colación M.', icon: '🍎', color: '#84CC16', bg: '#ECFCCB' }, // Lime
    comida: { label: 'Comida', icon: '🍽️', color: '#3B82F6', bg: '#EFF6FF' }, // Blue
    colacion_2: { label: 'Colación V.', icon: '🥜', color: '#8B5CF6', bg: '#F5F3FF' }, // Violet
    cena: { label: 'Cena', icon: '🌙', color: '#6366F1', bg: '#EEF2FF' }, // Indigo
};

// Helper to group logs by creation time (Batching)
const groupLogsByBatch = <T extends { log_date: string; created_at: string }>(logs: T[]): PlanBatch<T>[] => {
    if (!logs || logs.length === 0) return [];
    const sortedByCreation = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const batches: PlanBatch<T>[] = [];

    sortedByCreation.forEach(log => {
        const logCreatedTime = new Date(log.created_at).getTime();
        let batch = batches.find(b => Math.abs(b.createdAt.getTime() - logCreatedTime) < 300000); // 5 min window
        if (!batch) {
            batch = {
                id: log.created_at,
                createdAt: new Date(log.created_at),
                logs: [],
                startDate: new Date(log.log_date),
                endDate: new Date(log.log_date),
                daysCount: 0,
                isNewest: false
            };
            batches.push(batch);
        }
        batch.logs.push(log);
        const logDate = new Date(log.log_date);
        if (logDate < batch.startDate) batch.startDate = logDate;
        if (logDate > batch.endDate) batch.endDate = logDate;
    });

    batches.forEach(b => {
        b.daysCount = b.logs.length;
        b.logs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    });
    if (batches.length > 0) batches[0].isNewest = true;
    return batches;
};

const MyPlansPage: FC<MyPlansPageProps> = ({ dietLogs, exerciseLogs, onDataRefresh }) => {
    const [viewingDietLog, setViewingDietLog] = useState<DietLog | null>(null);
    const [viewingExerciseLog, setViewingExerciseLog] = useState<ExerciseLog | null>(null);
    const [activeTab, setActiveTab] = useState<'food' | 'exercise'>('food');
    const [expandedHistory, setExpandedHistory] = useState(false);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0); // For the horizontal date picker
    const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);

    // Compute batches
    const dietBatches = useMemo(() => groupLogsByBatch(dietLogs), [dietLogs]);
    const exerciseBatches = useMemo(() => groupLogsByBatch(exerciseLogs), [exerciseLogs]);

    const activeBatch = useMemo(() => {
        return activeTab === 'food' ? dietBatches[0] : exerciseBatches[0];
    }, [activeTab, dietBatches, exerciseBatches]);

    const historyBatches = useMemo(() => {
        return activeTab === 'food' ? dietBatches.slice(1) : exerciseBatches.slice(1);
    }, [activeTab, dietBatches, exerciseBatches]);

    // Reset date index when batch changes
    useEffect(() => {
        setSelectedDateIndex(0);
    }, [activeBatch]);

    // Helper: Find index of today in the active batch
    useEffect(() => {
        if (activeBatch && activeBatch.logs.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayIndex = activeBatch.logs.findIndex(l => l.log_date.startsWith(todayStr));
            if (todayIndex !== -1) setSelectedDateIndex(todayIndex);
        }
    }, [activeBatch]);


    const handleMarkComplete = async (log: DietLog | ExerciseLog) => {
        if (log.completed) return; 
        const isDietLog = 'desayuno' in log;
        const logType = isDietLog ? 'diet' : 'exercise';
        setUpdatingLogId(log.id);
    
        try {
            const { error } = await supabase.rpc('award_points_for_completed_plan', {
                p_log_id: log.id,
                p_log_type: logType
            });
            if (error && !error.message.includes('already been marked')) {
                console.error(`Error marking ${logType} log complete:`, error);
            }
            onDataRefresh();
        } catch (err: any) {
            console.error(`Error marking ${logType} log complete:`, err);
        } finally {
            setUpdatingLogId(null);
        }
    };

    const renderEmptyState = (text: string, icon: React.ReactNode) => (
        <div style={{ 
            textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--surface-color)', 
            borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-light)', marginTop: '1.5rem'
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>{icon}</div>
            <p style={{ fontSize: '1.1rem', margin: 0 }}>{text}</p>
        </div>
    );

    // --- SUB-COMPONENTS FOR ACTIVE VIEW ---

    const DateStrip = ({ logs, selectedIndex, onSelect }: { logs: any[], selectedIndex: number, onSelect: (i: number) => void }) => (
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.75rem', padding: '0.5rem 0 1.5rem 0', scrollBehavior: 'smooth' }} className="hide-scrollbar">
            {logs.map((log, index) => {
                const date = new Date(log.log_date);
                const isSelected = index === selectedIndex;
                const isCompleted = log.completed;
                
                return (
                    <button
                        key={log.id}
                        onClick={() => onSelect(index)}
                        style={{
                            minWidth: '65px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '0.75rem 0.5rem',
                            borderRadius: '16px',
                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--surface-color)',
                            color: isSelected ? 'white' : 'var(--text-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isSelected ? '0 4px 12px rgba(56, 189, 248, 0.4)' : 'none',
                            position: 'relative'
                        }}
                    >
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.6 }}>
                            {date.toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' }).slice(0,3)}
                        </span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0' }}>
                            {date.toLocaleDateString('es-MX', { day: 'numeric', timeZone: 'UTC' })}
                        </span>
                        {isCompleted && (
                            <div style={{
                                position: 'absolute', bottom: '-6px',
                                backgroundColor: isSelected ? 'white' : '#10B981',
                                color: isSelected ? 'var(--primary-color)' : 'white',
                                borderRadius: '50%', width: '16px', height: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem'
                            }}>✓</div>
                        )}
                    </button>
                );
            })}
        </div>
    );

    const MealCard = ({ type, content }: { type: string, content: string }) => {
        const style = MEAL_STYLES[type] || { label: 'Comida', icon: '🍽️', color: 'var(--text-color)', bg: 'var(--surface-color)' };
        
        return (
            <div style={{
                backgroundColor: 'var(--surface-color)', borderRadius: '16px', 
                border: '1px solid var(--border-color)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow)', transition: 'transform 0.2s'
            }} className="card-hover">
                <div style={{
                    padding: '0.75rem 1rem', backgroundColor: style.bg, 
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    borderBottom: `1px solid ${style.color}20`
                }}>
                    <span style={{fontSize: '1.4rem'}}>{style.icon}</span>
                    <span style={{fontWeight: 700, color: style.color, fontSize: '1rem'}}>{style.label}</span>
                </div>
                <div style={{ padding: '1.25rem', fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-color)' }}>
                    {content}
                </div>
            </div>
        );
    };

    const ActiveDietView = ({ log }: { log: DietLog }) => (
        <div className="fade-in">
             {/* Progress Header within the day */}
             <div style={{marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <h3 style={{margin: 0, fontSize: '1.2rem'}}>Menú del Día</h3>
                 {log.completed ? (
                     <span style={{color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px'}}>
                         {ICONS.check} Día Completado
                     </span>
                 ) : (
                     <button 
                        onClick={() => handleMarkComplete(log)} 
                        disabled={!!updatingLogId}
                        className="button-primary"
                        style={{padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '20px'}}
                     >
                         {updatingLogId === log.id ? '...' : 'Marcar Todo Comido'}
                     </button>
                 )}
             </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {log.desayuno && <MealCard type="desayuno" content={log.desayuno} />}
                {log.colacion_1 && <MealCard type="colacion_1" content={log.colacion_1} />}
                {log.comida && <MealCard type="comida" content={log.comida} />}
                {log.colacion_2 && <MealCard type="colacion_2" content={log.colacion_2} />}
                {log.cena && <MealCard type="cena" content={log.cena} />}
                
                {!log.desayuno && !log.comida && !log.cena && (
                    <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                        <p>No hay comidas registradas para este día.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const ActiveExerciseView = ({ log }: { log: ExerciseLog }) => {
        const exercises = (log.ejercicios as any[]) || [];
        return (
            <div className="fade-in">
                 <div style={{marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                     <div>
                        <h3 style={{margin: 0, fontSize: '1.2rem'}}>Rutina del Día</h3>
                        <p style={{margin: '0.25rem 0 0 0', color: 'var(--primary-color)', fontWeight: 600}}>{log.enfoque || 'General'}</p>
                     </div>
                     {log.completed ? (
                         <span style={{color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px'}}>
                             {ICONS.check} Rutina Cumplida
                         </span>
                     ) : (
                         <button 
                            onClick={() => handleMarkComplete(log)} 
                            disabled={!!updatingLogId}
                            className="button-primary"
                            style={{padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '20px'}}
                         >
                             {updatingLogId === log.id ? '...' : 'Terminar Rutina'}
                         </button>
                     )}
                 </div>

                 {exercises.length > 0 ? (
                     <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                         {exercises.map((ex, i) => (
                             <div key={i} style={{
                                 backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '12px',
                                 border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                 boxShadow: 'var(--shadow)'
                             }}>
                                 <div>
                                     <h4 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem'}}>{ex.nombre}</h4>
                                     <div style={{display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                         <span>🔄 {ex.series} series</span>
                                         <span>⚡ {ex.repeticiones} reps</span>
                                         <span>⏱️ {ex.descanso} descanso</span>
                                     </div>
                                 </div>
                                 <div style={{
                                     width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-hover-color)',
                                     display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'
                                 }}>
                                     {i + 1}
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                        <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🧘</div>
                        <p>Día de descanso o actividad libre.</p>
                    </div>
                 )}
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {viewingDietLog && <DietLogDetailModal log={viewingDietLog} onClose={() => setViewingDietLog(null)} />}
            {viewingExerciseLog && <ExerciseLogDetailModal log={viewingExerciseLog} onClose={() => setViewingExerciseLog(null)} />}

            {/* Header */}
            <div style={{marginBottom: '1.5rem'}}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Mis Planes</h1>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: 'var(--surface-hover-color)', padding: '4px', borderRadius: '14px', marginBottom: '2rem' }}>
                 <button 
                    onClick={() => setActiveTab('food')}
                    style={{
                        padding: '0.8rem', borderRadius: '10px', border: 'none',
                        backgroundColor: activeTab === 'food' ? 'var(--surface-color)' : 'transparent',
                        color: activeTab === 'food' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: activeTab === 'food' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    Alimentación
                </button>
                <button 
                    onClick={() => setActiveTab('exercise')}
                    style={{
                         padding: '0.8rem', borderRadius: '10px', border: 'none',
                        backgroundColor: activeTab === 'exercise' ? 'var(--surface-color)' : 'transparent',
                        color: activeTab === 'exercise' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: activeTab === 'exercise' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    Ejercicio
                </button>
            </div>

            {/* ACTIVE PLAN VIEW */}
            {activeBatch ? (
                <div style={{marginBottom: '3rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                         <span style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px'}}>PLAN ACTIVO</span>
                         <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Generado: {activeBatch.createdAt.toLocaleDateString()}</span>
                    </div>
                    
                    {/* Date Selector */}
                    <DateStrip 
                        logs={activeBatch.logs} 
                        selectedIndex={selectedDateIndex} 
                        onSelect={setSelectedDateIndex} 
                    />
                    
                    {/* Daily Content */}
                    {activeTab === 'food' 
                        ? <ActiveDietView log={activeBatch.logs[selectedDateIndex] as DietLog} />
                        : <ActiveExerciseView log={activeBatch.logs[selectedDateIndex] as ExerciseLog} />
                    }
                </div>
            ) : renderEmptyState(
                activeTab === 'food' ? "No hay un plan de alimentación activo." : "No hay rutinas de ejercicio activas.", 
                activeTab === 'food' ? ICONS.book : ICONS.activity
            )}

            {/* HISTORY SECTION */}
            {historyBatches.length > 0 && (
                <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                    <button 
                        onClick={() => setExpandedHistory(!expandedHistory)}
                        style={{
                            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer'
                        }}
                    >
                        <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-light)'}}>Historial de Planes</h3>
                        <span style={{transform: expandedHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-light)'}}>{ICONS.chevronDown}</span>
                    </button>
                    
                    {expandedHistory && (
                        <div className="fade-in" style={{display: 'grid', gap: '1rem'}}>
                            {historyBatches.map(batch => (
                                <div key={batch.id} style={{backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div>
                                            <p style={{margin: 0, fontWeight: 600, color: 'var(--text-color)'}}>
                                                Plan del {batch.startDate.toLocaleDateString()} al {batch.endDate.toLocaleDateString()}
                                            </p>
                                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>
                                                {batch.daysCount} días • {activeTab === 'food' ? 'Alimentación' : 'Ejercicio'}
                                            </p>
                                        </div>
                                        <button className="button-secondary" style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem'}}>Ver</button>
                                    </div>
                                    {/* Ideally we would show a simplified view or link to details here */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyPlansPage;
