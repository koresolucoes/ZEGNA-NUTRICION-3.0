
import React, { FC, useState, useMemo, ChangeEvent, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FoodEquivalent, Person, DietPlanHistoryItem, KnowledgeResource } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';
import { useClinic } from '../../contexts/ClinicContext';
import AiMealPlanGeneratorModal from './AiMealPlanGeneratorModal';
import AiRecipeFromEquivalentsModal from './AiRecipeFromEquivalentsModal';
import FoodExamplesModal from './FoodExamplesModal';

// --- CONSTANTS & HELPERS ---

const MACRO_COLORS = {
    protein: '#EC4899', // Pink
    lipid: '#F59E0B',   // Amber
    carb: '#3B82F6',    // Blue
    energy: '#10B981'   // Emerald
};

const modalRoot = document.getElementById('modal-root');

// --- SUB-COMPONENTS ---

const StepperInput: FC<{ value: string, onChange: (val: string) => void, isActive: boolean }> = ({ value, onChange, isActive }) => {
    const numValue = parseFloat(value) || 0;

    const adjust = (amount: number) => {
        const newValue = Math.max(0, numValue + amount);
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
            marginTop: 'auto'
        }}>
            <button 
                onClick={() => adjust(-0.5)} 
                style={{ flex: 1, height: '40px', border: 'none', background: 'transparent', color: 'var(--text-light)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                    marginBottom: 0, padding: 0, height: '40px', fontSize: '1rem'
                }} 
                placeholder="0"
            />
            <button 
                onClick={() => adjust(0.5)} 
                style={{ flex: 1, height: '40px', border: 'none', background: 'transparent', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                type="button"
            >
                +
            </button>
        </div>
    );
};

const EquivalentCard: FC<{ eq: FoodEquivalent, portion: string, onPortionChange: (id: string, val: string) => void, onShowExamples: (eq: FoodEquivalent, p: number) => void }> = React.memo(({ eq, portion, onPortionChange, onShowExamples }) => {
    const numPortions = parseFloat(portion) || 0;
    const isActive = numPortions > 0;

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
            position: 'relative',
            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
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
                 <div style={{color: 'var(--text-light)'}}><span style={{color: MACRO_COLORS.protein}}>P:</span> {stats.p}</div>
                 <div style={{color: 'var(--text-light)'}}><span style={{color: MACRO_COLORS.lipid}}>L:</span> {stats.l}</div>
                 <div style={{color: 'var(--text-light)'}}><span style={{color: MACRO_COLORS.carb}}>HC:</span> {stats.c}</div>
                 <div style={{fontWeight: 700, color: 'var(--text-color)'}}>{stats.k} kcal</div>
            </div>
            
            <StepperInput value={portion} onChange={(val) => onPortionChange(eq.id, val)} isActive={isActive} />
        </div>
    );
});


// --- MAIN COMPONENT ---

interface DietPlannerProps {
    equivalentsData: FoodEquivalent[];
    persons: Person[];
    isMobile: boolean;
    onPlanSaved: () => void;
    initialPlan: DietPlanHistoryItem | null;
    clearInitialPlan: () => void;
    knowledgeResources: KnowledgeResource[];
    customModalZIndex?: number;
}

