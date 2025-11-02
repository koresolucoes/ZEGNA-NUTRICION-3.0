import React, { FC, ReactNode } from 'react';

interface FinancialSummaryCardProps {
    title: string;
    value: string;
    icon: ReactNode;
}

const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-color)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};

const iconStyle: React.CSSProperties = {
    marginBottom: '1rem',
    color: 'var(--primary-color)',
    fontSize: '1.5rem',
};

const labelStyle: React.CSSProperties = {
    marginBottom: '0.25rem',
    fontSize: '0.9rem',
    color: 'var(--text-light)',
};

const valueStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    margin: 0,
};

const FinancialSummaryCard: FC<FinancialSummaryCardProps> = ({ title, value, icon }) => {
    return (
        <div style={cardStyle} className="card-hover">
            <div style={iconStyle}>{icon}</div>
            <p style={labelStyle}>{title}</p>
            <p style={valueStyle} className="summary-card-value">{value}</p>
        </div>
    );
};

export default FinancialSummaryCard;