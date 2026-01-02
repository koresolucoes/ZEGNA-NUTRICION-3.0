import React, { FC, useState, useMemo } from 'react';
import { DietLog, ExerciseLog } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import DietPlanViewer from '../../DietPlanViewer';
import ExercisePlanViewer from '../../ExercisePlanViewer';
import PdfPreviewModal from '../../shared/PdfPreviewModal';

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
    personName?: string;
}

export const PlansTab: FC<PlansTabProps> = ({
    allDietLogs, allExerciseLogs, onGenerateMeal, onGenerateExercise, onAddManualDiet, onAddManualExercise,
    onEditDietLog, onViewDietLog, onEditExerciseLog, onViewExerciseLog, openModal, hasAiFeature, personName
}) => {
    const [activePlanTab, setActivePlanTab] = useState<'food' | 'exercise'>('food');
    const [isGrouped, setIsGrouped] = useState(false);
    
    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Consolidated filtering and sorting logic
    const filteredAndSortedLogs = useMemo(() => {
        const sourceLogs = activePlanTab === 'food' ? allDietLogs : allExerciseLogs;
        
        return sourceLogs.filter((log: any) => {
            const logDate = new Date(log.log_date);
            const start = startDate ? new Date(startDate + 'T00:00:00') : null;
            const end = endDate ? new Date(endDate + 'T23:59:59') : null;
            
            // Date Range Filter
            if (start && logDate < start) return false;
            if (end && logDate > end) return false;
            
            // Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (activePlanTab === 'food') {
                    const d = log as DietLog;
                    const content = `${d.desayuno} ${d.comida} ${d.cena} ${d.colacion_1} ${d.colacion_2}`.toLowerCase();
                    return content.includes(term);
                } else {
                    const e = log as ExerciseLog;
                    const exContent = (e.ejercicios as any[] || []).map(ex => `${ex.nombre} ${ex.series} ${ex.repeticiones}`).join(' ').toLowerCase();
                    return (e.enfoque?.toLowerCase().includes(term) || exContent.includes(term));
                }
            }
            
            return true;
        }).sort((a: any, b: any) => {
            const dateA = new Date(a.log_date).getTime();
            const dateB = new Date(b.log_date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }, [allDietLogs, allExerciseLogs, activePlanTab, startDate, endDate, searchTerm, sortOrder]);

    const groupedLogs = useMemo(() => {
        return isGrouped ? groupLogsByWeek(filteredAndSortedLogs) : {};
    }, [isGrouped, filteredAndSortedLogs]);

    const getPrintHtml = () => {
        const title = activePlanTab === 'food' ? 'Plan de Alimentación' : 'Rutina de Ejercicio';
        const rows = filteredAndSortedLogs.map((log: any) => {
            const date = new Date(log.log_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
            
            if (activePlanTab === 'food') {
                const d = log as DietLog;
                return `
                    <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
                        <h3 style="margin-top: 0; color: #3B82F6; border-bottom: 1px solid #eee; padding-bottom: 5px;">${date}</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            ${d.desayuno ? `<tr><td style="font-weight: bold; width: 100px; padding: 4px 0;">Desayuno:</td><td>${d.desayuno}</td></tr>` : ''}
                            ${d.colacion_1 ? `<tr><td style="font-weight: bold; width: 100px; padding: 4px 0;">Colación 1:</td><td>${d.colacion_1}</td></tr>` : ''}
                            ${d.comida ? `<tr><td style="font-weight: bold; width: 100px; padding: 4px 0;">Comida:</td><td>${d.comida}</td></tr>` : ''}
                            ${d.colacion_2 ? `<tr><td style="font-weight: bold; width: 100px; padding: 4px 0;">Colación 2:</td><td>${d.colacion_2}</td></tr>` : ''}
                            ${d.cena ? `<tr><td style="font-weight: bold; width: 100px; padding: 4px 0;">Cena:</td><td>${d.cena}</td></tr>` : ''}
                        </table>
                    </div>
                `;
            } else {
                const e = log as ExerciseLog;
                const exercises = (e.ejercicios as any[]) || [];
                const exRows = exercises.map(ex => `<li><strong>${ex.nombre}</strong>: ${ex.series} series, ${ex.repeticiones} reps. Descanso: ${ex.descanso}</li>`).join('');
                return `
                    <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
                        <h3 style="margin-top: 0; color: #F59E0B; border-bottom: 1px solid #eee; padding-bottom: 5px;">${date}</h3>
                        <p><strong>Enfoque:</strong> ${e.enfoque || 'General'}</p>
                        <ul>${exRows}</ul>
                    </div>
                `;
            }
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; font-size: 12pt; line-height: 1.5; color: #333; }
                    h1 { text-align: center; color: #111; }
                    h2 { text-align: center; color: #555; font-weight: normal; margin-top: 0; }
                </style>
            </head>
            <body>
                <h1>${personName || 'Paciente'}</h1>
                <h2>${title}</h2>
                <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
                ${rows || '<p style="text-align: center; color: #777;">No hay registros para mostrar.</p>'}
            </body>
            </html>
        `;
    };

    return (
        <section className="fade-in">
            {isPrintModalOpen && (
                <PdfPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    title={`Imprimir ${activePlanTab === 'food' ? 'Plan de Alimentación' : 'Rutina'}`}
                    getHtmlContent={getPrintHtml}
                    fileName={`Plan_${activePlanTab}_${personName || 'Paciente'}.pdf`}
                />
            )}

            {/* Segmented Control for Food/Exercise */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={styles.filterButtonGroup}>
                    <button 
                        className={`filter-button ${activePlanTab === 'food' ? 'active' : ''}`} 
                        onClick={() => { setActivePlanTab('food'); setSearchTerm(''); }}
                        style={{ minWidth: '120px', justifyContent: 'center' }}
                    >
                        {ICONS.book} Alimentación
                    </button>
                    <button 
                        className={`filter-button ${activePlanTab === 'exercise' ? 'active' : ''}`} 
                        onClick={() => { setActivePlanTab('exercise'); setSearchTerm(''); }}
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
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>
                        {activePlanTab === 'food' ? 'Plan Alimenticio' : 'Rutina de Entrenamiento'}
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
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem'
                        }}
                        title={!hasAiFeature ? "Función Premium" : "Generar con IA"}
                    >
                        {ICONS.sparkles} Generar con IA
                    </button>
                    <button 
                        onClick={activePlanTab === 'food' ? onAddManualDiet : onAddManualExercise} 
                        className="button-secondary"
                        style={{backgroundColor: 'var(--surface-color)', padding: '0.6rem 1rem', fontSize: '0.9rem'}}
                    >
                        {ICONS.add} Manual
                    </button>
                </div>
            </div>

            {/* Advanced Filters Bar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                backgroundColor: 'var(--surface-color)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div style={{flex: 1, minWidth: '200px'}}>
                     <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input 
                            type="text" 
                            placeholder={activePlanTab === 'food' ? "Buscar comida..." : "Buscar ejercicio..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{...styles.searchInput, height: '38px', fontSize: '0.9rem'}}
                        />
                    </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                     <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        style={{...styles.input, margin: 0, height: '38px', width: '130px', fontSize: '0.85rem', padding: '0.4rem'}} 
                        placeholder="Desde"
                    />
                    <span style={{color: 'var(--text-light)'}}>-</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        style={{...styles.input, margin: 0, height: '38px', width: '130px', fontSize: '0.85rem', padding: '0.4rem'}} 
                        placeholder="Hasta"
                    />
                </div>

                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)',
                            cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem'
                        }}
                        title={sortOrder === 'desc' ? "Más recientes primero" : "Más antiguos primero"}
                    >
                        {sortOrder === 'desc' ? '↓ Recientes' : '↑ Antiguos'}
                    </button>
                    
                    <button 
                         onClick={() => setIsPrintModalOpen(true)}
                         className="button-secondary"
                         style={{padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                    >
                        {ICONS.print} Imprimir
                    </button>
                </div>
            </div>

            {/* List Header & Grouping Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                <h4 style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px'}}>
                    {filteredAndSortedLogs.length} Registros Encontrados
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
                        Object.keys(groupedLogs).length > 0 ? 
                        // Note: Sorting of groups keys follows the same sortOrder logic roughly
                        Object.keys(groupedLogs).sort((a,b) => sortOrder === 'asc' ? new Date(a).getTime() - new Date(b).getTime() : new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{marginBottom: '2rem'}}>
                                <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                    Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                </h4>
                                <DietPlanViewer 
                                    dietLogs={groupedLogs[weekStart]} 
                                    onEdit={onEditDietLog} 
                                    onViewDetails={onViewDietLog} 
                                    onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día?')} 
                                />
                            </div>
                        )) : <p style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>No hay planes con los filtros aplicados.</p>
                    ) : (
                        <DietPlanViewer 
                            dietLogs={filteredAndSortedLogs as DietLog[]} 
                            onEdit={onEditDietLog} 
                            onViewDetails={onViewDietLog} 
                            onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día?')} 
                        />
                    )}
                </div>
            )}

            {activePlanTab === 'exercise' && (
                <div className="fade-in">
                     {isGrouped ? (
                        Object.keys(groupedLogs).length > 0 ? Object.keys(groupedLogs).sort((a,b) => sortOrder === 'asc' ? new Date(a).getTime() - new Date(b).getTime() : new Date(b).getTime() - new Date(a).getTime()).map(weekStart => (
                            <div key={weekStart} style={{marginBottom: '2rem'}}>
                                <h4 style={{color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem'}}>
                                    Semana del {new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                </h4>
                                <ExercisePlanViewer 
                                    exerciseLogs={groupedLogs[weekStart]} 
                                    onEdit={onEditExerciseLog} 
                                    onViewDetails={onViewExerciseLog} 
                                    onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día?')} 
                                />
                            </div>
                        )) : <p style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>No hay rutinas con los filtros aplicados.</p>
                    ) : (
                        <ExercisePlanViewer 
                            exerciseLogs={filteredAndSortedLogs as ExerciseLog[]} 
                            onEdit={onEditExerciseLog} 
                            onViewDetails={onViewExerciseLog} 
                            onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día?')} 
                        />
                    )}
                </div>
            )}
        </section>
    );
};
