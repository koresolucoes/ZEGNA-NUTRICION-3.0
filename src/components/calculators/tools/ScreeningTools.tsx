import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import HelpTooltip from './shared/HelpTooltip';

const sectionStyle: React.CSSProperties = {
    padding: '1.5rem',
    backgroundColor: 'var(--surface-color)',
    borderRadius: '12px',
    border: `1px solid var(--border-color)`,
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--primary-color)',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
};

const resultTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    backgroundColor: 'var(--background-color)',
    borderRadius: '8px',
    overflow: 'hidden'
};

const thStyle: React.CSSProperties = {
    padding: '0.75rem',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--surface-hover-color)',
    color: 'var(--text-light)',
    fontSize: '0.9rem'
};

const tdStyle: React.CSSProperties = {
    padding: '0.75rem',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-color)',
};

const scoreCellStyle: React.CSSProperties = {
    ...tdStyle,
    fontWeight: 700,
    fontSize: '1.2rem',
    textAlign: 'center',
    color: 'var(--primary-color)'
};

const finalScoreCellStyle: React.CSSProperties = {
    ...scoreCellStyle,
    fontSize: '1.5rem'
};


const ScreeningTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [must, setMust] = useState({ 
        weight: '', 
        height: '', 
        prevWeight: '', 
        isAcutelyIll: false 
    });

    useEffect(() => {
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        setMust(prev => ({ ...prev, weight: weightStr, height: heightStr }));
    }, [lastConsultation]);

    const mustResult = useMemo(() => {
        const w = parseFloat(must.weight);
        const h = parseFloat(must.height);
        
        let bmiResult = { value: 'N/A', score: 0 };
        if (w > 0 && h > 0) {
            const bmi = w / ((h / 100) ** 2);
            let score = 0;
            if (bmi < 18.5) score = 2;
            else if (bmi < 20) score = 1;
            bmiResult = { value: bmi.toFixed(1), score };
        }

        let weightLossResult = { value: 'N/A', score: 0 };
        const prevW = parseFloat(must.prevWeight);
        if (prevW > 0 && w > 0) {
            const changePercent = ((w - prevW) / prevW) * 100;
            let score = 0;
            
            // Only score for weight LOSS
            if (changePercent < 0) {
                const lossPercent = Math.abs(changePercent);
                if (lossPercent > 10) {
                    score = 2;
                } else if (lossPercent >= 5) {
                    score = 1;
                }
                weightLossResult = { value: `${lossPercent.toFixed(1)}%`, score };
            } else if (changePercent >= 0) {
                // Display gain for user feedback, but score is always 0
                weightLossResult = { value: `+${changePercent.toFixed(1)}%`, score: 0 };
            }
        }

        const acuteDiseaseScore = must.isAcutelyIll ? 2 : 0;
        
        const totalScore = bmiResult.score + weightLossResult.score + acuteDiseaseScore;

        let riskLevel, actionPlan, riskColor;
        if (totalScore === 0) {
            riskLevel = 'Bajo Riesgo';
            actionPlan = 'Observar: repetir tamizaje en hospital (semanal), en comunidad (anual), etc.';
            riskColor = 'var(--primary-color)';
        } else if (totalScore === 1) {
            riskLevel = 'Riesgo Medio';
            actionPlan = 'Observar: registrar ingesta por 3 días. Si mejora, repetir tamizaje. Si no, seguir plan de alto riesgo.';
            riskColor = 'var(--accent-color)';
        } else {
            riskLevel = 'Alto Riesgo ⚠️';
            actionPlan = 'TRATAR: referir a dietista/nutriólogo, iniciar soporte nutricional y monitorear.';
            riskColor = 'var(--error-color)';
        }
        
        return { bmiResult, weightLossResult, acuteDiseaseScore, totalScore, riskLevel, actionPlan, riskColor };
    }, [must]);

    const handleSave = () => {
        const { totalScore, riskLevel, actionPlan } = mustResult;
        handleSaveToLog(
            'mustScreening',
            'Tamizaje MUST',
            `Resultado: ${riskLevel} (Puntuación: ${totalScore}). Plan: ${actionPlan}`,
            { inputs: must, result: mustResult }
        );
    };

    return (
        <div className="fade-in" style={{maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <h2 style={{margin: 0, textAlign: 'center'}}>Asistente de Tamizaje Nutricional (MUST)</h2>

            {/* Step 1 */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                    Paso 1: Índice de Masa Corporal (IMC)
                    <HelpTooltip content="IMC: >20 = 0 pts, 18.5-20 = 1 pt, <18.5 = 2 pts" />
                </h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div><label>Peso Actual (kg)</label><input type="number" value={must.weight} onChange={e => setMust(p => ({...p, weight: e.target.value}))} /></div>
                    <div><label>Altura (cm)</label><input type="number" value={must.height} onChange={e => setMust(p => ({...p, height: e.target.value}))} /></div>
                </div>
                 <table style={resultTableStyle}><tbody>
                    <tr>
                        <td style={tdStyle}>IMC Calculado</td>
                        <td style={{...tdStyle, fontWeight: 700, textAlign: 'center'}}>{mustResult.bmiResult.value} kg/m²</td>
                        <td style={scoreCellStyle}>{mustResult.bmiResult.score}</td>
                    </tr>
                </tbody></table>
            </div>

            {/* Step 2 */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                    Paso 2: Pérdida de Peso Involuntaria
                    <HelpTooltip content="Pérdida en los últimos 3-6 meses: <5% = 0 pts, 5-10% = 1 pt, >10% = 2 pts" />
                </h3>
                <div><label>Peso Anterior (kg)</label><input type="number" placeholder='Peso de hace 3-6 meses' value={must.prevWeight} onChange={e => setMust(p => ({...p, prevWeight: e.target.value}))} /></div>
                <table style={resultTableStyle}><tbody>
                    <tr>
                        <td style={tdStyle}>% de Pérdida</td>
                        <td style={{...tdStyle, fontWeight: 700, textAlign: 'center'}}>{mustResult.weightLossResult.value}</td>
                        <td style={scoreCellStyle}>{mustResult.weightLossResult.score}</td>
                    </tr>
                </tbody></table>
            </div>

            {/* Step 3 */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                    Paso 3: Efecto de Enfermedad Aguda
                    <HelpTooltip content="Si el paciente está agudamente enfermo Y no ha tenido (o no se prevé) ingesta por más de 5 días, se suman 2 puntos." />
                </h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px'}}>
                    <input type="checkbox" id="isAcutelyIll" style={{width: '20px', height: '20px'}} checked={must.isAcutelyIll} onChange={e => setMust(p => ({...p, isAcutelyIll: e.target.checked}))} />
                    <label htmlFor="isAcutelyIll" style={{marginBottom: 0}}>¿Paciente agudamente enfermo y sin ingesta &gt; 5 días?</label>
                </div>
                 <table style={resultTableStyle}><tbody>
                    <tr>
                        <td style={tdStyle}>Puntuación por Enfermedad</td>
                        <td style={scoreCellStyle}>{mustResult.acuteDiseaseScore}</td>
                    </tr>
                </tbody></table>
            </div>
            
            {/* Final Result */}
            <div style={{...sectionStyle, border: `2px solid ${mustResult.riskColor}`}}>
                <h3 style={{...sectionTitleStyle, color: mustResult.riskColor, borderBottomColor: mustResult.riskColor}}>Resultado Final del Tamizaje MUST</h3>
                <table style={{...resultTableStyle, backgroundColor: 'transparent'}}>
                    <thead><tr>
                        <th style={{...thStyle, backgroundColor: 'transparent'}}>Puntuación Total</th>
                        <th style={{...thStyle, backgroundColor: 'transparent'}}>Nivel de Riesgo</th>
                    </tr></thead>
                    <tbody><tr>
                        <td style={finalScoreCellStyle}>{mustResult.totalScore}</td>
                        <td style={{...finalScoreCellStyle, color: mustResult.riskColor}}>{mustResult.riskLevel}</td>
                    </tr></tbody>
                </table>
                <div style={{marginTop: '1.5rem'}}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--text-light)', fontSize: '0.9rem'}}>Plan de Acción Sugerido:</h4>
                    <p style={{margin: 0, fontWeight: 500}}>{mustResult.actionPlan}</p>
                </div>
            </div>

            {/* Save Button */}
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <button 
                    onClick={handleSave} 
                    disabled={!selectedPerson || saveStatus['mustScreening'] === 'saving' || saveStatus['mustScreening'] === 'success'}
                    style={{minWidth: '250px'}}
                >
                     {saveStatus['mustScreening'] === 'saving' ? 'Guardando...' : saveStatus['mustScreening'] === 'success' ? '¡Guardado!' : 'Guardar Tamizaje en Expediente'}
                </button>
            </div>
        </div>
    );
};

export default ScreeningTools;