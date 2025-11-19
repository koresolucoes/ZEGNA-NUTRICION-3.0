
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
    const getIconForType = (type: string) => {
        switch(type) {
            case 'consultation': return ICONS.clinic;
            case 'log': return ICONS.file;
            case 'diet': return ICONS.book; // Using book icon for diet
            case 'exercise': return ICONS.activity;
            case 'diet_plan_history': return ICONS.calculator;
            default: return ICONS.file;
        }
    };
    
    const getColorForType = (type: string) => {
        switch(type) {
            case 'consultation': return 'var(--primary-color)';
            case 'diet': return '#10B981';
            case 'exercise': return '#F59E0B';
            default: return 'var(--text-light)';
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={styles.detailCardHeader}>
                <h3 style={{...styles.detailCardTitle, margin: 0 }}>Expediente Activo</h3>
            </div>
            
            {/* Search Bar */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{...styles.searchInputContainer, width: '100%'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar en historial..." 
                        value={timelineFilters.search} 
                        onChange={e => setTimelineFilters(f => ({...f, search: e.target.value}))} 
                        style={{...styles.searchInput, margin: 0, height: '36px', fontSize: '0.9rem'}}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {timeline.map((item, index) => {
                    const icon = getIconForType(item.type);
                    const accentColor = getColorForType(item.type);
                    
                    return (
                        <div key={`${item.id}-${index}`} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', position: 'relative' }}>
                             {/* Timeline Line */}
                             {index !== timeline.length - 1 && (
                                 <div style={{ position: 'absolute', top: '32px', left: '15px', bottom: '-16px', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                             )}
                             
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', 
                                    backgroundColor: 'var(--surface-color)', border: `2px solid ${accentColor}`,
                                    display: 'grid', placeItems: 'center', color: accentColor, fontSize: '0.9rem'
                                }}>
                                    {icon}
                                </div>
                            </div>
                            
                            <div style={{flex: 1, minWidth: 0}}>
                                <div className="card-hover" style={{ 
                                    padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--surface-hover-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'
                                }}>
                                    <div onClick={() => item.type !== 'diet_plan_history' && handleTimelineItemClick(item)} style={{cursor: item.type !== 'diet_plan_history' ? 'pointer' : 'default', flex: 1}}>
                                        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                                            {item.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                            {item.type === 'consultation' ? `Consulta de Seguimiento` : item.type === 'log' ? item.log_type : item.type === 'diet' ? 'Plan Alimenticio' : item.type === 'exercise' ? 'Rutina Ejercicio' : `Plan Calculado`}
                                        </p>
                                        
                                        {/* Preview Content */}
                                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.type === 'consultation' ? `Peso: ${item.weight_kg}kg` : 
                                             item.type === 'log' ? item.description : 
                                             item.type === 'diet_plan_history' ? `${(item as DietPlanHistoryItem).totals.kcal.toFixed(0)} kcal` : 
                                             'Ver detalles...'}
                                        </p>
                                    </div>
                                    
                                    {/* Context Action */}
                                    {item.type !== 'diet_plan_history' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); sendContextToAi(formatItemForAI(item)); }}
                                            style={{
                                                ...styles.iconButton, 
                                                border: '1px solid var(--primary-color)', 
                                                backgroundColor: 'var(--primary-light)',
                                                color: 'var(--primary-dark)',
                                                width: '32px', height: '32px', padding: 0
                                            }}
                                            title="Analizar con IA">
                                            {ICONS.sparkles}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {timeline.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--text-light)', marginTop: '3rem'}}>
                        <p>No hay eventos registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelinePanel;
