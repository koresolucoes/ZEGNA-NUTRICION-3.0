import React, { FC, useState, FormEvent, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
// FIX: In Supabase v2, User is exported via `import type`.
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
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
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
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Notas Internas del Equipo</h3>
            </div>
            
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
                <label htmlFor="new-note">Agregar una nota sobre el paciente</label>
                <textarea
                    id="new-note"
                    ref={newNoteTextareaRef}
                    value={newNote}
                    onChange={handleNewNoteChange}
                    rows={4}
                    placeholder="Escribe tus observaciones, ideas o discusiones sobre el caso aquí. Usa @nombre para mencionar a un colega."
                    required
                />
                {error && <p style={styles.error}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                    <button type="submit" disabled={loading || !newNote.trim()}>
                        {loading ? 'Guardando...' : 'Guardar Nota'}
                    </button>
                </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {notes.length > 0 ? (
                    notes.map(note => {
                        const author = note.team_members_with_profiles;
                        const canModify = user.id === note.user_id || role === 'admin';
                        const isEditingThisNote = editingNoteId === note.id;

                        return (
                            <div key={note.id} className="note-container" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <img 
                                    src={author?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${author?.full_name || '?'}&radius=50`} 
                                    alt="avatar" 
                                    style={{width: '40px', height: '40px', borderRadius: '50%', marginTop: '0.25rem'}} 
                                />
                                <div style={{ flex: 1, backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{author?.full_name || 'Usuario'}</p>
                                        {!isEditingThisNote && <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                {new Date(note.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                            {canModify && (
                                                <div className="note-actions">
                                                    <button onClick={() => handleStartEdit(note)} style={{...styles.iconButton, border: 'none'}} title="Editar">{ICONS.edit}</button>
                                                    <button onClick={() => setNoteToDelete(note)} style={{...styles.iconButton, color: 'var(--error-color)', border: 'none'}} title="Eliminar">{ICONS.delete}</button>
                                                </div>
                                            )}
                                        </div>}
                                    </div>
                                    {isEditingThisNote ? (
                                        <div>
                                            <textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} rows={4} style={{width: '100%'}} />
                                            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
                                                <button onClick={handleCancelEdit} className="button-secondary">Cancelar</button>
                                                <button onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar'}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-light)' }}>
                                            {note.note}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0' }}>
                        No hay notas internas para este paciente. Sé el primero en añadir una.
                    </p>
                )}
            </div>
             <style>{`
                .note-actions {
                    display: flex;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .note-container:hover .note-actions {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default InternalNotesManager;