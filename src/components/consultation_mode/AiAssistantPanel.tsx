import React, { FC, FormEvent, RefObject, useState } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import AiUserMessage from './AiUserMessage';

interface Message {
    role: 'user' | 'model';
    content: string;
    context?: { displayText: string; fullText: string; file_url?: string; } | null;
}

interface AiAssistantPanelProps {
    messages: Message[];
    aiLoading: boolean;
    chatEndRef: RefObject<HTMLDivElement>;
    handleAiSubmit: (e: FormEvent | string) => Promise<void>;
    aiContext: { displayText: string; fullText: string; file_url?: string; } | null;
    setAiContext: React.Dispatch<React.SetStateAction<{ displayText: string; fullText: string; file_url?: string; } | null>>;
    userInput: string;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    aiInputRef: RefObject<HTMLInputElement>;
}

const quickPrompts = [
    "Resumir historial",
    "Analizar peso",
    "Sugerir cambios dieta",
    "Explicar lab. recientes"
];

// Componente para renderizar formato básico (Negritas y Listas)
const MarkdownRenderer: FC<{ content: string }> = ({ content }) => {
    // Dividir por líneas para manejar párrafos y listas
    const lines = content.split('\n');

    return (
        <div style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            {lines.map((line, i) => {
                const trimmedLine = line.trim();
                
                // Detectar items de lista (* o -)
                const isListItem = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
                const cleanLine = isListItem ? trimmedLine.substring(2) : line;

                // Procesar negritas (**texto**)
                const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                const formattedLine = parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} style={{ fontWeight: 700, color: 'var(--text-color)' }}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                });

                // Renderizar según tipo
                if (isListItem) {
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ marginRight: '0.5rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                            <span>{formattedLine}</span>
                        </div>
                    );
                }

                // Espacio para líneas vacías
                if (!trimmedLine) {
                    return <div key={i} style={{ height: '0.6rem' }} />;
                }

                return <div key={i} style={{ marginBottom: '0.25rem' }}>{formattedLine}</div>;
            })}
        </div>
    );
};

const AiAssistantPanel: FC<AiAssistantPanelProps> = ({
    messages, aiLoading, chatEndRef, handleAiSubmit,
    aiContext, setAiContext, userInput, setUserInput, aiInputRef
}) => {
    const [showContextModal, setShowContextModal] = useState(false);

    const contextCapsuleStyle: React.CSSProperties = {
        backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)',
        borderRadius: '16px', padding: '2px 8px 2px 10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0, position: 'relative', fontSize: '0.85rem', maxWidth: '100%', overflow: 'hidden'
    };

    const onQuickPromptClick = (prompt: string) => {
        handleAiSubmit(prompt); // Treat prompt as if submitted form
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {showContextModal && aiContext && (
                <div style={{...styles.modalOverlay, zIndex: 3000}}>
                    <div style={{...styles.modalContent, maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Contexto Adjunto</h3>
                            <button onClick={() => setShowContextModal(false)} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                        </div>
                        <div style={{...styles.modalBody, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem'}}>
                            {aiContext.fullText}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>ASISTENTE COPILOTO</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--text-light)', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                        <p style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.9rem' }}>Esperando contexto del paciente</p>
                        <p style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>Presiona el icono desde la linea del tiempo para comprender mejor el contexto</p>
                    </div>
                )}
                
                {messages.map((msg, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            maxWidth: '90%', padding: '0.75rem 1rem', borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                            backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                            color: msg.role === 'user' ? 'var(--white)' : 'var(--text-color)',
                            textAlign: 'left',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            border: msg.role === 'model' ? '1px solid var(--border-color)' : 'none'
                        }}>
                           {msg.role === 'user' ? (
                               <AiUserMessage text={msg.content} context={msg.context || null} />
                           ) : (
                               <MarkdownRenderer content={msg.content} />
                           )}
                        </div>
                    </div>
                ))}
                {aiLoading && (
                    <div style={{alignSelf: 'flex-start', backgroundColor: 'var(--surface-hover-color)', padding: '0.5rem 1rem', borderRadius: '12px'}}>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                        <style>{`
                            .typing-indicator span {
                                display: inline-block; width: 6px; height: 6px; background-color: var(--text-light); border-radius: 50%; margin: 0 2px; animation: typing 1s infinite;
                            }
                            .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                            .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
                            @keyframes typing { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                        `}</style>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts (Heuristic 7) */}
            {!aiContext && (
                <div style={{padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)'}} className="hide-scrollbar">
                    {quickPrompts.map(prompt => (
                        <button 
                            key={prompt} 
                            onClick={() => onQuickPromptClick(prompt)}
                            style={{
                                border: 'none', 
                                backgroundColor: 'transparent', 
                                color: 'var(--text-light)', 
                                padding: '4px 8px', 
                                fontSize: '0.75rem', 
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                fontWeight: 600
                            }}
                            className="nav-item-hover"
                            disabled={aiLoading}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={(e) => handleAiSubmit(e)} style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    backgroundColor: 'var(--surface-color)', borderRadius: '4px', 
                    padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)',
                    transition: 'border-color 0.2s'
                }}>
                    {aiContext && (
                         <div style={contextCapsuleStyle}>
                            {aiContext.file_url && <span style={{fontSize: '1rem'}}>📄</span>}
                            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'}}>{aiContext.displayText}</span>
                            <button type="button" onClick={() => setShowContextModal(true)} style={{...styles.iconButton, fontSize: '0.7rem', padding: '0 4px', textDecoration: 'underline', color: 'var(--primary-color)', border: 'none', background: 'transparent', cursor: 'pointer'}}>Ver más</button>
                            <button type="button" onClick={() => setAiContext(null)} style={{...styles.iconButton, color: 'var(--primary-color)', width: '18px', height: '18px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>&times;</button>
                        </div>
                    )}
                    <input 
                        ref={aiInputRef} 
                        type="text" 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)} 
                        placeholder="PREGUNTA A TU ASISTENTE" 
                        style={{ 
                            flex: 1, margin: 0, border: 'none', background: 'transparent', 
                            padding: '4px 0', color: 'var(--text-color)', outline: 'none', fontSize: '0.9rem',
                            textTransform: 'uppercase'
                        }} 
                        disabled={aiLoading} 
                    />
                </div>
                <button type="submit" disabled={aiLoading || !userInput.trim()} style={{...styles.iconButton, backgroundColor: 'transparent', color: 'var(--text-color)', border: 'none', padding: '0 0.5rem'}}>
                    <span style={{ fontSize: '1.2rem', transform: 'rotate(-45deg)', display: 'inline-block' }}>{ICONS.send}</span>
                </button>
            </form>
        </div>
    );
};

export default AiAssistantPanel;