const DietPlanner: FC<DietPlannerProps> = ({ equivalentsData, persons, isMobile, onPlanSaved, initialPlan, clearInitialPlan, knowledgeResources, customModalZIndex }) => {
    const { clinic, subscription } = useClinic();
    
    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1); // 1: Config, 2: Distribución, 3: Resultados
    
    // Data State
    const [portions, setPortions] = useState<Record<string, string>>({});
    const [goals, setGoals] = useState({ kcal: '2000', hc_perc: '50', prot_perc: '20', lip_perc: '30' });
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [personName, setPersonName] = useState('');

    // UI State
    const [activeGroupFilter, setActiveGroupFilter] = useState('Verduras');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Search/Select Patient UI
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Modals
    const [isAiPlanModalOpen, setIsAiPlanModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [foodExamplesState, setFoodExamplesState] = useState<{ isOpen: boolean; equivalent: FoodEquivalent | null; portions: number }>({ isOpen: false, equivalent: null, portions: 0 });

    const hasAiFeature = useMemo(() => subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false, [subscription]);

    // Initial Load Logic
    useEffect(() => {
        if (initialPlan) {
            setGoals(initialPlan.goals);
            setPortions(initialPlan.portions || {});
            setPersonName(String(initialPlan.person_name || ''));
            setSelectedPersonId(initialPlan.person_id || '');
            setSearchTerm(String(initialPlan.person_name || ''));
            setStep(3); // Jump to results if loading
            clearInitialPlan();
        } else {
            // Init empty portions
            const initP: Record<string, string> = {};
            equivalentsData.forEach(eq => initP[eq.id] = '');
            setPortions(initP);
        }
    }, [initialPlan, equivalentsData]);

    // --- CALCULATIONS ---

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
        return {
            prot: (kcal * (parseFloat(goals.prot_perc) / 100)) / 4,
            lip: (kcal * (parseFloat(goals.lip_perc) / 100)) / 9,
            hc: (kcal * (parseFloat(goals.hc_perc) / 100)) / 4,
        };
    }, [goals]);

    const adequacy = useMemo(() => ({
        prot: goalGrams.prot > 0 ? (planTotals.protein_g / goalGrams.prot) * 100 : 0,
        lip: goalGrams.lip > 0 ? (planTotals.lipid_g / goalGrams.lip) * 100 : 0,
        hc: goalGrams.hc > 0 ? (planTotals.carb_g / goalGrams.hc) * 100 : 0,
        kcal: parseFloat(goals.kcal) > 0 ? (planTotals.kcal / parseFloat(goals.kcal)) * 100 : 0
    }), [planTotals, goalGrams, goals.kcal]);

    // --- HANDLERS ---

    const handlePortionChange = useCallback((id: string, val: string) => {
        if (/^\d*\.?\d*$/.test(val)) setPortions(prev => ({ ...prev, [id]: val }));
    }, []);

    const handleGoalChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGoals(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectPerson = (p: Person | null) => {
        if (p) {
            setSelectedPersonId(p.id);
            setPersonName(p.full_name);
            setSearchTerm(p.full_name);
        } else {
            setSelectedPersonId('');
            setPersonName('');
            setSearchTerm('');
        }
        setIsDropdownOpen(false);
    };

    const filteredPersons = useMemo(() => persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())), [persons, searchTerm]);

    const groupedEquivalents = useMemo(() => {
        return equivalentsData.reduce((acc, eq) => {
            const group = eq.group_name;
            if (!acc[group]) acc[group] = [];
            acc[group].push(eq);
            return acc;
        }, {} as Record<string, FoodEquivalent[]>);
    }, [equivalentsData]);

    const groupsList = useMemo(() => [
        'Verduras', 'Frutas', 'Cereales y Tubérculos', 'Leguminosas', 
        'Alimentos de Origen Animal', 'Leche', 'Aceites y Grasas', 'Azúcares', 'Alimentos Libres en Energía', 'Bebidas Alcohólicas'
    ], []);

    const executeSave = async () => {
        if (!clinic) return;
        setLoading(true);
        try {
            await supabase.from('diet_plan_history').insert({
                clinic_id: clinic.id,
                person_id: selectedPersonId || null,
                person_name: personName || 'Plan Sin Asignar',
                goals,
                totals: planTotals,
                portions,
                plan_date: new Date().toISOString()
            });
            setSuccess("Plan guardado correctamente");
            setTimeout(() => setSuccess(null), 3000);
            onPlanSaved();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- STEPS COMPONENTS ---

    const StepIndicator = () => (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--surface-color)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                {[1, 2, 3].map(num => (
                    <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                        <div 
                            onClick={() => setStep(num)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: step >= num ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                                color: step >= num ? 'white' : 'var(--text-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {num}
                        </div>
                        {num < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: step > num ? 'var(--primary-color)' : 'var(--border-color)', margin: '0 0.5rem' }}></div>}
                    </div>
                ))}
            </div>
        </div>
    );

    const MacroFooter = () => (
        <div className="fade-in-up" style={{
            position: 'fixed', bottom: 0, left: isMobile ? 0 : '260px', right: 0,
            backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)',
            padding: '1rem 2rem', zIndex: 100, boxShadow: '0 -5px 20px rgba(0,0,0,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem'
        }}>
            <div style={{display: 'flex', gap: '1.5rem', flex: 1}}>
                {[
                    { label: 'PROT', val: planTotals.protein_g, goal: goalGrams.prot, adq: adequacy.prot, color: MACRO_COLORS.protein },
                    { label: 'LIP', val: planTotals.lipid_g, goal: goalGrams.lip, adq: adequacy.lip, color: MACRO_COLORS.lipid },
                    { label: 'HC', val: planTotals.carb_g, goal: goalGrams.hc, adq: adequacy.hc, color: MACRO_COLORS.carb },
                ].map(m => (
                    <div key={m.label} style={{flex: 1}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px'}}>
                            <span style={{color: m.color}}>{m.label}</span>
                            <span>{m.adq.toFixed(0)}%</span>
                        </div>
                        <div style={{height: '6px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '3px', overflow: 'hidden'}}>
                            <div style={{width: `${Math.min(m.adq, 100)}%`, height: '100%', backgroundColor: m.color, transition: 'width 0.3s'}}></div>
                        </div>
                        <div style={{fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '2px'}}>{m.val.toFixed(0)} / {m.goal.toFixed(0)}g</div>
                    </div>
                ))}
            </div>
            
            <div style={{textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem'}}>
                <div style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 700}}>CALORÍAS</div>
                <div style={{fontSize: '1.5rem', fontWeight: 800, color: adequacy.kcal > 105 ? 'var(--error-color)' : 'var(--text-color)'}}>
                    {planTotals.kcal.toFixed(0)} <span style={{fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500}}>/ {goals.kcal}</span>
                </div>
            </div>

            <button onClick={() => setStep(3)} className="button-primary" style={{padding: '0.8rem 1.5rem'}}>
                Ver Resultados →
            </button>
        </div>
    );

    // --- RENDER ---

    return (
        <div className="fade-in" style={{ paddingBottom: step === 2 ? '100px' : '2rem' }}>
            
            {/* Modals */}
            {isAiPlanModalOpen && <AiMealPlanGeneratorModal isOpen={isAiPlanModalOpen} onClose={() => setIsAiPlanModalOpen(false)} onPlanSaved={() => {onPlanSaved(); setStep(3);}} equivalentsData={equivalentsData} planPortions={portions} personId={selectedPersonId || null} persons={persons} />}
            {isRecipeModalOpen && <AiRecipeFromEquivalentsModal isOpen={isRecipeModalOpen} onClose={() => setIsRecipeModalOpen(false)} equivalentsData={equivalentsData} planPortions={portions} />}
            {foodExamplesState.isOpen && foodExamplesState.equivalent && <FoodExamplesModal isOpen={true} onClose={() => setFoodExamplesState(prev => ({...prev, isOpen: false}))} equivalent={foodExamplesState.equivalent} portions={foodExamplesState.portions} />}
            
            {/* Main UI */}
            <div style={{...styles.pageHeader, marginBottom: '2rem'}}>
                <div>
                    <h1 style={{margin: 0}}>Planificador Dietético</h1>
                    <p style={{color: 'var(--text-light)', margin: 0}}>Calcula y distribuye porciones de equivalentes.</p>
                </div>
                {success && <div style={{padding: '0.5rem 1rem', backgroundColor: '#10B981', color: 'white', borderRadius: '8px', fontSize: '0.9rem'}}>{success}</div>}
            </div>

            <StepIndicator />

            {/* STEP 1: CONFIGURATION */}
            {step === 1 && (
                <div className="fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
                    <div style={{backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)'}}>
                        <h3 style={{marginTop: 0, marginBottom: '1.5rem', color: 'var(--primary-color)'}}>1. Configuración del Plan</h3>
                        
                        <div style={{marginBottom: '2rem'}}>
                            <label style={styles.label}>Paciente</label>
                            <div style={{position: 'relative'}}>
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    placeholder="Buscar paciente..."
                                    style={{...styles.input, marginBottom: 0}}
                                />
                                {isDropdownOpen && filteredPersons.length > 0 && (
                                    <div style={{position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: 'var(--shadow)'}}>
                                        {filteredPersons.map(p => (
                                            <div key={p.id} onClick={() => handleSelectPerson(p)} className="nav-item-hover" style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)'}}>
                                                {p.full_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem'}}>
                            <div>
                                <label style={styles.label}>Meta Calórica (Kcal)</label>
                                <input type="number" name="kcal" value={goals.kcal} onChange={handleGoalChange} style={{...styles.input, fontSize: '1.2rem', fontWeight: 700}} />
                            </div>
                            <div>
                                <label style={styles.label}>Distribución Macros (%)</label>
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                    <div style={{flex: 1}}>
                                        <span style={{fontSize: '0.7rem', color: MACRO_COLORS.protein, fontWeight: 700}}>PROT</span>
                                        <input type="number" name="prot_perc" value={goals.prot_perc} onChange={handleGoalChange} style={styles.input} />
                                    </div>
                                    <div style={{flex: 1}}>
                                        <span style={{fontSize: '0.7rem', color: MACRO_COLORS.lipid, fontWeight: 700}}>LIP</span>
                                        <input type="number" name="lip_perc" value={goals.lip_perc} onChange={handleGoalChange} style={styles.input} />
                                    </div>
                                    <div style={{flex: 1}}>
                                        <span style={{fontSize: '0.7rem', color: MACRO_COLORS.carb, fontWeight: 700}}>HC</span>
                                        <input type="number" name="hc_perc" value={goals.hc_perc} onChange={handleGoalChange} style={styles.input} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center'}}>
                            <div>
                                <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Gramos Proteína</p>
                                <p style={{margin: 0, fontWeight: 700, fontSize: '1.2rem', color: MACRO_COLORS.protein}}>{goalGrams.prot.toFixed(0)}g</p>
                            </div>
                            <div>
                                <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Gramos Lípidos</p>
                                <p style={{margin: 0, fontWeight: 700, fontSize: '1.2rem', color: MACRO_COLORS.lipid}}>{goalGrams.lip.toFixed(0)}g</p>
                            </div>
                            <div>
                                <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Gramos Carbos</p>
                                <p style={{margin: 0, fontWeight: 700, fontSize: '1.2rem', color: MACRO_COLORS.carb}}>{goalGrams.hc.toFixed(0)}g</p>
                            </div>
                        </div>

                        <div style={{textAlign: 'right'}}>
                            <button onClick={() => setStep(2)} className="button-primary" style={{padding: '0.8rem 2rem', fontSize: '1rem'}}>
                                Continuar a Distribución →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: DISTRIBUTION */}
            {step === 2 && (
                <div className="fade-in">
                    {/* Category Tabs */}
                    <div style={{display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem'}} className="hide-scrollbar">
                        {groupsList.map(group => (
                            <button 
                                key={group} 
                                onClick={() => setActiveGroupFilter(group)}
                                style={{
                                    padding: '0.6rem 1.2rem', borderRadius: '20px', border: '1px solid var(--border-color)',
                                    backgroundColor: activeGroupFilter === group ? 'var(--primary-color)' : 'var(--surface-color)',
                                    color: activeGroupFilter === group ? 'white' : 'var(--text-light)',
                                    whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                }}
                            >
                                {group}
                            </button>
                        ))}
                    </div>
                    
                    {/* Cards Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                        gap: '1rem', 
                        paddingBottom: '2rem' 
                    }}>
                        {(groupedEquivalents[activeGroupFilter] || []).map(eq => (
                            <EquivalentCard 
                                key={eq.id} 
                                eq={eq} 
                                portion={portions[eq.id] || ''} 
                                onPortionChange={handlePortionChange}
                                onShowExamples={(e, p) => setFoodExamplesState({ isOpen: true, equivalent: e, portions: p })}
                            />
                        ))}
                    </div>
                    <MacroFooter />
                </div>
            )}

            {/* STEP 3: RESULTS */}
            {step === 3 && (
                <div className="fade-in" style={{maxWidth: '1000px', margin: '0 auto'}}>
                    <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem'}}>
                        {/* Summary Card */}
                        <div style={{backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)'}}>
                            <h3 style={{marginTop: 0, marginBottom: '1.5rem', textAlign: 'center'}}>Resumen Final</h3>
                            
                            <div style={{position: 'relative', width: '200px', height: '200px', margin: '0 auto 2rem auto'}}>
                                <svg viewBox="0 0 36 36" style={{width: '100%', height: '100%', transform: 'rotate(-90deg)'}}>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--surface-hover-color)" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={adequacy.kcal > 105 ? 'var(--error-color)' : 'var(--primary-color)'} strokeWidth="3" strokeDasharray={`${Math.min(adequacy.kcal, 100)}, 100`} />
                                </svg>
                                <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                                    <span style={{fontSize: '2rem', fontWeight: 800, color: 'var(--text-color)'}}>{planTotals.kcal.toFixed(0)}</span>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Kcal Totales</span>
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                {['prot', 'lip', 'hc'].map(m => {
                                    const macro = m as 'prot' | 'lip' | 'hc';
                                    const labels = { prot: 'Proteína', lip: 'Lípidos', hc: 'Carbohidratos' };
                                    const colors = { prot: MACRO_COLORS.protein, lip: MACRO_COLORS.lipid, hc: MACRO_COLORS.carb };
                                    const val = planTotals[`${macro === 'hc' ? 'carb' : macro === 'lip' ? 'lipid' : 'protein'}_g`];
                                    return (
                                        <div key={m}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px'}}>
                                                <span style={{fontWeight: 600}}>{labels[macro]}</span>
                                                <span style={{color: colors[macro], fontWeight: 700}}>{adequacy[macro].toFixed(0)}%</span>
                                            </div>
                                            <div style={{height: '8px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '4px', overflow: 'hidden'}}>
                                                <div style={{width: `${Math.min(adequacy[macro], 100)}%`, height: '100%', backgroundColor: colors[macro]}}></div>
                                            </div>
                                            <div style={{textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px'}}>
                                                {val.toFixed(0)}g / {goalGrams[macro].toFixed(0)}g
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        
                        {/* Actions Card */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            <div style={{backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', flex: 1}}>
                                <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Próximos Pasos</h3>
                                <p style={{color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '2rem'}}>
                                    Usa la Inteligencia Artificial para convertir estos cálculos en un plan tangible para tu paciente.
                                </p>
                                
                                <button onClick={() => setIsAiPlanModalOpen(true)} disabled={!hasAiFeature} style={{width: '100%', padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: hasAiFeature ? 1 : 0.6}}>
                                    {ICONS.sparkles} Generar Menú Semanal con IA
                                </button>
                                
                                <button onClick={() => setIsRecipeModalOpen(true)} disabled={!hasAiFeature} style={{width: '100%', padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                                    {ICONS.book} Crear Receta de Ejemplo
                                </button>
                                
                                <button onClick={executeSave} disabled={loading} style={{width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid var(--primary-color)', backgroundColor: 'transparent', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer'}}>
                                    {loading ? 'Guardando...' : 'Guardar en Historial'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{textAlign: 'center', marginTop: '2rem'}}>
                        <button onClick={() => setStep(2)} style={{background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', textDecoration: 'underline'}}>
                            ← Volver a editar distribución
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DietPlanner;
