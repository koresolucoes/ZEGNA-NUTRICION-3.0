import React, { FC, useState, FormEvent, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { InternalNoteWithAuthor, TeamMember } from '../../types';
import { styles } from '../../constants';
import { useClinic } from '../../contexts/ClinicContext';
import ConfirmationModal from '../shared/ConfirmationModal';
import { ICONS } from '../../pages/AuthPage';

interface InternalNotesManagerProps {
    notes: InternalNoteWithAuthor[];
    teamMembers: TeamMember[];
    personId: string;
    onNoteAdded: () => void;
    user: User;
}

const InternalNotesManager: FC<InternalNotesManagerProps> = ({ notes, teamMembers, personId, onNoteAdded, user }) => {
    const { role } = useClinic();
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for editing
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // State for deleting
    const [noteToDelete, setNoteToDelete] = useState<InternalNoteWithAuthor | null>(null);
    
    // State for @mentions
    const [mentionPopover, setMentionPopover] = useState<{ top: number; left: number; query: string } | null>(null);
    const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
    const modalRoot = document.getElementById('modal-root');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setLoading(true);
        setError(null);
        
        try {
            if (!user) throw new Error("Usuario no autenticado.");
            
            const mentionedUsers = teamMembers
                .filter(member => member.full_name && newNote.includes(`@${member.full_name}`))
                .map(member => member.user_id);

            const { error: dbError } = await supabase
                .from('internal_notes')
                .insert({
                    person_id: personId,
                    user_id: user.id,
                    note: newNote,
                    mentions: mentionedUsers.length > 0 ? mentionedUsers.filter((id): id is string => id !== null) : null,
                });
            
            if (dbError) throw dbError;

            setNewNote('');
            onNoteAdded();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleStartEdit = (note: InternalNoteWithAuthor) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.note);
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditingNoteContent('');
        setError(null);
    };

    const handleSaveEdit = async () => {
        if (!editingNoteId || !editingNoteContent.trim()) return;
        setEditLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from('internal_notes')
                .update({ note: editingNoteContent })
                .eq('id', editingNoteId);
            if (dbError) throw dbError;
            handleCancelEdit();
            onNoteAdded(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEditLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!noteToDelete) return;
        const { error: dbError } = await supabase.from('internal_notes').delete().eq('id', noteToDelete.id);
        if (dbError) setError(dbError.message);
        else onNoteAdded();
        setNoteToDelete(null);
    };

    // --- @Mention Logic ---
    const handleNewNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewNote(text);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\S*)$/);

        if (mentionMatch && newNoteTextareaRef.current) {
            const rect = newNoteTextareaRef.current.getBoundingClientRect();
            setMentionPopover({
                top: rect.bottom,
                left: rect.left,
                query: mentionMatch[1].toLowerCase(),
            });
        } else {
            setMentionPopover(null);
        }
    };

    const handleSelectMention = (memberName: string) => {
        const text = newNote;
        const cursorPos = newNoteTextareaRef.current!.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\S*)$/);
        
        if (mentionMatch) {
            const startIndex = mentionMatch.index!;
            const prefix = text.substring(0, startIndex);
            const suffix = text.substring(cursorPos);
            const newText = `${prefix}@${memberName} ${suffix}`;
            setNewNote(newText);
            setMentionPopover(null);

            setTimeout(() => {
                newNoteTextareaRef.current?.focus();
                const newCursorPos = startIndex + memberName.length + 2;
                newNoteTextareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    };

    const filteredMembers = useMemo(() => {
        if (!mentionPopover) return [];
        return teamMembers.filter(member => 
            member.full_name?.toLowerCase().includes(mentionPopover.query)
        );
    }, [mentionPopover, teamMembers]);


    const mentionPopoverComponent = mentionPopover && filteredMembers.length > 0 && modalRoot && createPortal(
        <div style={{
            position: 'fixed',
            top: `${mentionPopover.top}px`,
            left: `${mentionPopover.left}px`,
            zIndex: 1100,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'var(--surface-hover-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            minWidth: '200px'
        }}>
            {filteredMembers.map(member => (
                <div key={member.user_id} onClick={() => handleSelectMention(member.full_name!)} className="nav-item-hover" style={{padding: '0.5rem 1rem', cursor: 'pointer'}}>
                    {member.full_name}
                </div>
            ))}
        </div>,
        modalRoot
    );

    return (
        <div className="fade-in" style={{position: 'relative' }}>
            {mentionPopoverComponent}
            {noteToDelete && (
                <ConfirmationModal
                    isOpen={!!noteToDelete}
                    onClose={() => setNoteToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.</p>}
                />
            )}
            
            {/* Header & Info */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Discusión del Caso</h3>
            </div>

            <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--border-color)'}}>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="new-note" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)'}}>Nueva Nota</label>
                    <div style={{position: 'relative'}}>
                        <textarea
                            id="new-note"
                            ref={newNoteTextareaRef}
                            value={newNote}
                            onChange={handleNewNoteChange}
                            rows={3}
                            placeholder="Escribe observaciones, ideas o discusiones sobre el caso. Usa @ para mencionar."
                            required
                            style={{...styles.input, resize: 'vertical', minHeight: '80px', backgroundColor: 'var(--surface-color)'}}
                        />
                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" disabled={loading || !newNote.trim()} style={{padding: '0.5rem 1.5rem'}}>
                                {loading ? 'Guardando...' : 'Publicar Nota'}
                            </button>
                        </div>
                    </div>
                    {error && <p style={styles.error}>{error}</p>}
                </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notes.length > 0 ? (
                    notes.map(note => {
                        const author = note.team_members_with_profiles;
                        const canModify = user.id === note.user_id || role === 'admin';
                        const isEditingThisNote = editingNoteId === note.id;

                        return (
                            <div key={note.id} className="card-hover" style={{ 
                                backgroundColor: 'var(--surface-color)', 
                                borderRadius: '12px', 
                                padding: '1.25rem', 
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'flex-start'
                            }}>
                                <img 
                                    src={author?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${author?.full_name || '?'}&radius=50`} 
                                    alt="avatar" 
                                    style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-hover-color)'}} 
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>{author?.full_name || 'Usuario'}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                                {new Date(note.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        
                                        {!isEditingThisNote && canModify && (
                                            <div style={{display: 'flex', gap: '0.25rem'}}>
                                                <button onClick={() => handleStartEdit(note)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                                <button onClick={() => setNoteToDelete(note)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                            </div>
                                        )}
                                    </div>

                                    {isEditingThisNote ? (
                                        <div style={{marginTop: '0.5rem'}}>
                                            <textarea 
                                                value={editingNoteContent} 
                                                onChange={(e) => setEditingNoteContent(e.target.value)} 
                                                rows={3} 
                                                style={{...styles.input, width: '100%', marginBottom: '0.5rem'}} 
                                            />
                                            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                                                <button onClick={handleCancelEdit} className="button-secondary" style={{padding: '0.5rem 1rem'}}>Cancelar</button>
                                                <button onClick={handleSaveEdit} disabled={editLoading} style={{padding: '0.5rem 1rem'}}>{editLoading ? 'Guardando...' : 'Guardar'}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-color)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                            {note.note}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                        <p>No hay notas internas para este paciente. Inicia la discusión arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalNotesManager;