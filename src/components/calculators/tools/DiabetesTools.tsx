
import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import HelpTooltip from './shared/HelpTooltip';
import { styles } from '../../../constants';

const DiabetesTools: FC<ToolProps> = ({ lastConsultation, selectedPerson, handleSaveToLog, saveStatus }) => {
    const [hba1c, setHba1c] = useState('');

    useEffect(() => {
        const hba1cStr = lastConsultation?.lab_results?.[0]?.hba1c?.toString() || '';
        setHba1c(hba1cStr);
    }, [lastConsultation]);

    const eagResult = useMemo(() => {
        const h = parseFloat(hba1c);
        if (h > 0) {
            const eag = (28.7 * h) - 46.7;
            let interpretation;
            if (eag < 70) interpretation = { text: 'Riesgo Hipoglucemia', color: 'var(--accent-color)' };
            else if (eag < 154) interpretation = { text: 'Buen Control (<7%)', color: 'var(--primary-color)' };
            else if (eag < 183) interpretation = { text: 'Control Regular (<8%)', color: 'var(--accent-color)' };
            else interpretation = { text: 'Control Deficiente', color: 'var(--error-color)' };

            return { value: eag.toFixed(0), interpretation };
        }
        return null;
    }, [hba1c]);

    const inputStyle = { ...styles.input, backgroundColor: 'var(--background-color)', marginBottom: 0, fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' as const };

    return (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
            <CalculatorCard
                title={
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        Conversor eAG
                        <HelpTooltip content="Convierte la Hemoglobina Glicosilada (%) a Glucosa Promedio Estimada (mg/dL)." />
                    </div>
                }
                onSave={() => handleSaveToLog('eag', 'Cálculo eAG', `HbA1c: ${hba1c}%, eAG: ${eagResult!.value} mg/dL`, { inputs: { hba1c }, result: eagResult })}
                saveDisabled={!eagResult}
                saveStatus={saveStatus['eag']}
            >
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0'}}>
                    <div style={{width: '100%', maxWidth: '200px'}}>
                        <label style={{textAlign: 'center', marginBottom: '0.5rem'}}>HbA1c (%)</label>
                        <input type="number" step="0.1" value={hba1c} onChange={e => setHba1c(e.target.value)} style={inputStyle} placeholder="0.0" />
                    </div>
                    
                    <div style={{width: '2px', height: '40px', backgroundColor: 'var(--border-color)'}}></div>
                    
                    {eagResult ? (
                         <div style={{textAlign: 'center'}}>
                            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700}}>Glucosa Promedio (eAG)</p>
                            <p style={{margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1}}>{eagResult.value} <span style={{fontSize: '1rem', fontWeight: 500}}>mg/dL</span></p>
                            <p style={{margin: 0, fontWeight: 600, color: eagResult.interpretation.color}}>{eagResult.interpretation.text}</p>
                        </div>
                    ) : <div style={{height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'}}>Ingrese HbA1c para calcular</div>}
                </div>
            </CalculatorCard>
            
            <div style={{backgroundColor: 'var(--surface-color)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)', height: 'fit-content'}}>
                 <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--primary-color)'}}>Metas ADA (Adultos)</h3>
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{fontWeight: 500}}>HbA1c</span>
                        <span style={{fontWeight: 700, color: 'var(--text-color)'}}>&lt; 7.0%</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{fontWeight: 500}}>Glucosa Ayuno</span>
                        <span style={{fontWeight: 700, color: 'var(--text-color)'}}>80 - 130 mg/dL</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{fontWeight: 500}}>Postprandial (1-2h)</span>
                        <span style={{fontWeight: 700, color: 'var(--text-color)'}}>&lt; 180 mg/dL</span>
                    </li>
                </ul>
                <div style={{marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                    <p style={{margin: 0}}>*Metas generales. Deben individualizarse según edad y comorbilidades.</p>
                </div>
            </div>
        </div>
    );
};

export default DiabetesTools;
