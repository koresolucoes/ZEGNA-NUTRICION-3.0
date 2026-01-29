
import React, { FC, useState, useRef, useEffect } from 'react';
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
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
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
    personId: string;
    onEntrySaved?: () => void;
    fixedMealType?: string | null; // New prop to force meal type
}

const MealImageAnalyzer: FC<MealImageAnalyzerProps> = ({ todaysDietLog, clinicId, personId, onEntrySaved, fixedMealType }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMealType, setSelectedMealType] = useState('comida');
    const [saving, setSaving] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (fixedMealType) {
            setSelectedMealType(fixedMealType);
        }
    }, [fixedMealType]);

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
                // Auto-analyze on select
                handleAnalyze(selectedFile, reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleAnalyze = async (currentFile: File, currentPreview: string) => {
        if (!clinicId) return;
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const base64Data = await resizeAndCompressImage(currentFile);
            
            const imagePart = {
                inlineData: { mimeType: 'image/jpeg', data: base64Data },
            };

            const prompt = `Actúa como un asistente nutricional. Identifica el platillo y sus ingredientes principales. Estima las calorías aproximadas. Responde en 1 o 2 frases cortas y motivadoras. Si no es comida, di "No detecto comida".`;
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
            
            if(data.text && data.text.includes('No detecto comida')) {
                setError("No parece ser comida. Intenta de nuevo.");
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
            const fileExt = file.name.split('.').pop();
            const fileName = `journal/${personId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('files').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from('patient_journal').insert({
                person_id: personId,
                meal_type: selectedMealType,
                image_url: fileName,
                ai_analysis: result,
                description: null
            });

            if (dbError) throw dbError;
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
    
    // 1. Default Camera Viewfinder State
    if (!preview) {
        return (
            <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                    backgroundColor: '#F3F4F6', // Neutral gray placeholder
                    height: '240px',
                    width: '100%',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: '0' // Fits perfectly inside the timeline card
                }}
            >
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                
                {/* AI Badge Overlay */}
                <div style={{
                    position: 'absolute', top: '15px', left: '15px',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    color: 'white', fontSize: '0.7rem', fontWeight: 700,
                    padding: '4px 10px', borderRadius: '20px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                    <div style={{width: '6px', height: '6px', backgroundColor: '#10B981', borderRadius: '50%', boxShadow: '0 0 8px #10B981'}}></div>
                    AI READY
                </div>

                {/* Main Camera Action Icon */}
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    backgroundColor: 'black', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                    zIndex: 2
                }} className="camera-icon-hover">
                    📷
                </div>
                
                {/* Helper Text */}
                <div style={{position: 'absolute', bottom: '20px', color: '#6B7280', fontWeight: 600, fontSize: '0.9rem'}}>
                    Tomar foto {fixedMealType ? `de ${fixedMealType}` : 'de tu comida'}
                </div>

                {/* Visual corners for viewfinder effect */}
                <div style={{position: 'absolute', top: '20px', right: '20px', width: '30px', height: '30px', borderTop: '3px solid #D1D5DB', borderRight: '3px solid #D1D5DB', borderTopRightRadius: '8px'}}></div>
                <div style={{position: 'absolute', bottom: '20px', left: '20px', width: '30px', height: '30px', borderBottom: '3px solid #D1D5DB', borderLeft: '3px solid #D1D5DB', borderBottomLeftRadius: '8px'}}></div>

                <style>{`
                    .camera-icon-hover:hover { transform: scale(1.1); }
                `}</style>
            </div>
        );
    }

    // 2. Preview & Result State
    return (
        <div style={{position: 'relative', height: 'auto', minHeight: '300px', backgroundColor: 'black'}}>
            <img src={preview} alt="Comida" style={{ width: '100%', height: 'auto', display: 'block', opacity: loading ? 0.6 : 1 }} />
            
            {loading && (
                <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexDirection: 'column', zIndex: 10}}>
                     <div className="spinner" style={{width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px'}}></div>
                     <span style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>Analizando platillo...</span>
                     <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {result && !loading && (
                <div className="fade-in-up" style={{
                    padding: '1.5rem', backgroundColor: 'white', 
                    borderTopLeftRadius: '24px', borderTopRightRadius: '24px', 
                    marginTop: '-30px', position: 'relative', zIndex: 10,
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
                }}>
                    <div style={{width: '40px', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', margin: '0 auto 1rem auto'}}></div>
                    
                    <h4 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{color: 'var(--primary-color)'}}>{ICONS.sparkles}</span> Análisis IA
                    </h4>
                    <p style={{margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--text-light)', lineHeight: 1.6}}>{result}</p>
                    
                    {!fixedMealType && (
                        <div style={{marginBottom: '1rem'}}>
                             <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem'}}>Tipo de Comida</label>
                             <select value={selectedMealType} onChange={e => setSelectedMealType(e.target.value)} style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)'}}>
                                <option value="desayuno">Desayuno</option>
                                <option value="colacion_1">Colación 1</option>
                                <option value="comida">Comida</option>
                                <option value="colacion_2">Colación 2</option>
                                <option value="cena">Cena</option>
                                <option value="snack">Snack</option>
                             </select>
                        </div>
                    )}
                    
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button 
                            onClick={() => { setFile(null); setPreview(null); }} 
                            style={{flex: 1, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'white', fontWeight: 600, cursor: 'pointer', color: 'var(--text-color)'}}
                        >
                            Reintentar
                        </button>
                        <button 
                            onClick={handleSaveToJournal} 
                            disabled={saving}
                            className="button-primary" 
                            style={{flex: 1, padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)'}}
                        >
                            {saving ? 'Guardando...' : 'Guardar ✅'}
                        </button>
                    </div>
                </div>
            )}
             {error && (
                <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', backgroundColor: '#FEF2F2', color: '#DC2626', textAlign: 'center', zIndex: 20}}>
                    {error} <button onClick={() => {setFile(null); setPreview(null);}} style={{marginLeft: '10px', textDecoration: 'underline', border: 'none', background: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer'}}>Reintentar</button>
                </div>
            )}
        </div>
    );
};

export default MealImageAnalyzer;
