
import React, { FC, useState, useMemo, useEffect } from 'react';
import { DietLog, ExerciseLog } from '../../../types';
import { styles } from '../../../constants';
import { ICONS } from '../../../pages/AuthPage';
import DietPlanViewer from '../../DietPlanViewer';
import ExercisePlanViewer from '../../ExercisePlanViewer';
import PdfPreviewModal from '../../shared/PdfPreviewModal';
import { ScrollablePills, Pill, Grid } from '../../layout';

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
    isMobile?: boolean;
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
const groupLogsByBatch = <T extends { log_date: string; created_at: string }>(logs: T[]): PlanBatch<T>[] => {
    if (!logs || logs.length === 0) return [];

    // Sort by creation date descending (newest first)
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

export const PlansTab: FC<PlansTabProps> = ({
    allDietLogs, allExerciseLogs, onGenerateMeal, onGenerateExercise, onAddManualDiet, onAddManualExercise,
    onEditDietLog, onViewDietLog, onEditExerciseLog, onViewExerciseLog, openModal, hasAiFeature, personName, isMobile = window.innerWidth <= 768
}) => {
    const [activePlanTab, setActivePlanTab] = useState<'food' | 'exercise'>('food');
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
    
    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Filter logs first
    const filteredLogs = useMemo(() => {
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
        });
    }, [allDietLogs, allExerciseLogs, activePlanTab, startDate, endDate, searchTerm]);

    // Compute batches from filtered logs
    const batches = useMemo(() => groupLogsByBatch(filteredLogs), [filteredLogs]);

    // Auto-expand all batches on load or when data changes
    useEffect(() => {
        if (batches.length > 0) {
            setExpandedBatches(prev => {
                const next = new Set(prev);
                batches.forEach(b => next.add(b.id));
                return next;
            });
        }
    }, [activePlanTab, batches]);

    const toggleBatch = (id: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getPrintHtml = () => {
        const title = activePlanTab === 'food' ? 'Plan de Alimentación' : 'Rutina de Ejercicio';
        const rows = filteredLogs.sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()).map((log: any) => {
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

    const PlanBatchCard: FC<{ batch: PlanBatch<any> }> = ({ batch }) => {
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
                opacity: batch.isNewest ? 1 : 0.9,
                transition: 'all 0.2s'
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
                        {activePlanTab === 'food' ? (
                             <DietPlanViewer 
                                dietLogs={batch.logs} 
                                onEdit={onEditDietLog} 
                                onViewDetails={onViewDietLog} 
                                onDelete={(id) => openModal('deleteDietLog', id, '¿Eliminar este día?')} 
                            />
                        ) : (
                            <ExercisePlanViewer 
                                exerciseLogs={batch.logs} 
                                onEdit={onEditExerciseLog} 
                                onViewDetails={onViewExerciseLog} 
                                onDelete={(id) => openModal('deleteExerciseLog', id, '¿Eliminar este día?')} 
                            />
                        )}
                    </div>
                )}
            </div>
        );
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
                <div style={{
                    backgroundColor: 'var(--surface-hover-color)',
                    borderRadius: '14px',
                    padding: '0.35rem',
                    border: '1px solid var(--border-color)',
                    display: 'inline-flex',
                    gap: '0.35rem'
                }}>
                    <button 
                        type="button"
                        onClick={() => { setActivePlanTab('food'); setSearchTerm(''); }}
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: activePlanTab === 'food' ? 700 : 600,
                            padding: '0.5rem 1.25rem',
                            borderRadius: '10px',
                            minHeight: '38px',
                            backgroundColor: activePlanTab === 'food' ? 'var(--primary-color)' : 'transparent',
                            color: activePlanTab === 'food' ? '#ffffff' : 'var(--text-color)',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: activePlanTab === 'food' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
                        }}
                    >
                        {ICONS.book} Alimentación
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setActivePlanTab('exercise'); setSearchTerm(''); }}
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: activePlanTab === 'exercise' ? 700 : 600,
                            padding: '0.5rem 1.25rem',
                            borderRadius: '10px',
                            minHeight: '38px',
                            backgroundColor: activePlanTab === 'exercise' ? 'var(--primary-color)' : 'transparent',
                            color: activePlanTab === 'exercise' ? '#ffffff' : 'var(--text-color)',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: activePlanTab === 'exercise' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
                        }}
                    >
                        {ICONS.activity} Ejercicio
                    </button>
                </div>
            </div>

            {/* Action Header */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                padding: isMobile ? '1.0rem' : '1.5rem', 
                backgroundColor: 'var(--surface-hover-color)', 
                borderRadius: '16px', 
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
                gap: '1rem'
            }}>
                <div>
                    <h3 style={{margin: 0, fontSize: isMobile ? '1.05rem' : '1.1rem', color: 'var(--text-color)', fontWeight: 700}}>
                        {activePlanTab === 'food' ? 'Plan Alimenticio' : 'Rutina de Entrenamiento'}
                    </h3>
                    <p style={{margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                        {activePlanTab === 'food' ? 'Gestiona el menú y las comidas.' : 'Organiza los entrenamientos diarios.'}
                    </p>
                </div>
                <div style={{display: 'flex', gap: '0.6rem', width: isMobile ? '100%' : 'auto'}}>
                    <button
                        onClick={activePlanTab === 'food' ? onGenerateMeal : onGenerateExercise}
                        disabled={!hasAiFeature}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            padding: '0.65rem 1rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem',
                            fontWeight: 700, flex: 1, minHeight: '42px'
                        }}
                        title={!hasAiFeature ? "Función Premium" : "Generar con IA"}
                    >
                        {ICONS.sparkles} Generar con IA
                    </button>
                    <button 
                        onClick={activePlanTab === 'food' ? onAddManualDiet : onAddManualExercise} 
                        className="button-secondary"
                        style={{
                            backgroundColor: 'var(--surface-color)', 
                            padding: '0.65rem 1rem', 
                            fontSize: '0.85rem', 
                            fontWeight: 600,
                            borderRadius: '12px',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        {ICONS.add} Manual
                    </button>
                </div>
            </div>

            {/* Advanced Filters Bar */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '0.75rem',
                alignItems: isMobile ? 'stretch' : 'center',
                backgroundColor: 'var(--surface-color)',
                padding: isMobile ? '0.85rem' : '1rem',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem'
            }}>
                <div style={{flex: 1, width: '100%'}}>
                     <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input 
                            type="text" 
                            placeholder={activePlanTab === 'food' ? "Buscar comida..." : "Buscar ejercicio..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{...styles.searchInput, height: '40px', fontSize: '0.85rem', borderRadius: '10px'}}
                        />
                    </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto'}}>
                     <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        style={{...styles.input, margin: 0, height: '40px', flex: 1, fontSize: '0.8rem', padding: '0.4rem', borderRadius: '10px'}} 
                        placeholder="Desde"
                    />
                    <span style={{color: 'var(--text-light)'}}>-</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        style={{...styles.input, margin: 0, height: '40px', flex: 1, fontSize: '0.8rem', padding: '0.4rem', borderRadius: '10px'}} 
                        placeholder="Hasta"
                    />
                    <button 
                         onClick={() => setIsPrintModalOpen(true)}
                         className="button-secondary"
                         style={{
                             padding: '0.5rem 0.85rem', 
                             fontSize: '0.85rem', 
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: '0.4rem',
                             height: '40px',
                             borderRadius: '10px',
                             flexShrink: 0
                         }}
                         title="Imprimir Plan"
                    >
                        {ICONS.print} <span style={{display: isMobile ? 'none' : 'inline'}}>Imprimir</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="fade-in">
                {batches.length > 0 ? (
                    batches.map(batch => (
                        <PlanBatchCard key={batch.id} batch={batch} />
                    ))
                ) : (
                    <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                        <p>No hay planes con los filtros aplicados.</p>
                    </div>
                )}
            </div>
        </section>
    );
};
