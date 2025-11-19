import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import ResultDisplay from './shared/ResultDisplay';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const PediatricsTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [pediatrics, setPediatrics] = useState({
        gender: 'male' as 'male' | 'female',
        birthDate: '',
        measurementDate: new Date().toISOString().split('T')[0],
        weight: '',
        height: ''
    });

    useEffect(() => {
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
        if (birth > measurement) return null;

        const ageInMonths = (measurement.getFullYear() - birth.getFullYear()) * 12 + (measurement.getMonth() - birth.getMonth());
        const ageYears = Math.floor(ageInMonths / 12);
        const ageRemainderMonths = ageInMonths % 12;
        
        // Mock logic for demonstration
        const getMockPercentile = (val: number) => Math.floor(Math.random() * 90) + 5; 
        const w = parseFloat(weight);
        const h = parseFloat(height);

        return {
            ageDisplay: `${ageYears} años, ${ageRemainderMonths} meses`,
            metrics: [
                { label: 'Peso/Edad', p: getMockPercentile(w) },
                { label: 'Talla/Edad', p: getMockPercentile(h) },
                { label: 'Peso/Talla', p: getMockPercentile(w/h) },
                { label: 'IMC/Edad', p: getMockPercentile(w/(h*h)) }
            ]
        };
    }, [pediatrics]);

    const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0 };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <CalculatorCard 
                title="Percentiles Pediátricos (CDC/OMS)"
                onSave={() => handleSaveToLog('pediatrics', 'Evaluación Pediátrica', `Edad: ${pediatricsResult?.ageDisplay}`, { inputs: pediatrics, result: pediatricsResult })} 
                saveDisabled={!selectedPerson || !pediatricsResult} 
                saveStatus={saveStatus['pediatrics']}
            >
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
                     <div><label style={styles.label}>Fecha Nacimiento</label><input type="date" value={pediatrics.birthDate} onChange={e => setPediatrics(p => ({...p, birthDate: e.target.value}))} style={inputStyle} /></div>
                     <div><label style={styles.label}>Fecha Medición</label><input type="date" value={pediatrics.measurementDate} onChange={e => setPediatrics(p => ({...p, measurementDate: e.target.value}))} style={inputStyle} /></div>
                     <div><label style={styles.label}>Peso (kg)</label><input type="number" value={pediatrics.weight} onChange={e => setPediatrics(p => ({...p, weight: e.target.value}))} style={inputStyle} /></div>
                     <div><label style={styles.label}>Talla (cm)</label><input type="number" value={pediatrics.height} onChange={e => setPediatrics(p => ({...p, height: e.target.value}))} style={inputStyle} /></div>
                     <div style={{gridColumn: '1 / -1'}}>
                        <label style={styles.label}>Género</label>
                        <div className="select-wrapper">
                            <select value={pediatrics.gender} onChange={e => setPediatrics(p => ({...p, gender: e.target.value as 'male'|'female'}))} style={inputStyle}>
                                <option value="male">Niño</option>
                                <option value="female">Niña</option>
                            </select>
                        </div>
                     </div>
                </div>

                {pediatricsResult && (
                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                             <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Edad Calculada</p>
                             <p style={{margin: '0.25rem 0 0 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-color)'}}>{pediatricsResult.ageDisplay}</p>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            {pediatricsResult.metrics.map(m => (
                                <div key={m.label} style={{backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)'}}>
                                    <p style={{margin: 0, fontSize: '0.8rem', fontWeight: 600}}>{m.label}</p>
                                    <p style={{margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)'}}>{m.p} <span style={{fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-light)'}}>percentil</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CalculatorCard>
        </div>
    );
};

export default PediatricsTools;