
import React, { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';
import { WhatsappContact, WhatsappMessage } from '../types';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import ManageContactModal from '../components/chat/ManageContactModal';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import SkeletonLoader from '../components/shared/SkeletonLoader';

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
    const [isInChatView, setIsInChatView] = useState(false); // For mobile navigation
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
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        // Scroll to bottom whenever messages change
        scrollToBottom();
    }, [messages]);

    // --- Data Fetching ---

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
            // On desktop, auto-select first if none selected
            if (!isMobile && (!selectedContact || !data.some(c => c.id === selectedContact.id)) && data.length > 0) {
                setSelectedContact(data[0]);
            } else if (data.length === 0) {
                setSelectedContact(null);
            }
        }
        setLoading(prev => ({ ...prev, contacts: false }));
    }, [clinic, isMobile]);

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
            else {
                setMessages(data || []);
                setTimeout(scrollToBottom, 100);
            }
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
    
    // --- Handlers ---

    const handleSelectContact = (contact: WhatsappContact) => {
        setSelectedContact(contact);
        setMessageSearchTerm(''); 
        setIsInChatView(true); // For mobile
    };

    const handleBackToContacts = () => {
        setIsInChatView(false);
        if(isMobile) setSelectedContact(null);
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
            const updated = { ...contact, ai_is_active: isActive };
            setSelectedContact(updated);
            setContacts(prev => prev.map(c => c.id === contact.id ? updated : c));
        }
    };
    
    const handleDeleteConversation = async () => {
        if (!selectedContact) return;
        setLoading(prev => ({ ...prev, contacts: true }));
        setError(null);
        try {
            const { error: messagesError } = await supabase.from('whatsapp_conversations').delete().eq('contact_id', selectedContact.id);
            if (messagesError) throw messagesError;
            const { error: contactError } = await supabase.from('whatsapp_contacts').delete().eq('id', selectedContact.id);
            if (contactError) throw contactError;

            setSelectedContact(null);
            setIsInChatView(false);
        } catch (err: any) {
            setError(`Error al eliminar: ${err.message}`);
        } finally {
            setIsDeleteModalOpen(false);
            setLoading(prev => ({ ...prev, contacts: false }));
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !clinic) return;

        const tempMessageId = Date.now(); 
        const messagePayload: WhatsappMessage = {
            id: tempMessageId as unknown as number, 
            clinic_id: clinic.id,
            contact_id: selectedContact.id,
            contact_phone_number: selectedContact.phone_number,
            message_content: newMessage,
            sender: 'agent',
            sent_at: new Date().toISOString(),
            message_type: 'text'
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
            if (!response.ok) throw new Error('Failed to send');
        } catch (err: any) {
            console.error(err);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
            alert("Error enviando mensaje. Verifica tu conexión.");
        }
    };

    // --- Filters ---

    const filteredContacts = useMemo(() => {
        if (!contactSearchTerm) return contacts;
        const lowercasedFilter = contactSearchTerm.toLowerCase();
        return contacts.filter(contact =>
            (contact.person_name || contact.phone_number).toLowerCase().includes(lowercasedFilter)
        );
    }, [contacts, contactSearchTerm]);

    const filteredMessages = useMemo(() => {
        if (!messageSearchTerm.trim()) return messages;
        const lowercasedFilter = messageSearchTerm.toLowerCase();
        return messages.filter(msg =>
            msg.message_content.toLowerCase().includes(lowercasedFilter)
        );
    }, [messages, messageSearchTerm]);

    // --- Components ---

    const Highlight: FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
        if (!highlight.trim()) return <>{text}</>;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return <>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <mark key={i} style={{ backgroundColor: '#FCD34D', borderRadius: '2px' }}>{part}</mark> : part)}</>;
    };

    const Avatar: FC<{ name: string, size?: number }> = ({ name, size = 48 }) => (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, var(--primary-color), var(--primary-dark))`,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: `${size * 0.4}px`, border: '2px solid var(--surface-color)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 85px)', display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: '1600px', margin: '0 auto' }}>
            {isManageModalOpen && selectedContact && clinic && <ManageContactModal isOpen={true} onClose={() => setManageModalOpen(false)} onSuccess={() => { fetchContacts(); setManageModalOpen(false); }} contact={selectedContact} clinicId={clinic.id} onDelete={() => { setManageModalOpen(false); setIsDeleteModalOpen(true); }} />}
            {isDeleteModalOpen && selectedContact && <ConfirmationModal isOpen={true} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConversation} title="Eliminar Chat" message={<p>¿Eliminar chat con <strong>{selectedContact.person_name || selectedContact.phone_number}</strong>?</p>} confirmText="Eliminar" />}

            <div style={{
                display: 'flex', flex: 1, backgroundColor: 'var(--surface-color)', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-color)', position: 'relative'
            }}>
                
                {/* LEFT PANEL: Contact List */}
                <div style={{
                    width: isMobile ? '100%' : '340px',
                    borderRight: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: 'var(--surface-color)',
                    position: isMobile ? 'absolute' : 'relative',
                    zIndex: 10,
                    height: '100%',
                    transform: isMobile && isInChatView ? 'translateX(-100%)' : 'translateX(0)',
                    transition: 'transform 0.3s ease'
                }}>
                    {/* Header Search */}
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                             <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Chats</h2>
                             <div style={{backgroundColor: 'var(--primary-light)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-dark)'}}>
                                 {contacts.length} Activos
                             </div>
                        </div>
                        <div style={{...styles.searchInputContainer, backgroundColor: 'var(--background-color)', borderRadius: '10px'}}>
                            <span style={styles.searchInputIcon}>🔍</span>
                            <input
                                type="text" placeholder="Buscar chat..." value={contactSearchTerm}
                                onChange={e => setContactSearchTerm(e.target.value)}
                                style={{...styles.searchInput, height: '40px', backgroundColor: 'transparent', border: 'none', fontSize: '0.95rem'}}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading.contacts ? <div style={{padding: '1rem'}}><SkeletonLoader type="list" count={5} /></div> : 
                        contacts.length === 0 ? <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-light)'}}>No hay conversaciones iniciadas.</div> :
                        filteredContacts.map(contact => {
                            const isSelected = selectedContact?.id === contact.id;
                            const lastDate = new Date(contact.last_message_at || Date.now());
                            const isToday = lastDate.toDateString() === new Date().toDateString();
                            const displayTime = isToday 
                                ? lastDate.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) 
                                : lastDate.toLocaleDateString('es-MX', {day: '2-digit', month: 'short'});

                            return (
                                <div 
                                    key={contact.id} 
                                    onClick={() => handleSelectContact(contact)} 
                                    className="nav-item-hover"
                                    style={{ 
                                        padding: '1rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                                        backgroundColor: isSelected ? 'var(--surface-hover-color)' : 'transparent',
                                        transition: 'background-color 0.2s',
                                        borderLeft: isSelected ? '4px solid var(--primary-color)' : '4px solid transparent'
                                    }}
                                >
                                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                        <Avatar name={contact.person_name || contact.phone_number || '#'} />
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem'}}>
                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contact.person_name || contact.phone_number}
                                                </h4>
                                                <span style={{fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 500}}>{displayTime}</span>
                                            </div>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                                    {contact.person_id ? 'Paciente verificado' : 'Usuario invitado'}
                                                </p>
                                                {contact.ai_is_active && (
                                                    <span style={{fontSize: '0.65rem', backgroundColor: '#10B981', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 700}}>AUTO</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT PANEL: Conversation */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background-color)', // Distinct background for chat area
                    position: isMobile ? 'absolute' : 'relative',
                    width: '100%', height: '100%',
                    zIndex: 20,
                    transform: isMobile && !isInChatView ? 'translateX(100%)' : 'translateX(0)',
                    transition: 'transform 0.3s ease'
                }}>
                    {selectedContact ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ 
                                padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', 
                                display: 'flex', alignItems: 'center', gap: '1rem', height: '70px', flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                            }}>
                                {isMobile && (
                                    <button onClick={handleBackToContacts} style={{...styles.iconButton, padding: '0.5rem', marginLeft: '-0.5rem', marginRight: '0.25rem'}}>
                                        {ICONS.back}
                                    </button>
                                )}
                                
                                <Avatar name={selectedContact.person_name || selectedContact.phone_number} size={40} />
                                
                                <div style={{flex: 1, minWidth: 0}}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedContact.person_name || selectedContact.phone_number}
                                    </h3>
                                    {selectedContact.person_name && <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>{selectedContact.phone_number}</p>}
                                </div>

                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    {/* AI Toggle */}
                                    <div 
                                        onClick={() => handleAiToggle(selectedContact, !selectedContact.ai_is_active)}
                                        title={selectedContact.ai_is_active ? "Modo Automático Activado" : "Modo Manual"}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                                            backgroundColor: selectedContact.ai_is_active ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-hover-color)',
                                            border: `1px solid ${selectedContact.ai_is_active ? '#10B981' : 'var(--border-color)'}`,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{fontSize: '1rem'}}>{selectedContact.ai_is_active ? '🤖' : '👤'}</span>
                                        {!isMobile && <span style={{fontSize: '0.8rem', fontWeight: 600, color: selectedContact.ai_is_active ? '#10B981' : 'var(--text-light)'}}>
                                            {selectedContact.ai_is_active ? 'Piloto Auto' : 'Manual'}
                                        </span>}
                                    </div>

                                    <button onClick={() => setIsMessageSearchActive(!isMessageSearchActive)} style={{...styles.iconButton, width: '36px', height: '36px'}} title="Buscar en chat">🔍</button>
                                    <button onClick={() => setManageModalOpen(true)} style={{...styles.iconButton, width: '36px', height: '36px'}} title="Opciones">{ICONS.settings}</button>
                                </div>
                            </div>
                            
                            {isMessageSearchActive && (
                                <div className="fade-in" style={{padding: '0.75rem', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem'}}>
                                    <input ref={messageSearchInputRef} type="text" value={messageSearchTerm} onChange={e => setMessageSearchTerm(e.target.value)} placeholder="Buscar en la conversación..." style={{...styles.input, margin: 0, fontSize: '0.9rem', height: '36px'}} />
                                    <button onClick={() => { setIsMessageSearchActive(false); setMessageSearchTerm(''); }} style={styles.iconButton}>{ICONS.close}</button>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {loading.messages ? (
                                    <div style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}><SkeletonLoader type="list" count={3} /></div>
                                ) : (
                                    filteredMessages.map((msg, index) => {
                                        const isUser = msg.sender === 'user';
                                        const showDate = index === 0 || new Date(msg.sent_at).toDateString() !== new Date(filteredMessages[index - 1].sent_at).toDateString();
                                        
                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDate && (
                                                    <div style={{ textAlign: 'center', margin: '1.5rem 0 1rem 0' }}>
                                                        <span style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-light)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                            {new Date(msg.sent_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', marginBottom: '4px' }}>
                                                    <div style={{
                                                        maxWidth: '80%', padding: '0.5rem 0.75rem', 
                                                        borderRadius: '12px',
                                                        borderTopLeftRadius: isUser ? '0' : '12px',
                                                        borderTopRightRadius: isUser ? '12px' : '0',
                                                        backgroundColor: isUser ? 'var(--surface-color)' : 'var(--primary-color)', 
                                                        color: isUser ? 'var(--text-color)' : 'white',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                        position: 'relative',
                                                        minWidth: '80px'
                                                    }}>
                                                        {msg.message_type === 'image' && msg.media_url && (
                                                            <div style={{marginBottom: '0.5rem'}}>
                                                                <img src={msg.media_url} alt="Imagen enviada" style={{maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain'}} />
                                                            </div>
                                                        )}
                                                        
                                                        {msg.message_type === 'audio' && msg.media_url && (
                                                            <div style={{marginBottom: '0.5rem'}}>
                                                                <audio controls src={msg.media_url} style={{maxWidth: '100%', height: '32px'}} />
                                                            </div>
                                                        )}

                                                        <p style={{margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.4, paddingBottom: '12px'}}>
                                                            <Highlight text={msg.message_content} highlight={messageSearchTerm} />
                                                        </p>
                                                        <span style={{
                                                            position: 'absolute', bottom: '4px', right: '8px', fontSize: '0.65rem', opacity: 0.7,
                                                            color: isUser ? 'var(--text-light)' : 'rgba(255,255,255,0.8)'
                                                        }}>
                                                            {new Date(msg.sent_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)' }}>
                                {selectedContact.ai_is_active ? (
                                    <div className="fade-in" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #10B981'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                            <div style={{width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></div>
                                            <span style={{color: '#065F46', fontSize: '0.9rem', fontWeight: 600}}>El Agente IA está respondiendo...</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAiToggle(selectedContact, false)} 
                                            style={{backgroundColor: '#10B981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'}}
                                        >
                                            Tomar Control
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                        <textarea 
                                            value={newMessage} 
                                            onChange={e => setNewMessage(e.target.value)} 
                                            placeholder="Escribe un mensaje..." 
                                            rows={1}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            style={{
                                                flex: 1, borderRadius: '20px', padding: '0.75rem 1rem', border: '1px solid var(--border-color)',
                                                backgroundColor: 'var(--background-color)', fontSize: '0.95rem', resize: 'none', minHeight: '42px', maxHeight: '120px',
                                                fontFamily: 'inherit'
                                            }} 
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!newMessage.trim()}
                                            style={{
                                                width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
                                                color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: newMessage.trim() ? 'pointer' : 'default', opacity: newMessage.trim() ? 1 : 0.5,
                                                flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {ICONS.send}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.2 }}>💬</div>
                            <h3 style={{ margin: 0, color: 'var(--text-color)' }}>WhatsApp Web</h3>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Selecciona un contacto para ver la conversación.</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default ChatPage;
