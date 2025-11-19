
import React, { FC } from 'react';
import { ICONS } from '../../pages/AuthPage';

interface PatientPortalFABProps {
    onOpenChat: () => void;
    isMobile: boolean;
}

const PatientPortalFAB: FC<PatientPortalFABProps> = ({ onOpenChat, isMobile }) => {
    const fabStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: isMobile ? '90px' : '2rem', // Higher on mobile to clear the bottom nav
        right: '1.5rem',
        zIndex: 1050,
    };

    const mainButtonStyle: React.CSSProperties = {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)', // Enhanced shadow
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s',
    };

    return (
        <div style={fabStyle}>
            <button 
                onClick={onOpenChat} 
                style={mainButtonStyle} 
                aria-label="Abrir asistente de IA"
                title="Asistente de IA"
                className="nav-item-hover"
            >
                {ICONS.sparkles}
            </button>
        </div>
    );
};

export default PatientPortalFAB;
