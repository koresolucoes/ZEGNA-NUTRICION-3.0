
import React, { FC, useState, useRef } from 'react';
import { DietLog } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

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
}

const MealImageAnalyzer: FC<MealImageAnalyzerProps> = ({ todaysDietLog, clinicId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // Basic client-side check
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
        if (!file) {
            setError('Por favor, selecciona una imagen para analizar.');
            return;
        }
        if (!clinicId) {
            setError('Error de configuración: No se encontró el ID de la clínica.');
            return;
        }
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            // Compress image before sending to avoid Payload Too Large errors
            const base64Data = await resizeAndCompressImage(file);
            
            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg', // Always sending JPEG after compression
                    data: base64Data,
                },
            };

            let prompt = '';
            if (todaysDietLog) {
                prompt = `Actúa como un asistente nutricional experto y amigable. Tu respuesta debe ser un solo párrafo corto, conciso y fácil de entender para un paciente.

**Tarea Principal:** Analiza la foto de una comida y compárala con el plan alimenticio del día.

**Contexto del Plan de Hoy:**
- Desayuno: ${todaysDietLog.desayuno || 'No especificado'}
- Comida: ${todaysDietLog.comida || 'No especificado'}
- Cena: ${todaysDietLog.cena || 'No especificado'}

**Instrucciones de Respuesta:**
1.  **Validación de Imagen:** Si la imagen NO es una foto clara de comida, responde ÚNICAMENTE con el texto: "ERROR: La imagen no parece ser una foto clara de un platillo. Por favor, sube una foto mejor enfocada de tu comida."
2.  **Respuesta Válida:** Si la imagen es válida, identifica el platillo. Luego, escribe un párrafo corto (3-5 frases) que incluya:
    - Una comparación amigable entre lo que se ve en la foto y lo que estaba en el plan.
    - Una conclusión clara sobre el nivel de adecuación (si se alinea o no).
    - Si no se alinea, una sugerencia corta y positiva para la próxima vez.
    - Utiliza negritas (**texto**) para resaltar la conclusión principal.`;
            } else {
                prompt = `Actúa como un asistente nutricional experto y amigable. Tu respuesta debe ser un solo párrafo corto, conciso y fácil de entender para un paciente.

**Tarea Principal:** Analiza la foto de una comida y da un breve análisis general.

**Instrucciones de Respuesta:**
1.  **Validación de Imagen:** Si la imagen NO es una foto clara de comida, responde ÚNICAMENTE con el texto: "ERROR: La imagen no parece ser una foto clara de un platillo. Por favor, sube una foto mejor enfocada de tu comida."
2.  **Respuesta Válida:** Si la imagen es válida, identifica el platillo y describe en un párrafo corto (2-4 frases) los grupos de alimentos que contiene (proteínas, vegetales, etc.) y si se ve balanceado. Utiliza negritas para resaltar la conclusión.`;
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

            if (!apiResponse.ok) {
                // Handle non-JSON errors (like 413 Request Entity Too Large from server/proxy)
                const contentType = apiResponse.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await apiResponse.json();
                    throw new Error(errorData.error || `Error del servidor: ${apiResponse.statusText}`);
                } else {
                    const textError = await apiResponse.text();
                    if (apiResponse.status === 413) {
                        throw new Error("La imagen es demasiado grande incluso después de comprimir. Intenta con otra foto.");
                    }
                    throw new Error(`Error del servidor (${apiResponse.status}): ${textError.slice(0, 100)}...`);
                }
            }

            const data = await apiResponse.json();
            
            if(data.text && data.text.startsWith('ERROR:')) {
                setError(data.text.replace('ERROR: ', ''));
                setResult(null);
            } else {
                setResult(data.text);
            }

        } catch (err: any) {
            console.error("Error de análisis:", err);
            setError(`Error al analizar la imagen: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <div style={{
                border: `2px dashed ${preview ? 'var(--primary-color)' : 'var(--border-color)'}`,
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--background-color)',
                transition: 'border-color 0.2s',
            }} onClick={() => fileInputRef.current?.click()}>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                {preview ? (
                    <img src={preview} alt="Vista previa del platillo" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                ) : (
                    <div>
                        <span style={{ fontSize: '2rem', color: 'var(--text-light)' }}>📷</span>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-light)' }}>Toca aquí para seleccionar una foto de tu comida</p>
                    </div>
                )}
            </div>
            <p style={{fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', margin: '0.5rem 0 1rem 0'}}>
                Para un mejor análisis, asegúrate de que la foto sea clara y bien iluminada. Evita imágenes inapropiadas.
            </p>
            <button onClick={handleAnalyze} disabled={!file || loading} style={{ width: '100%' }}>
                {loading ? 'Comprimiendo y Analizando...' : 'Analizar mi platillo'}
            </button>
            
            {error && <p style={{...styles.error, marginTop: '1rem'}}>{error}</p>}

            {result && (
                <div style={{marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem'}}>
                    <h4 style={{margin: '0 0 1rem 0', color: 'var(--primary-color)'}}>Análisis de la IA</h4>
                    {result}
                </div>
            )}
        </div>
    );
};

export default MealImageAnalyzer;
