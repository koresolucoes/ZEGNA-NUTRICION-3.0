import React, { FC } from 'react';
import { ICONS } from '../../pages/AuthPage';

interface PatientPortalFABProps {
    onOpenChat: () => void;
}

const PatientPortalFAB: FC<PatientPortalFABProps> = ({ onOpenChat }) => {
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
        fontSize: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        transition: 'transform 0.3s ease-in-out',
    };

    return (
        <div style={fabStyle}>
            <button 
                onClick={onOpenChat} 
                style={mainButtonStyle} 
                aria-label="Abrir asistente de IA"
                title="Asistente de IA"
            >
                {ICONS.sparkles}
            </button>
        </div>
    );
};

export default PatientPortalFAB;
