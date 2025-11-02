import React, { FC, useState, FormEvent } from 'react';
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
            setFileToUpload(null);
            setFileDescription('');
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

    return (
        <div className="fade-in">
            {fileToDelete && <ConfirmationModal isOpen={!!fileToDelete} onClose={() => setFileToDelete(null)} onConfirm={handleDeleteFile} title="Confirmar Eliminación" message={<p>¿Estás seguro de que quieres eliminar el archivo <strong>{fileToDelete.file_name}</strong>?</p>} />}
            <h1 style={{ color: 'var(--primary-color)' }}>Mis Archivos</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Sube y gestiona tus documentos, como resultados de laboratorio o fotos de progreso.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0' }}>Subir Nuevo Archivo</h2>
                    <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {fileError && <p style={styles.error}>{fileError}</p>}
                        <input type="file" onChange={e => setFileToUpload(e.target.files ? e.target.files[0] : null)} />
                        <input type="text" placeholder="Descripción (opcional)" value={fileDescription} onChange={e => setFileDescription(e.target.value)} />
                        <button type="submit" disabled={uploading || !fileToUpload}>{uploading ? 'Subiendo...' : 'Subir Archivo'}</button>
                    </form>
                </div>
                
                <div>
                    {files.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {files.map(file => {
                                const isOwner = file.uploaded_by_user_id === user.id;
                                return (
                                    <li key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px' }}>
                                        <a href={supabase.storage.from('files').getPublicUrl(file.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{color: 'var(--primary-color)'}}>{ICONS.file}</span>
                                            <div>
                                                <p style={{margin: 0}}>{file.file_name}</p>
                                                {file.description && <p style={{margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>{file.description}</p>}
                                            </div>
                                        </a>
                                        {isOwner && <button onClick={() => setFileToDelete(file)} style={{ ...styles.iconButton, color: 'var(--error-color)' }}>{ICONS.delete}</button>}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px' }}>
                            <p>No has subido ningún archivo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyFilesPage;
