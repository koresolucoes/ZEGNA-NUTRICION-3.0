import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { LifestyleHabits } from '../../types';

interface LifestyleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    habitsToEdit: LifestyleHabits | null;
}

const modalRoot = document.getElementById('modal-root');

const LifestyleFormModal: FC<LifestyleFormModalProps> = ({ isOpen, onClose, personId, habitsToEdit }) => {
    const [formData, setFormData] = useState({
        sleep_hours_avg: '', stress_level: '', water_intake_liters_avg: '', smokes: false, alcohol_frequency: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (habitsToEdit) {
            setFormData({
                sleep_hours_avg: habitsToEdit.sleep_hours_avg?.toString() || '',
                stress_level: habitsToEdit.stress_level?.toString() || '',
                water_intake_liters_avg: habitsToEdit.water_intake_liters_avg?.toString() || '',
                smokes: habitsToEdit.smokes || false,
                alcohol_frequency: habitsToEdit.alcohol_frequency || '',
            });
        } else {
            setFormData({ sleep_hours_avg: '', stress_level: '', water_intake_liters_avg: '', smokes: false, alcohol_frequency: '' });
        }
    }, [habitsToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            const payload = { 
                person_id: personId,
                sleep_hours_avg: formData.sleep_hours_avg ? Number(formData.sleep_hours_avg) : null,
                stress_level: formData.stress_level ? Number(formData.stress_level) : null,
                water_intake_liters_avg: formData.water_intake_liters_avg ? Number(formData.water_intake_liters_avg) : null,
                smokes: formData.smokes,
                alcohol_frequency: formData.alcohol_frequency || null,
                updated_by_user_id: session.user.id,
            };
            
            const { error: dbError } = await supabase.from('lifestyle_habits').upsert(payload, { onConflict: 'person_id' });
            if (dbError) throw dbError;

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
                    <h2 style={styles.modalTitle}>{habitsToEdit ? 'Editar Hábitos' : 'Registrar Hábitos'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div>
                            <label htmlFor="sleep_hours_avg">Sueño (horas)</label>
                            <input id="sleep_hours_avg" name="sleep_hours_avg" type="number" step="0.5" value={formData.sleep_hours_avg} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="stress_level">Estrés (1-5)</label>
                            <input id="stress_level" name="stress_level" type="number" min="1" max="5" value={formData.stress_level} onChange={handleChange} />
                        </div>
                        <div>
                             <label htmlFor="water_intake_liters_avg">Agua (litros)</label>
                             <input id="water_intake_liters_avg" name="water_intake_liters_avg" type="number" step="0.5" value={formData.water_intake_liters_avg} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="alcohol_frequency">Frecuencia de Alcohol</label>
                            <select id="alcohol_frequency" name="alcohol_frequency" value={formData.alcohol_frequency} onChange={handleChange}>
                                <option value="">Seleccionar...</option>
                                <option value="Nunca">Nunca</option>
                                <option value="Ocasional">Ocasional</option>
                                <option value="Semanal">Semanal</option>
                                <option value="Diario">Diario</option>
                            </select>
                        </div>
                    </div>
                     <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <label htmlFor="smokes" style={{marginBottom: 0}}>¿Fuma?</label>
                        <label className="switch">
                            <input id="smokes" name="smokes" type="checkbox" checked={formData.smokes} onChange={handleChange} />
                            <span className="slider round"></span>
                        </label>
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

export default LifestyleFormModal;
