
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
            {/* Segmented Control for Food/Exercise */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={styles.filterButtonGroup}>
                    <button 
                        className={`filter-button ${activePlanTab === 'food' ? 'active' : ''}`} 
                        onClick={() => setActivePlanTab('food')}
                        style={{ minWidth: '120px', justifyContent: 'center' }}
                    >
                        {ICONS.book} Alimentación
                    </button>
                    <button 
                        className={`filter-button ${activePlanTab === 'exercise' ? 'active' : ''}`} 
                        onClick={() => setActivePlanTab('exercise')}
                        style={{ minWidth: '120px', justifyContent: 'center' }}
                    >
                        {ICONS.activity} Ejercicio
                    </button>
                </div>
            </div>

            {/* Action Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.5rem', 
                backgroundColor: 'var(--surface-hover-color)', 
                borderRadius: '12px', 
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>
                        {activePlanTab === 'food' ? 'Plan Alimenticio Semanal' : 'Rutina de Entrenamiento'}
                    </h3>
                    <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                        {activePlanTab === 'food' ? 'Gestiona el menú y las comidas.' : 'Organiza los entrenamientos diarios.'}
                    </p>
                </div>
                <div style={{display: 'flex', gap: '0.75rem'}}>
                    <button
                        onClick={activePlanTab === 'food' ? onGenerateMeal : onGenerateExercise}
                        disabled={!hasAiFeature}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            color: 'white',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                        title={!hasAiFeature ? "Función Premium" : "Generar con IA"}
                    >
                        {ICONS.sparkles} Generar con IA
                    </button>
                    <button 
                        onClick={activePlanTab === 'food' ? onAddManualDiet : onAddManualExercise} 
                        className="button-secondary"
                        style={{backgroundColor: 'var(--surface-color)'}}
                    >
                        {ICONS.add} Manual
                    </button>
                </div>
            </div>

            {/* List Header & Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px'}}>
                    Próximos Días
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>Agrupar por semana</span>
                    <label className="switch">
                        <input type="checkbox" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            {activePlanTab === 'food' && (
                <div className="fade-in">
                    {isGrouped ? (
                        Object.keys(groupedRecentDietLogs).length > 0 ? Object.keys(groupedRecentDietLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{marginBottom: '2rem'}}>
                                <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                    Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                </h4>
                                <DietPlanViewer dietLogs={groupedRecentDietLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día?')} />
                            </div>
                        )) : <p style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>No hay planes recientes.</p>
                    ) : (
                        <DietPlanViewer dietLogs={recentDietLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día?')} />
                    )}
                    
                    {Object.keys(groupedDietHistory).length > 0 && (
                        <div style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                            <button onClick={() => setShowDietHistory(!showDietHistory)} className="button-secondary" style={{width: '100%'}}>
                                {showDietHistory ? 'Ocultar Historial Antiguo' : 'Mostrar Historial Antiguo'}
                            </button>
                            {showDietHistory && (
                                <div style={{marginTop: '1.5rem'}}>
                                {Object.keys(groupedDietHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                    <div key={weekStart} style={{marginBottom: '2rem'}}>
                                        <h4 style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
                                        <DietPlanViewer dietLogs={groupedDietHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditDietLog} onViewDetails={onViewDietLog} onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar?')}/>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activePlanTab === 'exercise' && (
                <div className="fade-in">
                     {isGrouped ? (
                        Object.keys(groupedRecentExerciseLogs).length > 0 ? Object.keys(groupedRecentExerciseLogs).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{marginBottom: '2rem'}}>
                                <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                    Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                </h4>
                                <ExercisePlanViewer exerciseLogs={groupedRecentExerciseLogs[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día?')} />
                            </div>
                        )) : <p style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>No hay rutinas recientes.</p>
                    ) : (
                        <ExercisePlanViewer exerciseLogs={recentExerciseLogs.sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día?')} />
                    )}
                    
                    {Object.keys(groupedExerciseHistory).length > 0 && (
                        <div style={{marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem'}}>
                            <button onClick={() => setShowExerciseHistory(!showExerciseHistory)} className="button-secondary" style={{width: '100%'}}>
                                {showExerciseHistory ? 'Ocultar Historial Antiguo' : 'Mostrar Historial Antiguo'}
                            </button>
                            {showExerciseHistory && (
                                <div style={{marginTop: '1.5rem'}}>
                                {Object.keys(groupedExerciseHistory).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                                    <div key={weekStart} style={{marginBottom: '2rem'}}>
                                        <h4 style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
                                        <ExercisePlanViewer exerciseLogs={groupedExerciseHistory[weekStart].sort((a,b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())} onEdit={onEditExerciseLog} onViewDetails={onViewExerciseLog} onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar?')}/>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};
