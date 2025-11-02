import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import ResultDisplay from './shared/ResultDisplay';
import HelpTooltip from './shared/HelpTooltip';

// Mock database of common enteral formulas
const enteralFormulas = [
    { id: 'jevity_1_5', name: 'Jevity 1.5 kcal', kcal_per_ml: 1.5, protein_per_liter: 63.8 },
    { id: 'ensure_plus', name: 'Ensure Plus', kcal_per_ml: 1.5, protein_per_liter: 54.4 },
    { id: 'osmolite_1_2', name: 'Osmolite 1.2 kcal', kcal_per_ml: 1.2, protein_per_liter: 55.5 },
    { id: 'glucerna_1_2', name: 'Glucerna 1.2 kcal', kcal_per_ml: 1.2, protein_per_liter: 60.0 },
    { id: 'nepro_hp', name: 'Nepro HP', kcal_per_ml: 1.8, protein_per_liter: 81.0 },
    { id: 'two_cal_hn', name: 'TwoCal HN', kcal_per_ml: 2.0, protein_per_liter: 83.5 },
];

const panelSectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-color)',
    margin: '1.5rem 0 1rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center'
};

const ProgressBar: FC<{ label: string; value: number; total: number; unit: string }> = ({ label, value, total, unit }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const color = percentage < 90 ? 'var(--accent-color)' : percentage > 110 ? 'var(--error-color)' : 'var(--primary-color)';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                <span style={{ fontSize: '0.9rem', color: color, fontWeight: 500 }}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'var(--background-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                <div style={{ width: `${Math.min(percentage, 120)}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                <span>{value.toFixed(0)} {unit}</span>
                <span>Meta: {total.toFixed(0)} {unit}</span>
            </div>
        </div>
    );
};


const NutritionalSupportTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {

    const [goals, setGoals] = useState({ kcal: '', protein: '' });
    const [plan, setPlan] = useState({
        formulaId: enteralFormulas[0].id,
        volume: '',
        infusionTime: '',
        infusionRate: '',
    });

    // Auto-calculate and populate goals if a person is selected
    useEffect(() => {
        if (selectedPerson && lastConsultation) {
            const w = lastConsultation.weight_kg;
            const h = lastConsultation.height_cm;
            const a = selectedPerson.birth_date ? new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear() : null;
            
            if (w && h && a) {
                // Mifflin-St Jeor TMB
                const tmb = selectedPerson.gender === 'male'
                    ? (10 * w) + (6.25 * h) - (5 * a) + 5
                    : (10 * w) + (6.25 * h) - (5 * a) - 161;
                const get = tmb * 1.2; // Sedentary factor as a baseline
                const protein = w * 1.2; // Baseline protein needs
                
                setGoals({
                    kcal: get.toFixed(0),
                    protein: protein.toFixed(0)
                });
            }
        } else {
            // Reset if no person is selected
            setGoals({ kcal: '1800', protein: '90' });
        }
    }, [selectedPerson, lastConsultation]);

    const selectedFormula = useMemo(() => enteralFormulas.find(f => f.id === plan.formulaId)!, [plan.formulaId]);

    const nutrientDelivery = useMemo(() => {
        const volumeL = parseFloat(plan.volume) / 1000;
        if (volumeL > 0) {
            const totalKcal = parseFloat(plan.volume) * selectedFormula.kcal_per_ml;
            const totalProtein = volumeL * selectedFormula.protein_per_liter;
            return { totalKcal, totalProtein };
        }
        return { totalKcal: 0, totalProtein: 0 };
    }, [plan.volume, selectedFormula]);

    const handlePlanChange = (field: keyof typeof plan, value: string) => {
        if (!/^\d*\.?\d*$/.test(value)) return;

        setPlan(prev => {
            const newPlan = { ...prev, [field]: value };
            const vol = parseFloat(newPlan.volume);
            
            if (field === 'infusionTime' && vol > 0) {
                const time = parseFloat(value);
                newPlan.infusionRate = time > 0 ? (vol / time).toFixed(1) : '';
            } else if (field === 'infusionRate' && vol > 0) {
                const rate = parseFloat(value);
                newPlan.infusionTime = rate > 0 ? (vol / rate).toFixed(1) : '';
            } else if (field === 'volume') {
                // Recalculate rate if time is set
                const time = parseFloat(newPlan.infusionTime);
                if(time > 0) {
                    newPlan.infusionRate = (vol / time).toFixed(1);
                }
            }
            return newPlan;
        });
    };

    const handleSave = () => {
        const { totalKcal, totalProtein } = nutrientDelivery;
        const description = `Plan Soporte Enteral (${selectedFormula.name}): ${plan.volume}ml/día a ${plan.infusionRate || 'N/A'}ml/h. Aporte: ${totalKcal.toFixed(0)} kcal, ${totalProtein.toFixed(0)}g proteína.`;
        handleSaveToLog('nutritionalSupport', 'Plan de Soporte Nutricional', description, { inputs: { goals, ...plan }, result: { delivery: nutrientDelivery, infusionRate: plan.infusionRate } });
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <CalculatorCard
                title="Asistente de Planificación de Soporte Nutricional"
                onSave={handleSave}
                saveDisabled={!selectedPerson || !plan.volume || !plan.infusionTime}
                saveStatus={saveStatus['nutritionalSupport']}
            >
                {/* 1. Objetivos Nutricionales */}
                <h4 style={{...panelSectionTitleStyle, marginTop: 0}}>
                    1. Objetivos Nutricionales
                    <HelpTooltip content="Establece las metas calóricas y proteicas diarias para el paciente. Estos valores pueden ser calculados con la herramienta de 'Requerimientos Energéticos' o ajustados manually según el criterio clínico." />
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label>Gasto Energético Total (kcal/día)</label>
                        <input type="number" value={goals.kcal} onChange={e => setGoals(g => ({ ...g, kcal: e.target.value }))} />
                    </div>
                    <div>
                        <label>Requerimiento Proteico (g/día)</label>
                        <input type="number" value={goals.protein} onChange={e => setGoals(g => ({ ...g, protein: e.target.value }))} />
                    </div>
                </div>

                {/* 2. Selección de Fórmula */}
                <h4 style={panelSectionTitleStyle}>
                    2. Selección de Fórmula Enteral
                    <HelpTooltip content="Elige la fórmula enteral que se ajuste a las necesidades del paciente. La densidad calórica (kcal/mL) y el contenido de proteína (g/L) son clave para determinar el aporte nutricional." />
                </h4>
                <div>
                    <label>Fórmula</label>
                    <select value={plan.formulaId} onChange={e => setPlan(p => ({ ...p, formulaId: e.target.value }))}>
                        {enteralFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                        Densidad: <strong>{selectedFormula.kcal_per_ml} kcal/mL</strong> | Proteína: <strong>{selectedFormula.protein_per_liter} g/L</strong>
                    </p>
                </div>

                {/* 3. Cálculo de Aporte y Cobertura */}
                <h4 style={panelSectionTitleStyle}>
                    3. Cálculo de Aporte y Cobertura
                    <HelpTooltip content="Introduce el volumen total de la fórmula que el paciente recibirá en 24 horas. El sistema calculará automáticamente el aporte de calorías y proteínas y lo comparará con los objetivos establecidos." />
                </h4>
                <div>
                    <label>Volumen Total Planificado (mL/día)</label>
                    <input type="number" value={plan.volume} onChange={e => handlePlanChange('volume', e.target.value)} />
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px' }}>
                    <ProgressBar label="Cobertura Calórica" value={nutrientDelivery.totalKcal} total={parseFloat(goals.kcal)} unit="kcal" />
                    <ProgressBar label="Cobertura Proteica" value={nutrientDelivery.totalProtein} total={parseFloat(goals.protein)} unit="g" />
                </div>

                {/* 4. Plan de Infusión */}
                <h4 style={panelSectionTitleStyle}>
                    4. Plan de Infusión
                    <HelpTooltip content="Define cómo se administrará la fórmula. Puedes establecer el 'Tiempo de Infusión' total (en horas) y el sistema calculará el 'Ritmo' (en mL/hora), o viceversa. Ambos se basan en el Volumen Total Planificado." />
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label>Tiempo de Infusión (horas)</label>
                        <input type="number" value={plan.infusionTime} onChange={e => handlePlanChange('infusionTime', e.target.value)} />
                    </div>
                    <div>
                        <label>Ritmo de Infusión (mL/hora)</label>
                        <input type="number" value={plan.infusionRate} onChange={e => handlePlanChange('infusionRate', e.target.value)} />
                    </div>
                </div>
                 <ResultDisplay
                    label="Ritmo de Infusión Calculado"
                    value={plan.infusionRate || 'N/A'}
                    unit="mL/hora"
                />

            </CalculatorCard>
        </div>
    );
};

export default NutritionalSupportTools;