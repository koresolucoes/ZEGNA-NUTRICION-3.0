import React, { FC, useMemo, useState } from 'react';
import { DietLog, ExerciseLog } from '../../types';
import DietPlanViewer from '../../components/DietPlanViewer';
import ExercisePlanViewer from '../../components/ExercisePlanViewer';
import DietLogDetailModal from '../../components/modals/DietLogDetailModal';
import ExerciseLogDetailModal from '../../components/modals/ExerciseLogDetailModal';

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

    const groupedDietLogs = useMemo(() => groupLogsByWeek(dietLogs), [dietLogs]);
    const groupedExerciseLogs = useMemo(() => groupLogsByWeek(exerciseLogs), [exerciseLogs]);

    return (
        <div className="fade-in">
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

            <h1 style={{ color: 'var(--primary-color)' }}>Mis Planes</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Consulta el historial de tus planes alimenticios y rutinas de ejercicio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <section>
                    <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                        Planes Alimenticios
                    </h2>
                    {Object.keys(groupedDietLogs).length > 0 ? (
                        Object.keys(groupedDietLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '2rem' }}>
                                <h3 style={{ color: 'var(--accent-color)' }}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                <DietPlanViewer 
                                    dietLogs={groupedDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())}
                                    onViewDetails={setViewingDietLog} 
                                />
                            </div>
                        ))
                    ) : (
                        <p>No se han encontrado planes alimenticios.</p>
                    )}
                </section>
                
                <section>
                    <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                        Rutinas de Ejercicio
                    </h2>
                     {Object.keys(groupedExerciseLogs).length > 0 ? (
                        Object.keys(groupedExerciseLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{ marginBottom: '2rem' }}>
                                <h3 style={{ color: 'var(--accent-color)' }}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                <ExercisePlanViewer 
                                    exerciseLogs={groupedExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} 
                                    onViewDetails={setViewingExerciseLog}
                                />
                            </div>
                        ))
                    ) : (
                        <p>No se han encontrado rutinas de ejercicio.</p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MyPlansPage;