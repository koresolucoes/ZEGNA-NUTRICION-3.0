import React, { FC, ReactNode } from 'react';
import { styles } from '../../../../constants';
import { ICONS } from '../../../../pages/AuthPage';

const CalculatorCard: FC<{ 
    title: ReactNode; 
    children: ReactNode; 
    onSave?: () => void; 
    saveDisabled?: boolean; 
    saveStatus?: 'idle' | 'saving' | 'success' | 'error'; 
    extraActions?: ReactNode; 
}> = ({ title, children, onSave, saveDisabled, saveStatus, extraActions }) => (
    <div style={{
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out'
    }} className="fade-in">
        <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {title}
            </h3>
        </div>
        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>{children}</div>
            
            {(onSave || extraActions) && (
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                }}>
                    {extraActions}
                    {onSave && (
                        <button 
                            onClick={onSave} 
                            disabled={saveDisabled || saveStatus === 'saving' || saveStatus === 'success'} 
                            className="button-primary"
                            style={{
                                minWidth: '140px',
                                opacity: saveDisabled ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'success' ? <>{ICONS.check} Guardado</> : 'Guardar Resultado'}
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
);

export default CalculatorCard;