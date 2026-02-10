
import React, { FC } from 'react';
import { styles } from '../../constants';

interface CatalogCardProps {
    title: string;
    subtitle?: string;
    description?: string;
    avatarSrc?: string | null;
    avatarSeed?: string; // Fallback text for Dicebear if url is null
    headerGradientSeed: string; // Kept for interface compatibility but ignored for neutral look
    overlayBadge?: string; // Text for the glassmorphism badge
    actions?: React.ReactNode;
    onClick?: () => void;
    children?: React.ReactNode; // For extra content like icons/status rows
    onImageClick?: () => void;
}

const CatalogCard: FC<CatalogCardProps> = ({ 
    title, 
    subtitle, 
    description, 
    avatarSrc, 
    avatarSeed, 
    headerGradientSeed, 
    overlayBadge, 
    actions, 
    onClick,
    children,
    onImageClick
}) => {

    const glassBadgeStyle: React.CSSProperties = {
        position: 'absolute', 
        top: '12px', 
        right: '12px', 
        background: 'rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        color: 'var(--text-color)', 
        padding: '4px 12px', 
        borderRadius: '20px', 
        fontSize: '0.7rem', 
        fontWeight: 700, 
        letterSpacing: '0.5px',
        zIndex: 5,
        textTransform: 'uppercase'
    };

    return (
        <div 
            className="card-hover" 
            onClick={onClick}
            style={{
                backgroundColor: 'var(--surface-color)', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid var(--border-color)',
                display: 'flex', 
                flexDirection: 'column',
                boxShadow: 'var(--shadow)',
                height: '100%',
                position: 'relative',
                cursor: onClick ? 'pointer' : 'default'
            }}
        >
            {/* Header Gradient - Neutralized */}
            <div style={{
                height: '100px', 
                backgroundColor: 'var(--surface-hover-color)',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
            }}>
                {overlayBadge && (
                    <span style={glassBadgeStyle}>
                        {overlayBadge}
                    </span>
                )}
            </div>

            {/* Body Content */}
            <div style={{padding: '0 1.5rem 1.5rem 1.5rem', marginTop: '-50px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                <img 
                    src={avatarSrc || `https://api.dicebear.com/8.x/initials/svg?seed=${avatarSeed || '?'}&radius=50&backgroundColor=e5e7eb`} 
                    alt="Avatar" 
                    onClick={(e) => { if(onImageClick) { e.stopPropagation(); onImageClick(); } }}
                    style={{
                        width: '90px', height: '90px', borderRadius: '50%', 
                        border: '4px solid var(--surface-color)', backgroundColor: 'var(--surface-color)',
                        objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        position: 'relative', zIndex: 10,
                        cursor: onImageClick ? 'pointer' : 'default'
                    }}
                />
                
                <h3 style={{margin: '0.75rem 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-color)', lineHeight: 1.2}}>
                    {title}
                </h3>
                
                {subtitle && (
                    <span style={{
                        fontSize: '0.8rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-hover-color)',
                        padding: '2px 10px', borderRadius: '12px', fontWeight: 600, marginBottom: '0.75rem', display: 'inline-block',
                        border: '1px solid var(--border-color)'
                    }}>
                        {subtitle}
                    </span>
                )}
                
                {description && (
                    <p style={{margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-light)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4}}>
                        {description}
                    </p>
                )}

                {children && (
                    <div style={{width: '100%', marginTop: 'auto'}}>
                        {children}
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            {actions && (
                <div style={{padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    {actions}
                </div>
            )}
        </div>
    );
};

export default CatalogCard;
