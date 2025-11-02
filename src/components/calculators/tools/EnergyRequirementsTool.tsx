import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';

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

    return (
        <div className="fade-in" style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '800px', margin: '0 auto'}}>
            <CalculatorCard 
                title="Gasto Energético"
                onSave={() => handleSaveToLog('energyCalculator', `Cálculo GET (${selectedFormulaName})`, `GET: ${energyResult!.get} kcal/día`, { inputs: { ...energyCalculator, activityFactorLabel, stressFactorLabel }, result: energyResult })} 
                saveDisabled={!selectedPerson || !energyResult} 
                saveStatus={saveStatus['energyCalculator']}
                extraActions={<button className="button-secondary" disabled>Usar GET para crear Plan</button>}
            >
                <div>
                    <label style={{display: 'flex', alignItems: 'center'}}>
                        Fórmula de Cálculo
                        <HelpTooltip content="Mifflin-St Jeor es la más recomendada para la mayoría de adultos. Harris-Benedict es una fórmula más antigua. OMS es útil para estudios poblacionales." />
                    </label>
                    <select value={energyCalculator.formula} onChange={e => setEnergyCalculator(p => ({...p, formula: e.target.value}))}>
                        {energyFormulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                <fieldset style={{border: 'none', padding: 0, margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                    <legend style={{fontWeight: 600, fontSize: '1rem', paddingRight: '1rem'}}>Datos del Paciente</legend>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label>Peso (kg)</label><input type="number" value={energyCalculator.weight} onChange={e => setEnergyCalculator(p => ({...p, weight: e.target.value}))} /></div>
                        <div><label>Altura (cm)</label><input type="number" value={energyCalculator.height} onChange={e => setEnergyCalculator(p => ({...p, height: e.target.value}))} /></div>
                        <div><label>Edad</label><input type="number" value={energyCalculator.age} onChange={e => setEnergyCalculator(p => ({...p, age: e.target.value}))} /></div>
                        <div><label>Género</label><select value={energyCalculator.gender} onChange={e => setEnergyCalculator(p => ({...p, gender: e.target.value as 'male'|'female'}))}><option value="female">Mujer</option><option value="male">Hombre</option></select></div>
                    </div>
                </fieldset>
                    <fieldset style={{border: 'none', padding: 0, margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                    <legend style={{fontWeight: 600, fontSize: '1rem', paddingRight: '1rem'}}>Factores Metabólicos</legend>
                    <div>
                        <label style={{display: 'flex', alignItems: 'center'}}>
                            Factor de Actividad
                            <HelpTooltip content="Representa el nivel de actividad física diaria. Selecciona la opción que mejor describa el estilo de vida del paciente." />
                        </label>
                        <select value={energyCalculator.activity} onChange={e => setEnergyCalculator(p => ({...p, activity: e.target.value}))}>{activityFactors.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
                    </div>
                    <div style={{marginTop: '1rem'}}>
                        <label style={{display: 'flex', alignItems: 'center'}}>
                            Factor de Estrés
                            <HelpTooltip content="Ajusta el gasto energético según el estrés metabólico causado por una enfermedad o lesión. Usa 1.0 para pacientes ambulatorios sanos." />
                        </label>
                        <select value={energyCalculator.stress} onChange={e => setEnergyCalculator(p => ({...p, stress: e.target.value}))}>{stressFactors.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
                    </div>
                </fieldset>
                
                {energyResult && 
                    <div style={{marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--background-color)', borderRadius: '12px'}}>
                        <h4 style={{margin: '0 0 1rem 0', textAlign: 'center', color: 'var(--primary-color)'}}>Resultados del Cálculo</h4>
                        <div style={{display: 'flex', gap: '1rem', justifyContent: 'space-around', textAlign: 'center'}}>
                            <div>
                                <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>Tasa Metabólica Basal (TMB)</p>
                                <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1.8rem', color: 'var(--text-color)' }}>{energyResult.tmb} <span style={{fontSize: '1rem', color: 'var(--text-light)'}}>kcal</span></p>
                            </div>
                                <div>
                                <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>Gasto Energético Total (GET)</p>
                                <p style={{ margin: '0.25rem 0', fontWeight: 700, fontSize: '2.2rem', color: 'var(--primary-color)' }}>{energyResult.get} <span style={{fontSize: '1rem', color: 'var(--text-light)'}}>kcal</span></p>
                            </div>
                        </div>
                        <p style={{textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                            GET = TMB ({energyResult.tmb}) × F. Actividad ({energyCalculator.activity}) × F. Estrés ({energyCalculator.stress})
                        </p>
                    </div>
                }
            </CalculatorCard>
        </div>
    );
};

export default EnergyRequirementsTool;