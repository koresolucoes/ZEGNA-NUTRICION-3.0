
import React, { FC, useState } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { DietPlanHistoryItem, Person } from '../../types';

interface TimelinePanelProps {
    person?: Person;
    timeline: any[];
    timelineFilters: { search: string; start: string; end: string; };
    setTimelineFilters: React.Dispatch<React.SetStateAction<{ search: string; start: string; end: string; }>>;
    handleTimelineItemClick: (item: any) => void;
    sendContextToAi: (context: { displayText: string; fullText: string; }) => void;
    formatItemForAI: (item: any) => { displayText: string; fullText: string; };
}

const ExpedienteItem: FC<{ icon: string, label: string, onClick?: () => void, isActive?: boolean }> = ({ icon, label, onClick, isActive }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
            backgroundColor: isActive ? 'var(--surface-hover-color)' : 'transparent',
            borderRadius: '8px',
            transition: 'all 0.2s',
            marginBottom: '0.25rem'
        }} 
        className="card-hover"
    >
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isActive ? 'var(--primary-color)' : 'var(--text-color)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
    </div>
);

const TimelinePanel: FC<TimelinePanelProps> = ({
    person, timeline, timelineFilters, setTimelineFilters, handleTimelineItemClick, sendContextToAi, formatItemForAI
}) => {
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

    const handleFilterClick = (type: string) => {
        if (activeFilter === type) {
            setActiveFilter(null);
        } else {
            setActiveFilter(type);
        }
    };

    const filteredTimeline = timeline.filter(item => {
        if (activeFilter) {
            if (activeFilter === 'diet' && item.type !== 'diet' && item.type !== 'diet_plan_history') return false;
            if (activeFilter === 'exercise' && item.type !== 'exercise') return false;
            if (activeFilter === 'consultation' && item.type !== 'consultation') return false;
            if (activeFilter === 'log' && item.type !== 'log') return false;
        }
        return true;
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>DATOS EN EXPEDIENTE</h3>
            </div>
            
            <div style={{ padding: '0.5rem 1rem' }}>
                <ExpedienteItem 
                    label="Plan de alimentacion" 
                    icon="🍐" 
                    onClick={() => handleFilterClick('diet')}
                    isActive={activeFilter === 'diet'}
                />
                <ExpedienteItem 
                    label="Rutina de ejercicio" 
                    icon="📈" 
                    onClick={() => handleFilterClick('exercise')}
                    isActive={activeFilter === 'exercise'}
                />
                <ExpedienteItem 
                    label="Consulta de seguimiento" 
                    icon="🛡️" 
                    onClick={() => handleFilterClick('consultation')}
                    isActive={activeFilter === 'consultation'}
                />
                <ExpedienteItem 
                    label="Auditoria" 
                    icon="📁" 
                    onClick={() => handleFilterClick('log')}
                    isActive={activeFilter === 'log'}
                />
            </div>

            {person && (
                <div style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem', marginTop: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600 }}>Paciente seleccionado</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--primary-color)' }}>{ICONS.user}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'uppercase' }}>{person.full_name}</span>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <span>🔍</span>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.9rem' }}>Buscar en el historial</span>
                </div>
                <div style={{...styles.searchInputContainer, width: '100%'}}>
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
                {filteredTimeline.map((item, index) => {
                    const icon = getIconForType(item.type);
                    const accentColor = getColorForType(item.type);
                    
                    return (
                        <div key={`${item.id}-${index}`} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', position: 'relative' }}>
                             {/* Timeline Line */}
                             {index !== filteredTimeline.length - 1 && (
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
                {filteredTimeline.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--text-light)', marginTop: '3rem'}}>
                        <p>No hay eventos registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelinePanel;
