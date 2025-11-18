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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px', borderRadius: '16px', padding: 0}} className="fade-in">
                <div style={{...styles.modalHeader, borderBottom: 'none', paddingBottom: 0}}>
                    <h2 style={{...styles.modalTitle, fontSize: '1.5rem'}}>{displayToEdit ? 'Editar Pantalla' : 'Nueva Pantalla'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, paddingTop: '1.5rem'}}>
                    {error && <div style={{...styles.error, marginBottom: '1.5rem'}}>{error}</div>}
                    
                    <div style={{marginBottom: '1.5rem'}}>
                        <label htmlFor="display-name" style={styles.label}>Nombre de la Pantalla *</label>
                        <input
                            id="display-name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: TV Recepción Principal"
                            required
                            style={{...styles.input, fontSize: '1.1rem', padding: '1rem'}}
                        />
                    </div>
                    
                    <div style={{marginBottom: '1.5rem'}}>
                        <label htmlFor="calling-label" style={styles.label}>Texto de Ubicación (Ej: Consultorio, Box, Puerta) *</label>
                        <input
                            id="calling-label"
                            name="calling_label"
                            type="text"
                            value={formData.calling_label}
                            onChange={handleChange}
                            placeholder="Consultorio"
                            required
                            style={styles.input}
                        />
                        <small style={{color: 'var(--text-light)', display: 'block', marginTop: '0.5rem'}}>
                            Este texto aparecerá antes del número de sala. Ej: "Consultorio 1".
                        </small>
                    </div>

                    {displayToEdit && (
                         <div style={{padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                            <label style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>CÓDIGO DE VINCULACIÓN</label>
                            <p style={{margin: 0, fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--primary-color)'}}>
                                {displayToEdit.display_code}
                            </p>
                        </div>
                    )}
                </div>
                <div style={{...styles.modalFooter, backgroundColor: 'transparent', borderTop: 'none', paddingTop: 0, paddingBottom: '2rem'}}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading} style={{minWidth: '120px'}}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default DisplayFormModal;