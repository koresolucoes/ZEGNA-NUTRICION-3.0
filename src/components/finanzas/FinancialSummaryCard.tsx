import React, { FC, ReactNode } from 'react';
import { styles } from '../../constants';

interface FinancialSummaryCardProps {
    title: string;
    value: string;
    icon: ReactNode;
}

const FinancialSummaryCard: FC<FinancialSummaryCardProps> = ({ title, value, icon }) => {
    return (
        <div style={{...styles.summaryCard, padding: '1.5rem', alignItems: 'flex-start', textAlign: 'left', transition: 'all 0.2s ease'}} className="card-hover">
            <div style={{...styles.summaryCardIcon, marginBottom: '1rem', color: 'var(--primary-color)'}}>{icon}</div>
            <p style={{...styles.summaryCardLabel, marginBottom: '0.25rem', fontSize: '0.9rem'}}>{title}</p>
            <p style={{...styles.summaryCardValue, fontSize: '2rem'}} className="summary-card-value">{value}</p>
        </div>
    );
};

export default FinancialSummaryCard;
