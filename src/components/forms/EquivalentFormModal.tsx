
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FoodEquivalent } from '../../types';

interface EquivalentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    equivalentToEdit: FoodEquivalent | null;
}

const modalRoot = document.getElementById('modal-root');

const EquivalentFormModal: FC<EquivalentFormModalProps> = ({ isOpen, onClose, onSave, equivalentToEdit }) => {
    const [formData, setFormData] = useState({
        group_name: '',
        subgroup_name: '',
        protein_g: '',
        lipid_g: '',
        carb_g: '',
        kcal: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (equivalentToEdit) {
            setFormData({
                group_name: equivalentToEdit.group_name,
                subgroup_name: equivalentToEdit.subgroup_name,
                protein_g: String(equivalentToEdit.protein_g),
                lipid_g: String(equivalentToEdit.lipid_g),
                carb_g: String(equivalentToEdit.carb_g),
                kcal: String(equivalentToEdit.kcal),
            });
        } else {
            // Reset form for new entry
            setFormData({ group_name: '', subgroup_name: '', protein_g: '', lipid_g: '', carb_g: '', kcal: '' });
        }
    }, [equivalentToEdit, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['protein_g', 'lipid_g', 'carb_g', 'kcal'].includes(name);
        if (isNumeric) {
            if (/^\d*\.?\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // FIX: Correctly call getUser() from supabase.auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");
            
            const upsertPayload: any = {
                user_id: user.id, // FIX: Always include user_id to satisfy RLS policy
                group_name: formData.group_name,
                subgroup_name: formData.subgroup_name,
                protein_g: parseFloat(formData.protein_g) || 0,
                lipid_g: parseFloat(formData.lipid_g) || 0,
                carb_g: parseFloat(formData.carb_g) || 0,
                kcal: parseFloat(formData.kcal) || 0,
            };

            if (equivalentToEdit) {
                upsertPayload.id = equivalentToEdit.id;
            }

            const { error: dbError } = await supabase.from('food_equivalents').upsert(upsertPayload);
            
            if (dbError) throw dbError;
            
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{equivalentToEdit ? 'Editar Equivalente' : 'Nuevo Equivalente'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <div style={{flex: 1}}><label>Grupo</label><input name="group_name" value={formData.group_name} onChange={handleChange} required /></div>
                        <div style={{flex: 1}}><label>Subgrupo</label><input name="subgroup_name" value={formData.subgroup_name} onChange={handleChange} required /></div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                        <div><label>Proteína (g)</label><input type="number" step="0.1" name="protein_g" value={formData.protein_g} onChange={handleChange} /></div>
                        <div><label>Lípidos (g)</label><input type="number" step="0.1" name="lipid_g" value={formData.lipid_g} onChange={handleChange} /></div>
                        <div><label>Carbohidratos (g)</label><input type="number" step="0.1" name="carb_g" value={formData.carb_g} onChange={handleChange} /></div>
                        <div><label>Calorías (kcal)</label><input type="number" step="1" name="kcal" value={formData.kcal} onChange={handleChange} /></div>
                    </div>
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

export default EquivalentFormModal;