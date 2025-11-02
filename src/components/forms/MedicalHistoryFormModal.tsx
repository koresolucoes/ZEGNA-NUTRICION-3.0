import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { MedicalHistory } from '../../types';

interface MedicalHistoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    historyToEdit: MedicalHistory | null;
}

const modalRoot = document.getElementById('modal-root');

const MedicalHistoryFormModal: FC<MedicalHistoryFormModalProps> = ({ isOpen, onClose, personId, historyToEdit }) => {
    const [formData, setFormData] = useState({
        condition: '', diagnosis_date: '', notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (historyToEdit) {
            setFormData({
                condition: historyToEdit.condition,
                diagnosis_date: historyToEdit.diagnosis_date || '',
                notes: historyToEdit.notes || '',
            });
        } else {
            setFormData({ condition: '', diagnosis_date: '', notes: '' });
        }
    }, [historyToEdit]);

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
                diagnosis_date: formData.diagnosis_date || null,
                created_by_user_id: session.user.id,
            };

            if (historyToEdit) {
                const { error: dbError } = await supabase.from('medical_history').update(payload).eq('id', historyToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('medical_history').insert(payload);
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
                    <h2 style={styles.modalTitle}>{historyToEdit ? 'Editar Historial' : 'Agregar a Historial'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="condition">Condición / Cirugía / Evento *</label>
                    <input id="condition" name="condition" type="text" value={formData.condition} onChange={handleChange} required />
                    
                    <label htmlFor="diagnosis_date">Fecha (Opcional)</label>
                    <input id="diagnosis_date" name="diagnosis_date" type="date" value={formData.diagnosis_date} onChange={handleChange} />

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

export default MedicalHistoryFormModal;
