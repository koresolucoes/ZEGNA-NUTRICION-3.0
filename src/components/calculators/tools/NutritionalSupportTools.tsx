
import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const enteralFormulas = [
    { id: 'jevity_1_5', name: 'Jevity 1.5 kcal', kcal_per_ml: 1.5, protein_per_liter: 63.8 },
    { id: 'ensure_plus', name: 'Ensure Plus', kcal_per_ml: 1.5, protein_per_liter: 54.4 },
    { id: 'osmolite_1_2', name: 'Osmolite 1.2 kcal', kcal_per_ml: 1.2, protein_per_liter: 55.5 },
    { id: 'glucerna_1_2', name: 'Glucerna 1.2 kcal', kcal_per_ml: 1.2, protein_per_liter: 60.0 },
    { id: 'nepro_hp', name: 'Nepro HP', kcal_per_ml: 1.8, protein_per_liter: 81.0 },
    { id: 'two_cal_hn', name: 'TwoCal HN', kcal_per_ml: 2.0, protein_per_liter: 83.5 },
];

const ProgressBar: FC<{ label: string; value: number; total: number; unit: string }> = ({ label, value, total, unit }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const color = percentage < 90 ? 'var(--accent-color)' : percentage > 110 ? 'var(--error-color)' : 'var(--primary-color)';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>{label}</span>
                <span style={{ fontSize: '0.85rem', color: color, fontWeight: 700 }}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
            <div style={{ height: '10px', backgroundColor: 'var(--surface-active)', borderRadius: '5px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s ease-out', borderRadius: '5px' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                <span>{value.toFixed(0)} {unit}</span>
                <span>Meta: {total.toFixed(0)}</span>
            </div>
        </div>
    );
};

const NutritionalSupportTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [goals, setGoals] = useState({ kcal: '1800', protein: '90' });
    const [plan, setPlan] = useState({ formulaId: enteralFormulas[0].id, volume: '', infusionTime: '', infusionRate: '' });

    const selectedFormula = useMemo(() => enteralFormulas.find(f => f.id === plan.formulaId)!, [plan.formulaId]);
    const nutrientDelivery = useMemo(() => {
        const volumeL = parseFloat(plan.volume) / 1000;
        if (volumeL > 0) {
            return { totalKcal: parseFloat(plan.volume) * selectedFormula.kcal_per_ml, totalProtein: volumeL * selectedFormula.protein_per_liter };
        }
        return { totalKcal: 0, totalProtein: 0 };
    }, [plan.volume, selectedFormula]);

    const handlePlanChange = (field: keyof typeof plan, value: string) => {
        setPlan(prev => {
            const newPlan = { ...prev, [field]: value };
            const vol = parseFloat(newPlan.volume);
            if (field === 'infusionTime' && vol > 0) {
                newPlan.infusionRate = parseFloat(value) > 0 ? (vol / parseFloat(value)).toFixed(1) : '';
            } else if (field === 'infusionRate' && vol > 0) {
                newPlan.infusionTime = parseFloat(value) > 0 ? (vol / parseFloat(value)).toFixed(1) : '';
            } else if (field === 'volume' && parseFloat(newPlan.infusionTime) > 0) {
                newPlan.infusionRate = (vol / parseFloat(newPlan.infusionTime)).toFixed(1);
            }
            return newPlan;
        });
    };

    const handleSave = () => {
        const { totalKcal, totalProtein } = nutrientDelivery;
        const description = `Plan Soporte Enteral (${selectedFormula.name}): ${plan.volume}ml/día a ${plan.infusionRate || 'N/A'}ml/h. Aporte: ${totalKcal.toFixed(0)} kcal, ${totalProtein.toFixed(0)}g proteína.`;
        handleSaveToLog('nutritionalSupport', 'Plan de Soporte Nutricional', description, { inputs: { goals, ...plan }, result: { delivery: nutrientDelivery, infusionRate: plan.infusionRate } });
    };

    const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0 };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <CalculatorCard
                title="Calculadora de Soporte Enteral"
                onSave={handleSave}
                saveDisabled={!plan.volume || !plan.infusionTime}
                saveStatus={saveStatus['nutritionalSupport']}
            >
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
                    <div style={{gridColumn: '1 / -1', marginBottom: '0.5rem'}}>
                        <h4 style={{fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', margin: '0 0 0.5rem 0', fontWeight: 700}}>Metas Nutricionales</h4>
                        <div style={{display: 'flex', gap: '1rem'}}>
                             <div style={{flex: 1}}><label style={styles.label}>Kcal / día</label><input type="number" value={goals.kcal} onChange={e => setGoals(g => ({ ...g, kcal: e.target.value }))} style={inputStyle} /></div>
                             <div style={{flex: 1}}><label style={styles.label}>Proteína (g)</label><input type="number" value={goals.protein} onChange={e => setGoals(g => ({ ...g, protein: e.target.value }))} style={inputStyle} /></div>
                        </div>
                    </div>

                    <div style={{gridColumn: '1 / -1'}}>
                         <h4 style={{fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', margin: '0 0 0.5rem 0', fontWeight: 700}}>Selección de Fórmula</h4>
                         <div className="select-wrapper">
                            <select value={plan.formulaId} onChange={e => setPlan(p => ({ ...p, formulaId: e.target.value }))} style={inputStyle}>
                                {enteralFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                         </div>
                         <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                             <span><strong>{selectedFormula.kcal_per_ml}</strong> kcal/mL</span>
                             <span><strong>{selectedFormula.protein_per_liter}</strong> g/L Prot</span>
                         </div>
                    </div>
                </div>
                
                <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem'}}>
                        <div><label style={styles.label}>Volumen Total (mL)</label><input type="number" value={plan.volume} onChange={e => handlePlanChange('volume', e.target.value)} style={inputStyle} /></div>
                        <div><label style={styles.label}>Horas Infusión</label><input type="number" value={plan.infusionTime} onChange={e => handlePlanChange('infusionTime', e.target.value)} style={inputStyle} /></div>
                        <div><label style={{...styles.label, color: 'var(--primary-color)'}}>Ritmo (mL/h)</label><input type="number" value={plan.infusionRate} onChange={e => handlePlanChange('infusionRate', e.target.value)} style={{...inputStyle, borderColor: 'var(--primary-color)', fontWeight: 700}} /></div>
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        <ProgressBar label="Cobertura Calórica" value={nutrientDelivery.totalKcal} total={parseFloat(goals.kcal)} unit="kcal" />
                        <ProgressBar label="Cobertura Proteica" value={nutrientDelivery.totalProtein} total={parseFloat(goals.protein)} unit="g" />
                    </div>
                </div>

            </CalculatorCard>
        </div>
    );
};

export default NutritionalSupportTools;
