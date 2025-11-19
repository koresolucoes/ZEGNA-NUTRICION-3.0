import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import HelpTooltip from './shared/HelpTooltip';
import CalculatorCard from './shared/CalculatorCard';
import { styles } from '../../../constants';

const useIsMobile = (breakpoint = 960) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
};

const ResultMetricCard: FC<{ label: string; value: string; interpretation?: { text: string; color: string; } }> = ({ label, value, interpretation }) => (
    <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>{label}</p>
        <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem'}}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-color)' }}>{value}</p>
        </div>
        {interpretation && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: interpretation.color }}>{interpretation.text}</p>}
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
        const gender = (selectedPerson?.gender as 'male' | 'female') || 'female';
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
                ? { text: 'Riesgo Elevado', color: 'var(--error-color)' }
                : { text: 'Riesgo Bajo', color: 'var(--primary-color)' };
        }
        
        const whtrResult = (waist > 0 && h > 0) ? waist / h : null;
        let whtrInterpretation;
        if (whtrResult) {
             whtrInterpretation = whtrResult >= 0.5
                ? { text: 'Riesgo Elevado', color: 'var(--error-color)' }
                : { text: 'Riesgo Bajo', color: 'var(--primary-color)' };
        }

        let weightChangeLabel = 'Cambio de Peso';
        let weightChangeValue: string | null = null;
        let weightChangeInterpretation: { text: string; color: string; } | undefined = undefined;

        if (prevW > 0 && w > 0 && months > 0) {
            const changePercent = ((w - prevW) / prevW) * 100;
            
            if (changePercent < 0) { // Loss
                const lossPercent = Math.abs(changePercent);
                weightChangeLabel = 'Pérdida Involuntaria';
                weightChangeValue = `${lossPercent.toFixed(1)}%`;

                if ((months <= 1 && lossPercent > 5) || (months <= 3 && lossPercent > 7.5) || (months <= 6 && lossPercent > 10)) {
                    weightChangeInterpretation = { text: 'Pérdida Severa ⚠️', color: 'var(--error-color)' };
                } else if (lossPercent > 2) {
                    weightChangeInterpretation = { text: 'Significativa', color: 'var(--accent-color)' };
                } else {
                    weightChangeInterpretation = { text: 'No Significativa', color: 'var(--primary-color)' };
                }
            } else if (changePercent > 0) { // Gain
                const gainPercent = changePercent;
                weightChangeLabel = 'Ganancia Involuntaria';
                weightChangeValue = `+${gainPercent.toFixed(1)}%`;
                weightChangeInterpretation = { text: 'Aumento', color: 'var(--text-color)' };
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
            imc: { value: imcResult?.toFixed(1) || '-', interpretation: imcInterpretation },
            healthyWeight: healthyWeightRange ? `${healthyWeightRange.min} - ${healthyWeightRange.max} kg` : '-',
            whr: { value: whrResult?.toFixed(2) || '-', interpretation: whrInterpretation },
            whtr: { value: whtrResult?.toFixed(2) || '-', interpretation: whtrInterpretation },
            weightChange: { label: weightChangeLabel, value: weightChangeValue || '-', interpretation: weightChangeInterpretation },
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
    
    const inputStyle = {
        ...styles.input,
        backgroundColor: 'var(--background-color)',
        marginBottom: 0,
        padding: '0.65rem 0.75rem'
    };
    
    const groupTitleStyle = {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'var(--text-color)',
        marginBottom: '1rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
    };

    return (
        <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '2rem', alignItems: 'start'}}>
            <CalculatorCard title="Datos Antropométricos" saveDisabled={true} extraActions={null}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                    <div><label style={styles.label}>Peso (kg)</label><input type="number" name="weight" value={data.weight} onChange={handleChange} style={inputStyle} placeholder="0.0"/></div>
                    <div><label style={styles.label}>Altura (cm)</label><input type="number" name="height" value={data.height} onChange={handleChange} style={inputStyle} placeholder="0"/></div>
                    <div><label style={styles.label}>Cintura (cm)</label><input type="number" name="waist" value={data.waist} onChange={handleChange} style={inputStyle} placeholder="0"/></div>
                    <div><label style={styles.label}>Cadera (cm)</label><input type="number" name="hip" value={data.hip} onChange={handleChange} style={inputStyle} placeholder="0"/></div>
                </div>
                <div style={{marginBottom: '1.5rem'}}>
                    <label style={styles.label}>Género</label>
                    <div className="select-wrapper">
                        <select name="gender" value={data.gender} onChange={handleChange} style={inputStyle}>
                            <option value="female">Mujer</option>
                            <option value="male">Hombre</option>
                        </select>
                    </div>
                </div>
                
                <h4 style={groupTitleStyle}>Cambio de Peso</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                     <div><label style={styles.label}>Peso Anterior</label><input type="number" name="prevWeight" value={data.prevWeight} onChange={handleChange} style={inputStyle} placeholder="kg"/></div>
                     <div><label style={styles.label}>Hace (meses)</label><input type="number" name="months" value={data.months} onChange={handleChange} style={inputStyle} placeholder="#"/></div>
                </div>
                
                <h4 style={groupTitleStyle}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        Laboratorios y Signos
                        <HelpTooltip content='Marca "En tratamiento" si el paciente usa medicamentos para controlar este valor.' />
                    </div>
                </h4>
                
                {[
                    { label: 'P. Arterial', name: 'bp', units: 'mmHg', placeholder: '120/80', dual: true },
                    { label: 'Triglicéridos', name: 'triglycerides', units: 'mg/dL', placeholder: '150' },
                    { label: 'HDL', name: 'hdl', units: 'mg/dL', placeholder: '40' },
                    { label: 'Glucosa', name: 'glucose', units: 'mg/dL', placeholder: '90' },
                ].map(field => (
                    <div key={field.name} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}}>
                        <div style={{flex: 2}}>
                            <label style={{fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '2px'}}>{field.label}</label>
                            {field.dual ? (
                                <div style={{display: 'flex', gap: '0.25rem'}}>
                                    <input type="number" name="bp_systolic" placeholder="SIS" value={data.bp_systolic} onChange={handleChange} style={{...inputStyle, padding: '0.5rem'}} />
                                    <input type="number" name="bp_diastolic" placeholder="DIA" value={data.bp_diastolic} onChange={handleChange} style={{...inputStyle, padding: '0.5rem'}} />
                                </div>
                            ) : (
                                <input type="number" name={field.name} value={(data as any)[field.name]} onChange={handleChange} style={{...inputStyle, padding: '0.5rem'}} placeholder={field.placeholder} />
                            )}
                        </div>
                        <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', paddingBottom: '5px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer'}}>
                                <input type="checkbox" name={field.name === 'bp' ? 'on_bp_meds' : field.name === 'triglycerides' ? 'on_tg_meds' : field.name === 'hdl' ? 'on_hdl_meds' : 'on_glucose_meds'} checked={(data as any)[field.name === 'bp' ? 'on_bp_meds' : field.name === 'triglycerides' ? 'on_tg_meds' : field.name === 'hdl' ? 'on_hdl_meds' : 'on_glucose_meds']} onChange={handleChange} style={{margin: 0}}/>
                                Tx
                            </label>
                        </div>
                    </div>
                ))}
            </CalculatorCard>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <CalculatorCard 
                    title="Diagnóstico y Riesgo" 
                    onSave={handleSave} 
                    saveDisabled={!selectedPerson} 
                    saveStatus={saveStatus['anthropometryPanel']}
                >
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <ResultMetricCard label="IMC" value={results.imc.value} interpretation={results.imc.interpretation} />
                        <ResultMetricCard label="Peso Saludable" value={results.healthyWeight} />
                        <ResultMetricCard label="Cintura/Cadera" value={results.whr.value} interpretation={results.whr.interpretation} />
                        <ResultMetricCard label={results.weightChange.label} value={results.weightChange.value} interpretation={results.weightChange.interpretation} />
                    </div>
                    
                    <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--background-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                             <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>Síndrome Metabólico (ATP III)</p>
                             <span style={{ 
                                 padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
                                 backgroundColor: results.metabolicSyndrome.diagnosis ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                 color: results.metabolicSyndrome.diagnosis ? 'var(--error-color)' : 'var(--primary-color)'
                             }}>
                                {results.metabolicSyndrome.diagnosis ? 'Positivo' : 'Negativo'} ({results.metabolicSyndrome.count}/5)
                             </span>
                        </div>
                        <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                            {Object.entries(results.metabolicSyndrome.criteria).map(([key, value]) => {
                                const labels: any = { waist: 'Cintura', bp: 'P. Arterial', tg: 'Triglicéridos', hdl: 'HDL Bajo', glucose: 'Glucosa' };
                                return (
                                    <li key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: value ? 1 : 0.5}}>
                                        <span style={{color: value ? 'var(--error-color)' : 'var(--text-light)'}}>{value ? '⚠️' : '○'}</span>
                                        <span>{labels[key]}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </CalculatorCard>
            </div>
        </div>
    );
};

export default AnthropometryTools;