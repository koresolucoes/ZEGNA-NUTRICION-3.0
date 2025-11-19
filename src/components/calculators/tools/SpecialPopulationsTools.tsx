import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0 };

const ResultRow = ({ label, value, subtext, color = 'var(--text-color)' }: { label: string, value: string, subtext?: string, color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{value}</span>
            {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{subtext}</div>}
        </div>
    </div>
);

// --- Maternal Health Panel ---
const MaternalHealthPanel: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [activeTab, setActiveTab] = useState('pregnancy');
    const [state, setState] = useState({
        pre_weight: '', height: '', age: '', week: '', current_weight: '',
        lactation_period: '0-6', activity_factor: '1.2'
    });

    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '30';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';

        setState(prev => ({ ...prev, pre_weight: weightStr, current_weight: weightStr, height: heightStr, age: age }));
    }, [selectedPerson, lastConsultation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // --- Pregnancy Logic ---
    const pregestationalBmiResult = useMemo(() => {
        const pw = parseFloat(state.pre_weight);
        const h = parseFloat(state.height);
        if (pw > 0 && h > 0) {
            const bmi = pw / ((h / 100) ** 2);
            let category = '', totalGainRange = '', weeklyRate = 0;
            if (bmi < 18.5) { category = 'Bajo Peso'; totalGainRange = '12.5 - 18 kg'; weeklyRate = 0.51; }
            else if (bmi < 25) { category = 'Peso Normal'; totalGainRange = '11.5 - 16 kg'; weeklyRate = 0.42; }
            else if (bmi < 30) { category = 'Sobrepeso'; totalGainRange = '7 - 11.5 kg'; weeklyRate = 0.28; }
            else { category = 'Obesidad'; totalGainRange = '5 - 9 kg'; weeklyRate = 0.22; }
            return { bmi: bmi.toFixed(1), category, totalGainRange, weeklyRate };
        }
        return null;
    }, [state.pre_weight, state.height]);

    const gestationalGainResult = useMemo(() => {
        if (!pregestationalBmiResult) return null;
        const w = parseInt(state.week, 10);
        const cw = parseFloat(state.current_weight);
        const pw = parseFloat(state.pre_weight);
        if (w > 0 && cw > 0 && cw >= pw) {
            const actualTotalGain = cw - pw;
            const firstTrimesterGain = 1.5;
            const expectedGain = w <= 13 ? firstTrimesterGain : firstTrimesterGain + ((w - 13) * pregestationalBmiResult.weeklyRate);
            let interpretation;
            if (actualTotalGain > expectedGain * 1.15) interpretation = { text: 'Ganancia Excesiva', color: 'var(--error-color)' };
            else if (actualTotalGain < expectedGain * 0.85) interpretation = { text: 'Ganancia Insuficiente', color: 'var(--accent-color)' };
            else interpretation = { text: 'Adecuada', color: 'var(--primary-color)' };
            return { actualTotalGain: actualTotalGain.toFixed(1), expectedGain: expectedGain.toFixed(1), interpretation };
        }
        return null;
    }, [state.week, state.current_weight, state.pre_weight, pregestationalBmiResult]);

    // --- Lactation Logic ---
    const lactationResult = useMemo(() => {
        const w = parseFloat(state.current_weight);
        const h = parseFloat(state.height);
        const a = parseFloat(state.age);
        const af = parseFloat(state.activity_factor); // Activity Factor

        if (w > 0 && h > 0 && a > 0) {
            // Mifflin-St Jeor (Female)
            const tmb = (10 * w) + (6.25 * h) - (5 * a) - 161;
            const get_base = tmb * af;
            
            // Energy Cost of Milk Production (IOM)
            // 0-6 months: +500 kcal cost - 170 kcal (weight loss mobilization) = +330
            // 7-12 months: +400 kcal cost - 0 (stable) = +400
            const milkCost = state.lactation_period === '0-6' ? 330 : 400;
            const proteinAdd = 25; // +25g protein/day
            const waterAdd = state.lactation_period === '0-6' ? 0.7 : 0.6; // L/day extra approx

            return {
                tmb: tmb.toFixed(0),
                total_energy: (get_base + milkCost).toFixed(0),
                extra_kcal: milkCost,
                protein: proteinAdd,
                water_total: 3.8 // IOM AI for lactation
            };
        }
        return null;
    }, [state.current_weight, state.height, state.age, state.activity_factor, state.lactation_period]);


    const handleSave = () => {
        if (activeTab === 'pregnancy' && gestationalGainResult) {
            handleSaveToLog('maternal', 'Evaluación Embarazo', `Semana ${state.week}: Ganancia ${gestationalGainResult.actualTotalGain}kg (${gestationalGainResult.interpretation.text}).`, { inputs: state, result: gestationalGainResult });
        } else if (activeTab === 'lactation' && lactationResult) {
            handleSaveToLog('lactation', 'Requerimientos Lactancia', `Periodo ${state.lactation_period}m: ${lactationResult.total_energy} kcal/día.`, { inputs: state, result: lactationResult });
        }
    };

    return (
        <CalculatorCard 
            title="Salud Materno-Infantil" 
            onSave={handleSave}
            saveDisabled={activeTab === 'pregnancy' ? !gestationalGainResult : !lactationResult}
            saveStatus={saveStatus[activeTab === 'pregnancy' ? 'maternal' : 'lactation']}
        >
             <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface-hover-color)', padding: '4px', borderRadius: '8px'}}>
                <button onClick={() => setActiveTab('pregnancy')} className={`tab-button-small ${activeTab === 'pregnancy' ? 'active' : ''}`} style={{flex: 1, border: 'none', padding: '8px', borderRadius: '6px', backgroundColor: activeTab === 'pregnancy' ? 'var(--surface-color)' : 'transparent', boxShadow: activeTab === 'pregnancy' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', color: activeTab === 'pregnancy' ? 'var(--primary-color)' : 'var(--text-light)', fontWeight: 600, cursor: 'pointer'}}>Embarazo</button>
                <button onClick={() => setActiveTab('lactation')} className={`tab-button-small ${activeTab === 'lactation' ? 'active' : ''}`} style={{flex: 1, border: 'none', padding: '8px', borderRadius: '6px', backgroundColor: activeTab === 'lactation' ? 'var(--surface-color)' : 'transparent', boxShadow: activeTab === 'lactation' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', color: activeTab === 'lactation' ? 'var(--primary-color)' : 'var(--text-light)', fontWeight: 600, cursor: 'pointer'}}>Lactancia</button>
             </div>

            {activeTab === 'pregnancy' && (
                <div className="fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                        <h4 style={{margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Estado Pre-gestacional</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div><label style={styles.label}>Peso Previo (kg)</label><input type="number" name="pre_weight" value={state.pre_weight} onChange={handleChange} style={inputStyle} /></div>
                            <div><label style={styles.label}>Altura (cm)</label><input type="number" name="height" value={state.height} onChange={handleChange} style={inputStyle} /></div>
                        </div>
                         {pregestationalBmiResult && (
                            <div style={{marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{fontSize: '0.85rem'}}>Meta Total IOM: <strong>{pregestationalBmiResult.totalGainRange}</strong></span>
                                <span style={{fontSize: '0.85rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)', fontWeight: 600}}>{pregestationalBmiResult.category}</span>
                            </div>
                        )}
                    </div>

                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                        <h4 style={{margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Evaluación Actual</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div><label style={styles.label}>Semana</label><input type="number" name="week" value={state.week} onChange={handleChange} style={inputStyle} /></div>
                            <div><label style={styles.label}>Peso Actual (kg)</label><input type="number" name="current_weight" value={state.current_weight} onChange={handleChange} style={inputStyle} /></div>
                        </div>
                         {gestationalGainResult && (
                             <div style={{marginTop: '1rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px'}}>
                                 <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)'}}>Ganancia vs Esperada</p>
                                 <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem'}}>
                                    <span style={{fontSize: '1.8rem', fontWeight: 700, color: gestationalGainResult.interpretation.color}}>{gestationalGainResult.actualTotalGain} kg</span>
                                    <span style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>/ {gestationalGainResult.expectedGain} kg</span>
                                 </div>
                                 <p style={{margin: '0.25rem 0 0 0', color: gestationalGainResult.interpretation.color, fontWeight: 600}}>{gestationalGainResult.interpretation.text}</p>
                             </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'lactation' && (
                 <div className="fade-in">
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                        <div><label style={styles.label}>Peso Actual (kg)</label><input type="number" name="current_weight" value={state.current_weight} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={styles.label}>Altura (cm)</label><input type="number" name="height" value={state.height} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={styles.label}>Edad (años)</label><input type="number" name="age" value={state.age} onChange={handleChange} style={inputStyle} /></div>
                        <div>
                            <label style={styles.label}>Etapa Lactancia</label>
                            <div className="select-wrapper">
                                <select name="lactation_period" value={state.lactation_period} onChange={handleChange} style={inputStyle}>
                                    <option value="0-6">0 - 6 Meses</option>
                                    <option value="6-12">6 - 12 Meses</option>
                                </select>
                            </div>
                        </div>
                         <div style={{gridColumn: '1 / -1'}}>
                            <label style={styles.label}>Nivel de Actividad</label>
                            <div className="select-wrapper">
                                <select name="activity_factor" value={state.activity_factor} onChange={handleChange} style={inputStyle}>
                                    <option value="1.2">Sedentaria (1.2)</option>
                                    <option value="1.375">Ligera (1.375)</option>
                                    <option value="1.55">Moderada (1.55)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {lactationResult && (
                        <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                            <h4 style={{margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '1rem'}}>Requerimientos Estimados</h4>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                                <ResultRow label="Energía Total (EER)" value={`${lactationResult.total_energy} kcal`} subtext={`Incluye +${lactationResult.extra_kcal} kcal por leche`} color="var(--primary-dark)" />
                                <ResultRow label="Proteína Adicional" value={`+${lactationResult.protein} g/día`} />
                                <ResultRow label="Líquidos Totales" value={`${lactationResult.water_total} L/día`} subtext="Agua + Alimentos" />
                            </div>
                            <div style={{marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic'}}>
                                *Cálculos basados en IOM para lactancia exclusiva/parcial con pérdida de peso gradual.
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </CalculatorCard>
    );
};

// --- Geriatric Panel ---
const GeriatricPanel: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [state, setState] = useState({
        weight: '', height: '', calf_circumference: '', gender: 'female'
    });

    useEffect(() => {
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        const gender = selectedPerson?.gender || 'female';
        setState(prev => ({ ...prev, weight: weightStr, height: heightStr, gender }));
    }, [selectedPerson, lastConsultation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const results = useMemo(() => {
        const w = parseFloat(state.weight);
        const h = parseFloat(state.height);
        const cc = parseFloat(state.calf_circumference);
        
        if (!w || !h) return null;

        const bmi = w / ((h / 100) ** 2);
        
        // Lipchitz Classification for Elderly (>60y)
        let bmiClass = '', bmiColor = '';
        if (bmi < 22) { bmiClass = 'Bajo Peso (Riesgo)'; bmiColor = 'var(--error-color)'; }
        else if (bmi <= 27) { bmiClass = 'Peso Normal'; bmiColor = 'var(--primary-color)'; }
        else { bmiClass = 'Sobrepeso'; bmiColor = 'var(--accent-color)'; }

        // Sarcopenia Screen (Calf Circumference)
        let sarcopeniaRisk = 'No evaluado', sarcopeniaColor = 'var(--text-light)';
        if (cc) {
            // Cutoffs: Male < 34cm, Female < 33cm (Asian/Latin standards often use 33/32 or 31 generic)
            // Using generic clinical cutoff of 31cm for high sensitivity screening
            if (cc < 31) { sarcopeniaRisk = 'Posible Sarcopenia'; sarcopeniaColor = 'var(--error-color)'; }
            else { sarcopeniaRisk = 'Normal'; sarcopeniaColor = 'var(--primary-color)'; }
        }
        
        const waterNeeds = (w * 30).toFixed(0);

        return { bmi: bmi.toFixed(1), bmiClass, bmiColor, sarcopeniaRisk, sarcopeniaColor, waterNeeds };
    }, [state]);

    const handleSave = () => {
        if (results) {
            handleSaveToLog('geriatric', 'Evaluación Geriátrica', `IMC: ${results.bmi} (${results.bmiClass}). Pantorrilla: ${state.calf_circumference}cm (${results.sarcopeniaRisk}).`, { inputs: state, result: results });
        }
    };

    return (
        <CalculatorCard 
            title="Evaluación Geriátrica"
            onSave={handleSave}
            saveDisabled={!results}
            saveStatus={saveStatus['geriatric']}
        >
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
                <div><label style={styles.label}>Peso (kg)</label><input type="number" name="weight" value={state.weight} onChange={handleChange} style={inputStyle} /></div>
                <div><label style={styles.label}>Altura (cm)</label><input type="number" name="height" value={state.height} onChange={handleChange} style={inputStyle} /></div>
                <div style={{gridColumn: '1 / -1'}}>
                    <label style={{...styles.label, display: 'flex', alignItems: 'center'}}>
                        Circunferencia Pantorrilla (cm)
                        <HelpTooltip content="Indicador sensible de pérdida de masa muscular (Sarcopenia). < 31 cm sugiere riesgo." />
                    </label>
                    <input type="number" name="calf_circumference" value={state.calf_circumference} onChange={handleChange} style={inputStyle} placeholder="Opcional" />
                </div>
            </div>

            {results ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                     <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
                        <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>IMC (Criterio Geriátrico)</p>
                        <div style={{fontSize: '2rem', fontWeight: 800, color: results.bmiColor, margin: '0.5rem 0'}}>{results.bmi}</div>
                        <span style={{backgroundColor: results.bmiColor, color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600}}>{results.bmiClass}</span>
                    </div>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                         <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
                             <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600}}>Riesgo Sarcopenia</p>
                             <p style={{margin: '0.5rem 0 0 0', fontWeight: 700, color: results.sarcopeniaColor}}>{results.sarcopeniaRisk}</p>
                         </div>
                         <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'}}>
                             <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600}}>Hidratación (Min)</p>
                             <p style={{margin: '0.5rem 0 0 0', fontWeight: 700, color: 'var(--text-color)'}}>{results.waterNeeds} mL/día</p>
                         </div>
                    </div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center', margin: '0.5rem 0 0 0'}}>*Vigilar función renal/cardíaca para líquidos.</p>
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px'}}>
                    Ingrese peso y altura para calcular.
                </div>
            )}
        </CalculatorCard>
    );
};

const SpecialPopulationsTools: FC<ToolProps> = (props) => {
    return (
        <div className="fade-in" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem'}}>
            <MaternalHealthPanel {...props} />
            <GeriatricPanel {...props} />
        </div>
    );
};

export default SpecialPopulationsTools;