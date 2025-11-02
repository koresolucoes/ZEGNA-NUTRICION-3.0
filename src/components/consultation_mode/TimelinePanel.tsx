
import React, { FC } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { DietPlanHistoryItem } from '../../types';

interface TimelinePanelProps {
    timeline: any[];
    timelineFilters: { search: string; start: string; end: string; };
    setTimelineFilters: React.Dispatch<React.SetStateAction<{ search: string; start: string; end: string; }>>;
    handleTimelineItemClick: (item: any) => void;
    sendContextToAi: (context: { displayText: string; fullText: string; }) => void;
    formatItemForAI: (item: any) => { displayText: string; fullText: string; };
}

const TimelinePanel: FC<TimelinePanelProps> = ({
    timeline, timelineFilters, setTimelineFilters, handleTimelineItemClick, sendContextToAi, formatItemForAI
}) => {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <h3 style={{...styles.detailCardHeader, margin: 0 }}>Línea de Tiempo Unificada</h3>
            <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{...styles.searchInputContainer, flex: 2, minWidth: '200px'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar en timeline..." 
                        value={timelineFilters.search} 
                        onChange={e => setTimelineFilters(f => ({...f, search: e.target.value}))} 
                        style={{...styles.searchInput, margin: 0, height: '40px'}}
                    />
                </div>
                <div style={{flex: 1, minWidth: '130px'}}><input type="date" value={timelineFilters.start} onChange={e => setTimelineFilters(f => ({...f, start: e.target.value}))} style={{margin:0, height: '40px'}} /></div>
                <div style={{flex: 1, minWidth: '130px'}}><input type="date" value={timelineFilters.end} onChange={e => setTimelineFilters(f => ({...f, end: e.target.value}))} style={{margin:0, height: '40px'}} /></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {timeline.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface-hover-color)', display: 'grid', placeItems: 'center', color: 'var(--primary-color)' }}>
                                {item.type === 'consultation' ? ICONS.clinic : item.type === 'diet_plan_history' ? ICONS.calculator : ICONS.file}
                            </div>
                            {index !== timeline.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>}
                        </div>
                        <div style={{flex: 1}}>
                            <div className="table-row-hover" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div onClick={() => item.type !== 'diet_plan_history' && handleTimelineItemClick(item)} style={{cursor: item.type !== 'diet_plan_history' ? 'pointer' : 'default', flex: 1}}>
                                        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.8rem' }}>{item.date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                                            {item.type === 'consultation' ? `Consulta (Peso: ${item.weight_kg}kg)` : item.type === 'log' ? item.log_type : item.type === 'diet' ? 'Plan Alimenticio Creado' : item.type === 'exercise' ? 'Rutina Creada' : `Plan Calculado (${(item as DietPlanHistoryItem).totals.kcal.toFixed(0)} kcal)`}
                                        </p>
                                    </div>
                                    {item.type !== 'diet_plan_history' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sendContextToAi(formatItemForAI(item)); }}
                                            style={{...styles.iconButton, border: 'none', marginLeft: '0.5rem'}}
                                            title="Enviar al Asistente IA">
                                            {ICONS.send}
                                        </button>
                                    )}
                                </div>
                                {item.type === 'log' && <p onClick={() => handleTimelineItemClick(item)} style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.9rem' }}>{item.description.substring(0, 100)}...</p>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelinePanel;
