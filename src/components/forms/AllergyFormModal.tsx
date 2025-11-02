import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Allergy } from '../../types';

interface AllergyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    allergyToEdit: Allergy | null;
}

const modalRoot = document.getElementById('modal-root');

const AllergyFormModal: FC<AllergyFormModalProps> = ({ isOpen, onClose, personId, allergyToEdit }) => {
    const [formData, setFormData] = useState({
        substance: '', type: 'Alergia', severity: 'Leve', notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (allergyToEdit) {
            setFormData({
                substance: allergyToEdit.substance,
                type: allergyToEdit.type,
                severity: allergyToEdit.severity || 'Leve',
                notes: allergyToEdit.notes || '',
            });
        } else {
            setFormData({ substance: '', type: 'Alergia', severity: 'Leve', notes: '' });
        }
    }, [allergyToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
                created_by_user_id: session.user.id
            };

            if (allergyToEdit) {
                const { error: dbError } = await supabase.from('allergies_intolerances').update(payload).eq('id', allergyToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('allergies_intolerances').insert(payload);
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
                    <h2 style={styles.modalTitle}>{allergyToEdit ? 'Editar Alergia' : 'Agregar Alergia'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="substance">Sustancia *</label>
                    <input id="substance" name="substance" type="text" value={formData.substance} onChange={handleChange} required />
                    
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <div style={{flex: 1}}>
                            <label htmlFor="type">Tipo</label>
                            <select id="type" name="type" value={formData.type} onChange={handleChange}>
                                <option value="Alergia">Alergia</option>
                                <option value="Intolerancia">Intolerancia</option>
                            </select>
                        </div>
                        <div style={{flex: 1}}>
                            <label htmlFor="severity">Severidad</label>
                            <select id="severity" name="severity" value={formData.severity} onChange={handleChange}>
                                <option value="Leve">Leve</option>
                                <option value="Moderada">Moderada</option>
                                <option value="Severa">Severa</option>
                            </select>
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

export default AllergyFormModal;
