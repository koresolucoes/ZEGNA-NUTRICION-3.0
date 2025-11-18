import React, { FC, useState, useMemo, ChangeEvent, useEffect, useRef, ReactNode, useCallback } from 'react';
import { FoodEquivalent, Person, DietPlanHistoryItem, KnowledgeResource } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';
import { useClinic } from '../../contexts/ClinicContext';
import AiMealPlanGeneratorModal from './AiMealPlanGeneratorModal'; // Importar el nuevo modal

// --- PROPS INTERFACES FOR EXTRACTED COMPONENTS ---

interface EquivalentRowProps {
    eq: FoodEquivalent;
    portion: string;
    isMobile: boolean;
    onPortionChange: (id: string, value: string) => void;
    onMouseEnter: (e: React.MouseEvent, eq: FoodEquivalent) => void;
    onMouseLeave: () => void;
}

interface EquivalentsPanelProps {
    groupedEquivalents: Record<string, FoodEquivalent[]>;
    collapsedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    portions: Record<string, string>;
    isMobile: boolean;
    handlePortionChange: (id: string, value: string) => void;
    handleMouseEnter: (e: React.MouseEvent, eq: FoodEquivalent) => void;
    handleMouseLeave: () => void;
    planTotals: { protein_g: number; lipid_g: number; carb_g: number; kcal: number };
}

// --- EXTRACTED COMPONENTS ---

// Memoized component for a single equivalent row to prevent unnecessary re-renders.
const EquivalentRow: FC<EquivalentRowProps> = React.memo(({ eq, portion, isMobile, onPortionChange, onMouseEnter, onMouseLeave }) => {
    const numPortions = parseFloat(portion) || 0;
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onPortionChange(eq.id, e.target.value);
    }, [eq.id, onPortionChange]);
    
    const handleMouseEnterEvent = useCallback((e: React.MouseEvent) => {
        onMouseEnter(e, eq);
    }, [onMouseEnter, eq]);

    if (isMobile) {
        return (
            <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, cursor: 'help' }} onMouseEnter={handleMouseEnterEvent} onMouseLeave={onMouseLeave}>{eq.subgroup_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.75rem 0' }}>
                    <label style={{ margin: 0, fontWeight: 500, flexShrink: 0 }}>Porciones:</label>
                    <input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" value={portion} onChange={handleChange} style={{ margin: 0, padding: '10px', textAlign: 'center', width: '100px', flexShrink: 0 }} placeholder="0" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--text-light)', backgroundColor: 'var(--background-color)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span>Pr: <strong>{(numPortions * eq.protein_g).toFixed(1)}g</strong></span>
                    <span>Lp: <strong>{(numPortions * eq.lipid_g).toFixed(1)}g</strong></span>
                    <span>Hc: <strong>{(numPortions * eq.carb_g).toFixed(1)}g</strong></span>
                    <span style={{color: 'var(--text-color)'}}>Kcal: <strong>{(numPortions * eq.kcal).toFixed(0)}</strong></span>
                </div>
            </div>
        );
    }

    return (
        <div className="table-row-hover" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)'}}>
            <span style={{paddingLeft: '1.5rem', cursor: 'help'}} onMouseEnter={handleMouseEnterEvent} onMouseLeave={onMouseLeave}>{eq.subgroup_name}</span>
            <div style={{width: '80px', margin: '0 auto'}}><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" value={portion} onChange={handleChange} style={{margin: 0, padding: '8px', textAlign: 'center'}} placeholder="0" /></div>
            <span style={{textAlign: 'right'}}>{(numPortions * eq.protein_g).toFixed(1)}</span>
            <span style={{textAlign: 'right'}}>{(numPortions * eq.lipid_g).toFixed(1)}</span>
            <span style={{textAlign: 'right'}}>{(numPortions * eq.carb_g).toFixed(1)}</span>
            <span style={{textAlign: 'right'}}>{(numPortions * eq.kcal).toFixed(0)}</span>
        </div>
    );
});


const EquivalentsPanel: FC<EquivalentsPanelProps> = ({ 
    groupedEquivalents, collapsedGroups, toggleGroup, portions, isMobile, 
    handlePortionChange, handleMouseEnter, handleMouseLeave, planTotals 
}) => {
    // Define the specific order for food groups
    const groupOrder = [
        'Verduras',
        'Frutas',
        'Cereales y Tubérculos',
        'Leguminosas',
        'Alimentos de Origen Animal',
        'Leche',
        'Aceites y Grasas',
        'Azúcares',
        'Alimentos Libres en Energía',
        'Bebidas Alcohólicas'
    ];

    return (
        <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Distribución de Equivalentes</h3></div>
            <div style={{...styles.infoCardBody, padding: isMobile ? '0' : '1rem', ...(!isMobile && { overflowY: 'auto', maxHeight: '70vh' })}}>
                {!isMobile && (
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-light)'}}>
                        <span>Grupo</span><span style={{textAlign: 'center'}}>Porciones</span><span style={{textAlign: 'right'}}>Pr (g)</span><span style={{textAlign: 'right'}}>Lip (g)</span><span style={{textAlign: 'right'}}>Hc (g)</span><span style={{textAlign: 'right'}}>Kcal</span>
                    </div>
                )}
                {groupOrder
                    .filter(groupName => groupedEquivalents[groupName]) // Only render groups that exist in the data
                    .map((groupName) => {
                    const subgroups = groupedEquivalents[groupName];
                    const isCollapsed = collapsedGroups[groupName];
                    return (
                        <div key={groupName} style={{borderBottom: '1px solid var(--border-color)'}}>
                            <button onClick={() => toggleGroup(groupName)} style={{...styles.table, background: 'var(--surface-hover-color)', padding: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>{groupName}
                            </button>
                            {!isCollapsed && subgroups.sort((a, b) => a.subgroup_name.localeCompare(b.subgroup_name)).map(eq => (
                                <EquivalentRow
                                    key={eq.id}
                                    eq={eq}
                                    portion={portions[eq.id] || ''}
                                    isMobile={isMobile}
                                    onPortionChange={handlePortionChange}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                />
                            ))}
                        </div>
                    );
                })}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem', padding: '0.75rem', fontWeight: 600, background: 'var(--surface-hover-color)'}}>
                    <span style={{ gridColumn: isMobile ? '1' : 'span 2' }}>Total del Plan</span>
                    {!isMobile && <><span style={{textAlign: 'right'}}>{planTotals.protein_g.toFixed(1)}</span><span style={{textAlign: 'right'}}>{planTotals.lipid_g.toFixed(1)}</span><span style={{textAlign: 'right'}}>{planTotals.carb_g.toFixed(1)}</span></>}
                    <span style={{textAlign: 'right', fontSize: '1.1rem'}}>{planTotals.kcal.toFixed(0)} Kcal</span>
                </div>
            </div>
        </div>
    );
};


// --- MAIN DIET PLANNER COMPONENT ---

interface DietPlannerProps {
    equivalentsData: FoodEquivalent[];
    persons: Person[];
    isMobile: boolean;
    onPlanSaved: () => void;
    initialPlan: DietPlanHistoryItem | null;
    clearInitialPlan: () => void;
    knowledgeResources: KnowledgeResource[];
}

const DietPlanner: FC<DietPlannerProps> = ({ equivalentsData, persons, isMobile, onPlanSaved, initialPlan, clearInitialPlan, knowledgeResources }) => {
    const { clinic, subscription } = useClinic();
    const hasAiFeature = useMemo(() => {
        return subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false;
    }, [subscription]);

    const initialPortions = useMemo(() => 
        equivalentsData.reduce((acc, eq) => ({ ...acc, [eq.id]: '' }), {}),
        [equivalentsData]
    );

    const [portions, setPortions] = useState<Record<string, string>>(initialPortions);
    const [goals, setGoals] = useState({ kcal: '2000', hc_perc: '50', prot_perc: '20', lip_perc: '30' });
    const [personName, setPersonName] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isAdequacyCardExpanded, setIsAdequacyCardExpanded] = useState(false);
    const [isAiPlanModalOpen, setIsAiPlanModalOpen] = useState(false); // State for the new modal

    const bottomBarRef = useRef<HTMLDivElement>(null);
    const [bottomBarHeight, setBottomBarHeight] = useState(280); // Default height

     useEffect(() => {
        if (initialPlan) {
            setGoals(initialPlan.goals || { kcal: '2000', hc_perc: '50', prot_perc: '20', lip_perc: '30' });
            setPortions(initialPlan.portions || initialPortions);
            // FIX: Using String() constructor to safely convert potentially 'unknown' type to string.
            // This prevents a type error if `initialPlan.person_name` is inferred as something other than string | null.
            setPersonName(String(initialPlan.person_name || ''));
            setSelectedPersonId(initialPlan.person_id || '');
            // FIX: Using String() constructor to safely convert potentially 'unknown' type to string.
            setSearchTerm(String(initialPlan.person_name || '')); // Also set search term for display
            // Clear the initialPlan prop in the parent so it doesn't reload on every render
            clearInitialPlan();
        }
    }, [initialPlan, clearInitialPlan, initialPortions]);

     useEffect(() => {
        // Only auto-fill name if not loading a plan (to preserve saved plan name)
        if (!initialPlan) {
            const person = persons.find(p => p.id === selectedPersonId);
            if (person) {
                setPersonName(person.full_name);
            } else if (!selectedPersonId) { // If user deselects to generic
                setPersonName(searchTerm); // Keep what user might be typing for a generic plan
            }
        }
    }, [selectedPersonId, persons, initialPlan, searchTerm]);

    useEffect(() => {
        // Click outside handler
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const barElement = bottomBarRef.current;
        if (isMobile && barElement) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setBottomBarHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(barElement);
            return () => resizeObserver.disconnect();
        }
    }, [isMobile, isAdequacyCardExpanded]);

    const groupedEquivalents = useMemo(() => {
        return equivalentsData.reduce((acc, eq) => {
            const group = eq.group_name;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(eq);
            return acc;
        }, {} as Record<string, FoodEquivalent[]>);
    }, [equivalentsData]);

    const handlePortionChange = useCallback((equivalentId: string, value: string) => {
        if (/^\d*\.?\d*$/.test(value)) {
            setPortions(prev => ({ ...prev, [equivalentId]: value }));
        }
    }, []);

    const handleGoalChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (/^\d*\.?\d*$/.test(value)) {
            setGoals(prev => ({ ...prev, [name]: value }));
        }
    };

    const toggleGroup = useCallback((groupName: string) => {
        setCollapsedGroups(prev => ({...prev, [groupName]: !prev[groupName]}));
    }, []);

    const handleMouseEnter = useCallback((e: React.MouseEvent, eq: FoodEquivalent) => {
        const content = `1 Porción: ${eq.protein_g}g Pr, ${eq.lipid_g}g Lp, ${eq.carb_g}g Hc, ${eq.kcal} Kcal`;
        setTooltip({ content, x: e.clientX, y: e.clientY });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    const planTotals = useMemo(() => {
        return equivalentsData.reduce((totals, eq) => {
            const numPortions = parseFloat(portions[eq.id]) || 0;
            totals.protein_g += numPortions * eq.protein_g;
            totals.lipid_g += numPortions * eq.lipid_g;
            totals.carb_g += numPortions * eq.carb_g;
            totals.kcal += numPortions * eq.kcal;
            return totals;
        }, { protein_g: 0, lipid_g: 0, carb_g: 0, kcal: 0 });
    }, [portions, equivalentsData]);

    const goalGrams = useMemo(() => {
        const kcal = parseFloat(goals.kcal) || 0;
        const prot_perc = parseFloat(goals.prot_perc) || 0;
        const lip_perc = parseFloat(goals.lip_perc) || 0;
        const hc_perc = parseFloat(goals.hc_perc) || 0;

        const prot_kcal = kcal * (prot_perc / 100);
        const lip_kcal = kcal * (lip_perc / 100);
        const hc_kcal = kcal * (hc_perc / 100);
        return {
            prot: prot_kcal / 4,
            lip: lip_kcal / 9,
            hc: hc_kcal / 4,
        };
    }, [goals]);

    const adequacy = useMemo(() => ({
        prot: goalGrams.prot > 0 ? (planTotals.protein_g / goalGrams.prot) * 100 : 0,
        lip: goalGrams.lip > 0 ? (planTotals.lipid_g / goalGrams.lip) * 100 : 0,
        hc: goalGrams.hc > 0 ? (planTotals.carb_g / goalGrams.hc) * 100 : 0,
    }), [planTotals, goalGrams]);

    const overallAdequacy = useMemo(() => {
        const validMacros = [adequacy.prot, adequacy.lip, adequacy.hc].filter(p => p > 0);
        if (validMacros.length === 0) return 0;
        const total = validMacros.reduce((sum, current) => sum + current, 0);
        return total / validMacros.length;
    }, [adequacy]);

    const getAdequacyStatus = (percentage: number) => {
        if (percentage >= 95 && percentage <= 105) return { text: 'Adecuado', color: 'var(--primary-color)' };
        if (percentage > 105 && percentage <= 115) return { text: 'Lig. Excedido', color: 'var(--accent-color)' };
        if (percentage < 95 && percentage >= 85) return { text: 'Lig. Bajo', color: 'var(--accent-color)'};
        if (percentage > 115) return { text: 'Excedido', color: 'var(--error-color)'};
        return { text: 'Bajo', color: 'var(--error-color)'};
    };

    const handleSavePlan = async () => {
        if (!clinic) {
            setError("No se puede guardar el plan sin una clínica activa.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const { error: dbError } = await supabase.from('diet_plan_history').insert({
                clinic_id: clinic.id,
                person_id: selectedPersonId || null,
                person_name: personName || 'Plan sin nombre',
                goals: goals,
                totals: planTotals,
                portions: portions,
            });
            if (dbError) throw dbError;
            setSuccess("¡Plan guardado en el historial!");
            setTimeout(() => setSuccess(null), 3000);
            onPlanSaved();
        } catch (err: any) {
            setError(`Error al guardar: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const filteredPersons = useMemo(() => {
        if (!searchTerm) return persons;
        if (selectedPersonId && searchTerm === persons.find(p => p.id === selectedPersonId)?.full_name) {
            return persons;
        }
        return persons.filter(p => 
            p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [persons, searchTerm, selectedPersonId]);

    const handleSelectPerson = (person: Person | null) => {
        if (person) {
            setSelectedPersonId(person.id);
            setSearchTerm(person.full_name);
            setPersonName(person.full_name);
        } else {
            setSelectedPersonId('');
            setSearchTerm('');
            setPersonName('');
        }
        setIsDropdownOpen(false);
    };

    const AdequacyAnalysisPanel: FC<{isCompact?: boolean}> = ({ isCompact = false }) => (
         <div style={{...styles.infoCard, ...(isCompact && {padding: 0, boxShadow: 'none', background: 'transparent'})}}>
            <div style={{...styles.infoCardHeader, ...(isCompact && {padding: '0.5rem 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', textAlign: 'center' })}}>
                <h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Análisis de Adecuación</h3>
            </div>
            <div style={{...styles.infoCardBody, display: 'flex', flexDirection: 'column', gap: '1.25rem', ...(isCompact && {padding: '1rem 0 0 0'})}}>
            {[
                { name: 'Proteína', adequacy: adequacy.prot, current: planTotals.protein_g, goal: goalGrams.prot },
                { name: 'Lípidos', adequacy: adequacy.lip, current: planTotals.lipid_g, goal: goalGrams.lip },
                { name: 'H. Carbono', adequacy: adequacy.hc, current: planTotals.carb_g, goal: goalGrams.hc }
            ].map(macro => {
                const status = getAdequacyStatus(macro.adequacy);
                return (
                    <div key={macro.name}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'baseline'}}>
                            <span style={{fontWeight: 600}}>{macro.name}</span>
                            <span style={{fontSize: '0.9rem', color: status.color, fontWeight: 500}}>
                                {status.text} ({macro.adequacy.toFixed(1)}%)
                            </span>
                        </div>
                        <div style={{height: '10px', backgroundColor: 'var(--background-color)', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.25rem'}}>
                            <div style={{width: `${Math.min(macro.adequacy, 120)}%`, height: '100%', backgroundColor: status.color, transition: 'width 0.3s'}}></div>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                            <span>{macro.current.toFixed(1)}g</span>
                            <span>Meta: {macro.goal.toFixed(1)}g</span>
                        </div>
                    </div>
                );
            })}
            <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem'}}>
                {(() => {
                    const status = getAdequacyStatus(overallAdequacy);
                    return (
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'baseline'}}>
                                <span style={{fontWeight: 600}}>Adecuación General</span>
                                <span style={{fontSize: '0.9rem', color: status.color, fontWeight: 500}}>
                                    {status.text} ({overallAdequacy.toFixed(1)}%)
                                </span>
                            </div>
                            <div style={{height: '10px', backgroundColor: 'var(--background-color)', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.25rem'}}>
                                <div style={{width: `${Math.min(overallAdequacy, 120)}%`, height: '100%', backgroundColor: status.color, transition: 'width 0.3s'}}></div>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                <span>Promedio de macros</span>
                            </div>
                        </div>
                    );
                })()}
            </div>
            </div>
        </div>
    );

    const SavePlanPanel = ({ isCompact = false }) => {
        const hasPortions = Object.values(portions).some(p => parseFloat(String(p)) > 0);
        return (
            <div style={{...styles.infoCard, ...(isCompact && {padding: 0, boxShadow: 'none', background: 'transparent'})}}>
                {!isCompact && <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Acciones del Plan</h3></div>}
                <div style={{...styles.infoCardBody, ...(isCompact && {padding: 0}), display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                    
                    <div ref={searchContainerRef} style={{ position: 'relative' }}>
                        <label htmlFor="person-search-planner">Asociar Plan a Paciente (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <input id="person-search-planner" type="text" placeholder="Buscar y seleccionar..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedPersonId(''); setPersonName(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} style={{ marginBottom: 0, paddingRight: '2.5rem' }} autoComplete="off" />
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-light)', transition: 'transform 0.2s', ...(isDropdownOpen && { transform: 'translateY(-50%) rotate(180deg)' }) }}>▼</div>
                        </div>
                        {isDropdownOpen && (
                            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-hover-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                                <div onClick={() => handleSelectPerson(null)} style={{padding: '0.75rem 1rem', cursor: 'pointer', fontStyle: 'italic'}} className="nav-item-hover">-- Plan Genérico --</div>
                                {filteredPersons.map(p => (<div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer'}} className="nav-item-hover">{p.full_name}</div>))}
                            </div>
                        )}
                    </div>
                    
                    <label htmlFor="personName">Nombre del Plan / Paciente</label>
                    <input id="personName" type="text" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Ej: Plan de volumen para Juan Pérez" />
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button onClick={handleSavePlan} disabled={loading} style={{width: '100%'}}>{loading ? 'Guardando...' : 'Guardar en Historial'}</button>
                        <button type="button" onClick={() => setIsAiPlanModalOpen(true)} disabled={!hasPortions || !hasAiFeature} className="button-secondary" style={{width: '100%', whiteSpace: 'nowrap'}} title={!hasAiFeature ? "Esta función no está incluida en tu plan actual." : "Generar plan de comidas con IA"}>
                            {ICONS.sparkles} Generar Plan
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const tooltipStyle: React.CSSProperties = tooltip ? {
        position: 'fixed',
        left: tooltip.x + 15,
        top: tooltip.y,
        backgroundColor: 'var(--surface-hover-color)',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 1100,
        pointerEvents: 'none', // This is the fix for the flickering loop
        whiteSpace: 'nowrap',
        transition: 'opacity 0.2s',
        opacity: 1,
    } : { display: 'none' };
    
    const renderDesktopLayout = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
            {isAiPlanModalOpen && (
                <AiMealPlanGeneratorModal
                    isOpen={isAiPlanModalOpen}
                    onClose={() => setIsAiPlanModalOpen(false)}
                    onPlanSaved={onPlanSaved}
                    equivalentsData={equivalentsData}
                    planPortions={portions}
                    personId={selectedPersonId || null}
                />
            )}
            {tooltip && <div style={tooltipStyle}>{tooltip.content}</div>}
            <EquivalentsPanel 
                groupedEquivalents={groupedEquivalents}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
                portions={portions}
                isMobile={isMobile}
                handlePortionChange={handlePortionChange}
                handleMouseEnter={handleMouseEnter}
                handleMouseLeave={handleMouseLeave}
                planTotals={planTotals}
            />
            <div style={{ position: 'sticky', top: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Metas Nutricionales</h3></div>
                        <div style={styles.infoCardBody}><label>Meta Calórica (Kcal)</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="kcal" value={goals.kcal} onChange={handleGoalChange} placeholder="2000" /><div style={{display: 'flex', gap: '1rem'}}><div><label>% Pr</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="prot_perc" value={goals.prot_perc} onChange={handleGoalChange} placeholder="20" /></div><div><label>% Lip</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="lip_perc" value={goals.lip_perc} onChange={handleGoalChange} placeholder="30" /></div><div><label>% Hc</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="hc_perc" value={goals.hc_perc} onChange={handleGoalChange} placeholder="50" /></div></div></div>
                    </div>
                    <AdequacyAnalysisPanel />
                    <SavePlanPanel />
                </div>
            </div>
        </div>
    );

    const renderMobileLayout = () => (
        <div>
             {isAiPlanModalOpen && (
                <AiMealPlanGeneratorModal
                    isOpen={isAiPlanModalOpen}
                    onClose={() => setIsAiPlanModalOpen(false)}
                    onPlanSaved={onPlanSaved}
                    equivalentsData={equivalentsData}
                    planPortions={portions}
                    personId={selectedPersonId || null}
                />
            )}
            {tooltip && <div style={tooltipStyle}>{tooltip.content}</div>}
            <div style={{ paddingBottom: `${bottomBarHeight + 16}px` }}>
                <div style={{...styles.infoCard, marginBottom: '2rem'}}>
                    <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Metas Nutricionales</h3></div>
                    <div style={styles.infoCardBody}><label>Meta Calórica (Kcal)</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="kcal" value={goals.kcal} onChange={handleGoalChange} placeholder="2000" /><div style={{display: 'flex', gap: '1rem'}}><div><label>% Pr</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="prot_perc" value={goals.prot_perc} onChange={handleGoalChange} placeholder="20" /></div><div><label>% Lip</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="lip_perc" value={goals.lip_perc} onChange={handleGoalChange} placeholder="30" /></div><div><label>% Hc</label><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" name="hc_perc" value={goals.hc_perc} onChange={handleGoalChange} placeholder="50" /></div></div></div>
                </div>
                <EquivalentsPanel 
                    groupedEquivalents={groupedEquivalents}
                    collapsedGroups={collapsedGroups}
                    toggleGroup={toggleGroup}
                    portions={portions}
                    isMobile={isMobile}
                    handlePortionChange={handlePortionChange}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    planTotals={planTotals}
                />
            </div>

            <div ref={bottomBarRef} style={{position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--surface-color)', boxShadow: '0 -4px 12px rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div onClick={() => setIsAdequacyCardExpanded(!isAdequacyCardExpanded)} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <div>
                        <span style={{fontWeight: 600}}>Total: {planTotals.kcal.toFixed(0)} Kcal</span>
                        <span style={{marginLeft: '1rem', fontSize: '0.9rem', color: getAdequacyStatus(overallAdequacy).color}}>Adecuación: {overallAdequacy.toFixed(1)}%</span>
                    </div>
                    <button style={{background: 'none', border: 'none', color: 'var(--text-color)', transform: isAdequacyCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}}>▲</button>
                </div>
                <div style={{ padding: '0 1rem 1rem 1rem' }}>
                    {isAdequacyCardExpanded && <AdequacyAnalysisPanel isCompact />}
                    <div style={{borderTop: isAdequacyCardExpanded ? '1px solid var(--border-color)' : 'none', paddingTop: isAdequacyCardExpanded ? '1rem' : 0, marginTop: isAdequacyCardExpanded ? '1rem' : 0}}>
                        <SavePlanPanel isCompact />
                    </div>
                </div>
            </div>
        </div>
    );

    return isMobile ? renderMobileLayout() : renderDesktopLayout();
};

export default DietPlanner;