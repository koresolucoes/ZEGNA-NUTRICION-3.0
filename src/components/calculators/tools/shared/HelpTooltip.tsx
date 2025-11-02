import React, { FC, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HelpTooltipProps {
    content: string;
}

const modalRoot = document.getElementById('modal-root');

const HelpTooltip: FC<HelpTooltipProps> = ({ content }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const iconRef = useRef<HTMLSpanElement>(null);

    const iconStyle: React.CSSProperties = {
        cursor: 'help',
        color: 'var(--text-light)',
        border: '1px solid var(--text-light)',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        marginLeft: '8px',
        userSelect: 'none'
    };
    
    const handleMouseEnter = () => {
        if (iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const tooltipHeight = 100; // Estimate height for positioning logic
            const spaceAbove = rect.top;

            let top, transform;
            // If there's not enough space above, position it below
            if (spaceAbove < tooltipHeight + 10) {
                top = rect.bottom + 8;
                transform = 'translateX(-50%)';
            } else { // Otherwise, position it above
                top = rect.top - 8;
                transform = 'translate(-50%, -100%)';
            }
            
            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${rect.left + rect.width / 2}px`,
                transform: transform,
                backgroundColor: 'var(--surface-hover-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                zIndex: 1300,
                width: '300px',
                maxWidth: 'calc(100vw - 20px)',
                lineHeight: 1.5,
                pointerEvents: 'none',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                opacity: 1,
                transition: 'opacity 0.2s',
                visibility: 'visible',
            });
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };
    
    const tooltip = isVisible && modalRoot && createPortal(
        <div style={style}>
            {content}
        </div>,
        modalRoot
    );

    return (
        <div 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'inline-flex', alignItems: 'center' }}
            aria-label="Información adicional"
        >
            <span ref={iconRef} style={iconStyle}>?</span>
            {tooltip}
        </div>
    );
};

export default HelpTooltip;
