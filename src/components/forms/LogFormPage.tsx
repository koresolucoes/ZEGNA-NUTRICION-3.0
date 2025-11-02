

import React, { FC, useState, useEffect, FormEvent } from 'react';
// FIX: Import Json type to correctly cast payload for Supabase.
import { supabase, Database, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

const toLocalISOString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
};

interface Attachment {
    name: string;
    url: string;
    type: string;
}

// FIX: Renamed clientId to personId for consistency
const LogFormPage: FC<{ logToEditId: string | null; clientId: string; onBack: () => void; }> = ({ logToEditId, clientId: personId, onBack }) => {
    const [formData, setFormData] = useState<{
        log_type: string;
        description: string;
        log_time: string;
        attachments: Attachment[];
    }>({ 
        log_type: '', 
        description: '', 
        log_time: toLocalISOString(new Date()),
        attachments: []
    });
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLog = async () => {
            if (!logToEditId) return;
            setLoading(true);
            // FIX: Query the unified 'logs' table
            const { data, error } = await supabase.from('logs').select('*').eq('id', logToEditId).single();
            if (error && error.code !== 'PGRST116') {
                setError(error.message);
            } else if (data) {
                setFormData({ 
                    log_type: data.log_type || '', 
                    description: data.description || '',
                    log_time: data.log_time ? toLocalISOString(new Date(data.log_time)) : toLocalISOString(new Date(data.created_at)),
                    // FIX: Cast through `unknown` to resolve type mismatch between Supabase `Json` and `Attachment[]`.
                    attachments: (data.attachments as unknown as Attachment[]) || [],
                });
            }
            setLoading(false);
        };
        fetchLog();
    }, [logToEditId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    
    const removeExistingAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };
    
    const removeNewFile = (index: number) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.description) { setError("La descripción es obligatoria."); return; }
        setLoading(true);
        setError(null);
        
        let finalAttachments = [...formData.attachments];

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            if (filesToUpload.length > 0) {
                const uploadPromises = filesToUpload.map(async file => {
                    const fileName = `${personId}/${Date.now()}-${file.name}`;
                    const { error: uploadError } = await supabase.storage.from('log_images').upload(fileName, file);
                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage.from('log_images').getPublicUrl(fileName);
                    if (!urlData) throw new Error("Could not get public URL for file.");
                    return { name: file.name, url: urlData.publicUrl, type: file.type };
                });
                const uploadedFiles = await Promise.all(uploadPromises);
                finalAttachments.push(...uploadedFiles);
            }

            // FIX: Cast `attachments` to `Json` to satisfy Supabase's expected type for the jsonb column.
            const payload = {
                log_type: formData.log_type || 'General',
                description: formData.description,
                log_time: formData.log_time ? new Date(formData.log_time).toISOString() : new Date().toISOString(),
                attachments: finalAttachments as unknown as Json,
                created_by_user_id: session.user.id,
            };

            if (logToEditId) {
                const dataToUpdate: Database['public']['Tables']['logs']['Update'] = payload;
                const { error: dbError } = await supabase.from('logs').update(dataToUpdate).eq('id', logToEditId);
                if (dbError) throw dbError;
            } else {
                const dataToInsert: Database['public']['Tables']['logs']['Insert'] = {
                    ...payload,
                    person_id: personId,
                };
                const { error: dbError } = await supabase.from('logs').insert(dataToInsert);
                if (dbError) throw dbError;
            }
            
            // Create audit log entry
            await supabase.from('logs').insert({
                person_id: personId,
                log_type: 'AUDITORÍA',
                description: `Se ${logToEditId ? 'actualizó' : 'creó'} una entrada de bitácora (Tipo: ${payload.log_type}).`,
                created_by_user_id: session.user.id,
            });

            onBack();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fileListItemStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '4px',
        marginBottom: '4px',
        fontSize: '0.9rem'
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '7rem' }}>
            <div style={styles.pageHeader}>
                <h1>{logToEditId ? 'Editar Bitácora' : 'Agregar a Bitácora'}</h1>
                <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
            </div>
            <form id="log-form" onSubmit={handleSubmit} style={{maxWidth: '600px'}}>
                {error && <p style={styles.error}>{error}</p>}
                <label htmlFor="log_type">Tipo de Registro</label>
                <input id="log_type" name="log_type" type="text" value={formData.log_type} onChange={handleChange} placeholder="Ej: Avance, Nota, Recordatorio"/>
                
                <label htmlFor="log_time">Fecha y Hora del Registro</label>
                <input id="log_time" name="log_time" type="datetime-local" value={formData.log_time} onChange={handleChange} required />
                
                <label htmlFor="description">Descripción *</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={5}></textarea>

                <label htmlFor="file_upload">Adjuntar Archivos</label>
                <input id="file_upload" name="file_upload" type="file" multiple onChange={handleFileChange} style={{ marginBottom: '1rem' }} />

                {(formData.attachments.length > 0 || filesToUpload.length > 0) && (
                    <div>
                        <h4 style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Archivos adjuntos:</h4>
                        {formData.attachments.map((file, index) => (
                            <div key={`existing-${index}`} style={fileListItemStyle}>
                                <span>{file.name}</span>
                                <button type="button" onClick={() => removeExistingAttachment(index)} style={{...styles.iconButton, color: 'var(--error-color)'}} aria-label={`Quitar ${file.name}`}>&times;</button>
                            </div>
                        ))}
                        {filesToUpload.map((file, index) => (
                            <div key={`new-${index}`} style={fileListItemStyle}>
                                <span>{file.name}</span>
                                <button type="button" onClick={() => removeNewFile(index)} style={{...styles.iconButton, color: 'var(--error-color)'}} aria-label={`Quitar ${file.name}`}>&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </form>
             <div style={styles.floatingActions}>
                <button type="button" className="button-secondary" onClick={onBack}>Cancelar</button>
                <button type="submit" form="log-form" disabled={loading} style={styles.floatingSaveButton} aria-label={logToEditId ? 'Guardar Cambios' : 'Guardar Registro'}>
                    {loading ? '...' : ICONS.save}
                </button>
            </div>
        </div>
    );
};

export default LogFormPage;