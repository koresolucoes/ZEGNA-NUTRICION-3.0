import React, { FC, ReactNode } from 'react';
import { styles } from '../../../../constants';

// FIX: Changed title prop type from string to ReactNode to allow passing JSX elements with tooltips.
const CalculatorCard: FC<{ title: ReactNode; children: ReactNode; onSave?: () => void; saveDisabled?: boolean; saveStatus?: 'idle' | 'saving' | 'success' | 'error'; extraActions?: ReactNode; }> = ({ title, children, onSave, saveDisabled, saveStatus, extraActions }) => (
    <div style={{...styles.infoCard, display: 'flex', flexDirection: 'column'}}>
        <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>{title}</h3></div>
        <div style={{...styles.infoCardBody, flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div style={{flex: 1}}>{children}</div>
            {(onSave || extraActions) && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                    {extraActions}
                    {onSave && (
                        <button onClick={onSave} disabled={saveDisabled || saveStatus === 'saving' || saveStatus === 'success'} style={{flex: 1}}>
                            {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'success' ? '¡Guardado!' : 'Guardar en Expediente'}
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
);

export default CalculatorCard;