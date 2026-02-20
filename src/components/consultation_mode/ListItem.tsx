import React, { ReactNode } from 'react';

interface ListItemProps {
    label: string;
    value?: string | ReactNode;
    actionLabel: string;
    onAction: () => void;
    isList?: boolean;
}

const ListItem = ({ label, value, actionLabel, onAction, isList = false }: ListItemProps) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-color)' }}>{label}</p>
            {value && <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{value}</div>}
        </div>
        <button 
            onClick={onAction}
            style={{ 
                background: 'none', border: 'none', color: 'var(--primary-color)', 
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0.5rem',
                textTransform: 'uppercase'
            }}
        >
            {actionLabel}
        </button>
    </div>
);

export default ListItem;
