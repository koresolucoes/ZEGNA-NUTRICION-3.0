import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import ResultDisplay from './shared/ResultDisplay';
import HelpTooltip from './shared/HelpTooltip';

const panelSectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-color)',
    margin: '0 0 1rem 0',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center'
};

// --- Maternal Health Panel ---
const MaternalHealthPanel: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [activeTab, setActiveTab] = useState('pregnancy');
    const [state, setState] = useState({
        pre_weight: '', height: '', age: '', week: '', current_weight: '',
        lactation_weight: '', lactation_period: '0-6'
    });

    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';

        setState(prev => ({
            ...prev,
            pre_weight: weightStr,
            current_weight: weightStr,
            lactation_weight: weightStr,
            height: heightStr,
            age: age,
        }));
    }, [selectedPerson, lastConsultation]);

    const handleMaternalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setState(prev => ({ ...prev, [name]: value }));
    };

    const pregestationalBmiResult = useMemo(() => {
        const pw = parseFloat(state.pre_weight);
        const h = parseFloat(state.height);
        if (pw > 0 && h > 0) {
            const bmi = pw / ((h / 100) ** 2);
            let category = '';
            let totalGainRange = { min: 0, max: 0 };
            let weeklyRate = 0;

            if (bmi < 18.5) { category = 'Bajo Peso'; totalGainRange = { min: 12.5, max: 18 }; weeklyRate = 0.51; }
            else if (bmi < 25) { category = 'Peso Normal'; totalGainRange = { min: 11.5, max: 16 }; weeklyRate = 0.42; }
            else if (bmi < 30) { category = 'Sobrepeso'; totalGainRange = { min: 7, max: 11.5 }; weeklyRate = 0.28; }
            else { category = 'Obesidad'; totalGainRange = { min: 5, max: 9 }; weeklyRate = 0.22; }

            return { bmi: bmi.toFixed(1), category, totalGainRange: `${totalGainRange.min} - ${totalGainRange.max} kg`, weeklyRate };
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
            const firstTrimesterGain = 1.5; // Average
            const expectedGain = w <= 13 ? firstTrimesterGain : firstTrimesterGain + ((w - 13) * pregestationalBmiResult.weeklyRate);
            
            let interpretation;
            if (actualTotalGain > expectedGain * 1.15) interpretation = { text: 'Ganancia Excesiva', color: 'var(--error-color)' };
            else if (actualTotalGain < expectedGain * 0.85) interpretation = { text: 'Ganancia Insuficiente', color: 'var(--accent-color)' };
            else interpretation = { text: 'Ganancia Adecuada', color: 'var(--primary-color)' };

            return {
                actualTotalGain: actualTotalGain.toFixed(1),
                expectedGain: expectedGain.toFixed(1),
                interpretation,
            };
        }
        return null;
    }, [state.week, state.current_weight, state.pre_weight, pregestationalBmiResult]);

    const pregnancyEnergyResult = useMemo(() => {
        const h = parseFloat(state.height);
        const a = parseInt(state.age, 10);
        const pw = parseFloat(state.pre_weight);
        const w = parseInt(state.week, 10);
        if (h > 0 && a > 0 && pw > 0) {
            const tmb = (10 * pw) + (6.25 * h) - (5 * a) - 161; // Mifflin-St Jeor for women
            const get = tmb * 1.2; // Assuming sedentary
            let additionalKcal = 0;
            if (w > 13 && w <= 27) additionalKcal = 340;
            else if (w > 27) additionalKcal = 452;
            return { value: (get + additionalKcal).toFixed(0) };
        }
        return null;
    }, [state.height, state.age, state.pre_weight, state.week]);

    const lactationEnergyResult = useMemo(() => {
        const w = parseFloat(state.lactation_weight);
        const h = parseFloat(state.height);
        const a = parseInt(state.age, 10);
        if (w > 0 && h > 0 && a > 0) {
            const tmb = (10 * w) + (6.25 * h) - (5 * a) - 161;
            const get = tmb * 1.2;
            const additionalKcal = state.lactation_period === '0-6' ? 500 : 400;
            return { value: (get + additionalKcal).toFixed(0) };
        }
        return null;
    }, [state.lactation_weight, state.height, state.age, state.lactation_period]);

    return (
        <CalculatorCard title="Panel de Salud Materno-Infantil">
            <nav className="sub-tabs" style={{marginTop: '-1rem'}}>
                <button className={`sub-tab-button ${activeTab === 'pregnancy' ? 'active' : ''}`} onClick={() => setActiveTab('pregnancy')}>Embarazo</button>
                <button className={`sub-tab-button ${activeTab === 'lactation' ? 'active' : ''}`} onClick={() => setActiveTab('lactation')}>Lactancia</button>
            </nav>

            {activeTab === 'pregnancy' && (
                <div className="fade-in">
                    <h4 style={{...panelSectionTitleStyle, marginTop: '1.5rem'}}>
                        1. Diagnóstico Pre-gestacional
                        <HelpTooltip content="El IMC previo al embarazo determina la ganancia de peso total recomendada, según las guías del Institute of Medicine (IOM)." />
                    </h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label>Peso Previo (kg)</label><input type="number" name="pre_weight" value={state.pre_weight} onChange={handleMaternalChange} /></div>
                        <div><label>Altura (cm)</label><input type="number" name="height" value={state.height} onChange={handleMaternalChange} /></div>
                    </div>
                    {pregestationalBmiResult && <ResultDisplay label="IMC Previo" value={pregestationalBmiResult.bmi} interpretation={{ text: pregestationalBmiResult.category, color: 'var(--text-color)'}}><p style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>Recomendación IOM: <strong>{pregestationalBmiResult.totalGainRange}</strong></p></ResultDisplay>}
                    
                    <h4 style={{...panelSectionTitleStyle, marginTop: '2rem'}}>2. Evaluación de Ganancia Actual</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label>Semana de Gestación</label><input type="number" name="week" value={state.week} onChange={handleMaternalChange} /></div>
                        <div><label>Peso Actual (kg)</label><input type="number" name="current_weight" value={state.current_weight} onChange={handleMaternalChange} /></div>
                    </div>
                    {gestationalGainResult && <ResultDisplay label="Ganancia Actual vs. Esperada" value={`${gestationalGainResult.actualTotalGain} / ${gestationalGainResult.expectedGain}`} unit="kg" interpretation={gestationalGainResult.interpretation} />}

                    <h4 style={{...panelSectionTitleStyle, marginTop: '2rem'}}>3. Requerimiento Energético Gestacional</h4>
                     <div><label>Edad (años)</label><input type="number" name="age" value={state.age} onChange={handleMaternalChange} /></div>
                    {pregnancyEnergyResult && <ResultDisplay label="GET Estimado" value={pregnancyEnergyResult.value} unit="kcal/día" />}
                </div>
            )}

            {activeTab === 'lactation' && (
                 <div className="fade-in">
                    <h4 style={{...panelSectionTitleStyle, marginTop: '1.5rem'}}>Requerimiento Energético en Lactancia</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                        <div><label>Peso Actual (kg)</label><input type="number" name="lactation_weight" value={state.lactation_weight} onChange={handleMaternalChange} /></div>
                        <div><label>Edad (años)</label><input type="number" name="age" value={state.age} onChange={handleMaternalChange} /></div>
                        <div><label>Periodo</label><select name="lactation_period" value={state.lactation_period} onChange={handleMaternalChange}><option value="0-6">0-6 meses</option><option value=">6">&gt;6 meses</option></select></div>
                    </div>
                     {lactationEnergyResult && <ResultDisplay label="GET Estimado" value={lactationEnergyResult.value} unit="kcal/día" />}
                </div>
            )}
        </CalculatorCard>
    );
};

