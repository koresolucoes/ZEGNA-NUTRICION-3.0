import React, { FC, useState, useMemo } from 'react';
import { DietLog, ExerciseLog } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import DietPlanViewer from '../../DietPlanViewer';
import ExercisePlanViewer from '../../ExercisePlanViewer';

// Helper to group logs by week
const groupLogsByWeek = (logs: (DietLog[] | ExerciseLog[])) => {
    if (!logs || logs.length === 0) return {};
    return logs.reduce((acc: { [key: string]: any[] }, log: any) => {
        const d = new Date(log.log_date);
        d.setUTCHours(12,0,0,0);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setUTCDate(diff));
        const weekStartStr = weekStart.toISOString().split('T')[0];

        if (!acc[weekStartStr]) {
            acc[weekStartStr] = [];
        }
        acc[weekStartStr].push(log);
        return acc;
    }, {});
};

interface PlansTabProps {
    allDietLogs: DietLog[];
    allExerciseLogs: ExerciseLog[];
    onGenerateMeal: () => void;
    onGenerateExercise: () => void;
    onAddManualDiet: () => void;
    onAddManualExercise: () => void;
    onEditDietLog: (log: DietLog) => void;
    onViewDietLog: (log: DietLog) => void;
    onEditExerciseLog: (log: ExerciseLog) => void;
    onViewExerciseLog: (log: ExerciseLog) => void;
    openModal: (action: 'deleteDietLog' | 'deleteExerciseLog', id: string, text: string) => void;
    hasAiFeature: boolean;
}

export const PlansTab: FC<PlansTabProps> = ({
    allDietLogs, allExerciseLogs, onGenerateMeal, onGenerateExercise, onAddManualDiet, onAddManualExercise,
    onEditDietLog, onViewDietLog, onEditExerciseLog, onViewExerciseLog, openModal, hasAiFeature
}) => {
    const [showDietHistory, setShowDietHistory] = useState(false);
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);

    const recentDietLogs = useMemo(() => allDietLogs.slice(0, 7).sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()), [allDietLogs]);
    const recentExerciseLogs = useMemo(() => allExerciseLogs.slice(0, 7).sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()), [allExerciseLogs]);
    
    const historicalDietLogs = useMemo(() => allDietLogs.slice(7), [allDietLogs]);
    const historicalExerciseLogs = useMemo(() => allExerciseLogs.slice(7), [allExerciseLogs]);
    
    const groupedDietHistory = useMemo(() => groupLogsByWeek(historicalDietLogs), [historicalDietLogs]);
    const groupedExerciseHistory = useMemo(() => groupLogsByWeek(historicalExerciseLogs), [historicalExerciseLogs]);


    return (
        <section className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
                <div className="section-header">
                     <h2 className="section-title">Plan Alimenticio</h2>
                </div>
                 <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={onGenerateMeal}
                        disabled={!hasAiFeature}
                        title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar un plan de comidas usando IA"}
                    >
                        {ICONS.sparkles} Generar con IA
                    </button>
                    <button onClick={onAddManualDiet} className="button-secondary">{ICONS.edit} Agregar Día Manualmente</button>
                </div>
                <DietPlanViewer dietLogs={recentDietLogs} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')} />

                {historicalDietLogs.length > 0 && (
                    <div style={{marginTop: '1.5rem'}}>
                        <button onClick={() => setShowDietHistory(!showDietHistory)} className="button-secondary">{showDietHistory ? 'Ocultar' : 'Ver'} Historial de Planes Alimenticios</button>
                        {showDietHistory && (
                            <div style={{marginTop: '1.5rem'}}>
                            {Object.keys(groupedDietHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '1.5rem'}}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <DietPlanViewer dietLogs={groupedDietHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')}/>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <div className="section-header">
                     <h2 className="section-title">Rutina de Ejercicio</h2>
                </div>
                 <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={onGenerateExercise}
                        disabled={!hasAiFeature}
                        title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar una rutina de ejercicio usando IA"}
                    >
                        {ICONS.sparkles} Generar con IA
                    </button>
                    <button onClick={onAddManualExercise} className="button-secondary">{ICONS.edit} Agregar Día Manualmente</button>
                </div>
                 <ExercisePlanViewer exerciseLogs={recentExerciseLogs} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')} />

                 {historicalExerciseLogs.length > 0 && (
                     <div style={{marginTop: '1.5rem'}}>
                        <button onClick={() => setShowExerciseHistory(!showExerciseHistory)} className="button-secondary">{showExerciseHistory ? 'Ocultar' : 'Ver'} Historial de Rutinas</button>
                        {showExerciseHistory && (
                            <div style={{marginTop: '1.5rem'}}>
                            {Object.keys(groupedExerciseHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '1.5rem'}}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <ExercisePlanViewer exerciseLogs={groupedExerciseHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')}/>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                 )}
            </div>
        </section>
    );
};