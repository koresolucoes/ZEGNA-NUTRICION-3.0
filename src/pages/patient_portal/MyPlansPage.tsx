
import React, { FC, useMemo, useState } from 'react';
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

// Helper to group logs by creation time (Batching)
// Logs created within a 5-minute window are considered part of the same "Plan Generation"
const groupLogsByBatch = <T extends { log_date: string; created_at: string }>(logs: T[]): PlanBatch<T>[] => {
    if (!logs || logs.length === 0) return [];

    // Sort by creation date descending (newest first) to process latest plans first
    const sortedByCreation = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const batches: PlanBatch<T>[] = [];

    sortedByCreation.forEach(log => {
        const logCreatedTime = new Date(log.created_at).getTime();
        
        // Find an existing batch created within +/- 5 minutes of this log
        let batch = batches.find(b => Math.abs(b.createdAt.getTime() - logCreatedTime) < 300000); // 300,000ms = 5 minutes

        if (!batch) {
            batch = {
                id: log.created_at, // Use the first log's timestamp as ID
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

        // Update Batch Metadata
        const logDate = new Date(log.log_date);
        if (logDate < batch.startDate) batch.startDate = logDate;
        if (logDate > batch.endDate) batch.endDate = logDate;
    });

    // Finalize batches
    batches.forEach(b => {
        b.daysCount = b.logs.length;
        // Sort logs inside the batch by log_date (Chronological order of the plan)
        b.logs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    });

    // Mark the very first batch as the newest
    if (batches.length > 0) batches[0].isNewest = true;

    return batches;
};

const MyPlansPage: FC<MyPlansPageProps> = ({ dietLogs, exerciseLogs, onDataRefresh }) => {
    const [viewingDietLog, setViewingDietLog] = useState<DietLog | null>(null);
    const [viewingExerciseLog, setViewingExerciseLog] = useState<ExerciseLog | null>(null);
    const [activeTab, setActiveTab] = useState<'food' | 'exercise'>('food');
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
    const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);

    // Compute batches
    const dietBatches = useMemo(() => groupLogsByBatch(dietLogs), [dietLogs]);
    const exerciseBatches = useMemo(() => groupLogsByBatch(exerciseLogs), [exerciseLogs]);

    // Auto-expand the newest batch on load
    useMemo(() => {
        if (activeTab === 'food' && dietBatches.length > 0) {
             setExpandedBatches(new Set([dietBatches[0].id]));
        } else if (activeTab === 'exercise' && exerciseBatches.length > 0) {
             setExpandedBatches(new Set([exerciseBatches[0].id]));
        }
    }, [activeTab, dietBatches.length > 0, exerciseBatches.length > 0]);

    const toggleBatch = (id: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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
    
            if (error) {
                if (!error.message.includes('already been marked')) {
                    console.error(`Error marking ${logType} log complete:`, error);
                    alert("Error al marcar como completado.");
                }
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
            textAlign: 'center', 
            padding: '4rem 2rem', 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            color: 'var(--text-light)',
            marginTop: '1.5rem'
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>{icon}</div>
            <p style={{ fontSize: '1.1rem', margin: 0 }}>{text}</p>
        </div>
    );

    const PlanBatchCard: FC<{ batch: PlanBatch<any>, type: 'food' | 'exercise' }> = ({ batch, type }) => {
        const isExpanded = expandedBatches.has(batch.id);
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
        
        const borderColor = batch.isNewest ? 'var(--primary-color)' : 'var(--border-color)';
        const bgColor = batch.isNewest ? 'var(--surface-color)' : 'var(--surface-hover-color)';

        return (
            <div style={{ 
                marginBottom: '1.5rem', 
                borderRadius: '16px', 
                border: `1px solid ${borderColor}`,
                backgroundColor: bgColor,
                overflow: 'hidden',
                boxShadow: batch.isNewest ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
                opacity: batch.isNewest ? 1 : 0.8
            }} className="fade-in">
                {/* Header */}
                <div 
                    onClick={() => toggleBatch(batch.id)}
                    style={{
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                        transition: 'background 0.2s'
                    }}
                    className="nav-item-hover"
                >
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                             <h4 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)', fontWeight: 700}}>
                                {batch.isNewest ? '✨ Plan Actual' : 'Plan Anterior'}
                            </h4>
                            <span style={{fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 400}}>
                                Generado el {batch.createdAt.toLocaleDateString('es-MX')}
                            </span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                            <span>📅 {batch.startDate.toLocaleDateString('es-MX', dateOptions)} - {batch.endDate.toLocaleDateString('es-MX', dateOptions)}</span>
                            <span>•</span>
                            <span>{batch.daysCount} días</span>
                        </div>
                    </div>
                    
                    <span style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        color: 'var(--primary-color)',
                        fontSize: '1.5rem'
                    }}>
                        {ICONS.chevronDown}
                    </span>
                </div>

                {/* Content */}
                {isExpanded && (
                    <div style={{padding: '0', backgroundColor: 'var(--background-color)'}}>
                        {type === 'food' ? (
                            <DietPlanViewer 
                                dietLogs={batch.logs}
                                onViewDetails={setViewingDietLog}
                                onToggleComplete={handleMarkComplete}
                            />
                        ) : (
                            <ExercisePlanViewer 
                                exerciseLogs={batch.logs} 
                                onViewDetails={setViewingExerciseLog}
                                onToggleComplete={handleMarkComplete}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {viewingDietLog && (
                <DietLogDetailModal 
                    log={viewingDietLog} 
                    onClose={() => setViewingDietLog(null)} 
                />
            )}
            {viewingExerciseLog && (
                <ExerciseLogDetailModal 
                    log={viewingExerciseLog} 
                    onClose={() => setViewingExerciseLog(null)} 
                />
            )}

            <div style={{...styles.pageHeader, flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '2rem'}}>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Mis Planes</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>Consulta y marca tu progreso en alimentación y rutinas.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                 <button 
                    onClick={() => setActiveTab('food')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: activeTab === 'food' ? 'var(--primary-light)' : 'transparent',
                        color: activeTab === 'food' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {ICONS.book} Alimentación
                </button>
                <button 
                    onClick={() => setActiveTab('exercise')}
                    style={{
                         padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: activeTab === 'exercise' ? 'var(--primary-light)' : 'transparent',
                        color: activeTab === 'exercise' ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: 700,
                        cursor: 'pointer',
                         display: 'flex', alignItems: 'center', gap: '0.5rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {ICONS.activity} Ejercicio
                </button>
            </div>

            {activeTab === 'food' && (
                <section className="fade-in">
                    {dietBatches.length > 0 ? (
                        dietBatches.map(batch => (
                            <PlanBatchCard key={batch.id} batch={batch} type="food" />
                        ))
                    ) : renderEmptyState("No hay planes alimenticios asignados.", ICONS.book)}
                </section>
            )}
            
            {activeTab === 'exercise' && (
                <section className="fade-in">
                     {exerciseBatches.length > 0 ? (
                        exerciseBatches.map(batch => (
                            <PlanBatchCard key={batch.id} batch={batch} type="exercise" />
                        ))
                    ) : renderEmptyState("No hay rutinas de ejercicio asignadas.", ICONS.activity)}
                </section>
            )}
        </div>
    );
};

export default MyPlansPage;
