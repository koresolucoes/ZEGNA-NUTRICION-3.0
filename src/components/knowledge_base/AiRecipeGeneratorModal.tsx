

import React, { FC, useState, useMemo, FormEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FoodEquivalent } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface AiRecipeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    equivalents: FoodEquivalent[];
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

const AiRecipeGeneratorModal: FC<AiRecipeGeneratorModalProps> = ({ isOpen, onClose, equivalents }) => {
    const { clinic } = useClinic();
    const [selectedEquivalents, setSelectedEquivalents] = useState<{ equivalentId: string; portions: string }[]>([{ equivalentId: '', portions: '1' }]);
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

    const groupedEquivalents = useMemo(() => {
        return equivalents.reduce((acc, eq) => {
            const group = eq.group_name;
            if (!acc[group]) acc[group] = [];
            acc[group].push(eq);
            return acc;
        }, {} as Record<string, FoodEquivalent[]>);
    }, [equivalents]);

    const handleEquivalentChange = (index: number, field: 'equivalentId' | 'portions', value: string) => {
        const updated = [...selectedEquivalents];
        updated[index] = { ...updated[index], [field]: value };
        setSelectedEquivalents(updated);
    };
    const addEquivalent = () => setSelectedEquivalents([...selectedEquivalents, { equivalentId: '', portions: '1' }]);
    const removeEquivalent = (index: number) => setSelectedEquivalents(selectedEquivalents.filter((_, i) => i !== index));

    const handleGenerate = async () => {
        setError(null);
        if (selectedEquivalents.some(e => !e.equivalentId || !e.portions)) {
            setError("Por favor, selecciona un equivalente y especifica las porciones para cada fila.");
            return;
        }

        setLoading(true);
        setGeneratedRecipe('');
        
        let messageIndex = 0;
        setThinkingMessage(thinkingMessages[messageIndex]);
        intervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % thinkingMessages.length;
            setThinkingMessage(thinkingMessages[messageIndex]);
        }, 2000);

        try {
            const equivalentsList = selectedEquivalents.map(sel => {
                const eq = equivalents.find(e => e.id === sel.equivalentId);
                return `- ${eq?.subgroup_name || 'Desconocido'}: ${sel.portions} porción(es)`;
            }).join('\n');

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
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Generador de Recetas con IA</h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    {!generatedRecipe && !loading && (
                        <>
                            <p style={{marginTop: 0, color: 'var(--text-light)'}}>Construye una receta especificando los grupos de alimentos equivalentes que debe contener.</p>
                            <h3 style={{fontSize: '1.1rem', marginBottom: '1rem'}}>Equivalentes a Incluir</h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                                {selectedEquivalents.map((item, index) => (
                                    <div key={index} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                        <select 
                                            value={item.equivalentId} 
                                            onChange={e => handleEquivalentChange(index, 'equivalentId', e.target.value)} 
                                            style={{flex: 3, margin: 0}}
                                        >
                                            <option value="" disabled>Selecciona un equivalente...</option>
                                            {Object.keys(groupedEquivalents).map(groupName => {
                                                const groupEquivalents = groupedEquivalents[groupName];
                                                return (
                                                    <optgroup label={groupName} key={groupName}>
                                                        {groupEquivalents.map(eq => (
                                                            <option value={eq.id} key={eq.id}>{eq.subgroup_name}</option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                        <input 
                                            type="number" 
                                            min="0.25" 
                                            step="0.25" 
                                            value={item.portions} 
                                            onChange={e => handleEquivalentChange(index, 'portions', e.target.value)} 
                                            style={{flex: 1, margin: 0}} 
                                            placeholder="Porciones"
                                        />
                                        <button type="button" onClick={() => removeEquivalent(index)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addEquivalent} className="button-secondary" style={{marginTop: '0.5rem'}}>+ Agregar Equivalente</button>

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
                         <button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Receta'}</button>
                    ) : (
                         <button onClick={handleGenerate} disabled={loading}>{loading ? 'Generando...' : 'Generar Receta'}</button>
                    )}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default AiRecipeGeneratorModal;