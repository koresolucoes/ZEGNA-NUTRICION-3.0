import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const RenalTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [gfr, setGfr] = useState({ creatinine: '', age: '', gender: 'female' as 'male' | 'female' });
    const [proteinNeeds, setProteinNeeds] = useState({ weight: '', stage: 'g1-g3' });

    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '';
        const gender = selectedPerson?.gender || 'female';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        
        setGfr(prev => ({ ...prev, age, gender: gender as 'male' | 'female' }));
        setProteinNeeds(prev => ({ ...prev, weight: weightStr }));
    }, [selectedPerson, lastConsultation]);

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
            if (result >= 90) { interpretation = 'Estadio G1: Normal'; stageKey = 'g1-g3'; }
            else if (result >= 60) { interpretation = 'Estadio G2: Lig. disminuido'; stageKey = 'g1-g3'; }
            else if (result >= 45) { interpretation = 'Estadio G3a: Lig-Mod'; stageKey = 'g1-g3'; }
            else if (result >= 30) { interpretation = 'Estadio G3b: Mod-Sev'; stageKey = 'g1-g3'; }
            else if (result >= 15) { interpretation = 'Estadio G4: Severo'; stageKey = 'g4-g5'; }
            else { interpretation = 'Estadio G5: Falla Renal'; stageKey = 'g4-g5'; }
            
            return { value: result.toFixed(0), interpretation, stageKey, unit: "ml/min/1.73m²" };
        }
        return null;
    }, [gfr]);

    useEffect(() => {
        if (gfrResult?.stageKey && !['hemodialysis', 'peritoneal'].includes(proteinNeeds.stage)) {
            setProteinNeeds(prev => ({ ...prev, stage: gfrResult.stageKey }));
        }
    }, [gfrResult, proteinNeeds.stage]);

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
            return { value, rangeLabel: `${stageInfo.range.min}${stageInfo.range.min !== stageInfo.range.max ? `-${stageInfo.range.max}` : ''} g/kg` };
        }
        return null;
    }, [proteinNeeds, proteinStages]);

    const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0 };
    
    const handleSaveEvaluation = () => {
        if (!selectedPerson || !gfrResult || !proteinNeedsResult) return;
        const description = `Evaluación Renal: TFG ${gfrResult.value} (${gfrResult.interpretation}), Proteína ${proteinNeedsResult.value} g/día.`;
        handleSaveToLog('renalEvaluation', 'Evaluación Renal', description, { inputs: { gfr, proteinNeeds }, result: { gfr: gfrResult, protein: proteinNeedsResult } });
    };

    return (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <CalculatorCard 
                title="Evaluación Renal (CKD-EPI 2021)"
                onSave={handleSaveEvaluation}
                saveDisabled={!selectedPerson || !gfrResult || !proteinNeedsResult}
                saveStatus={saveStatus['renalEvaluation']}
            >
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem'}}>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        <h4 style={{fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700, margin: 0}}>Datos TFG</h4>
                        <div><label style={styles.label}>Creatinina (mg/dL)</label><input type="number" step="0.1" value={gfr.creatinine} onChange={e => setGfr(p => ({...p, creatinine: e.target.value}))} style={inputStyle} placeholder="0.0" /></div>
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <div style={{flex: 1}}><label style={styles.label}>Edad</label><input type="number" value={gfr.age} onChange={e => setGfr(p => ({...p, age: e.target.value}))} style={inputStyle} /></div>
                            <div style={{flex: 1}}><label style={styles.label}>Género</label><div className="select-wrapper"><select value={gfr.gender} onChange={e => setGfr(p => ({...p, gender: e.target.value as 'male' | 'female'}))} style={inputStyle}><option value="female">Mujer</option><option value="male">Hombre</option></select></div></div>
                        </div>
                     </div>

                     <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        <h4 style={{fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700, margin: 0}}>Requerimiento Proteico</h4>
                        <div><label style={styles.label}>Peso (kg)</label><input type="number" value={proteinNeeds.weight} onChange={e => setProteinNeeds(p => ({...p, weight: e.target.value}))} style={inputStyle} placeholder="0.0"/></div>
                        <div>
                            <label style={{...styles.label, display: 'flex', alignItems: 'center'}}>
                                Estadio Clínico
                                <HelpTooltip content="Selecciona la etapa de la enfermedad para ajustar el cálculo de proteínas." />
                            </label>
                            <div className="select-wrapper">
                                <select value={proteinNeeds.stage} onChange={e => setProteinNeeds(p => ({...p, stage: e.target.value}))} style={inputStyle}>
                                    {proteinStages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>
                     </div>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                     {gfrResult ? (
                         <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
                            <p style={{margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700}}>TFG Estimada</p>
                            <p style={{margin: '0.5rem 0', fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-color)'}}>{gfrResult.value}</p>
                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 600}}>{gfrResult.interpretation}</p>
                         </div>
                     ) : <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', backgroundColor: 'var(--background-color)', borderRadius: '12px', color: 'var(--text-light)', fontSize: '0.9rem'}}>Ingrese datos TFG</div>}
                     
                     {proteinNeedsResult ? (
                          <div style={{backgroundColor: 'var(--primary-light)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary-color)', textAlign: 'center'}}>
                            <p style={{margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--primary-dark)', fontWeight: 700}}>Proteína Sugerida</p>
                            <p style={{margin: '0.5rem 0', fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-color)'}}>{proteinNeedsResult.value} <span style={{fontSize: '1rem'}}>g/día</span></p>
                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--primary-dark)'}}>Basado en {proteinNeedsResult.rangeLabel}</p>
                         </div>
                     ) : <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', backgroundColor: 'var(--background-color)', borderRadius: '12px', color: 'var(--text-light)', fontSize: '0.9rem'}}>Ingrese datos de Peso</div>}
                </div>

            </CalculatorCard>
        </div>
    );
};

export default RenalTools;