
import React, { FC, useState, useEffect, FormEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
// FIX: In Supabase v2, User is exported via `import type`.
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { KnowledgeResource } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface ResourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    resourceToEdit: KnowledgeResource | null;
}

const modalRoot = document.getElementById('modal-root');

const RECIPE_TEMPLATE = `**Nombre:** 
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
* Azúcares: 0
`;

const ResourceFormModal: FC<ResourceFormModalProps> = ({ isOpen, onClose, user, resourceToEdit }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        title: '', type: 'Artículo', content: '', tags: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for file management
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
    const [isFileRemoved, setIsFileRemoved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (resourceToEdit) {
            setFormData({
                title: resourceToEdit.title,
                type: resourceToEdit.type,
                content: resourceToEdit.content || '',
                tags: (resourceToEdit.tags || []).join(', '),
            });
            setExistingFileUrl(resourceToEdit.file_url || null);
        } else {
            setFormData({ title: '', type: 'Artículo', content: '', tags: '' });
            setExistingFileUrl(null);
        }
        // Reset file-related states every time the modal opens
        setFileToUpload(null);
        setIsFileRemoved(false);
    }, [resourceToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'type' && value === 'Receta' && formData.content.trim() === '') {
            setFormData(prev => ({ ...prev, type: value, content: RECIPE_TEMPLATE }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
            setIsFileRemoved(false); // If a new file is selected, we are not removing
        }
    };
    
    const handleRemoveExistingFile = () => {
        setIsFileRemoved(true);
        setExistingFileUrl(null); // Visually remove it for the user
        setFileToUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Helper to clean filenames strictly (Alphanumeric, dots, underscores ONLY)
    const sanitizeFileName = (name: string) => {
        return name
            .replace(/[^a-zA-Z0-9.]/g, '_') // Replace ANY special char with underscore
            .toLowerCase();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) { setError("No se pudo identificar la clínica. Intenta refrescar la página."); return; }
        setLoading(true);
        setError(null);

        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("Usuario no autenticado.");

            const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            
            // 1. Create/Update the database record first
            const basePayload: any = {
                title: formData.title,
                type: formData.type,
                content: formData.content || null,
                tags: tagsArray,
                clinic_id: clinic.id,
            };
            
            // If user explicitly removed the file, clear the URL
            if (isFileRemoved) {
                basePayload.file_url = null;
            }

            let resourceId = resourceToEdit?.id;

            if (resourceToEdit) {
                // Remove clinic_id from update payload to be safe with RLS
                const { clinic_id, ...updatePayload } = basePayload;
                
                const { error: updateError } = await supabase
                    .from('knowledge_base_resources')
                    .update(updatePayload)
                    .eq('id', resourceToEdit.id);
                
                if (updateError) throw updateError;
            } else {
                const { data: newResource, error: insertError } = await supabase
                    .from('knowledge_base_resources')
                    .insert(basePayload)
                    .select('id')
                    .single();
                
                if (insertError) throw insertError;
                resourceId = newResource.id;
            }

            // 2. Upload File if present and update record
            if (fileToUpload && resourceId) {
                const fileExt = fileToUpload.name.split('.').pop() || '';
                const baseName = fileToUpload.name.substring(0, fileToUpload.name.lastIndexOf('.')) || fileToUpload.name;
                const cleanName = sanitizeFileName(baseName);
                
                // Use user ID as root folder to ensure RLS compatibility (matches FileManager logic)
                // Format: user_id/resources/timestamp_filename
                const filePath = `${currentUser.id}/resources/${Date.now()}_${cleanName}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('files')
                    .upload(filePath, fileToUpload, {
                        cacheControl: '3600',
                        upsert: true 
                    });

                if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

                const { data: urlData } = supabase.storage
                    .from('files')
                    .getPublicUrl(filePath);
                
                // Add timestamp param to bust cache if overwriting
                const finalFileUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

                // Update the resource with the file URL
                const { error: urlUpdateError } = await supabase
                    .from('knowledge_base_resources')
                    .update({ file_url: finalFileUrl })
                    .eq('id', resourceId);

                if (urlUpdateError) throw urlUpdateError;
            }

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
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '700px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{resourceToEdit ? 'Editar Recurso' : 'Nuevo Recurso'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="title">Título *</label>
                    <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} required />
                    
                    <label htmlFor="type">Tipo de Recurso</label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange}>
                        <option value="Artículo">Artículo</option>
                        <option value="Receta">Receta</option>
                        <option value="Guía PDF">Guía PDF</option>
                        <option value="Documento">Documento</option>
                        <option value="Imagen">Imagen</option>
                    </select>

                    <label htmlFor="content">Contenido</label>
                    <textarea 
                        id="content" 
                        name="content" 
                        value={formData.content} 
                        onChange={handleChange} 
                        rows={8} 
                        placeholder={formData.type === 'Receta' ? RECIPE_TEMPLATE : "Escribe el contenido del artículo, receta o una descripción del archivo adjunto aquí..."}
                    />
                    
                    <label htmlFor="file_upload">Archivo Adjunto (Opcional)</label>
                    
                    {/* Show existing file if exists and not removed */}
                    {existingFileUrl && !fileToUpload && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" style={{ ...styles.link, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {decodeURIComponent(existingFileUrl.split('/').pop() || 'Archivo actual')}
                            </a>
                            <button type="button" onClick={handleRemoveExistingFile} style={{...styles.iconButton, color: 'var(--error-color)'}} aria-label="Quitar archivo existente">&times;</button>
                        </div>
                    )}

                    <input ref={fileInputRef} id="file_upload" name="file_upload" type="file" onChange={handleFileChange} />
                    
                    {fileToUpload && (
                        <p style={{fontSize: '0.9rem', color: 'var(--primary-color)', marginTop: '0.5rem', fontWeight: 500}}>
                            Nuevo archivo seleccionado: {fileToUpload.name}
                        </p>
                    )}


                    <label htmlFor="tags" style={{marginTop: '1rem'}}>Etiquetas (separadas por coma)</label>
                    <input id="tags" name="tags" type="text" value={formData.tags} onChange={handleChange} placeholder="Ej: diabetes, recetas, cardio"/>

                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Recurso'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ResourceFormModal;