// --- Geriatric Panel ---
const GeriatricPanel: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [state, setState] = useState({
        weight: '', height: '', age: '', gender: 'female' as 'male' | 'female', activity: '1.2', calf_circumference: ''
    });

    useEffect(() => {
        const age = selectedPerson?.birth_date ? (new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()).toString() : '';
        // FIX: Explicitly cast person gender to 'male' | 'female' to match state type.
        const gender = (selectedPerson?.gender as 'male' | 'female') || 'female';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        
        setState(prev => ({ ...prev, weight: weightStr, height: heightStr, age, gender }));
    }, [selectedPerson, lastConsultation]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setState(prev => ({...prev, [name]: value}));
    };

    const energyResult = useMemo(() => {
        const w = parseFloat(state.weight);
        const h = parseFloat(state.height);
        const a = parseInt(state.age, 10);
        if (w > 0 && h > 0 && a > 0) {
            const bmr = state.gender === 'male' 
                ? (10 * w) + (6.25 * h) - (5 * a) + 5
                : (10 * w) + (6.25 * h) - (5 * a) - 161;
            const get = bmr * parseFloat(state.activity);
            const protein = { min: (w * 1.0).toFixed(1), max: (w * 1.2).toFixed(1) };
            return { bmr: bmr.toFixed(0), get: get.toFixed(0), protein: `${protein.min} - ${protein.max}` };
        }
        return null;
    }, [state]);

    const sarcopeniaRisk = useMemo(() => {
        const cc = parseFloat(state.calf_circumference);
        if (cc > 0) {
            return cc < 31 
                ? { text: '⚠️ Posible Riesgo de Sarcopenia', color: 'var(--error-color)' }
                : { text: 'Bajo Riesgo de Sarcopenia', color: 'var(--primary-color)' };
        }
        return null;
    }, [state.calf_circumference]);

    return (
        <CalculatorCard title="Panel de Evaluación del Adulto Mayor">
            <h4 style={panelSectionTitleStyle}>1. Requerimientos Nutricionales</h4>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div><label>Peso (kg)</label><input type="number" name="weight" value={state.weight} onChange={handleChange} /></div>
                <div><label>Altura (cm)</label><input type="number" name="height" value={state.height} onChange={handleChange} /></div>
                <div><label>Edad</label><input type="number" name="age" value={state.age} onChange={handleChange} /></div>
                <div><label>Género</label><select name="gender" value={state.gender} onChange={handleChange}><option value="female">Mujer</option><option value="male">Hombre</option></select></div>
            </div>
            <div style={{marginTop: '1rem'}}><label>Factor de Actividad</label><input type="number" step="0.1" name="activity" value={state.activity} onChange={handleChange} /></div>
            
            {energyResult && (
                <ResultDisplay label="GET Estimado (Mifflin-St Jeor)" value={energyResult.get} unit="kcal/día">
                    <p style={{fontSize: '0.9rem', color: 'var(--text-light)', margin: '0.5rem 0 0 0'}}>TMB: {energyResult.bmr} kcal/día</p>
                </ResultDisplay>
            )}
            {energyResult && <ResultDisplay label="Proteína Sugerida (1.0-1.2 g/kg)" value={energyResult.protein} unit="g/día" interpretation={{text: 'Recomendación para prevenir sarcopenia', color: 'var(--text-light)'}}/>}
            
            <h4 style={{...panelSectionTitleStyle, marginTop: '2rem'}}>
                2. Tamizaje de Sarcopenia
                <HelpTooltip content="Una circunferencia de pantorrilla <31 cm es un indicador de baja masa muscular y sugiere riesgo de sarcopenia en adultos mayores." />
            </h4>
            <div><label>Circunferencia de Pantorrilla (cm)</label><input type="number" name="calf_circumference" value={state.calf_circumference} onChange={handleChange} /></div>
            {sarcopeniaRisk && <ResultDisplay label="Resultado" value="" interpretation={sarcopeniaRisk} />}

            <div style={{marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary-dark)', fontSize: '0.9rem', border: '1px solid var(--primary-color)'}}>
                <h5 style={{margin: '0 0 0.5rem 0', color: 'var(--primary-dark)'}}>⚠️ Atención a Micronutrientes</h5>
                <p style={{margin: 0}}>En esta etapa de la vida, es crucial vigilar la ingesta de <strong>Vitamina D, Calcio y Vitamina B12</strong>.</p>
            </div>
        </CalculatorCard>
    );
};

// --- Main Component ---
const SpecialPopulationsTools: FC<ToolProps> = (props) => {
    return (
        <div className="fade-in" style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
            <MaternalHealthPanel {...props} />
            <GeriatricPanel {...props} />
        </div>
    );
};

export default SpecialPopulationsTools;