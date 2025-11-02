import React, { FC } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { DietLog } from '../../types';

interface DietLogDetailModalProps {
    log: DietLog;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const DietLogDetailModal: FC<DietLogDetailModalProps> = ({ log, onClose }) => {
    if (!modalRoot) return null;

    const modalContent = (
         <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        Plan Alimenticio del Día
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <h3 style={{...styles.detailCardTitle, color: 'var(--primary-dark)'}}>
                        {new Date(log.log_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h3>

                    <div style={{marginTop: '1.5rem'}}>
                        <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Desayuno</h4><p style={{margin: 0}}>{log.desayuno || '-'}</p></div>
                        <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Colación 1</h4><p style={{margin: 0}}>{log.colacion_1 || '-'}</p></div>
                        <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Comida</h4><p style={{margin: 0}}>{log.comida || '-'}</p></div>
                        <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Colación 2</h4><p style={{margin: 0}}>{log.colacion_2 || '-'}</p></div>
                        <div style={styles.detailGroup}><h4 style={styles.detailGroupTitle}>Cena</h4><p style={{margin: 0}}>{log.cena || '-'}</p></div>
                    </div>
                </div>
                 <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, modalRoot);
}

export default DietLogDetailModal;