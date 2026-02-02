
import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { DailyCheckin } from '../../types';

const modalRoot = document.getElementById('modal-root');

interface DailyCheckinFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    checkinToEdit: DailyCheckin | null;
}

const RatingInput: FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => (
    <div style={{marginBottom: '1.5rem'}}>
        <label>{label}</label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    type="button"
                    key={star}
                    onClick={() => onChange(star)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                        color: star <= value ? 'var(--accent-color)' : 'var(--border-color)',
                        transition: 'color 0.2s',
                    }}
                    aria-label={`Calificar con ${star} estrellas`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                </button>
            ))}
        </div>
    </div>
);

const DailyCheckinFormModal: FC<DailyCheckinFormModalProps> = ({ isOpen, onClose, onSave, checkinToEdit }) => {
    const [formData, setFormData] = useState({
        checkin_date: '',
        mood_rating: 3,
        energy_level_rating: 3,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (checkinToEdit) {
            setFormData({
                checkin_date: checkinToEdit.checkin_date,
                mood_rating: checkinToEdit.mood_rating || 3,
                energy_level_rating: checkinToEdit.energy_level_rating || 3,
                notes: checkinToEdit.notes || '',
            });
        }
    }, [checkinToEdit]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!checkinToEdit) throw new Error("No check-in provided.");

            const payload = {
                mood_rating: formData.mood_rating,
                energy_level_rating: formData.energy_level_rating,
                notes: formData.notes || null,
            };
            
            if (checkinToEdit.id) {
                const { error: dbError } = await supabase
                    .from('daily_checkins')
                    .update(payload)
                    .eq('id', checkinToEdit.id);

                if (dbError) throw dbError;
            } else {
                 if (!checkinToEdit.person_id) throw new Error("Error interno: ID de paciente no disponible.");
                 
                 const { data: insertedData, error: dbError } = await supabase
                    .from('daily_checkins')
                    .insert({
                        ...payload,
                        person_id: checkinToEdit.person_id,
                        checkin_date: formData.checkin_date
                    })
                    .select()
                    .single();

                if (dbError) throw dbError;

                if (insertedData) {
                     await supabase.rpc('award_daily_checkin_points', {
                        p_person_id: checkinToEdit.person_id,
                        p_checkin_id: insertedData.id,
                    });
                }
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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        {checkinToEdit?.id ? 'Editar Registro del Día' : 'Nuevo Registro'}
                        <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 400, marginTop: '0.25rem' }}>
                            {new Date(formData.checkin_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { dateStyle: 'full' })}
                        </span>
                    </h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <RatingInput label="Tu estado de ánimo" value={formData.mood_rating} onChange={v => setFormData(p => ({...p, mood_rating: v}))} />
                    <RatingInput label="Tu nivel de energía" value={formData.energy_level_rating} onChange={v => setFormData(p => ({...p, energy_level_rating: v}))} />

                    <label htmlFor="notes-modal">Notas Adicionales</label>
                    <textarea
                        id="notes-modal"
                        rows={4}
                        value={formData.notes}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        placeholder="¿Algo que quieras compartir sobre tu día?"
                    />
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

export default DailyCheckinFormModal;
