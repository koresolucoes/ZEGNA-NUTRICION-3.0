
import React, { FC, useMemo, useState } from 'react';
import { DietLog, ExerciseLog } from '../../types';
import DietPlanViewer from '../../components/DietPlanViewer';
import ExercisePlanViewer from '../../components/ExercisePlanViewer';
import DietLogDetailModal from '../../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../../components/modals/ExerciseLogDetailModal';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

interface MyPlansPageProps {
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
}

const groupLogsByWeek = (logs: (DietLog[] | ExerciseLog[])) => {
    if (!logs || logs.length === 0) return {};
    return logs.reduce((acc: { [key: string]: any[] }, log: any) => {
        const d = new Date(log.log_date);
        d.setUTCHours(12, 0, 0, 0);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setUTCDate(diff));
        const weekStartStr = weekStart.toISOString().split('T')[0];

        if (!acc[weekStartStr]) acc[weekStartStr] = [];
        acc[weekStartStr].push(log);
        return acc;
    }, {});
};

const MyPlansPage: FC<MyPlansPageProps> = ({ dietLogs, exerciseLogs }) => {
    const [viewingDietLog, setViewingDietLog] = useState<DietLog | null>(null);
    const [viewingExerciseLog, setViewingExerciseLog] = useState<ExerciseLog | null>(null);
    const [activeTab, setActiveTab] = useState<'food' | 'exercise'>('food');

    const groupedDietLogs = useMemo(() => groupLogsByWeek(dietLogs), [dietLogs]);
    const groupedExerciseLogs = useMemo(() => groupLogsByWeek(exerciseLogs), [exerciseLogs]);

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
                <p style={{ margin: 0, color: 'var(--text-light)' }}>Consulta tu historial de alimentación y rutinas.</p>
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
                    {Object.keys(groupedDietLogs).length > 0 ? (
                        Object.keys(groupedDietLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>📅</span>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-color)' }}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h3>
                                </div>
                                <DietPlanViewer 
                                    dietLogs={groupedDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())}
                                    onViewDetails={setViewingDietLog} 
                                />
                            </div>
                        ))
                    ) : renderEmptyState("No hay planes alimenticios asignados.", ICONS.book)}
                </section>
            )}
            
            {activeTab === 'exercise' && (
                <section className="fade-in">
                     {Object.keys(groupedExerciseLogs).length > 0 ? (
                        Object.keys(groupedExerciseLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <span style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>💪</span>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-color)' }}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h3>
                                </div>
                                <ExercisePlanViewer 
                                    exerciseLogs={groupedExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} 
                                    onViewDetails={setViewingExerciseLog}
                                />
                            </div>
                        ))
                    ) : renderEmptyState("No hay rutinas de ejercicio asignadas.", ICONS.activity)}
                </section>
            )}
        </div>
    );
};

export default MyPlansPage;
