
import React, { FC, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FoodEquivalent } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface AiRecipeFromEquivalentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    equivalentsData: FoodEquivalent[];
    planPortions: Record<string, string>;
    zIndex?: number; // New prop
}

const modalRoot = document.getElementById('modal-root');

const RECIPE_TEMPLATE_AI = `**Nombre:** 
**Descripción:** 
**Ingredientes (1 porción):**
* 
* 
**Instrucciones:**
1. 
2. 
---
**Análisis de Equivalentes (SMAE):**
* Cereales y Tubérculos: 0
* Leguminosas: 0
* Verduras: 0
* Frutas: 0
* Alimentos de Origen Animal: 0
* Leche: 0
* Aceites y Grasas: 0
* Azúcares: 0`;

const AiRecipeFromEquivalentsModal: FC<AiRecipeFromEquivalentsModalProps> = ({ isOpen, onClose, equivalentsData, planPortions, zIndex = 1200 }) => {
    const { clinic } = useClinic();
    const [customInstructions, setCustomInstructions] = useState('');
    const [generatedRecipe, setGeneratedRecipe] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [thinkingMessage, setThinkingMessage] = useState('');
    const intervalRef = useRef<number | null>(null);

    const thinkingMessages = [
        "Consultando al chef...",
        "Calculando macronutrientes...",
        "Buscando combinaciones de sabores...",
        "Escribiendo los pasos de la receta...",
        "Asegurando que sea delicioso y nutritivo...",
    ];

    const activeEquivalents = useMemo(() => {
        return Object.entries(planPortions)
            .filter(([_, portions]) => parseFloat(String(portions)) > 0)
            .map(([id, portions]) => {
                const eq = equivalentsData.find(e => e.id === id);
                return { name: eq?.subgroup_name || 'Desconocido', portions };
            });
    }, [planPortions, equivalentsData]);

    const handleGenerate = async () => {
        setError(null);
        setLoading(true);
        setGeneratedRecipe('');
        
        let messageIndex = 0;
        setThinkingMessage(thinkingMessages[messageIndex]);
        intervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % thinkingMessages.length;
            setThinkingMessage(thinkingMessages[messageIndex]);
        }, 2000);

        try {
            const equivalentsList = activeEquivalents.map(eq => `- ${eq.name}: ${eq.portions} porción(es)`).join('\n');

            let prompt = `Actúa como un chef y nutriólogo experto. Tu tarea es crear una receta deliciosa y práctica basada en una lista de porciones de alimentos equivalentes del Sistema Mexicano de Alimentos Equivalentes (SMAE).

**Equivalentes a utilizar:**
${equivalentsList}

**Instrucciones Adicionales:**
${customInstructions || "Ninguna."}

**Formato de Salida OBLIGATORIO:**
Debes devolver la receta en el siguiente formato de texto (markdown), sin agregar NADA más antes o después. Rellena todos los campos. En el análisis de equivalentes, lista TODOS los grupos principales y pon '0' si no se usó.

${RECIPE_TEMPLATE_AI}`;

            const apiResponse = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic?.id,
                    contents: prompt,
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `Error del servidor: ${apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            // FIX: Explicitly cast `data.text` to a string to satisfy the state setter's type requirement, preventing a potential type error.
            // The value from response.json() can be inferred as 'unknown', which cannot be assigned to a state of type 'string'.
            setGeneratedRecipe(data.text as string);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    };
    
    const handleSave = async () => {
        if (!generatedRecipe) return;
        setLoading(true);
        setError(null);
        try {
            const titleMatch = generatedRecipe.match(/\*\*Nombre:\*\*\s*(.*)/);
            const title = titleMatch ? titleMatch[1].trim() : `Receta Generada ${new Date().toLocaleDateString()}`;

            const { error: dbError } = await supabase.from('knowledge_base_resources').insert({
                title: title,
                type: 'Receta',
                content: generatedRecipe,
                clinic_id: clinic!.id,
            });
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
        <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Recetas desde Equivalentes</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    {!generatedRecipe && !loading && (
                        <>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Se generará una receta con la siguiente distribución de equivalentes de tu plan actual:</p>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface-hover-color)', padding: '1rem', borderRadius: '8px'}}>
                                {activeEquivalents.map((eq, i) => <li key={i}><strong>{eq.portions}</strong> porción(es) de <strong>{eq.name}</strong></li>)}
                            </ul>
                            <label htmlFor="custom_instructions" style={{marginTop: '1.5rem'}}>Instrucciones Adicionales (Opcional)</label>
                            <textarea id="custom_instructions" value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} rows={2} placeholder="Ej: Receta para desayuno, vegetariana, sin gluten..."/>
                        </>
                    )}

                    {loading && (
                        <div style={{textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                             <div className="spinner" style={{marginBottom: '20px', width: '40px', height: '40px', border: '4px solid var(--surface-hover-color)', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                             <p style={{ minHeight: '2.5em', color: 'var(--text-light)', fontWeight: 500 }}>
                                 {thinkingMessage}
                             </p>
                             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}
                    
                    {generatedRecipe && !loading && (
                        <div>
                             <h3 style={{color: 'var(--primary-dark)'}}>Receta Generada</h3>
                             <textarea 
                                value={generatedRecipe}
                                onChange={e => setGeneratedRecipe(e.target.value)}
                                rows={15}
                                style={{fontFamily: 'monospace', fontSize: '0.9rem'}}
                             />
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                    {generatedRecipe ? (
                         <button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar en Biblioteca'}</button>
                    ) : (
                         <button onClick={handleGenerate} disabled={loading}>{loading ? 'Generando...' : 'Generar Receta'}</button>
                    )}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default AiRecipeFromEquivalentsModal;
