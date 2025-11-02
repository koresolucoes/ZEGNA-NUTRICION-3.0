
import React, { FC, useState } from 'react';
// FIX: Import the supabase client to make it available in the component.
import { supabase } from '../../supabase';
import { File as PatientFile, TeamMember } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import AttachmentPreviewModal from '../modals/AttachmentPreviewModal';

interface FileManagerProps {
    files: PatientFile[];
    onAdd: () => void;
    onDelete: (file: PatientFile) => void;
    memberMap: Map<string, TeamMember>;
}

const FileManager: FC<FileManagerProps> = ({ files, onAdd, onDelete, memberMap }) => {
    const [previewingFile, setPreviewingFile] = useState<PatientFile | null>(null);

    const getFileUrl = (filePath: string) => {
        // This function assumes the public URL structure of Supabase Storage.
        // It might need adjustment based on your actual Supabase URL.
        const { data } = supabase.storage.from('files').getPublicUrl(filePath);
        return data.publicUrl;
    }
    
    return (
        <div className="fade-in">
             {previewingFile && (
                <AttachmentPreviewModal 
                    attachment={{
                        name: previewingFile.file_name,
                        url: getFileUrl(previewingFile.file_path),
                        type: previewingFile.file_type || 'application/octet-stream'
                    }}
                    onClose={() => setPreviewingFile(null)}
                />
            )}
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Archivos del Paciente</h3>
                <button onClick={onAdd}>{ICONS.add} Subir Archivo</button>
            </div>
            {files.length > 0 ? (
                <div className="info-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'}}>
                    {files.map(file => {
                        const uploader = file.uploaded_by_user_id ? memberMap.get(file.uploaded_by_user_id) : null;
                        return(
                            <div key={file.id} style={fileCardStyle}>
                                <div style={thumbnailContainerStyle} onClick={() => file.file_type?.startsWith('image/') && setPreviewingFile(file)}>
                                    {file.file_type && file.file_type.startsWith('image/') ? (
                                        <img src={getFileUrl(file.file_path)} alt={file.file_name} style={thumbnailStyle} />
                                    ) : (
                                        <div style={iconContainerStyle}>{ICONS.file}</div>
                                    )}
                                </div>
                                <div style={fileInfoStyle}>
                                    <p style={fileNameStyle} title={file.file_name}>{file.file_name}</p>
                                    <p style={fileDateStyle}>Subido el {new Date(file.created_at).toLocaleDateString('es-MX')}</p>
                                    {uploader && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                            <img src={uploader.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${uploader.full_name || '?'}&radius=50`} alt="avatar" style={{width: '16px', height: '16px', borderRadius: '50%'}} />
                                            <span>{uploader.full_name || uploader.user_id}</span>
                                        </div>
                                    )}
                                    {file.description && <p style={fileDescStyle}>{file.description}</p>}
                                </div>
                                <div style={fileActionsStyle}>
                                    <a href={getFileUrl(file.file_path)} target="_blank" rel="noopener noreferrer" download={file.file_name} style={{...styles.iconButton, color: 'var(--text-light)'}} title="Descargar">
                                        {ICONS.download}
                                    </a>
                                    <button onClick={() => onDelete(file)} style={{...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p>No hay archivos adjuntos para este paciente. Sube fotos, resultados de laboratorio u otros documentos relevantes.</p>
            )}
        </div>
    );
};

// Styles for the component
const fileCardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-color)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s',
};

const thumbnailContainerStyle: React.CSSProperties = {
    width: '100%',
    paddingTop: '75%', // 4:3 Aspect Ratio
    position: 'relative',
    backgroundColor: 'var(--background-color)',
    cursor: 'pointer',
};

const thumbnailStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
};

const iconContainerStyle: React.CSSProperties = {
    ...thumbnailStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--primary-color)',
    fontSize: '3rem',
};

const fileInfoStyle: React.CSSProperties = {
    padding: '0.75rem',
    flex: 1,
};

const fileNameStyle: React.CSSProperties = {
    fontWeight: 600,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const fileDateStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    margin: '0.25rem 0 0.5rem 0',
};

const fileDescStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: 'var(--text-light)',
    margin: '0.5rem 0 0 0',
    fontStyle: 'italic',
};

const fileActionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderTop: '1px solid var(--border-color)',
};

export default FileManager;