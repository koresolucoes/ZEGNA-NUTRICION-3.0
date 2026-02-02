
import React, { FC, useState, FormEvent, useRef } from 'react';
import { supabase } from '../../supabase';
import { User } from '@supabase/supabase-js';
import { Person, PatientFile } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import AttachmentPreviewModal from '../../components/modals/AttachmentPreviewModal';

interface MyFilesPageProps {
    person: Person;
    user: User;
    files: PatientFile[];
    onDataRefresh: () => void;
}

const MyFilesPage: FC<MyFilesPageProps> = ({ person, user, files, onDataRefresh }) => {
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [fileDescription, setFileDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState('');
    const [fileToDelete, setFileToDelete] = useState<PatientFile | null>(null);
    const [previewFile, setPreviewFile] = useState<{name: string, url: string, type: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (!fileToUpload) return;
        setUploading(true);
        setFileError('');
        try {
            const fileExt = fileToUpload.name.split('.').pop();
            const filePath = `${person.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('files').upload(filePath, fileToUpload);
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from('files').insert({
                person_id: person.id,
                file_name: fileToUpload.name,
                file_path: filePath,
                file_type: fileToUpload.type,
                file_size: fileToUpload.size,
                description: fileDescription || null,
                uploaded_by_user_id: user.id,
            });
            if (dbError) throw dbError;
            
            setFileToUpload(null);
            setFileDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            onDataRefresh();
        } catch (err: any) {
            setFileError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async () => {
        if (!fileToDelete) return;
        try {
            const { error: storageError } = await supabase.storage.from('files').remove([fileToDelete.file_path]);
            if (storageError) console.warn("Error deleting from storage", storageError); // Continue to delete DB record
            
            const { error: dbError } = await supabase.from('files').delete().eq('id', fileToDelete.id);
            if (dbError) throw dbError;
            setFileToDelete(null);
            onDataRefresh();
        } catch (err: any) {
            setFileError(`Error al eliminar: ${err.message}`);
            setFileToDelete(null);
        }
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '0 KB';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const getFileUrl = (path: string) => {
        const { data } = supabase.storage.from('files').getPublicUrl(path);
        return data.publicUrl;
    };
    
    const openPreview = (file: PatientFile) => {
        setPreviewFile({
            name: file.file_name,
            url: getFileUrl(file.file_path),
            type: file.file_type || 'application/octet-stream'
        });
    };

    const getFileIcon = (type: string | null) => {
        if (!type) return '📄';
        if (type.startsWith('image/')) return '🖼️';
        if (type.includes('pdf')) return '📑';
        return '📄';
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            {fileToDelete && <ConfirmationModal isOpen={!!fileToDelete} onClose={() => setFileToDelete(null)} onConfirm={handleDeleteFile} title="Eliminar Archivo" message={<p>¿Eliminar <strong>{fileToDelete.file_name}</strong>?</p>} confirmText="Sí, eliminar" confirmButtonClass="button-danger" />}
            {previewFile && <AttachmentPreviewModal attachment={previewFile} onClose={() => setPreviewFile(null)} zIndex={2000} />}
            
            <div style={{marginBottom: '2rem', paddingLeft: '0.5rem'}}>
                 <h1 style={{fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '0.5rem', marginTop: 0}}>Mis Archivos</h1>
                 <p style={{color: 'var(--text-light)', margin: 0, fontSize: '1rem'}}>
                     Documentos clínicos, resultados y fotografías.
                 </p>
            </div>

            {/* Upload Area */}
            <div 
                style={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: 'var(--shadow)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {fileToUpload ? (
                    <form onSubmit={handleFileUpload}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '16px'}}>
                            <div style={{fontSize: '2rem'}}>📄</div>
                            <div style={{flex: 1, minWidth: 0}}>
                                <p style={{margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{fileToUpload.name}</p>
                                <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>{formatFileSize(fileToUpload.size)}</p>
                            </div>
                            <button type="button" onClick={() => { setFileToUpload(null); if(fileInputRef.current) fileInputRef.current.value=''; }} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-light)'}}>✕</button>
                        </div>
                        
                        <div style={{marginBottom: '1rem'}}>
                            <input 
                                type="text" 
                                placeholder="Añadir una descripción (opcional)" 
                                value={fileDescription} 
                                onChange={e => setFileDescription(e.target.value)} 
                                style={{
                                    width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', 
                                    backgroundColor: 'var(--background-color)', fontSize: '0.95rem', outline: 'none'
                                }}
                            />
                        </div>

                        {fileError && <p style={{color: 'var(--error-color)', fontSize: '0.9rem', marginBottom: '1rem'}}>{fileError}</p>}
                        
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button type="button" onClick={() => { setFileToUpload(null); }} className="button-secondary" style={{flex: 1, padding: '0.8rem', borderRadius: '12px'}}>Cancelar</button>
                            <button type="submit" disabled={uploading} className="button-primary" style={{flex: 2, padding: '0.8rem', borderRadius: '12px', fontWeight: 700}}>
                                {uploading ? 'Subiendo...' : 'Subir Archivo'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '16px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'var(--background-color)',
                            transition: 'all 0.2s'
                        }}
                        className="nav-item-hover"
                    >
                        <div style={{fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)'}}>{ICONS.add}</div>
                        <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 600}}>Subir Nuevo Archivo</h3>
                        <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>Toca para seleccionar PDF, JPG o PNG</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept="image/*,.pdf" />
                    </div>
                )}
            </div>
            
            {/* File List */}
            <div>
                <h3 style={{fontSize: '1rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem'}}>Recientes</h3>
                
                {files.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                        {files.map(file => {
                            const isImage = file.file_type?.startsWith('image/');
                            return (
                                <div key={file.id} className="card-hover" style={{
                                    backgroundColor: 'var(--surface-color)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: 'var(--shadow)'
                                }}>
                                    <div 
                                        onClick={() => openPreview(file)}
                                        style={{
                                            height: '120px', 
                                            backgroundColor: isImage ? 'black' : 'var(--surface-hover-color)',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        {isImage ? (
                                            <img src={getFileUrl(file.file_path)} alt={file.file_name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                        ) : (
                                            <span style={{fontSize: '3rem'}}>{getFileIcon(file.file_type)}</span>
                                        )}
                                        {/* Type Badge */}
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                                            fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {file.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </div>
                                    </div>
                                    
                                    <div style={{padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                        <h4 style={{margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={file.file_name}>
                                            {file.file_name}
                                        </h4>
                                        <p style={{margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-light)'}}>
                                            {new Date(file.created_at || '').toLocaleDateString()} • {formatFileSize(file.file_size)}
                                        </p>
                                        
                                        <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem'}}>
                                            <a 
                                                href={getFileUrl(file.file_path)} 
                                                download={file.file_name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{color: 'var(--primary-color)', fontSize: '1.2rem', padding: '4px', cursor: 'pointer'}}
                                                title="Descargar"
                                            >
                                                {ICONS.download}
                                            </a>
                                            {file.uploaded_by_user_id === user.id && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setFileToDelete(file); }}
                                                    style={{background: 'none', border: 'none', color: 'var(--error-color)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px'}}
                                                    title="Eliminar"
                                                >
                                                    {ICONS.delete}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '4rem 2rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)'}}>
                        <div style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}>📂</div>
                        <p style={{fontSize: '1rem'}}>No tienes archivos guardados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyFilesPage;
