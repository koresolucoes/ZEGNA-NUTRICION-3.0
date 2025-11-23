
import React, { FC, useState, useRef } from 'react';
import { ICONS } from '../../pages/AuthPage';

const AiUserMessage: FC<{ text: string; context: { displayText: string; fullText: string; file_url?: string; } | null }> = ({ text, context }) => {
    const [isPopoverVisible, setPopoverVisible] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const capsuleRef = useRef<HTMLDivElement>(null);

    const smallCapsuleStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: 'var(--white)',
        color: 'var(--primary-color)',
        fontSize: '0.8rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        cursor: 'pointer'
    };
    
    const handleMouseEnter = () => {
        if (!capsuleRef.current) return;
        const rect = capsuleRef.current.getBoundingClientRect();
        
        const popoverHeightEstimate = 120; // An estimate to decide placement
        
        let style: React.CSSProperties = {
            position: 'fixed',
            zIndex: 1100, // Ensure it's on top of the modal
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            width: '280px',
            maxWidth: 'calc(100vw - 20px)',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem',
            color: 'var(--text-color)',
            transition: 'opacity 0.2s',
            pointerEvents: 'none', // So it doesn't block the mouseleave event
            transform: 'translateX(-50%)',
            left: `${rect.left + rect.width / 2}px`,
            opacity: 1,
            visibility: 'visible',
        };
        
        if (rect.top < popoverHeightEstimate + 20) {
            // Not enough space above, position below
            style.top = `${rect.bottom + 5}px`;
        } else {
            // Position above
            style.bottom = `${window.innerHeight - rect.top + 5}px`;
        }
        
        setPopoverStyle(style);
        setPopoverVisible(true);
    };

    const handleMouseLeave = () => {
        setPopoverVisible(false);
    };

    return (
        <div>
            {context && (
                <div 
                    style={{ display: 'inline-block', marginBottom: '0.5rem' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div ref={capsuleRef} style={smallCapsuleStyle}>
                        <span style={{color: 'var(--primary-color)'}}>
                            {context.file_url ? '📄' : ICONS.send}
                        </span>
                        <span>{context.displayText}</span>
                    </div>
                    {isPopoverVisible && (
                        <div style={popoverStyle}>
                             {context.file_url ? (
                                <>
                                    <p style={{fontWeight: 600, marginBottom: '0.5rem', margin: 0}}>Archivo adjunto enviado para análisis.</p>
                                    <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.8}}>{context.displayText}</p>
                                </>
                             ) : context.fullText}
                        </div>
                    )}
                </div>
            )}
            <div>{text}</div>
        </div>
    );
};

export default AiUserMessage;
