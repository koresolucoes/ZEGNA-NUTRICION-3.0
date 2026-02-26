import React, { ReactNode } from 'react';

interface CardButtonProps {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    subLabel?: string;
}

const CardButton = ({ icon, label, onClick, subLabel }: CardButtonProps) => (
    <div 
        onClick={onClick}
        className="card-hover"
        style={{ 
            backgroundColor: 'var(--surface-color)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer',
            textAlign: 'center',
            height: '100%',
            minHeight: '120px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
    >
        <div style={{ color: 'var(--primary-color)', transform: 'scale(1.2)' }}>{icon}</div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{label}</p>
        {subLabel && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>{subLabel}</p>}
    </div>
);

export default CardButton;
