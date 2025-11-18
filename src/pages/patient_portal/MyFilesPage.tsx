import React, { FC, useState, FormEvent, useRef } from 'react';
import { supabase } from '../../supabase';
import { User } from '@supabase/supabase-js';
import { Person, PatientFile } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

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
            const filePath = `${person.id}/${Date.now()}-${fileToUpload.name}`;
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
            
            // Reset form
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
            if (storageError) throw storageError;
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

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {fileToDelete && <ConfirmationModal isOpen={!!fileToDelete} onClose={() => setFileToDelete(null)} onConfirm={handleDeleteFile} title="Confirmar Eliminación" message={<p>¿Estás seguro de que quieres eliminar el archivo <strong>{fileToDelete.file_name}</strong>?</p>} />}
            
            <div style={styles.pageHeader}>
                 <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mis Archivos</h1>
            </div>
            <p style={{ color: 'var(--text-light)', marginTop: '-1.5rem', marginBottom: '2rem' }}>
                Sube documentos importantes, fotos de progreso o resultados de laboratorio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                {/* Upload Card */}
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {ICONS.add} Nuevo Archivo
                    </h2>
                    <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {fileError && <p style={styles.error}>{fileError}</p>}
                        
                        <div 
                            style={{
                                border: '2px dashed var(--border-color)',
                                borderRadius: '8px',
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: 'var(--background-color)',
                                transition: 'border-color 0.2s'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className="nav-item-hover"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} />
                            {fileToUpload ? (
                                <div>
                                    <span style={{fontSize: '2rem'}}>📄</span>
                                    <p style={{margin: '0.5rem 0 0 0', fontWeight: 600}}>{fileToUpload.name}</p>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>{formatFileSize(fileToUpload.size)}</p>
                                    <p style={{margin: '0.5rem 0 0 0', color: 'var(--primary-color)', fontSize: '0.9rem'}}>Clic para cambiar</p>
                                </div>
                            ) : (
                                <div>
                                    <span style={{fontSize: '2rem', color: 'var(--text-light)'}}>{ICONS.file}</span>
                                    <p style={{margin: '0.5rem 0 0 0', color: 'var(--text-color)'}}>Selecciona un archivo</p>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>PDF, JPG, PNG</p>
                                </div>
                            )}
                        </div>

                        <input 
                            type="text" 
                            placeholder="Descripción (opcional, ej: Resultados Enero)" 
                            value={fileDescription} 
                            onChange={e => setFileDescription(e.target.value)} 
                            style={{marginBottom: 0}}
                        />
                        <button type="submit" disabled={uploading || !fileToUpload} style={{width: '100%'}}>
                            {uploading ? 'Subiendo...' : 'Subir Archivo'}
                        </button>
                    </form>
                </div>
                
                {/* File List */}
                <div>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0' }}>Archivos Guardados</h2>
                    {files.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {files.map(file => {
                                const isOwner = file.uploaded_by_user_id === user.id;
                                return (
                                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} className="card-hover">
                                        <a href={supabase.storage.from('files').getPublicUrl(file.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                            <div style={{backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                {ICONS.file}
                                            </div>
                                            <div style={{overflow: 'hidden'}}>
                                                <p style={{margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis'}}>{file.file_name}</p>
                                                <div style={{display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem'}}>
                                                    <span>{new Date(file.created_at || '').toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{formatFileSize(file.file_size)}</span>
                                                </div>
                                                {file.description && <p style={{margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic'}}>{file.description}</p>}
                                            </div>
                                        </a>
                                        {isOwner && (
                                            <button 
                                                onClick={() => setFileToDelete(file)} 
                                                style={{ ...styles.iconButton, color: 'var(--error-color)', marginLeft: '0.5rem' }} 
                                                title="Eliminar archivo"
                                            >
                                                {ICONS.delete}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <p style={{margin: 0}}>No hay archivos guardados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyFilesPage;