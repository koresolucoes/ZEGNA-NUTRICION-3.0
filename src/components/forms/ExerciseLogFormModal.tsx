import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ExerciseLog } from '../../types';

interface Exercise {
    nombre: string;
    series: string;
    repeticiones: string;
    descanso: string;
}

interface ExerciseLogFormModalProps {
    logToEdit: ExerciseLog | null;
    personId: string;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ExerciseLogFormModal: FC<ExerciseLogFormModalProps> = ({ logToEdit, personId, onClose }) => {
    const [formData, setFormData] = useState<{
        log_date: string;
        dia: string;
        enfoque: string;
        ejercicios: Exercise[];
    }>({
        log_date: new Date().toISOString().split('T')[0],
        dia: '',
        enfoque: '',
        // FIX: Ensure initial state is a correctly typed empty array.
        ejercicios: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (logToEdit) {
            setFormData({
                log_date: logToEdit.log_date,
                dia: logToEdit.dia || '',
                enfoque: logToEdit.enfoque || '',
                // FIX: Cast `logToEdit.ejercicios` to `unknown` before `Exercise[]` to resolve type mismatch with Supabase's broad `Json` type.
                ejercicios: (logToEdit.ejercicios as unknown as Exercise[]) || [],
            });
        }
    }, [logToEdit]);

    const handleMainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
        const newEjercicios = [...formData.ejercicios];
        newEjercicios[index][field] = value;
        setFormData(prev => ({...prev, ejercicios: newEjercicios}));
    };

    const addExercise = () => {
        setFormData(prev => ({...prev, ejercicios: [...prev.ejercicios, { nombre: '', series: '', repeticiones: '', descanso: ''}]}));
    };
    
    const removeExercise = (index: number) => {
        const newEjercicios = formData.ejercicios.filter((_, i) => i !== index);
        setFormData(prev => ({...prev, ejercicios: newEjercicios}));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            // FIX: Cast `formData.ejercicios` to `Json` via `unknown` to match the expected type for Supabase's `jsonb` column, resolving insertion/update errors.
            const payload = {
                person_id: personId,
                log_date: formData.log_date,
                dia: formData.dia,
                enfoque: formData.enfoque || null,
                ejercicios: formData.ejercicios as unknown as Json,
                created_by_user_id: session.user.id,
            };

            if (logToEdit) {
                const { error: dbError } = await supabase.from('exercise_logs').update(payload).eq('id', logToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('exercise_logs').insert(payload);
                if (dbError) throw dbError;
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '700px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{logToEdit ? 'Editar Rutina del Día' : 'Agregar Día de Rutina'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <div style={{display: 'flex', gap: '1rem'}}>
                       <div style={{flex: 1}}>
                         <label htmlFor="log_date">Fecha</label>
                         <input id="log_date" name="log_date" type="date" value={formData.log_date} onChange={handleMainChange} required />
                       </div>
                       <div style={{flex: 1}}>
                         <label htmlFor="dia">Día de la semana</label>
                         <input id="dia" name="dia" type="text" value={formData.dia} onChange={handleMainChange} placeholder="Ej. Lunes" required/>
                       </div>
                    </div>
                    <label htmlFor="enfoque">Enfoque del día</label>
                    <input id="enfoque" name="enfoque" type="text" value={formData.enfoque} onChange={handleMainChange} placeholder="Ej. Tren superior, Cardio, Descanso" />
                    
                    <h3 style={{fontSize: '1rem', marginTop: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem'}}>Ejercicios</h3>
                    {formData.ejercicios.map((ex, index) => (
                        <div key={index} style={{display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1rem'}}>
                            <div><label style={{fontSize: '0.8rem'}}>Nombre</label><input type="text" value={ex.nombre} onChange={e => handleExerciseChange(index, 'nombre', e.target.value)} style={{marginBottom: 0}} /></div>
                            <div><label style={{fontSize: '0.8rem'}}>Series</label><input type="text" value={ex.series} onChange={e => handleExerciseChange(index, 'series', e.target.value)} style={{marginBottom: 0}} /></div>
                            <div><label style={{fontSize: '0.8rem'}}>Reps</label><input type="text" value={ex.repeticiones} onChange={e => handleExerciseChange(index, 'repeticiones', e.target.value)} style={{marginBottom: 0}} /></div>
                            <div><label style={{fontSize: '0.8rem'}}>Descanso</label><input type="text" value={ex.descanso} onChange={e => handleExerciseChange(index, 'descanso', e.target.value)} style={{marginBottom: 0}} /></div>
                            <button type="button" onClick={() => removeExercise(index)} className="button-secondary" style={{padding: '10px', color: 'var(--error-color)'}}>{ICONS.delete}</button>
                        </div>
                    ))}
                     <button type="button" onClick={addExercise} className="button-secondary">{ICONS.add} Agregar Ejercicio</button>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>
            </form>
        </div>
    );
    
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

export default ExerciseLogFormModal;