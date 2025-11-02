import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';

const panelSectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-color)',
    margin: '0 0 0.5rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center'
};

const panelDescriptionStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: 'var(--text-light)',
    marginTop: 0,
    marginBottom: '1rem',
};


const RenalTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    // State for TFG
    const [gfr, setGfr] = useState({ creatinine: '', age: '', gender: 'female' as 'male' | 'female' });
    
    // State for Protein Needs
    const [proteinNeeds, setProteinNeeds] = useState({ weight: '', stage: 'g1-g3' });

    // Autopopulate fields from selected person context
    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '';
        // FIX: Explicitly cast person gender to 'male' | 'female' to match state type.
        const gender = (selectedPerson?.gender as 'male' | 'female') || 'female';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        
        setGfr(prev => ({ ...prev, age, gender }));
        setProteinNeeds(prev => ({ ...prev, weight: weightStr }));
    }, [selectedPerson, lastConsultation]);

    // Calculate TFG and determine clinical stage
    const gfrResult = useMemo(() => {
        const creatinine = parseFloat(gfr.creatinine);
        const age = parseInt(gfr.age, 10);
        if (creatinine > 0 && age > 0) {
            const kappa = gfr.gender === 'female' ? 0.7 : 0.9;
            const alpha = gfr.gender === 'female' ? -0.241 : -0.302;
            const genderFactor = gfr.gender === 'female' ? 1.012 : 1;
            const scrOverKappa = creatinine / kappa;
            const result = 142 * Math.pow(Math.min(scrOverKappa, 1), alpha) * Math.pow(Math.max(scrOverKappa, 1), -1.200) * Math.pow(0.9938, age) * genderFactor;
            
            let interpretation, stageKey;
            if (result >= 90) { interpretation = 'Estadio G1: Normal o elevado'; stageKey = 'g1-g3'; }
            else if (result >= 60) { interpretation = 'Estadio G2: Lig. disminuido'; stageKey = 'g1-g3'; }
            else if (result >= 45) { interpretation = 'Estadio G3a: Lig. a mod. disminuido'; stageKey = 'g1-g3'; }
            else if (result >= 30) { interpretation = 'Estadio G3b: Mod. a sev. disminuido'; stageKey = 'g1-g3'; }
            else if (result >= 15) { interpretation = 'Estadio G4: Severamente disminuido'; stageKey = 'g4-g5'; }
            else { interpretation = 'Estadio G5: Falla renal'; stageKey = 'g4-g5'; }
            
            return { value: result.toFixed(0), interpretation, stageKey, unit: "ml/min/1.73m²" };
        }
        return null;
    }, [gfr]);

    // Auto-select protein stage based on TFG result, but allow manual override for dialysis
    useEffect(() => {
        if (gfrResult?.stageKey && !['hemodialysis', 'peritoneal'].includes(proteinNeeds.stage)) {
            setProteinNeeds(prev => ({ ...prev, stage: gfrResult.stageKey }));
        }
    }, [gfrResult, proteinNeeds.stage]);

    // Protein needs options and calculation logic
    const proteinStages = [
        { key: 'g1-g3', label: 'Estadio G1-G3 (Pre-diálisis)', range: { min: 0.8, max: 1.0 } },
        { key: 'g4-g5', label: 'Estadio G4-G5 (Pre-diálisis)', range: { min: 0.6, max: 0.8 } },
        { key: 'hemodialysis', label: 'Hemodiálisis', range: { min: 1.0, max: 1.2 } },
        { key: 'peritoneal', label: 'Diálisis Peritoneal', range: { min: 1.0, max: 1.3 } }
    ];

    const proteinNeedsResult = useMemo(() => {
        const w = parseFloat(proteinNeeds.weight);
        if (w > 0) {
            const stageInfo = proteinStages.find(s => s.key === proteinNeeds.stage);
            if (!stageInfo) return null;

            const minGrams = (w * stageInfo.range.min);
            const maxGrams = (w * stageInfo.range.max);
            
            const value = minGrams.toFixed(1) === maxGrams.toFixed(1) ? `${minGrams.toFixed(1)}` : `${minGrams.toFixed(1)} - ${maxGrams.toFixed(1)}`;
            const calculation = `${w.toFixed(1)} kg × (${stageInfo.range.min}${stageInfo.range.min !== stageInfo.range.max ? `-${stageInfo.range.max}` : ''} g/kg)`;

            return { value, calculation, rangeLabel: `${stageInfo.range.min}${stageInfo.range.min !== stageInfo.range.max ? `-${stageInfo.range.max}` : ''} g/kg` };
        }
        return null;
    }, [proteinNeeds, proteinStages]);

    // Styles for the result display tables
    const resultBoxStyle: React.CSSProperties = {
        marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '12px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center'
    };
    const resultItemStyle: React.CSSProperties = { borderRight: '1px solid var(--border-color)' };
    const resultLabelStyle: React.CSSProperties = { margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' };
    const resultValueStyle: React.CSSProperties = { margin: '0.25rem 0', fontWeight: 600, fontSize: '1.5rem', color: 'var(--primary-color)' };

    // Combined save logic for the entire panel
    const handleSaveEvaluation = () => {
        if (!selectedPerson || !gfrResult || !proteinNeedsResult) return;
        const description = `Evaluación Renal: TFG ${gfrResult.value} (${gfrResult.interpretation}), Proteína ${proteinNeedsResult.value} g/día.`;
        const data = {
            inputs: { gfr, proteinNeeds },
            result: { gfr: gfrResult, protein: proteinNeedsResult }
        };
        handleSaveToLog('renalEvaluation', 'Evaluación Renal', description, data);
    };

    return (
        <div className="fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
            <CalculatorCard 
                title="Panel de Evaluación Renal"
                onSave={handleSaveEvaluation}
                saveDisabled={!selectedPerson || !gfrResult || !proteinNeedsResult}
                saveStatus={saveStatus['renalEvaluation']}
            >
                {/* Section 1: TFG */}
                <h4 style={panelSectionTitleStyle}>
                    1. Tasa de Filtración Glomerular (TFG)
                    <HelpTooltip content="La Tasa de Filtración Glomerular (TFG) estima qué tan bien están funcionando los riñones. Se calcula usando la fórmula CKD-EPI 2021, el estándar actual para adultos." />
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div><label>Creatinina (mg/dL)</label><input type="number" step="0.1" value={gfr.creatinine} onChange={e => setGfr(p => ({...p, creatinine: e.target.value}))} /></div>
                    <div><label>Edad (años)</label><input type="number" value={gfr.age} onChange={e => setGfr(p => ({...p, age: e.target.value}))} /></div>
                    <div><label>Género</label><select value={gfr.gender} onChange={e => setGfr(p => ({...p, gender: e.target.value as 'male' | 'female'}))}><option value="female">Mujer</option><option value="male">Hombre</option></select></div>
                </div>

                {gfrResult && (
                    <div style={resultBoxStyle}>
                        <div style={resultItemStyle}>
                            <p style={resultLabelStyle}>TFG Calculada</p>
                            <p style={resultValueStyle}>{gfrResult.value} <span style={{fontSize: '1rem', color: 'var(--text-light)'}}>{gfrResult.unit}</span></p>
                        </div>
                        <div style={{...resultItemStyle, borderRight: 'none'}}>
                            <p style={resultLabelStyle}>Estadio ERC</p>
                            <p style={{...resultValueStyle, fontSize: '1.2rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>{gfrResult.interpretation}</p>
                        </div>
                    </div>
                )}

                {/* Section 2: Protein Needs */}
                <h4 style={{...panelSectionTitleStyle, marginTop: '2rem'}}>
                    2. Requerimientos Proteicos Recomendados
                    <HelpTooltip content="Los requerimientos de proteína varían según la etapa de la Enfermedad Renal Crónica (ERC) y si el paciente está en diálisis, ya que esta última aumenta las pérdidas de proteínas." />
                </h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'flex-end'}}>
                    <div><label>Peso (kg)</label><input type="number" value={proteinNeeds.weight} onChange={e => setProteinNeeds(p => ({...p, weight: e.target.value}))} /></div>
                    <div>
                        <label>Etapa / Condición</label>
                        <select value={proteinNeeds.stage} onChange={e => setProteinNeeds(p => ({...p, stage: e.target.value}))}>
                            {proteinStages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                    </div>
                </div>
                {proteinNeedsResult && (
                     <div style={resultBoxStyle}>
                        <div style={resultItemStyle}>
                            <p style={resultLabelStyle}>Rango Aplicado</p>
                            <p style={resultValueStyle}>{proteinNeedsResult.rangeLabel}</p>
                            <p style={{fontSize: '0.8rem', color: 'var(--text-light)', margin: 0, wordBreak: 'break-word'}}>{proteinNeedsResult.calculation}</p>
                        </div>
                        <div style={{...resultItemStyle, borderRight: 'none'}}>
                            <p style={resultLabelStyle}>Requerimiento Total</p>
                            <p style={resultValueStyle}>{proteinNeedsResult.value} <span style={{fontSize: '1rem', color: 'var(--text-light)'}}>gramos/día</span></p>
                        </div>
                    </div>
                )}
            </CalculatorCard>
        </div>
    );
};

export default RenalTools;