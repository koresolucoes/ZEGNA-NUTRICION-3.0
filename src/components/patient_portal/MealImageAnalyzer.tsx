
import React, { FC, useState, useRef } from 'react';
import { DietLog } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';

// Helper function to resize and compress image before sending
const resizeAndCompressImage = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Return only the Base64 data (remove "data:image/jpeg;base64," prefix)
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

interface MealImageAnalyzerProps {
    todaysDietLog: DietLog | null;
    clinicId: string;
    personId: string; // Added personId for DB insert
    onEntrySaved?: () => void; // Callback to refresh feed
}

const MealImageAnalyzer: FC<MealImageAnalyzerProps> = ({ todaysDietLog, clinicId, personId, onEntrySaved }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMealType, setSelectedMealType] = useState('comida');
    const [saving, setSaving] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.type.startsWith('image/')) {
                setError('Por favor, selecciona un archivo de imagen válido.');
                return;
            }
            setFile(selectedFile);
            setResult(null);
            setError(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleAnalyze = async () => {
        if (!file || !clinicId) return;
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const base64Data = await resizeAndCompressImage(file);
            
            const imagePart = {
                inlineData: { mimeType: 'image/jpeg', data: base64Data },
            };

            let prompt = '';
            if (todaysDietLog) {
                prompt = `Actúa como un asistente nutricional experto y amigable. Tu respuesta debe ser un solo párrafo corto (máximo 40 palabras), conciso y fácil de entender.
**Tarea:** Analiza la foto de una comida y compárala con el plan del día.
**Plan:** Desayuno: ${todaysDietLog.desayuno || '-'}, Comida: ${todaysDietLog.comida || '-'}, Cena: ${todaysDietLog.cena || '-'}.
Si la imagen NO es comida, responde "ERROR: No es comida". Si es válida, identifica el platillo y di si se ajusta al plan. Usa negritas para la conclusión.`;
            } else {
                prompt = `Actúa como un asistente nutricional experto. Tu respuesta debe ser un solo párrafo corto (máximo 40 palabras).
**Tarea:** Analiza la foto y describe brevemente los grupos de alimentos. Si no es comida, responde "ERROR: No es comida".`;
            }
            
            const textPart = { text: prompt };

            const apiResponse = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinicId,
                    contents: { parts: [imagePart, textPart] }
                })
            });

            if (!apiResponse.ok) throw new Error("Error al analizar la imagen.");

            const data = await apiResponse.json();
            
            if(data.text && data.text.startsWith('ERROR:')) {
                setError(data.text.replace('ERROR: ', ''));
                setResult(null);
            } else {
                setResult(data.text);
            }

        } catch (err: any) {
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveToJournal = async () => {
        if (!file || !result || !personId) return;
        setSaving(true);
        try {
            // 1. Upload Image to Supabase
            const fileExt = file.name.split('.').pop();
            const fileName = `journal/${personId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('files').upload(fileName, file);
            if (uploadError) throw uploadError;

            // 2. Insert into DB
            const { error: dbError } = await supabase.from('patient_journal').insert({
                person_id: personId,
                meal_type: selectedMealType,
                image_url: fileName,
                ai_analysis: result,
                description: null // Could add a textarea for user description later
            });

            if (dbError) throw dbError;

            // Reset
            setFile(null);
            setPreview(null);
            setResult(null);
            if (onEntrySaved) onEntrySaved();

        } catch (err: any) {
            setError(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div>
            {!preview ? (
                <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--background-color)',
                    transition: 'border-color 0.2s',
                }} onClick={() => fileInputRef.current?.click()}>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <span style={{ fontSize: '2.5rem', color: 'var(--text-light)' }}>📷</span>
                    <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600, color: 'var(--primary-color)' }}>Subir Foto</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Analiza tu comida con IA</p>
                </div>
            ) : (
                <div className="fade-in">
                    <img src={preview} alt="Vista previa" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '250px', marginBottom: '1rem', border: '1px solid var(--border-color)' }} />
                    
                    {error && <p style={styles.error}>{error}</p>}

                    {!result && !loading && (
                        <button onClick={handleAnalyze} className="button-primary" style={{ width: '100%', padding: '0.8rem' }}>
                            {ICONS.sparkles} Analizar con IA
                        </button>
                    )}

                    {loading && <div style={{textAlign: 'center', color: 'var(--primary-color)', fontWeight: 600}}>Analizando...</div>}

                    {result && (
                        <div className="fade-in">
                            <div style={{padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.5}}>
                                <strong>Análisis IA:</strong> {result}
                            </div>
                            
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600}}>Tipo de Comida</label>
                                <select 
                                    value={selectedMealType} 
                                    onChange={(e) => setSelectedMealType(e.target.value)}
                                    style={{width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)'}}
                                >
                                    <option value="desayuno">Desayuno</option>
                                    <option value="colacion_1">Colación 1</option>
                                    <option value="comida">Comida</option>
                                    <option value="colacion_2">Colación 2</option>
                                    <option value="cena">Cena</option>
                                    <option value="snack">Snack</option>
                                </select>
                            </div>

                            <div style={{display: 'flex', gap: '0.75rem'}}>
                                <button onClick={() => { setFile(null); setPreview(null); setResult(null); }} className="button-secondary" style={{flex: 1}}>Cancelar</button>
                                <button onClick={handleSaveToJournal} disabled={saving} className="button-primary" style={{flex: 1}}>
                                    {saving ? 'Guardando...' : 'Guardar en Diario'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MealImageAnalyzer;
