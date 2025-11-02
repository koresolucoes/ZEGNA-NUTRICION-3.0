
import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import { ICONS } from '../../../pages/AuthPage';
import HelpTooltip from './shared/HelpTooltip';

// Simple hook to detect mobile viewport
const useIsMobile = (breakpoint = 960) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
};

const ResultItem: FC<{ label: string; value: string; interpretation?: { text: string; color: string; } }> = ({ label, value, interpretation }) => (
    <div style={{ padding: '0.75rem', backgroundColor: 'var(--background-color)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ margin: 0, color: 'var(--text-light)' }}>{label}</p>
            {interpretation && <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: interpretation.color }}>{interpretation.text}</p>}
        </div>
        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '1.5rem', color: 'var(--text-color)' }}>{value}</p>
    </div>
);


const AnthropometryTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const isMobile = useIsMobile();
    
    const [data, setData] = useState({
        weight: '', height: '', waist: '', hip: '', gender: 'female' as 'male' | 'female',
        prevWeight: '', months: '',
        bp_systolic: '', bp_diastolic: '', on_bp_meds: false,
        triglycerides: '', on_tg_meds: false,
        hdl: '', on_hdl_meds: false,
        glucose: '', on_glucose_meds: false
    });

    useEffect(() => {
        const gender: 'male' | 'female' = selectedPerson?.gender === 'male' ? 'male' : 'female';
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        
        const tgStr = lastConsultation?.lab_results?.[0]?.triglycerides_mg_dl?.toString() || '';
        const hdlStr = lastConsultation?.lab_results?.[0]?.cholesterol_mg_dl?.toString() || '';
        const glucoseStr = lastConsultation?.lab_results?.[0]?.glucose_mg_dl?.toString() || '';

        let bp_systolic_str = '';
        let bp_diastolic_str = '';
        if (lastConsultation?.ta) {
            const bpParts = lastConsultation.ta.split('/');
            bp_systolic_str = bpParts[0]?.trim() || '';
            bp_diastolic_str = bpParts[1]?.trim() || '';
        }
        
        setData(prev => ({ 
            ...prev, 
            weight: weightStr, 
            height: heightStr,
            gender,
            triglycerides: tgStr,
            hdl: hdlStr,
            glucose: glucoseStr,
            bp_systolic: bp_systolic_str,
            bp_diastolic: bp_diastolic_str,
        }));
    }, [selectedPerson, lastConsultation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
        } else {
            setData(prev => ({...prev, [name]: value}));
        }
    };

    const results = useMemo(() => {
        const w = parseFloat(data.weight);
        const h = parseFloat(data.height);
        const waist = parseFloat(data.waist);
        const hip = parseFloat(data.hip);
        const prevW = parseFloat(data.prevWeight);
        const months = parseFloat(data.months);

        const imcResult = (w > 0 && h > 0) ? w / ((h / 100) ** 2) : null;
        let imcInterpretation;
        if (imcResult) {
            if (imcResult < 18.5) imcInterpretation = { text: 'Bajo Peso', color: 'var(--accent-color)' };
            else if (imcResult < 25) imcInterpretation = { text: 'Peso Normal', color: 'var(--primary-color)' };
            else if (imcResult < 30) imcInterpretation = { text: 'Sobrepeso', color: 'var(--accent-color)' };
            else imcInterpretation = { text: 'Obesidad', color: 'var(--error-color)' };
        }

        const healthyWeightRange = h > 0 ? {
            min: (18.5 * ((h / 100) ** 2)).toFixed(1),
            max: (24.9 * ((h / 100) ** 2)).toFixed(1),
        } : null;

        const whrResult = (waist > 0 && hip > 0) ? waist / hip : null;
        let whrInterpretation;
        if (whrResult) {
            const highRisk = data.gender === 'male' ? 0.90 : 0.85;
            whrInterpretation = whrResult > highRisk
                ? { text: 'Riesgo Cardiovascular Elevado', color: 'var(--error-color)' }
                : { text: 'Riesgo Bajo', color: 'var(--primary-color)' };
        }
        
        const whtrResult = (waist > 0 && h > 0) ? waist / h : null;
        let whtrInterpretation;
        if (whtrResult) {
             whtrInterpretation = whtrResult >= 0.5
                ? { text: 'Riesgo Metabólico Elevado', color: 'var(--error-color)' }
                : { text: 'Riesgo Bajo', color: 'var(--primary-color)' };
        }

        let weightChangeLabel = '% Cambio de Peso Involuntario';
        let weightChangeValue: string | null = null;
        let weightChangeInterpretation: { text: string; color: string; } | undefined = undefined;

        if (prevW > 0 && w > 0 && months > 0) {
            const changePercent = ((w - prevW) / prevW) * 100;
            
            if (changePercent < 0) { // Loss
                const lossPercent = Math.abs(changePercent);
                weightChangeLabel = '% Pérdida de Peso Involuntaria';
                weightChangeValue = `${lossPercent.toFixed(1)}%`;

                if ((months <= 1 && lossPercent > 5) || (months <= 3 && lossPercent > 7.5) || (months <= 6 && lossPercent > 10)) {
                    weightChangeInterpretation = { text: 'Pérdida Severa ⚠️', color: 'var(--error-color)' };
                } else if (lossPercent > 2) {
                    weightChangeInterpretation = { text: 'Pérdida Significativa', color: 'var(--accent-color)' };
                } else {
                    weightChangeInterpretation = { text: 'No Significativa', color: 'var(--primary-color)' };
                }
            } else if (changePercent > 0) { // Gain
                const gainPercent = changePercent;
                weightChangeLabel = '% Aumento de Peso Involuntario';
                weightChangeValue = `+${gainPercent.toFixed(1)}%`;

                if ((months <= 1 && gainPercent > 5) || (months <= 3 && gainPercent > 7.5) || (months <= 6 && gainPercent > 10)) {
                    weightChangeInterpretation = { text: 'Aumento Severo ⚠️', color: 'var(--error-color)' };
                } else if (gainPercent > 2) {
                    weightChangeInterpretation = { text: 'Aumento Significativo', color: 'var(--accent-color)' };
                } else {
                    weightChangeInterpretation = { text: 'No Significativo', color: 'var(--primary-color)' };
                }
            }
        }

        const criteria = {
            waist: (data.gender === 'male' && waist > 102) || (data.gender === 'female' && waist > 88),
            bp: data.on_bp_meds || (parseFloat(data.bp_systolic) >= 130 || parseFloat(data.bp_diastolic) >= 85),
            tg: data.on_tg_meds || parseFloat(data.triglycerides) >= 150,
            hdl: data.on_hdl_meds || (data.gender === 'male' && parseFloat(data.hdl) < 40) || (data.gender === 'female' && parseFloat(data.hdl) < 50),
            glucose: data.on_glucose_meds || parseFloat(data.glucose) >= 100,
        };
        const criteriaMetCount = Object.values(criteria).filter(Boolean).length;
        const isMetabolicSyndrome = criteriaMetCount >= 3;

        return { 
            imc: { value: imcResult?.toFixed(1) || 'N/A', interpretation: imcInterpretation },
            healthyWeight: healthyWeightRange ? `${healthyWeightRange.min} - ${healthyWeightRange.max} kg` : 'N/A',
            whr: { value: whrResult?.toFixed(2) || 'N/A', interpretation: whrInterpretation },
            whtr: { value: whtrResult?.toFixed(2) || 'N/A', interpretation: whtrInterpretation },
            weightChange: { label: weightChangeLabel, value: weightChangeValue || 'N/A', interpretation: weightChangeInterpretation },
            metabolicSyndrome: { count: criteriaMetCount, diagnosis: isMetabolicSyndrome, criteria: criteria }
        };
    }, [data]);

    const handleSave = () => {
        handleSaveToLog(
            'anthropometryPanel',
            'Evaluación Antropométrica',
            `Evaluación completa: IMC ${results.imc.value}, Síndrome Metabólico ${results.metabolicSyndrome.diagnosis ? 'Presente' : 'Ausente'} (${results.metabolicSyndrome.count}/5).`,
            { inputs: data, result: results }
        );
    };
    
    // --- Dynamic Styles ---
    const panelStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
        gap: '2rem',
        padding: isMobile ? '1rem' : '1.5rem',
        maxWidth: '1000px',
        margin: '0 auto',
    };
    
    const inputColumnStyle: React.CSSProperties = {
        paddingRight: isMobile ? '0' : '2rem',
        borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
        paddingBottom: isMobile ? '2rem' : '0',
        borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
        marginBottom: isMobile ? '2rem' : '0',
    };

    const inputGroupStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '1rem',
        marginBottom: '1rem'
    };

    const labInputContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1rem',
        marginBottom: '1rem'
    };

    const labToggleStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: isMobile ? 0 : '1rem'
    };
    
    const sectionTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-color)', margin: '0 0 1rem 0' };
    const subSectionTitleStyle: React.CSSProperties = { ...sectionTitleStyle, fontSize: '1rem', color: 'var(--text-color)', marginTop: '2rem' };
    const resultColumnStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
    const MS_CRITERIA_LABELS = { waist: 'Obesidad Abdominal', bp: 'Presión Arterial Elevada', tg: 'Triglicéridos Elevados', hdl: 'Colesterol HDL Bajo', glucose: 'Glucosa en Ayuno Elevada' };

    return (
        <div className="fade-in">
            <div style={panelStyle}>
                <div style={inputColumnStyle}>
                    <h3 style={sectionTitleStyle}>Datos del Paciente</h3>
                    
                    <h4 style={subSectionTitleStyle}>Antropometría</h4>
                    <div style={inputGroupStyle}>
                        <div><label>Peso (kg)</label><input type="number" name="weight" value={data.weight} onChange={handleChange} /></div>
                        <div><label>Altura (cm)</label><input type="number" name="height" value={data.height} onChange={handleChange} /></div>
                        <div><label>Cintura (cm)</label><input type="number" name="waist" value={data.waist} onChange={handleChange} /></div>
                        <div><label>Cadera (cm)</label><input type="number" name="hip" value={data.hip} onChange={handleChange} /></div>
                    </div>
                     <div style={{marginBottom: '1rem'}}><label>Género</label><select name="gender" value={data.gender} onChange={handleChange}><option value="female">Mujer</option><option value="male">Hombre</option></select></div>
                    
                    <h4 style={{...subSectionTitleStyle, display: 'flex', alignItems: 'center'}}>
                        Cambio de Peso
                        <HelpTooltip content="Calcula el % de cambio de peso involuntario en un periodo. Una pérdida o ganancia significativa puede indicar riesgo nutricional." />
                    </h4>
                    <div style={inputGroupStyle}>
                         <div><label>Peso Anterior (kg)</label><input type="number" name="prevWeight" value={data.prevWeight} onChange={handleChange} /></div>
                         <div><label>Tiempo (meses)</label><input type="number" name="months" value={data.months} onChange={handleChange} /></div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2rem' }}>
                        <h4 style={{ ...subSectionTitleStyle, marginTop: 0, marginBottom: 0 }}>Laboratorios y Signos Vitales</h4>
                        <HelpTooltip content='Marque "En tratamiento" si el paciente usa medicamentos para un valor específico. Esto es crucial para el diagnóstico de Síndrome Metabólico, ya que el tratamiento cuenta como criterio positivo, aún si el valor está controlado.' />
                    </div>

                    <div style={labInputContainerStyle}><div style={{flex: 1}}><label>P. Arterial</label><div style={{display: 'flex', gap: '0.5rem'}}><input type="number" name="bp_systolic" placeholder="Sistólica" value={data.bp_systolic} onChange={handleChange} /><input type="number" name="bp_diastolic" placeholder="Diastólica" value={data.bp_diastolic} onChange={handleChange} /></div></div><div style={labToggleStyle}><input type="checkbox" name="on_bp_meds" id="on_bp_meds" checked={data.on_bp_meds} onChange={handleChange} /><label htmlFor="on_bp_meds" style={{marginBottom:0}}>En tratamiento</label></div></div>
                    <div style={labInputContainerStyle}><div style={{flex: 1}}><label>Triglicéridos (mg/dL)</label><input type="number" name="triglycerides" value={data.triglycerides} onChange={handleChange} /></div><div style={labToggleStyle}><input type="checkbox" name="on_tg_meds" id="on_tg_meds" checked={data.on_tg_meds} onChange={handleChange} /><label htmlFor="on_tg_meds" style={{marginBottom:0}}>En tratamiento</label></div></div>
                    <div style={labInputContainerStyle}><div style={{flex: 1}}><label>HDL (mg/dL)</label><input type="number" name="hdl" value={data.hdl} onChange={handleChange} /></div><div style={labToggleStyle}><input type="checkbox" name="on_hdl_meds" id="on_hdl_meds" checked={data.on_hdl_meds} onChange={handleChange} /><label htmlFor="on_hdl_meds" style={{marginBottom:0}}>En tratamiento</label></div></div>
                    <div style={labInputContainerStyle}><div style={{flex: 1}}><label>Glucosa Ayuno (mg/dL)</label><input type="number" name="glucose" value={data.glucose} onChange={handleChange} /></div><div style={labToggleStyle}><input type="checkbox" name="on_glucose_meds" id="on_glucose_meds" checked={data.on_glucose_meds} onChange={handleChange} /><label htmlFor="on_glucose_meds" style={{marginBottom:0}}>En tratamiento</label></div></div>
                </div>

                <div style={resultColumnStyle}>
                    <h3 style={sectionTitleStyle}>Resultados e Interpretación</h3>
                    <ResultItem label="IMC (kg/m²)" value={results.imc.value} interpretation={results.imc.interpretation} />
                    <ResultItem label="Rango de Peso Saludable" value={results.healthyWeight} />
                    <ResultItem label="Índice Cintura-Cadera (ICC)" value={results.whr.value} interpretation={results.whr.interpretation} />
                    <ResultItem label="Índice Cintura-Talla (ICT)" value={results.whtr.value} interpretation={results.whtr.interpretation} />
                    <ResultItem label={results.weightChange.label} value={results.weightChange.value} interpretation={results.weightChange.interpretation} />
                    
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                             <p style={{ margin: 0, color: 'var(--text-light)' }}>Síndrome Metabólico (ATP III)</p>
                             <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: results.metabolicSyndrome.diagnosis ? 'var(--error-color)' : 'var(--primary-color)'}}>
                                 {results.metabolicSyndrome.diagnosis ? 'Diagnóstico Positivo ⚠️' : 'Diagnóstico Negativo'} ({results.metabolicSyndrome.count}/5)
                             </p>
                        </div>
                        <ul style={{listStyle: 'none', padding: 0, margin: '1rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            {Object.entries(results.metabolicSyndrome.criteria).map(([key, met]) => (
                                <li key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: met ? 'var(--error-color)' : 'var(--text-light)'}}>
                                    <span>{met ? '✅' : '–'}</span>
                                    <span>{MS_CRITERIA_LABELS[key as keyof typeof MS_CRITERIA_LABELS]}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', maxWidth: '1000px', margin: '2rem auto 0 auto'}}>
                <button 
                    onClick={handleSave} 
                    disabled={!selectedPerson || saveStatus['anthropometryPanel'] === 'saving' || saveStatus['anthropometryPanel'] === 'success'}
                    style={{minWidth: '250px'}}
                >
                     {saveStatus['anthropometryPanel'] === 'saving' ? 'Guardando...' : saveStatus['anthropometryPanel'] === 'success' ? '¡Guardado!' : 'Guardar Evaluación en Expediente'}
                </button>
            </div>
        </div>
    );
};

export default AnthropometryTools;