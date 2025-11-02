import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Medication } from '../../types';

interface MedicationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    medicationToEdit: Medication | null;
}

const modalRoot = document.getElementById('modal-root');

const MedicationFormModal: FC<MedicationFormModalProps> = ({ isOpen, onClose, personId, medicationToEdit }) => {
    const [formData, setFormData] = useState({
        name: '', dosage: '', frequency: '', notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (medicationToEdit) {
            setFormData({
                name: medicationToEdit.name,
                dosage: medicationToEdit.dosage || '',
                frequency: medicationToEdit.frequency || '',
                notes: medicationToEdit.notes || '',
            });
        } else {
            setFormData({ name: '', dosage: '', frequency: '', notes: '' });
        }
    }, [medicationToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            const payload = { 
                ...formData, 
                person_id: personId,
                created_by_user_id: session.user.id,
            };

            if (medicationToEdit) {
                const { error: dbError } = await supabase.from('medications').update(payload).eq('id', medicationToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('medications').insert(payload);
                if (dbError) throw dbError;
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={styles.modalContent} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{medicationToEdit ? 'Editar Medicamento' : 'Agregar Medicamento'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="name">Nombre del Medicamento / Suplemento *</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
                    
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <div style={{flex: 1}}>
                            <label htmlFor="dosage">Dosis</label>
                            <input id="dosage" name="dosage" type="text" value={formData.dosage} onChange={handleChange} />
                        </div>
                        <div style={{flex: 1}}>
                            <label htmlFor="frequency">Frecuencia</label>
                            <input id="frequency" name="frequency" type="text" value={formData.frequency} onChange={handleChange} />
                        </div>
                    </div>

                    <label htmlFor="notes">Notas</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default MedicationFormModal;
