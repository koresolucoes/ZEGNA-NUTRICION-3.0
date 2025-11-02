import React, { FC } from 'react';

const ResultDisplay: FC<{ label: string; value: string | number | null; unit?: string; interpretation?: { text: string; color: string; }; children?: React.ReactNode }> = ({ label, value, unit, interpretation, children }) => {
    const hasValue = value !== null && value !== '' && value !== undefined && (typeof value !== 'number' || !Number.isNaN(value));
    
    if (!hasValue && !children) return null;

    return (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>{label}</p>
            {hasValue && (
                <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1.5rem', color: 'var(--primary-color)' }}>
                    {value} {unit}
                </p>
            )}
            {interpretation && (
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500, fontSize: '0.9rem', color: interpretation.color }}>
                    {interpretation.text}
                </p>
            )}
            {children}
        </div>
    );
};

export default ResultDisplay;
