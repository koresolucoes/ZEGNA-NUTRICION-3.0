
import React, { FC, useState, useMemo, ChangeEvent, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FoodEquivalent, Person, DietPlanHistoryItem, KnowledgeResource } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';
import { useClinic } from '../../contexts/ClinicContext';
import AiMealPlanGeneratorModal from './AiMealPlanGeneratorModal';
import FoodExamplesModal from './FoodExamplesModal';

// --- CONSTANTS & HELPERS ---

const MACRO_COLORS = {
    protein: '#EC4899', // Pink/Red
    lipid: '#F59E0B',   // Orange/Yellow
    carb: '#3B82F6',    // Blue
    energy: '#10B981'   // Green
};

const modalRoot = document.getElementById('modal-root');

// --- COMPONENT INTERFACES ---

interface EquivalentRowProps {
    eq: FoodEquivalent;
    portion: string;
    isMobile: boolean;
    onPortionChange: (id: string, value: string) => void;
    onShowExamples: (eq: FoodEquivalent, portion: number) => void;
}

interface EquivalentsPanelProps {
    groupedEquivalents: Record<string, FoodEquivalent[]>;
    collapsedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    portions: Record<string, string>;
    isMobile: boolean;
    handlePortionChange: (id: string, value: string) => void;
    onShowExamples: (eq: FoodEquivalent, portion: number) => void;
}

// --- SUB-COMPONENTS ---

// Heuristic #7: Efficiency of Use - Stepper Controls
const StepperInput: FC<{ value: string, onChange: (val: string) => void, isActive: boolean }> = ({ value, onChange, isActive }) => {
    const numValue = parseFloat(value) || 0;

    const adjust = (amount: number) => {
        const newValue = Math.max(0, numValue + amount);
        // Avoid floating point errors
        onChange(newValue === 0 ? '' : String(Math.round(newValue * 100) / 100));
    };

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: isActive ? 'var(--surface-color)' : 'var(--background-color)', 
            borderRadius: '8px', 
            border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`, 
            overflow: 'hidden',
            width: '100%',
            marginTop: 'auto' // Push to bottom of card
        }}>
            <button 
                onClick={() => adjust(-0.5)} 
                style={{ flex: 1, height: '36px', border: 'none', background: 'transparent', color: 'var(--text-light)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                className="nav-item-hover"
                type="button"
            >
                -
            </button>
            <input 
                type="number" 
                inputMode="decimal" 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                style={{ 
                    width: '50px', textAlign: 'center', border: 'none', background: 'transparent', 
                    fontWeight: 700, color: numValue > 0 ? 'var(--primary-color)' : 'var(--text-light)',
                    marginBottom: 0, padding: 0, height: '36px'
                }} 
                placeholder="0"
            />
            <button 
                onClick={() => adjust(0.5)} 
                style={{ flex: 1, height: '36px', border: 'none', background: 'transparent', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                className="nav-item-hover"
                type="button"
            >
                +
            </button>
        </div>
    );
};

const EquivalentCard: FC<EquivalentRowProps> = React.memo(({ eq, portion, isMobile, onPortionChange, onShowExamples }) => {
    const numPortions = parseFloat(portion) || 0;
    const isActive = numPortions > 0;

    const handleChange = useCallback((val: string) => {
        onPortionChange(eq.id, val);
    }, [eq.id, onPortionChange]);

    // Heuristic #6: Recognition rather than recall. Show calculated macros inline.
    const stats = useMemo(() => ({
        p: (numPortions * eq.protein_g).toFixed(1),
        l: (numPortions * eq.lipid_g).toFixed(1),
        c: (numPortions * eq.carb_g).toFixed(1),
        k: (numPortions * eq.kcal).toFixed(0)
    }), [numPortions, eq]);

    return (
        <div style={{ 
            padding: '1rem', 
            border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`, 
            borderRadius: '12px',
            backgroundColor: isActive ? 'var(--primary-light)' : 'var(--surface-color)',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            height: '100%',
            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            position: 'relative'
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.95rem', lineHeight: 1.3 }}>
                    {eq.subgroup_name}
                </div>
                 {isActive && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onShowExamples(eq, numPortions); }}
                        style={{
                            border: 'none', background: 'var(--primary-color)', color: 'white',
                            borderRadius: '50%', width: '24px', height: '24px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            fontSize: '0.8rem', padding: 0
                        }}
                        title="Ver alimentos equivalentes"
                    >
                        👁️
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem' }}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-light)'}}>
                    <span style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: MACRO_COLORS.protein}}></span>
                    <span>P: {stats.p}</span>
                 </div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-light)'}}>
                    <span style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: MACRO_COLORS.lipid}}></span>
                    <span>L: {stats.l}</span>
                 </div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-light)'}}>
                    <span style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: MACRO_COLORS.carb}}></span>
                    <span>HC: {stats.c}</span>
                 </div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-color)', fontWeight: 600}}>
                    <span style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: MACRO_COLORS.energy}}></span>
                    <span>{stats.k} kcal</span>
                 </div>
            </div>
            
            <StepperInput value={portion} onChange={handleChange} isActive={isActive} />
        </div>
    );
});

const EquivalentsPanel: FC<EquivalentsPanelProps> = ({ 
    groupedEquivalents, collapsedGroups, toggleGroup, portions, isMobile, 
    handlePortionChange, onShowExamples
}) => {
    const groupOrder = [
        'Verduras', 'Frutas', 'Cereales y Tubérculos', 'Leguminosas',
        'Alimentos de Origen Animal', 'Leche', 'Aceites y Grasas',
        'Azúcares', 'Alimentos Libres en Energía', 'Bebidas Alcohólicas'
    ];

    return (
        <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: '80px' /* Space for fixed footer */ }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                 <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)'}}>Distribución de Equivalentes</h3>
            </div>
            <div style={{ overflowY: 'auto' }}>
                {groupOrder
                    .filter(groupName => groupedEquivalents[groupName])
                    .map((groupName) => {
                    const subgroups = groupedEquivalents[groupName];
                    const isCollapsed = collapsedGroups[groupName];
                    
                    // Heuristic #1: Visibility of System Status. Show summary even when collapsed.
                    const totalPortionsInGroup = subgroups.reduce((sum, eq) => sum + (parseFloat(portions[eq.id]) || 0), 0);
                    const hasActivePortions = totalPortionsInGroup > 0;

                    return (
                        <div key={groupName} style={{borderBottom: '1px solid var(--border-color)'}}>
                            <button 
                                onClick={() => toggleGroup(groupName)} 
                                style={{
                                    width: '100%', textAlign: 'left', padding: '0.85rem 1rem', 
                                    background: hasActivePortions ? 'var(--surface-hover-color)' : 'var(--surface-color)', 
                                    border: 'none', cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)', 
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                    <span style={{ 
                                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                                        transition: 'transform 0.2s', fontSize: '0.8rem', color: 'var(--text-light)' 
                                    }}>▼</span>
                                    {groupName}
                                </div>
                                {hasActivePortions && (
                                    <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '12px' }}>
                                        {totalPortionsInGroup}
                                    </span>
                                )}
                            </button>
                            
                            {!isCollapsed && (
                                <div className="fade-in" style={{ 
                                    padding: '1rem',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', // Responsive Grid
                                    gap: '1rem',
                                    backgroundColor: 'var(--background-color)' // Subtle contrast for the grid area
                                }}>
                                    {subgroups.sort((a, b) => a.subgroup_name.localeCompare(b.subgroup_name)).map(eq => (
                                        <EquivalentCard
                                            key={eq.id}
                                            eq={eq}
                                            portion={portions[eq.id] || ''}
                                            isMobile={isMobile}
                                            onPortionChange={handlePortionChange}
                                            onShowExamples={onShowExamples}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---

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
    
    const initialPortions = useMemo(() => 
        equivalentsData.reduce((acc, eq) => ({ ...acc, [eq.id]: '' }), {}),
        [equivalentsData]
    );

    const [portions, setPortions] = useState<Record<string, string>>(initialPortions);
    const [goals, setGoals] = useState({ kcal: '2000', hc_perc: '50', prot_perc: '20', lip_perc: '30' });
    const [personName, setPersonName] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState('');
    // Default collapse logic: Keep common groups open, collapse others
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
        'Bebidas Alcohólicas': true, 'Azúcares': true, 'Alimentos Libres en Energía': true
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Search/Dropdown States
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    
    const [isAiPlanModalOpen, setIsAiPlanModalOpen] = useState(false);
    
    // --- NEW STATES FOR PATIENT SELECT MODAL ---
    const [isPatientSelectModalOpen, setIsPatientSelectModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    // --- NEW STATE FOR FOOD EXAMPLES MODAL ---
    const [foodExamplesState, setFoodExamplesState] = useState<{ isOpen: boolean; equivalent: FoodEquivalent | null; portions: number }>({ isOpen: false, equivalent: null, portions: 0 });


    const hasAiFeature = useMemo(() => {
        return subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false;
    }, [subscription]);

    const hasPortions = useMemo(() => Object.values(portions).some(p => parseFloat(String(p)) > 0), [portions]);

     useEffect(() => {
        if (initialPlan) {
            setGoals(initialPlan.goals || { kcal: '2000', hc_perc: '50', prot_perc: '20', lip_perc: '30' });
            setPortions(initialPlan.portions || initialPortions);
            setPersonName(String(initialPlan.person_name || ''));
            setSelectedPersonId(initialPlan.person_id || '');
            setSearchTerm(String(initialPlan.person_name || ''));
            clearInitialPlan();
        }
    }, [initialPlan, clearInitialPlan, initialPortions]);

     useEffect(() => {
        if (!initialPlan) {
            const person = persons.find(p => p.id === selectedPersonId);
            if (person) {
                setPersonName(person.full_name);
            } else if (!selectedPersonId) { 
                setPersonName(searchTerm); 
            }
        }
    }, [selectedPersonId, persons, initialPlan, searchTerm]);

    useEffect(() => {
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

    const handleShowExamples = useCallback((eq: FoodEquivalent, portion: number) => {
        setFoodExamplesState({ isOpen: true, equivalent: eq, portions: portion });
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
        kcal: parseFloat(goals.kcal) > 0 ? (planTotals.kcal / parseFloat(goals.kcal)) * 100 : 0
    }), [planTotals, goalGrams, goals.kcal]);

    // --- REFACTORED SAVE LOGIC ---
    const executeSave = async (targetPersonId: string | null, targetPersonName: string) => {
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
                person_id: targetPersonId,
                person_name: targetPersonName || 'Plan sin nombre',
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

    const handleSavePlanClick = () => {
        if (selectedPersonId) {
            executeSave(selectedPersonId, personName);
        } else {
            // No patient selected, open the selection modal
            setIsPatientSelectModalOpen(true);
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
    
    // Modal filtered persons
    const modalFilteredPersons = useMemo(() => {
        return persons.filter(p => 
            p.full_name.toLowerCase().includes(modalSearchTerm.toLowerCase())
        );
    }, [persons, modalSearchTerm]);

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

    const handleSelectFromModal = (person: Person) => {
        handleSelectPerson(person);
        setIsPatientSelectModalOpen(false);
        // Optionally verify confirmation before saving, but UX is faster if we save immediately
        executeSave(person.id, person.full_name);
    };

    // --- HEURISTIC #1 & #7: VISIBILITY & EFFICIENCY (Sticky Footer) ---
    const StickyStatusFooter = () => (
        <div style={{
            position: 'fixed', bottom: 0, left: isMobile ? 0 : '260px', right: 0,
            backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)',
            padding: '0.75rem 1.5rem', zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '1rem',
            transition: 'left 0.3s ease',
            flexDirection: isMobile ? 'column' : 'row'
        }}>
            {/* Left: Macros Stats */}
            <div style={{display: 'flex', gap: '1.5rem', flex: 1, width: '100%'}}>
                {[
                    { label: 'Prot', val: planTotals.protein_g, goal: goalGrams.prot, adq: adequacy.prot, color: MACRO_COLORS.protein },
                    { label: 'Lip', val: planTotals.lipid_g, goal: goalGrams.lip, adq: adequacy.lip, color: MACRO_COLORS.lipid },
                    { label: 'HC', val: planTotals.carb_g, goal: goalGrams.hc, adq: adequacy.hc, color: MACRO_COLORS.carb },
                ].map(m => (
                    <div key={m.label} style={{flex: 1, minWidth: 0}}>
                         <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px'}}>
                             <span style={{color: m.color}}>{m.label}</span>
                             <span style={{color: m.adq > 110 ? 'var(--error-color)' : m.adq < 90 ? 'var(--text-light)' : 'var(--primary-color)'}}>{m.adq.toFixed(0)}%</span>
                         </div>
                         <div style={{height: '4px', backgroundColor: 'var(--background-color)', borderRadius: '2px', overflow: 'hidden'}}>
                             <div style={{width: `${Math.min(m.adq, 100)}%`, height: '100%', backgroundColor: m.color, transition: 'width 0.3s ease'}}></div>
                         </div>
                         {!isMobile && <div style={{fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '1px'}}>{m.val.toFixed(0)} / {m.goal.toFixed(0)}g</div>}
                    </div>
                ))}
            </div>
            
            {/* Right: Calories & Actions */}
            <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: 'flex-end'}}>
                 <div style={{textAlign: 'right', minWidth: '80px'}}>
                     <div style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600}}>CALORÍAS</div>
                     <div style={{fontSize: '1.1rem', fontWeight: 700, color: adequacy.kcal > 105 ? 'var(--error-color)' : 'var(--text-color)'}}>
                         {planTotals.kcal.toFixed(0)} <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 400}}>/ {goals.kcal}</span>
                     </div>
                </div>
                
                <div style={{display: 'flex', gap: '0.5rem', flex: isMobile ? 1 : 'initial'}}>
                    <button 
                        type="button" 
                        onClick={() => setIsAiPlanModalOpen(true)} 
                        disabled={!hasPortions || !hasAiFeature} 
                        className="button-secondary" 
                        title={!hasAiFeature ? "Función Premium" : "Crear menú con IA"}
                        style={{padding: '0.5rem 0.75rem', fontSize: '0.9rem', whiteSpace: 'nowrap', flex: 1}}
                    >
                        {ICONS.sparkles} {isMobile ? 'IA' : 'Menú IA'}
                    </button>
                    <button 
                        onClick={handleSavePlanClick} 
                        disabled={loading} 
                        className="button-primary"
                        style={{padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap', flex: 1}}
                    >
                        {loading ? '...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );

    const ConfigPanel = () => (
         <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1.5rem' }}>
            {/* Patient Selection */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
                <label htmlFor="planner-patient" style={styles.label}>Paciente</label>
                <input 
                    id="planner-patient"
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm} 
                    onChange={e => { setSearchTerm(e.target.value); setSelectedPersonId(''); setPersonName(e.target.value); setIsDropdownOpen(true); }} 
                    onFocus={() => setIsDropdownOpen(true)} 
                    style={{ ...styles.input, marginBottom: 0 }} 
                    autoComplete="off" 
                />
                {isDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: 'var(--shadow)' }}>
                        <div onClick={() => handleSelectPerson(null)} style={{padding: '0.75rem 1rem', cursor: 'pointer', fontStyle: 'italic', borderBottom: '1px solid var(--border-color)'}} className="nav-item-hover">-- Plan Genérico --</div>
                        {filteredPersons.map(p => (<div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer'}} className="nav-item-hover">{p.full_name}</div>))}
                    </div>
                )}
            </div>

            {/* Caloric Goal */}
             <div>
                <label htmlFor="kcal-goal" style={styles.label}>Meta Calórica (Kcal)</label>
                <input id="kcal-goal" type="number" name="kcal" value={goals.kcal} onChange={handleGoalChange} style={{...styles.input, marginBottom: 0, fontWeight: 700, color: 'var(--primary-color)'}} />
            </div>

             {/* Macro Distribution */}
             <div>
                <label style={styles.label}>Distribución % (P / L / HC)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <input type="number" name="prot_perc" value={goals.prot_perc} onChange={handleGoalChange} style={{...styles.input, marginBottom: 0, borderColor: MACRO_COLORS.protein, color: MACRO_COLORS.protein, fontWeight: 600}} placeholder="P" />
                    <input type="number" name="lip_perc" value={goals.lip_perc} onChange={handleGoalChange} style={{...styles.input, marginBottom: 0, borderColor: MACRO_COLORS.lipid, color: MACRO_COLORS.lipid, fontWeight: 600}} placeholder="L" />
                    <input type="number" name="hc_perc" value={goals.hc_perc} onChange={handleGoalChange} style={{...styles.input, marginBottom: 0, borderColor: MACRO_COLORS.carb, color: MACRO_COLORS.carb, fontWeight: 600}} placeholder="HC" />
                </div>
            </div>
         </div>
    );

    return (
        <div className="fade-in" style={{position: 'relative', minHeight: '80vh'}}>
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
            
            {foodExamplesState.isOpen && foodExamplesState.equivalent && (
                <FoodExamplesModal 
                    isOpen={foodExamplesState.isOpen}
                    onClose={() => setFoodExamplesState({ ...foodExamplesState, isOpen: false })}
                    equivalent={foodExamplesState.equivalent}
                    portions={foodExamplesState.portions}
                />
            )}
            
            {/* NEW: Patient Selection Modal for Saving */}
            {isPatientSelectModalOpen && modalRoot && createPortal(
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Guardar Plan</h2>
                            <button onClick={() => setIsPatientSelectModalOpen(false)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Selecciona un paciente para guardar este cálculo en su historial.</p>
                            
                            <input 
                                type="text" 
                                placeholder="Buscar paciente..." 
                                value={modalSearchTerm}
                                onChange={e => setModalSearchTerm(e.target.value)}
                                style={{...styles.input, marginBottom: '1rem'}}
                                autoFocus
                            />
                            
                            <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
                                {modalFilteredPersons.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => handleSelectFromModal(p)}
                                        className="nav-item-hover"
                                        style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                                    >
                                        <span>{p.full_name}</span>
                                        <span style={{fontSize: '1.2rem', color: 'var(--primary-color)'}}>→</span>
                                    </div>
                                ))}
                                {modalFilteredPersons.length === 0 && (
                                    <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-light)'}}>No se encontraron resultados.</div>
                                )}
                            </div>
                            
                            <div style={{marginTop: '1rem', textAlign: 'center'}}>
                                <button 
                                    onClick={() => { 
                                        setIsPatientSelectModalOpen(false); 
                                        // Save as generic plan without ID
                                        executeSave(null, 'Plan Genérico ' + new Date().toLocaleDateString()); 
                                    }}
                                    className="button-secondary"
                                    style={{fontSize: '0.9rem', width: '100%'}}
                                >
                                    Guardar como Plan Genérico (Sin asignar)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                modalRoot
            )}
            
            {error && <p style={styles.error}>{error}</p>}
            
            {/* Notification Toast */}
            {success && createPortal(
                <div className="fade-in" style={{
                    position: 'fixed',
                    bottom: '5rem', // Above the sticky footer
                    right: '2rem',
                    backgroundColor: 'var(--surface-color)',
                    borderLeft: '4px solid #10B981',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    zIndex: 2000,
                    color: 'var(--text-color)',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                }}>
                    <span style={{fontSize: '1.2rem'}}>✅</span>
                    {success}
                </div>,
                document.body
            )}

            <ConfigPanel />

            <EquivalentsPanel 
                groupedEquivalents={groupedEquivalents}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
                portions={portions}
                isMobile={isMobile}
                handlePortionChange={handlePortionChange}
                onShowExamples={handleShowExamples}
            />
            
            <StickyStatusFooter />
        </div>
    );
};

export default DietPlanner;
