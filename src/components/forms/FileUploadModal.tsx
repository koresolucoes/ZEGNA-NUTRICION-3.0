import React, { FC, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
}

const modalRoot = document.getElementById('modal-root');

export const FileUploadModal: FC<FileUploadModalProps> = ({ isOpen, onClose, personId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Por favor, selecciona un archivo para subir.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            // 1. Upload the file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${personId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(filePath, file);

            if (uploadError) {
                throw new Error(`Error al subir archivo: ${uploadError.message}`);
            }

            // 2. Insert metadata into the database table
            const payload = {
                person_id: personId,
                file_name: file.name,
                file_path: filePath,
                file_type: file.type,
                file_size: file.size,
                description: description || null,
                uploaded_by_user_id: session.user.id,
            };

            const { error: dbError } = await supabase.from('files').insert(payload);
            
            if (dbError) {
                // If DB insert fails, try to remove the orphaned file from storage
                await supabase.storage.from('files').remove([filePath]);
                throw new Error(`Error al guardar en base de datos: ${dbError.message}`);
            }

            onClose(); // This triggers a refresh in the parent component
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const resetForm = () => {
        setFile(null);
        setDescription('');
        setError(null);
        setLoading(false);
        onClose();
    }

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Subir Archivo</h2>
                    <button type="button" onClick={resetForm} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <label htmlFor="file-upload">Archivo *</label>
                    <input id="file-upload" name="file-upload" type="file" onChange={handleFileChange} required />
                    
                    {file && (
                        <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                            Seleccionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                    )}

                    <label htmlFor="description">Descripción (Opcional)</label>
                    <textarea 
                        id="description" 
                        name="description" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        rows={3}
                        placeholder="Ej: Foto de progreso semana 4, Resultados de laboratorio..."
                    />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Subiendo...' : 'Subir Archivo'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};
