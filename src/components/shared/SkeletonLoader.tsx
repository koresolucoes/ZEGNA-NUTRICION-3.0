
import React, { FC } from 'react';

interface SkeletonLoaderProps {
    type?: 'card' | 'list' | 'table' | 'detail' | 'widget';
    count?: number;
}

const SkeletonLoader: FC<SkeletonLoaderProps> = ({ type = 'list', count = 1 }) => {
    const baseStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out',
    };

    const containerStyle: React.CSSProperties = {
        width: '100%',
    };

    const renderCard = (key: number) => (
        <div key={key} style={{ 
            backgroundColor: 'var(--surface-color)', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ ...baseStyle, width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                    <div style={{ ...baseStyle, height: '20px', width: '60%', marginBottom: '0.5rem' }}></div>
                    <div style={{ ...baseStyle, height: '14px', width: '40%' }}></div>
                </div>
            </div>
            <div style={{ ...baseStyle, height: '14px', width: '100%' }}></div>
            <div style={{ ...baseStyle, height: '14px', width: '80%' }}></div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ ...baseStyle, height: '32px', flex: 1, borderRadius: '8px' }}></div>
                <div style={{ ...baseStyle, height: '32px', flex: 1, borderRadius: '8px' }}></div>
            </div>
        </div>
    );

    const renderListItem = (key: number) => (
        <div key={key} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '1rem', 
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)'
        }}>
            <div style={{ ...baseStyle, width: '40px', height: '40px', borderRadius: '50%', marginRight: '1rem', flexShrink: 0 }}></div>
            <div style={{ flex: 1 }}>
                <div style={{ ...baseStyle, height: '16px', width: '50%', marginBottom: '0.5rem' }}></div>
                <div style={{ ...baseStyle, height: '12px', width: '30%' }}></div>
            </div>
            <div style={{ ...baseStyle, width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0 }}></div>
        </div>
    );
    
    const renderTable = () => (
        <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)' }}>
                <div style={{ ...baseStyle, height: '16px', width: '32px', marginRight: '1rem', opacity: 0.5, borderRadius: '50%', flexShrink: 0 }}></div>
                <div style={{ ...baseStyle, height: '16px', flex: 2, marginRight: '1rem', opacity: 0.5 }}></div>
                <div className="skeleton-hidden-mobile" style={{ ...baseStyle, height: '16px', flex: 1, marginRight: '1rem', opacity: 0.5 }}></div>
                <div className="skeleton-hidden-mobile" style={{ ...baseStyle, height: '16px', flex: 1, marginRight: '1rem', opacity: 0.5 }}></div>
                <div className="skeleton-hidden-mobile" style={{ ...baseStyle, height: '16px', width: '60px', opacity: 0.5 }}></div>
            </div>
            {[...Array(count)].map((_, i) => (
                <div key={i} style={{ display: 'flex', padding: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <div style={{ ...baseStyle, height: '32px', width: '32px', borderRadius: '50%', marginRight: '1rem', flexShrink: 0 }}></div>
                    <div style={{ ...baseStyle, height: '16px', flex: 2, marginRight: '1rem' }}></div>
                    <div className="skeleton-hidden-mobile" style={{ ...baseStyle, height: '16px', flex: 1, marginRight: '1rem' }}></div>
                    <div className="skeleton-hidden-mobile" style={{ ...baseStyle, height: '16px', flex: 1, marginRight: '1rem' }}></div>
                    <div style={{ ...baseStyle, height: '24px', width: '60px', borderRadius: '6px', flexShrink: 0, marginLeft: 'auto' }}></div>
                </div>
            ))}
        </div>
    );

    const renderDetail = () => (
        <div className="skeleton-grid">
             {[...Array(count > 1 ? count : 4)].map((_, i) => (
                <div key={i} style={{ 
                    backgroundColor: 'var(--surface-color)', 
                    padding: '1.5rem', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color)' 
                }}>
                    <div style={{ ...baseStyle, height: '20px', width: '50%', marginBottom: '1rem' }}></div>
                    <div style={{ ...baseStyle, height: '14px', width: '100%', marginBottom: '0.5rem' }}></div>
                    <div style={{ ...baseStyle, height: '14px', width: '90%', marginBottom: '0.5rem' }}></div>
                    <div style={{ ...baseStyle, height: '14px', width: '70%' }}></div>
                </div>
             ))}
        </div>
    );

    const renderWidget = (key: number) => (
        <div key={key} style={{ 
            backgroundColor: 'var(--surface-color)', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)',
            height: '100%'
        }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                 <div style={{ ...baseStyle, height: '20px', width: '40%' }}></div>
                 <div style={{ ...baseStyle, height: '20px', width: '20px', borderRadius: '50%' }}></div>
             </div>
             <div style={{ ...baseStyle, height: '60px', width: '100%', borderRadius: '8px' }}></div>
        </div>
    );

    return (
        <>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 0.2; }
                    100% { opacity: 0.4; }
                }
                
                .skeleton-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                @media (min-width: 640px) {
                    .skeleton-grid {
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .skeleton-hidden-mobile {
                        display: none !important;
                    }
                }
            `}</style>
            <div style={containerStyle}>
                {type === 'card' && <div className="skeleton-grid">{[...Array(count)].map((_, i) => renderCard(i))}</div>}
                {type === 'list' && [...Array(count)].map((_, i) => renderListItem(i))}
                {type === 'table' && renderTable()}
                {type === 'detail' && renderDetail()}
                {type === 'widget' && <div className="skeleton-grid">{[...Array(count)].map((_, i) => renderWidget(i))}</div>}
            </div>
        </>
    );
};

export default SkeletonLoader;
