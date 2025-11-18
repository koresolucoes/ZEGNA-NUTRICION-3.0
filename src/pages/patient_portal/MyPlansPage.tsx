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
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-light)'
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

            <div style={styles.pageHeader}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mis Planes</h1>
            </div>
            <p style={{ color: 'var(--text-light)', marginTop: '-1.5rem', marginBottom: '2rem' }}>
                Consulta el historial detallado de tu alimentación y rutinas de ejercicio.
            </p>

            <nav className="tabs" style={{ marginBottom: '2rem' }}>
                <button 
                    className={`tab-button ${activeTab === 'food' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('food')}
                >
                    Plan Alimenticio
                </button>
                <button 
                    className={`tab-button ${activeTab === 'exercise' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('exercise')}
                >
                    Rutinas de Ejercicio
                </button>
            </nav>

            {activeTab === 'food' && (
                <section className="fade-in">
                    {Object.keys(groupedDietLogs).length > 0 ? (
                        Object.keys(groupedDietLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--primary-color)' }}>{ICONS.calendar}</span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h3>
                                </div>
                                <DietPlanViewer 
                                    dietLogs={groupedDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())}
                                    onViewDetails={setViewingDietLog} 
                                />
                            </div>
                        ))
                    ) : renderEmptyState("No hay planes alimenticios asignados aún.", ICONS.book)}
                </section>
            )}
            
            {activeTab === 'exercise' && (
                <section className="fade-in">
                     {Object.keys(groupedExerciseLogs).length > 0 ? (
                        Object.keys(groupedExerciseLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--primary-color)' }}>{ICONS.activity}</span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h3>
                                </div>
                                <ExercisePlanViewer 
                                    exerciseLogs={groupedExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} 
                                    onViewDetails={setViewingExerciseLog}
                                />
                            </div>
                        ))
                    ) : renderEmptyState("No hay rutinas de ejercicio asignadas aún.", ICONS.activity)}
                </section>
            )}
        </div>
    );
};

export default MyPlansPage;