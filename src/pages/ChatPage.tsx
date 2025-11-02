import React, { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';
import { WhatsappContact, WhatsappMessage } from '../types';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import ManageContactModal from '../components/chat/ManageContactModal';
import ConfirmationModal from '../components/shared/ConfirmationModal';

const ChatPage: FC<{ isMobile: boolean }> = ({ isMobile }) => {
    const { clinic } = useClinic();
    const [contacts, setContacts] = useState<WhatsappContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<WhatsappContact | null>(null);
    const [messages, setMessages] = useState<WhatsappMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState({ contacts: true, messages: false });
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [isContactListOpen, setIsContactListOpen] = useState(true);
    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Search States
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [messageSearchTerm, setMessageSearchTerm] = useState('');
    const [isMessageSearchActive, setIsMessageSearchActive] = useState(false);
    const messageSearchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isMessageSearchActive) {
            messageSearchInputRef.current?.focus();
        }
    }, [isMessageSearchActive]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchContacts = useCallback(async () => {
        if (!clinic) return;
        setLoading(prev => ({ ...prev, contacts: true }));
        const { data, error } = await supabase
            .from('whatsapp_contacts')
            .select('*')
            .eq('clinic_id', clinic.id)
            .order('last_message_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setContacts(data || []);
            // If there's no selected contact or the selected one is gone, select the first one
            if ((!selectedContact || !data.some(c => c.id === selectedContact.id)) && data && data.length > 0) {
                setSelectedContact(data[0]);
            } else if (data.length === 0) {
                setSelectedContact(null);
            }
        }
        setLoading(prev => ({ ...prev, contacts: false }));
    }, [clinic, selectedContact]);

    useEffect(() => {
        fetchContacts();
        if (!clinic) return;

        const subscription = supabase.channel('whatsapp-contacts-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_contacts', filter: `clinic_id=eq.${clinic.id}` },
                () => { fetchContacts(); }
            ).subscribe();
        
        return () => { supabase.removeChannel(subscription); }
    }, [clinic, fetchContacts]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedContact) {
                setMessages([]);
                return;
            };
            setLoading(prev => ({ ...prev, messages: true }));
            const { data, error } = await supabase
                .from('whatsapp_conversations')
                .select('*')
                .eq('contact_id', selectedContact.id)
                .order('sent_at', { ascending: true });
            
            if (error) setError(error.message);
            else setMessages(data || []);
            setLoading(prev => ({ ...prev, messages: false }));
        }
        fetchMessages();

        if (!selectedContact) return;
        const subscription = supabase.channel(`whatsapp-messages-${selectedContact.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_conversations', filter: `contact_id=eq.${selectedContact.id}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new as WhatsappMessage]);
                }
            ).subscribe();

        return () => { supabase.removeChannel(subscription); }
    }, [selectedContact]);
    
    const handleSelectContact = (contact: WhatsappContact) => {
        setSelectedContact(contact);
        setMessageSearchTerm(''); // Reset message search on contact change
        if (isMobile) {
            setIsContactListOpen(false);
        }
    };

    const handleAiToggle = async (contact: WhatsappContact, isActive: boolean) => {
        const { error } = await supabase
            .from('whatsapp_contacts')
            .update({ ai_is_active: isActive })
            .eq('id', contact.id);
        
        if (error) {
            setError(error.message);
        } else {
            // Optimistic UI update
            setSelectedContact(prev => prev ? { ...prev, ai_is_active: isActive } : null);
            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, ai_is_active: isActive } : c));
        }
    };
    
    const handleDeleteConversation = async () => {
        if (!selectedContact) return;
        setLoading(prev => ({ ...prev, contacts: true }));
        setError(null);
        try {
            const { error: messagesError } = await supabase
                .from('whatsapp_conversations')
                .delete()
                .eq('contact_id', selectedContact.id);
            if (messagesError) throw messagesError;

            const { error: contactError } = await supabase
                .from('whatsapp_contacts')
                .delete()
                .eq('id', selectedContact.id);
            if (contactError) throw contactError;

            setSelectedContact(null);
        } catch (err: any) {
            setError(`Error al eliminar la conversación: ${err.message}`);
        } finally {
            setIsDeleteModalOpen(false);
            setLoading(prev => ({ ...prev, contacts: false }));
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !clinic) return;

        const tempMessageId = `temp-${Date.now()}`;
        const messagePayload: WhatsappMessage = {
            id: tempMessageId,
            clinic_id: clinic.id,
            contact_id: selectedContact.id,
            contact_phone_number: selectedContact.phone_number,
            message_content: newMessage,
            sender: 'agent',
            sent_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, messagePayload]);
        const messageToSend = newMessage;
        setNewMessage('');

        try {
            const response = await fetch('/api/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: clinic.id,
                    contact_phone_number: selectedContact.phone_number,
                    contact_id: selectedContact.id,
                    message_body: messageToSend
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
        } catch (err: any) {
            setError(`Error enviando mensaje: ${err.message}`);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        }
    };

    const filteredContacts = useMemo(() => {
        if (!contactSearchTerm) return contacts;
        const lowercasedFilter = contactSearchTerm.toLowerCase();
        return contacts.filter(contact =>
            (contact.person_name || contact.phone_number).toLowerCase().includes(lowercasedFilter)
        );
    }, [contacts, contactSearchTerm]);

    const Highlight: FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
        if (!highlight.trim()) return <>{text}</>;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '1px 0' }}>{part}</mark>
                    ) : ( part )
                )}
            </>
        );
    };

    const filteredMessages = useMemo(() => {
        if (!messageSearchTerm.trim()) return messages;
        const lowercasedFilter = messageSearchTerm.toLowerCase();
        return messages.filter(msg =>
            msg.message_content.toLowerCase().includes(lowercasedFilter)
        );
    }, [messages, messageSearchTerm]);
    
    const contactListStyle: React.CSSProperties = {
        width: isMobile ? '85%' : '300px',
        maxWidth: '320px',
        borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out, padding 0.3s ease-in-out, border 0.3s ease-in-out',
        backgroundColor: 'var(--surface-color)',
        flexShrink: 0,
        ...(isMobile ? {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
            transform: isContactListOpen ? 'translateX(0)' : 'translateX(-100%)',
        } : {
            position: 'relative',
            transform: 'translateX(0)',
            ...(!isContactListOpen && {
                width: '0px',
                padding: '0',
                borderRight: 'none',
                overflow: 'hidden',
            }),
        }),
    };
    
    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)', backgroundColor: 'var(--surface-color)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            {isMobile && isContactListOpen && <div onClick={() => setIsContactListOpen(false)} style={{...styles.modalOverlay, zIndex: 99, backgroundColor: 'rgba(0,0,0,0.5)'}}></div>}

            {isManageModalOpen && selectedContact && clinic && (
                 <ManageContactModal 
                    isOpen={isManageModalOpen}
                    onClose={() => setManageModalOpen(false)}
                    onSuccess={() => { fetchContacts(); setManageModalOpen(false); }}
                    contact={selectedContact}
                    clinicId={clinic.id}
                    onDelete={() => { setManageModalOpen(false); setIsDeleteModalOpen(true); }}
                />
            )}
             {isDeleteModalOpen && selectedContact && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteConversation}
                    title="Eliminar Conversación"
                    message={<p>¿Estás seguro de que quieres eliminar esta conversación con <strong>{selectedContact.person_name || selectedContact.phone_number}</strong>? Se borrarán todos los mensajes. Esta acción es irreversible.</p>}
                    confirmText="Sí, eliminar"
                />
            )}

            {/* Contact List */}
            <div style={contactListStyle}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        {!isContactListOpen && !isMobile && (
                             <button onClick={() => setIsContactListOpen(true)} style={{...styles.hamburger, padding: '0.5rem'}}>{ICONS.menu}</button>
                        )}
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Conversaciones</h2>
                        {isContactListOpen && (
                             <button onClick={() => setIsContactListOpen(false)} style={{...styles.iconButton, border: 'none'}} className="nav-item-hover" title="Ocultar lista">
                                {ICONS.back}
                            </button>
                        )}
                    </div>
                    <div style={styles.searchInputContainer}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar contacto..."
                            value={contactSearchTerm}
                            onChange={e => setContactSearchTerm(e.target.value)}
                            style={{...styles.searchInput, margin: 0, height: '40px'}}
                        />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading.contacts ? <p style={{padding: '1rem'}}>Cargando...</p> : filteredContacts.map(contact => (
                        <div key={contact.id} onClick={() => handleSelectContact(contact)} style={{ padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', backgroundColor: selectedContact?.id === contact.id ? 'var(--primary-light)' : 'transparent' }} className="nav-item-hover">
                            <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {contact.person_name || contact.phone_number}
                                {contact.person_id && <span title="Contacto Vinculado">{ICONS.link}</span>}
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                Último mensaje: {new Date(contact.last_message_at || '').toLocaleString('es-MX', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                            </p>
                        </div>
                    ))}
                    {!loading.contacts && filteredContacts.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-light)', padding: '1rem'}}>No se encontraron contactos.</p>}
                </div>
            </div>

            {/* Chat Window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {selectedContact ? (
                    <>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {!isContactListOpen && (
                                <button onClick={() => setIsContactListOpen(true)} style={{...styles.hamburger, padding: '0.5rem', flexShrink: 0 }}>{ICONS.menu}</button>
                            )}

                            {isMessageSearchActive ? (
                                <div className="fade-in" style={{...styles.searchInputContainer, display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <span style={styles.searchInputIcon}>🔍</span>
                                    <input
                                        ref={messageSearchInputRef}
                                        type="text"
                                        placeholder="Buscar en conversación..."
                                        value={messageSearchTerm}
                                        onChange={e => setMessageSearchTerm(e.target.value)}
                                        style={{...styles.searchInput, margin: 0, height: '40px', width: '100%'}}
                                    />
                                    <button
                                        onClick={() => { setIsMessageSearchActive(false); setMessageSearchTerm(''); }}
                                        style={{...styles.iconButton, border: 'none', background: 'transparent'}}
                                        title="Cerrar búsqueda"
                                    >
                                        {ICONS.close}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h3 style={{ flexGrow: 1, minWidth: 0, margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--primary-color)' }}>
                                        {selectedContact.person_name || selectedContact.phone_number}
                                    </h3>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0}}>
                                        <button
                                            onClick={() => setIsMessageSearchActive(true)}
                                            style={{...styles.iconButton, border: '1px solid var(--border-color)', width: '40px', height: '40px'}}
                                            className="nav-item-hover"
                                            title="Buscar en chat"
                                        >
                                            🔍
                                        </button>
                                        <button
                                            onClick={() => setManageModalOpen(true)}
                                            style={{...styles.iconButton, border: '1px solid var(--border-color)', width: '40px', height: '40px'}}
                                            className="nav-item-hover"
                                            title="Gestionar Contacto"
                                        >
                                            {ICONS.settings}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {loading.messages ? <p>Cargando mensajes...</p> : filteredMessages.map(msg => (
                                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-start' : 'flex-end', marginBottom: '1rem' }}>
                                    <div style={{ maxWidth: '70%', padding: '0.75rem 1rem', borderRadius: '12px', backgroundColor: msg.sender === 'user' ? 'var(--surface-hover-color)' : 'var(--primary-color)', color: msg.sender === 'user' ? 'var(--text-color)' : 'white', minWidth: 0 }}>
                                        <p style={{margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'break-word'}}><Highlight text={msg.message_content} highlight={messageSearchTerm} /></p>
                                        <p style={{margin: '0.5rem 0 0 0', fontSize: '0.75rem', textAlign: 'right', opacity: 0.7}}>{new Date(msg.sent_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                           <button
                                type="button"
                                onClick={() => handleAiToggle(selectedContact, !selectedContact.ai_is_active)}
                                title={selectedContact.ai_is_active ? 'Desactivar Asistente IA' : 'Activar Asistente IA'}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.2s',
                                    border: `2px solid ${selectedContact.ai_is_active ? '#10B981' : '#6B7280'}`,
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer'
                                }}
                                className="nav-item-hover"
                            >
                                <span style={{
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    color: selectedContact.ai_is_active ? '#10B981' : '#6B7280',
                                    transition: 'color 0.2s'
                                }}>
                                    AI
                                </span>
                            </button>
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={selectedContact.ai_is_active ? "IA activa, no se puede enviar mensaje." : "Escribe un mensaje..."} disabled={selectedContact.ai_is_active} style={{flex: 1, margin: 0}} />
                            <button type="submit" disabled={selectedContact.ai_is_active || !newMessage.trim()}>{ICONS.send}</button>
                        </form>
                    </>
                ) : (
                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', gap: '1rem' }}>
                         {!isContactListOpen && (
                            <button onClick={() => setIsContactListOpen(true)} style={{...styles.hamburger, padding: '0.5rem'}}>{ICONS.menu}</button>
                        )}
                        {loading.contacts ? <p>Cargando conversaciones...</p> : <p>Selecciona una conversación para empezar.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;