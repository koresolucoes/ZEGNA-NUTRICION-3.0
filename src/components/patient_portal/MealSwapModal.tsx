
import React, { FC, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Type } from '@google/genai';

interface MealSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clinicId: string;
    logId: string;
    mealColumn: string; // 'desayuno', 'comida', 'cena', etc.
    originalContent: string;
}

const modalRoot = document.getElementById('modal-root');

const MealSwapModal: FC<MealSwapModalProps> = ({ isOpen, onClose, onSuccess, clinicId, logId, mealColumn, originalContent }) => {
    const [options, setOptions] = useState<{ name: string; description: string; calories: string }[]>([]);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (hasFetched.current) return;
            hasFetched.current = true;
            
            setLoading(true);
            setError(null);

            try {
                const prompt = `Actúa como un nutriólogo experto. El paciente quiere cambiar su comida actual: "${originalContent}".
                
                Genera 3 opciones alternativas que sean:
                1. Nutricionalmente equivalentes (mismas calorías y macros aproximados).
                2. Variadas en ingredientes.
                3. Prácticas de preparar.
                
                Devuelve SOLO un JSON con la estructura especificada.`;

                const schema = {
                    type: Type.OBJECT,
                    properties: {
                        alternatives: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "Nombre corto del platillo" },
                                    description: { type: Type.STRING, description: "Descripción de ingredientes y cantidades (breve)" },
                                    calories: { type: Type.STRING, description: "Calorías aproximadas (ej. '450 kcal')" }
                                },
                                required: ["name", "description", "calories"]
                            }
                        }
                    },
                    required: ["alternatives"]
                };

                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clinic_id: clinicId,
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: schema,
                        }
                    })
                });

                if (!response.ok) throw new Error("Error al consultar al agente.");
                
                const data = await response.json();
                const json = JSON.parse(data.text);
                
                if (json.alternatives && Array.isArray(json.alternatives)) {
                    setOptions(json.alternatives);
                } else {
                    throw new Error("Formato de respuesta inválido.");
                }

            } catch (err: any) {
                setError(err.message || "No se pudieron generar opciones.");
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchSuggestions();
        }
    }, [isOpen, clinicId, originalContent]);

    const handleSave = async () => {
        if (selectedOptionIndex === null) return;
        setSaving(true);
        try {
            const selected = options[selectedOptionIndex];
            const newContent = `${selected.name}: ${selected.description}`;
            
            const { error: updateError } = await supabase
                .from('diet_logs')
                .update({ [mealColumn]: newContent })
                .eq('id', logId);

            if (updateError) throw updateError;
            
            onSuccess();
            onClose();
        } catch (err: any) {
            setError("Error al guardar el cambio.");
            setSaving(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Intercambiar Opción</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={{...styles.modalBody, padding: '1.5rem'}}>
                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)'}}>
                        <span style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>Opción Actual</span>
                        <p style={{margin: '0.5rem 0 0 0', fontWeight: 500, color: 'var(--text-color)'}}>{originalContent}</p>
                    </div>

                    {loading ? (
                        <div style={{textAlign: 'center', padding: '3rem'}}>
                            <div className="spinner" style={{width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto'}}></div>
                            <p style={{color: 'var(--text-light)'}}>La IA está buscando alternativas saludables...</p>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : error ? (
                        <div style={{textAlign: 'center', padding: '2rem', color: 'var(--error-color)'}}>
                            <p>{error}</p>
                            <button onClick={onClose} className="button-secondary" style={{marginTop: '1rem'}}>Cerrar</button>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {options.map((opt, index) => (
                                <div 
                                    key={index}
                                    onClick={() => setSelectedOptionIndex(index)}
                                    style={{
                                        border: selectedOptionIndex === index ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        cursor: 'pointer',
                                        backgroundColor: selectedOptionIndex === index ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--surface-color)',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    {selectedOptionIndex === index && (
                                        <div style={{position: 'absolute', top: '10px', right: '10px', color: 'var(--primary-color)', fontSize: '1.2rem'}}>✓</div>
                                    )}
                                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--text-color)'}}>{opt.name}</h4>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>{opt.description}</p>
                                    <span style={{display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B', backgroundColor: '#FFF7ED', padding: '2px 8px', borderRadius: '12px'}}>
                                        🔥 {opt.calories}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary" disabled={saving}>Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={selectedOptionIndex === null || saving || loading}
                        className="button-primary"
                    >
                        {saving ? 'Guardando...' : 'Confirmar Cambio'}
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default MealSwapModal;
