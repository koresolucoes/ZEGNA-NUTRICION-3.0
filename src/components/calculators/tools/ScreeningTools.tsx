import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0 };

const ScreeningTools: FC<ToolProps> = ({ selectedPerson, lastConsultation, handleSaveToLog, saveStatus }) => {
    const [must, setMust] = useState({ weight: '', height: '', prevWeight: '', isAcutelyIll: false });

    useEffect(() => {
        const weightStr = lastConsultation?.weight_kg?.toString() || '';
        const heightStr = lastConsultation?.height_cm?.toString() || '';
        setMust(prev => ({ ...prev, weight: weightStr, height: heightStr }));
    }, [lastConsultation]);

    const mustResult = useMemo(() => {
        const w = parseFloat(must.weight);
        const h = parseFloat(must.height);
        let bmiScore = 0, weightLossScore = 0;
        const bmi = (w > 0 && h > 0) ? w / ((h / 100) ** 2) : 0;

        if (bmi > 0) {
            if (bmi < 18.5) bmiScore = 2;
            else if (bmi < 20) bmiScore = 1;
        }

        const prevW = parseFloat(must.prevWeight);
        if (prevW > 0 && w > 0) {
            const lossPercent = ((prevW - w) / prevW) * 100;
            if (lossPercent > 10) weightLossScore = 2;
            else if (lossPercent >= 5) weightLossScore = 1;
        }

        const acuteScore = must.isAcutelyIll ? 2 : 0;
        const totalScore = bmiScore + weightLossScore + acuteScore;

        let riskLevel, color;
        if (totalScore === 0) { riskLevel = 'Bajo Riesgo'; color = 'var(--primary-color)'; }
        else if (totalScore === 1) { riskLevel = 'Riesgo Medio'; color = 'var(--accent-color)'; }
        else { riskLevel = 'Alto Riesgo'; color = 'var(--error-color)'; }
        
        return { bmi: bmi.toFixed(1), bmiScore, weightLossScore, acuteScore, totalScore, riskLevel, color };
    }, [must]);

    const handleSave = () => {
        handleSaveToLog('mustScreening', 'Tamizaje MUST', `Riesgo: ${mustResult.riskLevel} (${mustResult.totalScore} pts).`, { inputs: must, result: mustResult });
    };

    const StepRow: FC<{ num: number; title: string; children: React.ReactNode; score: number }> = ({ num, title, children, score }) => (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
             <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{num}</div>
             <div style={{ flex: 1 }}>
                 <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-color)' }}>{title}</h4>
                 {children}
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px' }}>
                 <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700 }}>Puntos</span>
                 <span style={{ fontSize: '1.5rem', fontWeight: 700, color: score > 0 ? 'var(--primary-color)' : 'var(--text-light)' }}>{score}</span>
             </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <CalculatorCard
                title="Tamizaje Universal de Malnutrición (MUST)"
                onSave={handleSave}
                saveDisabled={!selectedPerson}
                saveStatus={saveStatus['mustScreening']}
            >
                <StepRow num={1} title="IMC" score={mustResult.bmiScore}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{flex: 1}}><label style={styles.label}>Peso (kg)</label><input type="number" value={must.weight} onChange={e => setMust(p => ({...p, weight: e.target.value}))} style={inputStyle} /></div>
                        <div style={{flex: 1}}><label style={styles.label}>Altura (cm)</label><input type="number" value={must.height} onChange={e => setMust(p => ({...p, height: e.target.value}))} style={inputStyle} /></div>
                    </div>
                    <p style={{marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)'}}>IMC Calculado: <strong>{mustResult.bmi}</strong></p>
                </StepRow>

                <StepRow num={2} title="Pérdida de Peso Involuntaria (3-6 meses)" score={mustResult.weightLossScore}>
                     <div><label style={styles.label}>Peso Anterior (kg)</label><input type="number" value={must.prevWeight} onChange={e => setMust(p => ({...p, prevWeight: e.target.value}))} style={inputStyle} /></div>
                </StepRow>

                <StepRow num={3} title="Efecto de Enfermedad Aguda" score={mustResult.acuteScore}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <input type="checkbox" id="acute_ill" checked={must.isAcutelyIll} onChange={e => setMust(p => ({...p, isAcutelyIll: e.target.checked}))} style={{ width: '20px', height: '20px', margin: 0 }} />
                        <label htmlFor="acute_ill" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>¿Paciente muy enfermo y sin ingesta probable por &gt;5 días?</label>
                    </div>
                </StepRow>

                <div style={{ backgroundColor: mustResult.color, color: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 600, opacity: 0.9 }}>Resultado Final</p>
                    <h3 style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 800 }}>{mustResult.totalScore} Puntos</h3>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{mustResult.riskLevel}</p>
                </div>

            </CalculatorCard>
        </div>
    );
};

export default ScreeningTools;