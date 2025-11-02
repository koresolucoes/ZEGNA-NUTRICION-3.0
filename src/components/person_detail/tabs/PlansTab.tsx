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
    const [activePlanTab, setActivePlanTab] = useState('food');
    const [isGrouped, setIsGrouped] = useState(false);
    const [showDietHistory, setShowDietHistory] = useState(false);
    const [showExerciseHistory, setShowExerciseHistory] = useState(false);

    const recentDietLogs = useMemo(() => allDietLogs.slice(0, 7).sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()), [allDietLogs]);
    const recentExerciseLogs = useMemo(() => allExerciseLogs.slice(0, 7).sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()), [allExerciseLogs]);
    
    const groupedRecentDietLogs = useMemo(() => groupLogsByWeek(recentDietLogs), [recentDietLogs]);
    const groupedRecentExerciseLogs = useMemo(() => groupLogsByWeek(recentExerciseLogs), [recentExerciseLogs]);
    
    const historicalDietLogs = useMemo(() => allDietLogs.slice(7), [allDietLogs]);
    const groupedDietHistory = useMemo(() => groupLogsByWeek(historicalDietLogs), [historicalDietLogs]);
    const historicalExerciseLogs = useMemo(() => allExerciseLogs.slice(7), [allExerciseLogs]);
    const groupedExerciseHistory = useMemo(() => groupLogsByWeek(historicalExerciseLogs), [historicalExerciseLogs]);


    return (
        <section className="fade-in">
            <nav className="sub-tabs">
                <button className={`sub-tab-button ${activePlanTab === 'food' ? 'active' : ''}`} onClick={() => setActivePlanTab('food')}>Plan Alimentar</button>
                <button className={`sub-tab-button ${activePlanTab === 'exercise' ? 'active' : ''}`} onClick={() => setActivePlanTab('exercise')}>Rutina de Ejercicio</button>
            </nav>

            {activePlanTab === 'food' && (
                <div className="fade-in">
                    <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={onGenerateMeal}
                            disabled={!hasAiFeature}
                            title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar un plan de comidas usando IA"}
                        >
                            {ICONS.sparkles} Generar Plan con IA
                        </button>
                        <button onClick={onAddManualDiet} className="button-secondary">{ICONS.edit} Agregar Día Manualmente</button>
                    </div>
                    <section>
                        <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem', borderBottom: 'none'}}>
                          <h2 style={{margin:0}}>Plan Alimenticio Reciente</h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>Agrupar por semana</span>
                              <label className="switch">
                                <input type="checkbox" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} />
                                <span className="slider round"></span>
                              </label>
                          </div>
                        </div>
                        {isGrouped ? (
                            Object.keys(groupedRecentDietLogs).length > 0 ? Object.keys(groupedRecentDietLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '1.5rem'}}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <DietPlanViewer dietLogs={groupedRecentDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')} />
                                </div>
                            )) : <p>No hay planes alimenticios disponibles.</p>
                        ) : (
                            <DietPlanViewer dietLogs={recentDietLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')} />
                        )}
                    </section>
                    <section style={{marginTop: '2rem'}}>
                        <button onClick={() => setShowDietHistory(!showDietHistory)} className="button-secondary">{showDietHistory ? 'Ocultar' : 'Ver'} Historial</button>
                        {showDietHistory && (
                            <div style={{marginTop: '1.5rem'}}>
                            {Object.keys(groupedDietHistory).length > 0 ? Object.keys(groupedDietHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <DietPlanViewer dietLogs={groupedDietHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')}/>
                                </div>
                            )) : <p style={{marginTop: '1rem'}}>No hay planes más antiguos en el historial.</p>}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activePlanTab === 'exercise' && (
                <div className="fade-in">
                    <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={onGenerateExercise}
                            disabled={!hasAiFeature}
                            title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar una rutina de ejercicio usando IA"}
                        >
                            {ICONS.sparkles} Generar Rutina con IA
                        </button>
                        <button onClick={onAddManualExercise} className="button-secondary">{ICONS.edit} Agregar Día Manualmente</button>
                    </div>
                    <section>
                         <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem', borderBottom: 'none'}}>
                          <h2 style={{margin:0}}>Rutina de Ejercicio Reciente</h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>Agrupar por semana</span>
                              <label className="switch">
                                <input type="checkbox" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} />
                                <span className="slider round"></span>
                              </label>
                          </div>
                        </div>
                        {isGrouped ? (
                            Object.keys(groupedRecentExerciseLogs).length > 0 ? Object.keys(groupedRecentExerciseLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '1.5rem'}}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <ExercisePlanViewer exerciseLogs={groupedRecentExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')} />
                                </div>
                            )) : <p>No hay rutinas de ejercicio disponibles.</p>
                        ) : (
                            <ExercisePlanViewer exerciseLogs={recentExerciseLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')} />
                        )}
                    </section>
                    <section style={{marginTop: '2rem'}}>
                        <button onClick={() => setShowExerciseHistory(!showExerciseHistory)} className="button-secondary">{showExerciseHistory ? 'Ocultar' : 'Ver'} Historial</button>
                        {showExerciseHistory && (
                            <div style={{marginTop: '1.5rem'}}>
                            {Object.keys(groupedExerciseHistory).length > 0 ? Object.keys(groupedExerciseHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart}>
                                    <h3 style={{color: 'var(--primary-color)'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h3>
                                    <ExercisePlanViewer exerciseLogs={groupedExerciseHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')}/>
                                </div>
                            )) : <p style={{marginTop: '1rem'}}>No hay rutinas más antiguas en el historial.</p>}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
};
