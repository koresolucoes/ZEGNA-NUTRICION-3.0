import React, { FC, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface ConsultingRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (room: string) => void;
    patientName: string;
}

const modalRoot = document.getElementById('modal-root');

const ConsultingRoomModal: FC<ConsultingRoomModalProps> = ({ isOpen, onClose, onConfirm, patientName }) => {
    const [room, setRoom] = useState('1');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (room.trim()) {
            onConfirm(room.trim());
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '450px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Asignar Ubicación</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <p style={{marginTop: 0}}>
                        Asignar ubicación de llamada para <strong>{patientName}</strong>.
                    </p>
                    <label htmlFor="room-input">Número o Nombre de la Ubicación (ej: '1', 'Recepción')</label>
                    <input
                        id="room-input"
                        type="text"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={loading || !room.trim()}>
                        {loading ? 'Confirmando...' : 'Confirmar'}
                    </button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ConsultingRoomModal;