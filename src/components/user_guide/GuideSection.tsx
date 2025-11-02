
import React, { FC, useState } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface GuideSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const GuideSection: FC<GuideSectionProps> = ({ title, icon, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '12px',
            marginBottom: '1rem',
            transition: 'all 0.3s ease-in-out',
            boxShadow: isOpen ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    ...styles.pageHeader,
                    padding: '1.5rem',
                    borderBottom: isOpen ? '1px solid var(--border-color)' : 'none',
                    marginBottom: 0,
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    cursor: 'pointer'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>{icon}</span>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-color)' }}>{title}</h2>
                </div>
                <span style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease-in-out',
                    color: 'var(--primary-color)',
                    fontSize: '1.5rem'
                }}>
                    {ICONS.chevronDown}
                </span>
            </button>
            {isOpen && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', lineHeight: 1.7, color: 'var(--text-light)' }} className="fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

export default GuideSection;
