import React, { useState, FC } from 'react';
import { ICONS } from '../pages/AuthPage';

interface FABProps {
    onNewClient: () => void;
    onNewAfiliado: () => void;
    onQuickConsult: () => void;
    onFeedback: () => void;
}

const FloatingActionButton: FC<FABProps> = ({ onNewClient, onNewAfiliado, onQuickConsult, onFeedback }) => {
    const [isOpen, setIsOpen] = useState(false);

    const fabStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1050,
    };

    const mainButtonStyle: React.CSSProperties = {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease-in-out',
    };

    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '75px', // Above the main button
        right: '5px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'flex-end',
    };
    
    const menuItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: 'var(--surface-color)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.2s',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(10px)',
        visibility: isOpen ? 'visible' : 'hidden',
        color: 'var(--text-color)',
        whiteSpace: 'nowrap',
    };
    
    const actions = [
        { label: 'Enviar Feedback', icon: ICONS.feedback, action: onFeedback },
        { label: 'Consulta Rápida', icon: ICONS.clinic, action: onQuickConsult },
        { label: 'Nuevo Paciente', icon: ICONS.add, action: onNewClient },
        { label: 'Nuevo Afiliado', icon: ICONS.add, action: onNewAfiliado },
    ];

    return (
        <div style={fabStyle}>
            {isOpen && <div style={menuStyle}>
                {actions.map((item, index) => (
                    <div key={item.label} onClick={() => { item.action(); setIsOpen(false); }} style={{...menuItemStyle, transitionDelay: `${(actions.length - index) * 50}ms`}} role="button" className="nav-item-hover">
                        <span>{item.label}</span>
                        <div style={{color: 'var(--primary-color)'}}>{item.icon}</div>
                    </div>
                ))}
            </div>}
            <button onClick={() => setIsOpen(!isOpen)} style={mainButtonStyle} aria-haspopup="true" aria-expanded={isOpen} aria-label="Acciones Rápidas">
                +
            </button>
        </div>
    );
};

export default FloatingActionButton;