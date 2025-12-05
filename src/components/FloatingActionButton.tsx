
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

    const toggleMenu = () => setIsOpen(!isOpen);

    // Actions defined from Top to Bottom visually
    const actions = [
        { label: 'Enviar Feedback', icon: ICONS.feedback, action: onFeedback, color: '#8B5CF6', delay: '150ms' },
        { label: 'Consulta Rápida', icon: ICONS.clinic, action: onQuickConsult, color: '#F59E0B', delay: '100ms' },
        { label: 'Nuevo Afiliado', icon: ICONS.users, action: onNewAfiliado, color: '#10B981', delay: '50ms' },
        { label: 'Nuevo Paciente', icon: ICONS.user, action: onNewClient, color: '#3B82F6', delay: '0ms' }, // Closest to FAB
    ];

    return (
        <>
            {/* Glassmorphism Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 1999,
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                    transition: 'all 0.3s ease-in-out',
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* FAB Container */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '1rem',
                pointerEvents: 'none' // Pass through clicks when closed
            }}>
                
                {/* Action Buttons Group */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '1rem',
                    marginBottom: '10px'
                }}>
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                opacity: isOpen ? 1 : 0,
                                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
                                transition: `all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${isOpen ? action.delay : '0ms'}`,
                                visibility: isOpen ? 'visible' : 'hidden',
                                pointerEvents: isOpen ? 'auto' : 'none'
                            }}
                        >
                            {/* Label */}
                            <span style={{
                                backgroundColor: 'var(--surface-color)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--border-color)'
                            }}>
                                {action.label}
                            </span>

                            {/* Mini FAB */}
                            <button
                                onClick={() => {
                                    action.action();
                                    setIsOpen(false);
                                }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: action.color,
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                className="fab-action-btn"
                                aria-label={action.label}
                            >
                                {action.icon}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Main FAB */}
                <button
                    onClick={toggleMenu}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: isOpen 
                            ? '0 0 0 6px rgba(56, 189, 248, 0.2), 0 8px 20px rgba(0,0,0,0.3)' 
                            : '0 8px 20px rgba(56, 189, 248, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transform: isOpen ? 'rotate(135deg)' : 'rotate(0deg)'
                    }}
                    aria-label={isOpen ? "Cerrar menú" : "Abrir menú de acciones"}
                    className="fab-main-btn"
                >
                    <span style={{display: 'block', marginTop: '-4px', lineHeight: '1'}}>+</span>
                </button>
            </div>

            {/* Styles Injection for Hovers */}
            <style>{`
                .fab-action-btn:hover {
                    transform: scale(1.1);
                }
                .fab-main-btn:hover {
                    transform: scale(1.05) ${isOpen ? 'rotate(135deg)' : 'rotate(0deg)'};
                }
            `}</style>
        </>
    );
};

export default FloatingActionButton;
