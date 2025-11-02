import React, { FC, useState, FormEvent } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DailyCheckinForm: FC<{ personId: string; onCheckinSaved: () => void }> = ({ personId, onCheckinSaved }) => {
    const today = getLocalDateString(new Date());
    const [formData, setFormData] = useState({
        checkin_date: today,
        mood_rating: 3,
        energy_level_rating: 3,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const payload = {
                person_id: personId,
                checkin_date: formData.checkin_date,
                mood_rating: formData.mood_rating,
                energy_level_rating: formData.energy_level_rating,
                notes: formData.notes || null,
            };

            const { data: insertedData, error } = await supabase
                .from('daily_checkins')
                .insert(payload)
                .select()
                .single();
            
            if (error) throw error;
            
            // --- GAMIFICATION ---
            // After successful insert, call the RPC to award points
            const { error: rpcError } = await supabase.rpc('award_daily_checkin_points', {
                p_person_id: personId,
                p_checkin_id: insertedData.id,
            });

            if (rpcError) {
                // Don't block the UI for a gamification error, just log it.
                console.warn("Could not award points for daily checkin:", rpcError);
            }
            // --- END GAMIFICATION ---
            
            setSuccess('¡Registro guardado con éxito! Has ganado 5 puntos.');
            setFormData(prev => ({ ...prev, notes: '' }));
            setTimeout(() => setSuccess(null), 3000);
            onCheckinSaved();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
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
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            color: star <= value ? 'var(--accent-color)' : 'var(--border-color)',
                            transition: 'color 0.2s',
                        }}
                        aria-label={`Calificar con ${star} estrellas`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="currentColor" stroke="none">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );


    return (
        <form onSubmit={handleSubmit}>
            <p>¿Cómo te sientes hoy, {new Date(formData.checkin_date.replace(/-/g, '/')).toLocaleDateString('es-MX', {weekday: 'long'})}?</p>
            {error && <p style={styles.error}>{error}</p>}
            {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
            
            <RatingInput label="Tu estado de ánimo" value={formData.mood_rating} onChange={v => setFormData(p => ({...p, mood_rating: v}))} />
            <RatingInput label="Tu nivel de energía" value={formData.energy_level_rating} onChange={v => setFormData(p => ({...p, energy_level_rating: v}))} />

            <label htmlFor="notes">Notas Adicionales</label>
            <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="¿Algo que quieras compartir sobre tu día? (Ej: tuve antojo de..., me sentí con más fuerza en el gym, etc.)"
            />
            
            <button type="submit" disabled={loading} style={{width: '100%', marginTop: '1rem'}}>
                {loading ? 'Guardando...' : 'Guardar Mi Registro'}
            </button>
        </form>
    );
};

export default DailyCheckinForm;