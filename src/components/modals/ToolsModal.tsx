import React, { FC, ReactNode } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface ToolsModalProps {
    onClose: () => void;
    children: ReactNode;
    isMobile: boolean;
}

const ToolsModal: FC<ToolsModalProps> = ({ onClose, children, isMobile }) => (
    <div style={{ ...styles.modalOverlay, zIndex: 2100, padding: isMobile ? '0.5rem' : '2rem', backdropFilter: 'blur(5px)' }}>
        <div style={{ ...styles.modalContent, width: '95%', maxWidth: '1400px', height: isMobile ? '95vh' : '90vh' }} className="fade-in">
            <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Herramientas y Calculadoras</h2>
                <button onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
            </div>
            <div style={{ ...styles.modalBody, display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    </div>
);

export default ToolsModal;
