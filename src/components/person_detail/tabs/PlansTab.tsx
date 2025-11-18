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

    // Enhanced button style for AI actions
    const aiButtonStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
        color: 'white',
        border: 'none',
        padding: '0.6rem 1.2rem',
        fontWeight: 600,
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'transform 0.2s, box-shadow 0.2s'
    };

    const manualButtonStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        color: 'var(--text-color)',
        border: '1px solid var(--border-color)',
        padding: '0.6rem 1.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    };


    return (
        <section className="fade-in">
            <nav className="sub-tabs" style={{marginBottom: '2rem'}}>
                <button className={`sub-tab-button ${activePlanTab === 'food' ? 'active' : ''}`} onClick={() => setActivePlanTab('food')}>Plan Alimentar</button>
                <button className={`sub-tab-button ${activePlanTab === 'exercise' ? 'active' : ''}`} onClick={() => setActivePlanTab('exercise')}>Rutina de Ejercicio</button>
            </nav>

            {activePlanTab === 'food' && (
                <div className="fade-in">
                    <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{flex: 1, minWidth: '200px'}}>
                            <h3 style={{margin: 0, fontSize: '1rem'}}>Acciones del Plan</h3>
                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)'}}>Crea o edita el menú semanal.</p>
                        </div>
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                            <button
                                onClick={onGenerateMeal}
                                disabled={!hasAiFeature}
                                style={aiButtonStyle}
                                title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar un plan de comidas usando IA"}
                                className="button-primary" // fallback class
                            >
                                {ICONS.sparkles} Generar con IA
                            </button>
                            <button onClick={onAddManualDiet} style={manualButtonStyle} className="button-secondary">
                                {ICONS.edit} Agregar Manualmente
                            </button>
                        </div>
                    </div>

                    <section>
                        <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem', borderBottom: 'none'}}>
                          <h2 style={{margin:0}}>Plan Reciente</h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                              <span style={{color: 'var(--text-color)', fontSize: '0.85rem', fontWeight: 500}}>Agrupar por semana</span>
                              <label className="switch">
                                <input type="checkbox" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} />
                                <span className="slider round"></span>
                              </label>
                          </div>
                        </div>
                        {isGrouped ? (
                            Object.keys(groupedRecentDietLogs).length > 0 ? Object.keys(groupedRecentDietLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '2rem'}}>
                                    <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h4>
                                    <DietPlanViewer dietLogs={groupedRecentDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')} />
                                </div>
                            )) : <p style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>No hay planes alimenticios recientes.</p>
                        ) : (
                            <DietPlanViewer dietLogs={recentDietLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')} />
                        )}
                    </section>
                    
                    {Object.keys(groupedDietHistory).length > 0 && (
                        <section style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                <h3 style={{margin: 0, fontSize: '1.2rem'}}>Historial Antiguo</h3>
                                <button onClick={() => setShowDietHistory(!showDietHistory)} className="button-secondary">{showDietHistory ? 'Ocultar' : 'Mostrar'}</button>
                            </div>
                            {showDietHistory && (
                                <div style={{marginTop: '1.5rem'}}>
                                {Object.keys(groupedDietHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                    <div key={weekStart} style={{marginBottom: '2rem'}}>
                                        <h4 style={{color: 'var(--text-light)', fontSize: '1rem'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
                                        <DietPlanViewer dietLogs={groupedDietHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día del plan alimenticio?')}/>
                                    </div>
                                ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}

            {activePlanTab === 'exercise' && (
                <div className="fade-in">
                     <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{flex: 1, minWidth: '200px'}}>
                            <h3 style={{margin: 0, fontSize: '1rem'}}>Acciones de Rutina</h3>
                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)'}}>Diseña el entrenamiento semanal.</p>
                        </div>
                        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                            <button
                                onClick={onGenerateExercise}
                                disabled={!hasAiFeature}
                                style={aiButtonStyle}
                                title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar una rutina de ejercicio usando IA"}
                            >
                                {ICONS.sparkles} Generar con IA
                            </button>
                            <button onClick={onAddManualExercise} style={manualButtonStyle} className="button-secondary">
                                {ICONS.edit} Agregar Manualmente
                            </button>
                        </div>
                    </div>

                    <section>
                         <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem', borderBottom: 'none'}}>
                          <h2 style={{margin:0}}>Rutina Reciente</h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                              <span style={{color: 'var(--text-color)', fontSize: '0.85rem', fontWeight: 500}}>Agrupar por semana</span>
                              <label className="switch">
                                <input type="checkbox" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} />
                                <span className="slider round"></span>
                              </label>
                          </div>
                        </div>
                        {isGrouped ? (
                            Object.keys(groupedRecentExerciseLogs).length > 0 ? Object.keys(groupedRecentExerciseLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                <div key={weekStart} style={{marginBottom: '2rem'}}>
                                    <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                        Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    </h4>
                                    <ExercisePlanViewer exerciseLogs={groupedRecentExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')} />
                                </div>
                            )) : <p style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>No hay rutinas de ejercicio recientes.</p>
                        ) : (
                            <ExercisePlanViewer exerciseLogs={recentExerciseLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')} />
                        )}
                    </section>
                    
                    {Object.keys(groupedExerciseHistory).length > 0 && (
                        <section style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                <h3 style={{margin: 0, fontSize: '1.2rem'}}>Historial Antiguo</h3>
                                <button onClick={() => setShowExerciseHistory(!showExerciseHistory)} className="button-secondary">{showExerciseHistory ? 'Ocultar' : 'Mostrar'}</button>
                            </div>
                            {showExerciseHistory && (
                                <div style={{marginTop: '1.5rem'}}>
                                {Object.keys(groupedExerciseHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                    <div key={weekStart} style={{marginBottom: '2rem'}}>
                                        <h4 style={{color: 'var(--text-light)', fontSize: '1rem'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
                                        <ExercisePlanViewer exerciseLogs={groupedExerciseHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día de la rutina?')}/>
                                    </div>
                                ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}
        </section>
    );
};