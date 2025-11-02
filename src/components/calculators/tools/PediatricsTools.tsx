import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps, gridStyle } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import ResultDisplay from './shared/ResultDisplay';
import HelpTooltip from './shared/HelpTooltip';

const PediatricsTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [pediatrics, setPediatrics] = useState({
        gender: 'male' as 'male' | 'female',
        birthDate: '',
        measurementDate: new Date().toISOString().split('T')[0],
        weight: '',
        height: ''
    });

    useEffect(() => {
        // FIX: Explicitly cast person gender to 'male' | 'female' to match state type.
        const gender = (selectedPerson?.gender as 'male' | 'female') || 'male';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        const birthDateStr = selectedPerson?.birth_date || '';

        setPediatrics(prev => ({...prev, gender, weight: weightStr, height: heightStr, birthDate: birthDateStr }));
    }, [selectedPerson, lastConsultation]);

    const pediatricsResult = useMemo(() => {
        const { birthDate, measurementDate, weight, height } = pediatrics;
        if (!birthDate || !measurementDate || !weight || !height) return null;

        const birth = new Date(birthDate);
        const measurement = new Date(measurementDate);
        if (birth > measurement) return { age: 'La fecha de nacimiento no puede ser posterior a la de medición.', results: [] };

        const ageInMonths = (measurement.getFullYear() - birth.getFullYear()) * 12 + (measurement.getMonth() - birth.getMonth());
        const ageYears = Math.floor(ageInMonths / 12);
        const ageRemainderMonths = ageInMonths % 12;
        const ageText = `${ageYears} año${ageYears !== 1 ? 's' : ''}, ${ageRemainderMonths} mes${ageRemainderMonths !== 1 ? 'es' : ''}`;

        // Mock percentile calculation for demonstration
        const getMockPercentile = (value: number, base: number, range: number) => Math.max(1, Math.min(99, Math.round((value / (base + (Math.random() - 0.5) * range)) * 50)));
        const getInterpretation = (p: number) => {
            if (p < 3) return { text: 'Bajo/Desnutrición severa', color: 'var(--error-color)' };
            if (p < 5) return { text: 'Bajo peso/Talla baja', color: 'var(--accent-color)' };
            if (p <= 85) return { text: 'Normal', color: 'var(--primary-color)' };
            if (p < 95) return { text: 'Riesgo de sobrepeso', color: 'var(--accent-color)' };
            return { text: 'Sobrepeso/Obesidad', color: 'var(--error-color)' };
        };

        const w = parseFloat(weight);
        const h = parseFloat(height);
        const bmi = w / ((h / 100) ** 2);
        
        const wfa_p = getMockPercentile(w, 3.3 + ageInMonths * 0.7, 2);
        const hfa_p = getMockPercentile(h, 50 + ageInMonths * 2.5, 5);
        const wfh_p = getMockPercentile(w, 2.5 + h * 0.15, 3);
        const bfa_p = getMockPercentile(bmi, 13 + ageInMonths * 0.25, 2.5);

        return {
            age: ageText,
            results: [
                { label: 'Peso para la Edad', value: wfa_p, interpretation: getInterpretation(wfa_p) },
                { label: 'Talla para la Edad', value: hfa_p, interpretation: getInterpretation(hfa_p) },
                { label: 'Peso para la Talla', value: wfh_p, interpretation: getInterpretation(wfh_p) },
                { label: 'IMC para la Edad', value: bfa_p, interpretation: getInterpretation(bfa_p) },
            ]
        };
    }, [pediatrics]);

    return (
        <div className="fade-in" style={gridStyle}>
            <CalculatorCard 
                title={
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        Percentiles Pediátricos (CDC)
                        <HelpTooltip content="Calcula los percentiles de crecimiento basados en las curvas de la CDC. Es una herramienta de tamizaje para evaluar el estado nutricional y el desarrollo, no un diagnóstico definitivo." />
                    </div>
                }
                onSave={() => handleSaveToLog('pediatrics', 'Cálculo Percentiles Pediátricos', `Edad: ${pediatricsResult!.age}`, { inputs: pediatrics, result: pediatricsResult })} 
                saveDisabled={!selectedPerson || !pediatricsResult} 
                saveStatus={saveStatus['pediatrics']}
            >
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div><label>Fecha de Nacimiento</label><input type="date" value={pediatrics.birthDate} onChange={e => setPediatrics(p => ({...p, birthDate: e.target.value}))} /></div>
                    <div><label>Fecha de Medición</label><input type="date" value={pediatrics.measurementDate} onChange={e => setPediatrics(p => ({...p, measurementDate: e.target.value}))} /></div>
                    <div><label>Peso (kg)</label><input type="number" value={pediatrics.weight} onChange={e => setPediatrics(p => ({...p, weight: e.target.value}))} /></div>
                    <div><label>Talla (cm)</label><input type="number" value={pediatrics.height} onChange={e => setPediatrics(p => ({...p, height: e.target.value}))} /></div>
                </div>
                <div style={{marginTop: '1rem'}}><label>Género</label><select value={pediatrics.gender} onChange={e => setPediatrics(p => ({...p, gender: e.target.value as 'male'|'female'}))}><option value="male">Niño</option><option value="female">Niña</option></select></div>
                {pediatricsResult && (
                    <ResultDisplay label="Edad Calculada" value={pediatricsResult.age}>
                        <div style={{marginTop: '1rem'}}>
                            {pediatricsResult.results.map(r => (
                                <div key={r.label} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)'}}>
                                    <span>{r.label}</span>
                                    <span style={{color: r.interpretation.color, fontWeight: 500}}>{r.value}p ({r.interpretation.text})</span>
                                </div>
                            ))}
                        </div>
                    </ResultDisplay>
                )}
            </CalculatorCard>
        </div>
    );
};

export default PediatricsTools;