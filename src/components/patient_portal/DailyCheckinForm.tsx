
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
            
            const { error: rpcError } = await supabase.rpc('award_daily_checkin_points', {
                p_person_id: personId,
                p_checkin_id: insertedData.id,
            });

            if (rpcError) console.warn("Could not award points:", rpcError);
            
            setSuccess('¡Registro guardado!');
            setFormData(prev => ({ ...prev, notes: '' }));
            setTimeout(() => setSuccess(null), 3000);
            onCheckinSaved();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const RatingInput: FC<{ label: string; value: number; onChange: (value: number) => void; icon: 'star' | 'energy' }> = ({ label, value, onChange, icon }) => (
        <div style={{textAlign: 'center', flex: 1}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', letterSpacing: '1px'}}>{label}</label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(rating => {
                    const isActive = rating <= value;
                    // Colors: Teal for Mood, Orange for Energy
                    const activeColor = icon === 'star' ? '#2DD4BF' : '#F59E0B'; 
                    const inactiveColor = 'var(--surface-active)';
                    
                    return (
                        <button
                            type="button"
                            key={rating}
                            onClick={() => onChange(rating)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0',
                                color: isActive ? activeColor : inactiveColor,
                                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s',
                                transform: isActive ? 'scale(1.2)' : 'scale(1)',
                                width: '44px', // Big touch target
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            aria-label={`Rate ${rating}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d={icon === 'star' 
                                    ? "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
                                    : "M13 2L3 14h9l-1 8 10-12h-9l1-8z"} />
                            </svg>
                        </button>
                    )
                })}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
                <p style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>
                    ¿Cómo te sientes hoy?
                </p>
                <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'capitalize'}}>
                    {new Date().toLocaleDateString('es-MX', {weekday: 'long', day: 'numeric', month: 'long'})}
                </p>
            </div>
            
            {error && <p style={styles.error}>{error}</p>}
            {success && <div style={{marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', fontWeight: 700, textAlign: 'center', fontSize: '1rem'}}>{success}</div>}
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--background-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)'}}>
                <RatingInput label="ÁNIMO" value={formData.mood_rating} onChange={v => setFormData(p => ({...p, mood_rating: v}))} icon="star" />
                <div style={{height: '1px', backgroundColor: 'var(--border-color)', width: '100%'}}></div>
                <RatingInput label="ENERGÍA" value={formData.energy_level_rating} onChange={v => setFormData(p => ({...p, energy_level_rating: v}))} icon="energy" />
            </div>

            <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                 <label htmlFor="notes" style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block', letterSpacing: '1px'}}>NOTAS ADICIONALES</label>
                <textarea
                    id="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    style={{
                        ...styles.input, 
                        backgroundColor: 'var(--background-color)', 
                        border: '1px solid var(--border-color)', 
                        fontSize: '1rem', 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        resize: 'none',
                        flex: 1,
                        marginBottom: '1.5rem'
                    }}
                    placeholder="¿Algún síntoma o comentario sobre tu día?"
                />
                
                <button type="submit" disabled={loading} style={{width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 800, fontSize: '1.1rem', backgroundColor: '#38BDF8', color: '#0F172A', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)', transition: 'transform 0.2s'}}>
                    {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </form>
    );
};

export default DailyCheckinForm;
