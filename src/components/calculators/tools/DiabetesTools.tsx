import React, { FC, useState, useMemo, useEffect } from 'react';
import { ToolProps, gridStyle } from './tool-types';
import CalculatorCard from './shared/CalculatorCard';
import ResultDisplay from './shared/ResultDisplay';
import HelpTooltip from './shared/HelpTooltip';

const DiabetesTools: FC<ToolProps> = ({ lastConsultation, selectedPerson, handleSaveToLog, saveStatus }) => {
    // State for eAG calculator
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
            if (eag < 70) interpretation = { text: 'Hipoglucemia potencial', color: 'var(--accent-color)' };
            else if (eag < 154) interpretation = { text: 'Buen control (Objetivo ADA <7%)', color: 'var(--primary-color)' };
            else if (eag < 183) interpretation = { text: 'Control regular (Objetivo ADA <8%)', color: 'var(--accent-color)' };
            else interpretation = { text: 'Control deficiente', color: 'var(--error-color)' };

            return { value: eag.toFixed(0), interpretation };
        }
        return null;
    }, [hba1c]);

    return (
        <div className="fade-in" style={gridStyle}>
            <CalculatorCard
                title={
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        Glucosa Promedio Estimada (eAG)
                        <HelpTooltip content="Convierte el valor de HbA1c (%) a un valor de glucosa promedio (mg/dL) usando la fórmula de la ADAG, facilitando la comprensión para el paciente." />
                    </div>
                }
                onSave={() => handleSaveToLog('eag', 'Cálculo eAG', `HbA1c: ${hba1c}%, eAG: ${eagResult!.value} mg/dL`, { inputs: { hba1c }, result: eagResult })}
                saveDisabled={!selectedPerson || !eagResult}
                saveStatus={saveStatus['eag']}
            >
                <div>
                    <label>HbA1c (%)</label>
                    <input type="number" step="0.1" value={hba1c} onChange={e => setHba1c(e.target.value)} />
                </div>
                {eagResult && (
                    <ResultDisplay
                        label="Glucosa Promedio Estimada (eAG)"
                        value={eagResult.value}
                        unit="mg/dL"
                        interpretation={eagResult.interpretation}
                    />
                )}
            </CalculatorCard>
            
            <CalculatorCard title="Metas de Control Glucémico (ADA)">
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--text-color)' }}>
                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <strong>HbA1c:</strong> &lt;7.0% (para la mayoría de adultos no embarazadas)
                    </li>
                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <strong>Glucosa Preprandial:</strong> 80–130 mg/dL
                    </li>
                    <li style={{ padding: '0.5rem 0' }}>
                        <strong>Glucosa Postprandial (1-2h):</strong> &lt;180 mg/dL
                    </li>
                </ul>
                <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1rem'}}>
                    *Las metas pueden ser individualizadas según la edad, comorbilidades y riesgo de hipoglucemia del paciente.
                </p>
            </CalculatorCard>
        </div>
    );
};

export default DiabetesTools;
