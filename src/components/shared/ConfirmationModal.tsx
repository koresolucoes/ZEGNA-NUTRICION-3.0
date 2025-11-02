

import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void | Promise<void>;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: 'button-danger' | 'button-primary';
    // New props for handling deletion internally
    itemToDelete?: { id: string } | null;
    tableName?: string;
    onSuccess?: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ConfirmationModal: FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    confirmButtonClass = 'button-danger',
    itemToDelete,
    tableName,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !modalRoot) return null;
    
    const handleConfirmClick = async () => {
        setLoading(true);
        setError(null);
        try {
            if (onConfirm) {
                await onConfirm();
            } else if (tableName && itemToDelete) {
                const { error: dbError } = await supabase.from(tableName).delete().eq('id', itemToDelete.id);
                if (dbError) throw dbError;
                
                if (onSuccess) onSuccess(); // Callback on success
                // No cerramos el modal aquí para que onSuccess pueda hacerlo
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{title}</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}><span className="sr-only">Cerrar</span>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={{...styles.error, marginBottom: '1rem'}}>Error: {error}</p>}
                    {message}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary" disabled={loading}>{cancelText}</button>
                    <button onClick={handleConfirmClick} className={confirmButtonClass} disabled={loading}>
                        {loading ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ConfirmationModal;