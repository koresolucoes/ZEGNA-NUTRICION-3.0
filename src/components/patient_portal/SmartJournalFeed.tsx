import React, { FC } from 'react';
import { supabase } from '../../supabase';
import { PatientJournalEntry } from '../../types';
import { ICONS } from '../../pages/AuthPage';

interface SmartJournalFeedProps {
    entries: PatientJournalEntry[];
    loading?: boolean;
}

// Map meal types to user-friendly labels and icons
const MEAL_CONFIG: Record<string, { label: string, icon: string, color: string }> = {
    desayuno: { label: 'Desayuno', icon: '🍳', color: '#F59E0B' },
    colacion_1: { label: 'Colación 1', icon: '🍎', color: '#10B981' },
    comida: { label: 'Comida', icon: '🍽️', color: '#3B82F6' },
    colacion_2: { label: 'Colación 2', icon: '🥜', color: '#8B5CF6' },
    cena: { label: 'Cena', icon: '🌙', color: '#6366F1' },
    snack: { label: 'Snack', icon: '🍪', color: '#EC4899' },
    otro: { label: 'Otro', icon: '🍴', color: '#64748B' }
};

const SmartJournalFeed: FC<SmartJournalFeedProps> = ({ entries, loading }) => {
    if (loading) return <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>Cargando diario...</div>;
    
    if (entries.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-light)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📸</div>
                <p style={{fontSize: '1.1rem'}}>Tu diario visual está vacío.</p>
                <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Usa "Analizar Platillo" para agregar tu primera foto.</p>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ display: 'grid', gap: '1.5rem' }}>
            {entries.map(entry => {
                const config = MEAL_CONFIG[entry.meal_type || 'otro'] || MEAL_CONFIG['otro'];
                const reactions = (entry.reactions as unknown as string[]) || [];

                return (
                    <div key={entry.id} className="card-hover" style={{
                        backgroundColor: 'var(--surface-color)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <div style={{
                                    backgroundColor: `${config.color}20`, 
                                    color: config.color,
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    {config.icon}
                                </div>
                                <div>
                                    <h4 style={{margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)'}}>{config.label}</h4>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>
                                        {new Date(entry.entry_date).toLocaleDateString('es-MX', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Image */}
                        <div style={{position: 'relative', width: '100%', paddingTop: '75%', backgroundColor: 'var(--background-color)'}}>
                            <img 
                                src={supabase.storage.from('files').getPublicUrl(entry.image_url).data.publicUrl} 
                                alt="Comida" 
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover'
                                }}
                            />
                        </div>

                        {/* Content */}
                        <div style={{padding: '1.25rem'}}>
                            {/* AI Analysis */}
                            {entry.ai_analysis && (
                                <div style={{marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-color)'}}>
                                    <span style={{fontWeight: 700, color: 'var(--primary-color)', marginRight: '0.5rem'}}>AI:</span>
                                    {entry.ai_analysis}
                                </div>
                            )}

                            {/* User Description */}
                            {entry.description && (
                                <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-light)'}}>
                                    "{entry.description}"
                                </p>
                            )}

                            {/* Feedback Section */}
                            {(entry.nutritionist_feedback || reactions.length > 0) && (
                                <div style={{
                                    marginTop: '1rem', 
                                    padding: '0.75rem', 
                                    backgroundColor: 'var(--surface-hover-color)', 
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {reactions.length > 0 && (
                                        <div style={{display: 'flex', gap: '0.5rem', marginBottom: entry.nutritionist_feedback ? '0.5rem' : 0}}>
                                            {reactions.map((emoji, i) => (
                                                <span key={i} style={{fontSize: '1.2rem'}}>{emoji}</span>
                                            ))}
                                        </div>
                                    )}
                                    {entry.nutritionist_feedback && (
                                        <div style={{fontSize: '0.85rem', color: 'var(--text-color)'}}>
                                            <strong>Nutriólogo:</strong> {entry.nutritionist_feedback}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SmartJournalFeed;