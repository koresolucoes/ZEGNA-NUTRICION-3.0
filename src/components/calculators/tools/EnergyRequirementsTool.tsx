
import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const activityFactors = [
    { label: 'Sedentario (poco o nada)', value: '1.2' },
    { label: 'Actividad Ligera (1-3 días/sem)', value: '1.375' },
    { label: 'Actividad Moderada (3-5 días/sem)', value: '1.55' },
    { label: 'Actividad Intensa (6-7 días/sem)', value: '1.725' },
    { label: 'Actividad Muy Intensa (trabajo físico)', value: '1.9' }
];

const stressFactors = [
    { label: 'Paciente sano, sin estrés', value: '1.0' },
    { label: 'Cirugía menor / Infección leve', value: '1.2' },
    { label: 'Traumatismo / Cáncer', value: '1.4' },
    { label: 'Sepsis / Quemaduras graves', value: '1.6' }
];

const energyFormulas = [
    { id: 'mifflin', name: 'Mifflin-St Jeor' },
    { id: 'harris', name: 'Harris-Benedict' },
    { id: 'oms', name: 'OMS' }
];

const EnergyRequirementsTool: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [energyCalculator, setEnergyCalculator] = useState({
        formula: 'mifflin', weight: '', height: '', age: '', gender: 'female' as 'male' | 'female', activity: '1.2', stress: '1.0'
    });

    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '';
        const gender = selectedPerson?.gender || 'female';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';

        setEnergyCalculator(prev => ({...prev, weight: weightStr, height: heightStr, age: age, gender: gender as 'male' | 'female'}));
    }, [selectedPerson, lastConsultation]);

    const energyResult = useMemo(() => {
        const w = parseFloat(energyCalculator.weight);
        const h = parseFloat(energyCalculator.height);
        const a = parseInt(energyCalculator.age, 10);
        const activity = parseFloat(energyCalculator.activity);
        const stress = parseFloat(energyCalculator.stress);

        if (w > 0 && h > 0 && a > 0) {
            let tmb;
            switch (energyCalculator.formula) {
                case 'oms':
                    if (energyCalculator.gender === 'male') {
                        if (a >= 18 && a <= 29) tmb = (15.3 * w) + 679;
                        else if (a >= 30 && a <= 60) tmb = (11.6 * w) + 879;
                        else tmb = (13.5 * w) + 487; // > 60
                    } else { // female
                        if (a >= 18 && a <= 29) tmb = (14.7 * w) + 496;
                        else if (a >= 30 && a <= 60) tmb = (8.7 * w) + 829;
                        else tmb = (10.5 * w) + 596; // > 60
                    }
                    break;
                case 'harris':
                    if (energyCalculator.gender === 'male') {
                        tmb = 66.473 + (13.7516 * w) + (5.0033 * h) - (6.755 * a);
                    } else {
                        tmb = 655.0955 + (9.5634 * w) + (1.8496 * h) - (4.6756 * a);
                    }
                    break;
                case 'mifflin':
                default:
                    if (energyCalculator.gender === 'male') {
                        tmb = (10 * w) + (6.25 * h) - (5 * a) + 5;
                    } else {
                        tmb = (10 * w) + (6.25 * h) - (5 * a) - 161;
                    }
                    break;
            }
            const get = tmb * activity * stress;
            return { tmb: tmb.toFixed(0), get: get.toFixed(0) };
        }
        return null;
    }, [energyCalculator]);
    
    const selectedFormulaName = energyFormulas.find(f => f.id === energyCalculator.formula)?.name || '';
    const activityFactorLabel = activityFactors.find(f => f.value === energyCalculator.activity)?.label || '';
    const stressFactorLabel = stressFactors.find(f => f.value === energyCalculator.stress)?.label || '';

    const inputStyle = {
        ...styles.input,
        backgroundColor: 'var(--background-color)',
        marginBottom: 0
    };

    return (
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '800px', margin: '0 auto'}}>
            <CalculatorCard 
                title="Gasto Energético"
                onSave={() => handleSaveToLog('energyCalculator', `Cálculo GET (${selectedFormulaName})`, `GET: ${energyResult!.get} kcal/día`, { inputs: { ...energyCalculator, activityFactorLabel, stressFactorLabel }, result: energyResult })} 
                saveDisabled={!energyResult} 
                saveStatus={saveStatus['energyCalculator']}
            >
                <div style={{marginBottom: '1.5rem'}}>
                    <label style={styles.label}>Fórmula de Cálculo</label>
                    <div className="select-wrapper">
                        <select value={energyCalculator.formula} onChange={e => setEnergyCalculator(p => ({...p, formula: e.target.value}))} style={inputStyle}>
                            {energyFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{padding: '1.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', marginBottom: '1.5rem'}}>
                    <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Datos Antropométricos</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label style={styles.label}>Peso (kg)</label><input type="number" value={energyCalculator.weight} onChange={e => setEnergyCalculator(p => ({...p, weight: e.target.value}))} style={inputStyle} placeholder="0.0"/></div>
                        <div><label style={styles.label}>Altura (cm)</label><input type="number" value={energyCalculator.height} onChange={e => setEnergyCalculator(p => ({...p, height: e.target.value}))} style={inputStyle} placeholder="0"/></div>
                        <div><label style={styles.label}>Edad</label><input type="number" value={energyCalculator.age} onChange={e => setEnergyCalculator(p => ({...p, age: e.target.value}))} style={inputStyle} placeholder="0"/></div>
                        <div><label style={styles.label}>Género</label><div className="select-wrapper"><select value={energyCalculator.gender} onChange={e => setEnergyCalculator(p => ({...p, gender: e.target.value as 'male'|'female'}))} style={inputStyle}><option value="female">Mujer</option><option value="male">Hombre</option></select></div></div>
                    </div>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                    <div>
                        <label style={{...styles.label, display: 'flex', alignItems: 'center'}}>
                            Factor de Actividad
                            <HelpTooltip content="Representa el nivel de actividad física diaria. Selecciona la opción que mejor describa el estilo de vida del paciente." />
                        </label>
                        <div className="select-wrapper">
                            <select value={energyCalculator.activity} onChange={e => setEnergyCalculator(p => ({...p, activity: e.target.value}))} style={inputStyle}>
                                {activityFactors.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{...styles.label, display: 'flex', alignItems: 'center'}}>
                            Factor de Estrés
                            <HelpTooltip content="Ajusta el gasto energético según el estrés metabólico causado por una enfermedad o lesión. Usa 1.0 para pacientes ambulatorios sanos." />
                        </label>
                        <div className="select-wrapper">
                            <select value={energyCalculator.stress} onChange={e => setEnergyCalculator(p => ({...p, stress: e.target.value}))} style={inputStyle}>
                                {stressFactors.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                
                {energyResult && 
                    <div style={{marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                         <div style={{backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)'}}>
                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>TMB (Basal)</p>
                            <p style={{ margin: '0.5rem 0 0 0', fontWeight: 700, fontSize: '1.8rem', color: 'var(--text-color)' }}>{energyResult.tmb} <span style={{fontSize: '1rem', color: 'var(--text-light)', fontWeight: 500}}>kcal</span></p>
                        </div>
                        <div style={{backgroundColor: 'var(--primary-light)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--primary-color)'}}>
                            <p style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>GET (Total)</p>
                            <p style={{ margin: '0.5rem 0 0 0', fontWeight: 800, fontSize: '2rem', color: 'var(--primary-color)' }}>{energyResult.get} <span style={{fontSize: '1rem', color: 'var(--primary-dark)', fontWeight: 500}}>kcal</span></p>
                        </div>
                    </div>
                }
            </CalculatorCard>
        </div>
    );
};

export default EnergyRequirementsTool;
