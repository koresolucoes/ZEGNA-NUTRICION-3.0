import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { QueueDisplay } from '../../types';

interface DisplayFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    displayToEdit: QueueDisplay | null;
}

const modalRoot = document.getElementById('modal-root');

// Helper to generate a unique code
const generateDisplayCode = (clinicName: string) => {
    const prefix = clinicName.substring(0, 4).toUpperCase().replace(/\s/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${randomPart}`;
};

const DisplayFormModal: FC<DisplayFormModalProps> = ({ isOpen, onClose, onSave, displayToEdit }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({ name: '', calling_label: 'Consultorio' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (displayToEdit) {
            setFormData({
                name: displayToEdit.name,
                calling_label: displayToEdit.calling_label || 'Consultorio'
            });
        } else {
            setFormData({ name: '', calling_label: 'Consultorio' });
        }
    }, [displayToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !formData.name.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const payload = {
                name: formData.name,
                calling_label: formData.calling_label,
            };

            if (displayToEdit) {
                // Update existing display
                const { error } = await supabase
                    .from('queue_displays')
                    .update(payload)
                    .eq('id', displayToEdit.id);
                if (error) throw error;
            } else {
                // Create new display
                const newCode = generateDisplayCode(clinic.name || 'CLINIC');
                const { error } = await supabase
                    .from('queue_displays')
                    .insert({
                        ...payload,
                        clinic_id: clinic.id,
                        display_code: newCode,
                    });
                if (error) throw error;
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{displayToEdit ? 'Editar Pantalla' : 'Nueva Pantalla'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="display-name">Nombre de la Pantalla*</label>
                    <input
                        id="display-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: Pantalla Sala Principal"
                        required
                    />
                    <label htmlFor="calling-label">Texto de Llamada (ej: Consultorio, Box)*</label>
                    <input
                        id="calling-label"
                        name="calling_label"
                        type="text"
                        value={formData.calling_label}
                        onChange={handleChange}
                        placeholder="Consultorio"
                        required
                    />

                    {displayToEdit && (
                         <div>
                            <label>Código de Vinculación</label>
                            <input type="text" value={displayToEdit.display_code} readOnly style={{ backgroundColor: 'var(--background-color)', cursor: 'not-allowed', letterSpacing: '2px', fontFamily: 'monospace' }} />
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default DisplayFormModal;