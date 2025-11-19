
import React, { FC, FormEvent, RefObject, useState } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import AiUserMessage from './AiUserMessage';

interface Message {
    role: 'user' | 'model';
    content: string;
    context?: { displayText: string; fullText: string; } | null;
}

interface AiAssistantPanelProps {
    messages: Message[];
    aiLoading: boolean;
    chatEndRef: RefObject<HTMLDivElement>;
    handleAiSubmit: (e: FormEvent | string) => Promise<void>;
    aiContext: { displayText: string; fullText: string; } | null;
    setAiContext: React.Dispatch<React.SetStateAction<{ displayText: string; fullText: string; } | null>>;
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

const AiAssistantPanel: FC<AiAssistantPanelProps> = ({
    messages, aiLoading, chatEndRef, handleAiSubmit,
    aiContext, setAiContext, userInput, setUserInput, aiInputRef
}) => {
    const [isContextPopoverVisible, setContextPopoverVisible] = useState(false);

    const contextCapsuleStyle: React.CSSProperties = {
        backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)',
        borderRadius: '16px', padding: '2px 8px 2px 10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0, position: 'relative', fontSize: '0.85rem', maxWidth: '100%', overflow: 'hidden'
    };
    const contextPopoverStyle: React.CSSProperties = {
        position: 'absolute', bottom: '120%', left: 0, backgroundColor: 'var(--surface-color)',
        border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10, width: '300px',
        whiteSpace: 'pre-wrap', fontSize: '0.9rem', textAlign: 'left',
        visibility: isContextPopoverVisible ? 'visible' : 'hidden', opacity: isContextPopoverVisible ? 1 : 0, transition: 'opacity 0.2s, visibility 0.2s',
    };

    const onQuickPromptClick = (prompt: string) => {
        handleAiSubmit(prompt); // Treat prompt as if submitted form
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={styles.detailCardHeader}>
                <h3 style={{...styles.detailCardTitle, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {ICONS.sparkles} Asistente Clínico
                </h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.length === 0 && (
                    <div style={{textAlign: 'center', color: 'var(--text-light)', marginTop: '2rem'}}>
                        <p>Estoy listo para ayudarte con el análisis del paciente.</p>
                        <p style={{fontSize: '0.8rem'}}>Envía elementos desde la línea de tiempo para darme contexto.</p>
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
                           {msg.role === 'user' ? <AiUserMessage text={msg.content} context={msg.context || null} /> : msg.content}
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
                <div style={{padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)'}} className="hide-scrollbar">
                    {quickPrompts.map(prompt => (
                        <button 
                            key={prompt} 
                            onClick={() => onQuickPromptClick(prompt)}
                            style={{
                                border: '1px solid var(--primary-color)', 
                                backgroundColor: 'var(--surface-color)', 
                                color: 'var(--primary-color)', 
                                borderRadius: '20px', 
                                padding: '4px 12px', 
                                fontSize: '0.75rem', 
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="nav-item-hover"
                            disabled={aiLoading}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={(e) => handleAiSubmit(e)} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    backgroundColor: 'var(--background-color)', borderRadius: '20px', 
                    padding: '0.25rem 0.75rem', border: '1px solid var(--border-color)',
                    transition: 'border-color 0.2s'
                }}>
                    {aiContext && (
                         <div style={contextCapsuleStyle} onMouseEnter={() => setContextPopoverVisible(true)} onMouseLeave={() => setContextPopoverVisible(false)}>
                            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'}}>{aiContext.displayText}</span>
                            <button type="button" onClick={() => setAiContext(null)} style={{...styles.iconButton, color: 'var(--primary-color)', width: '18px', height: '18px', padding: 0 }}>&times;</button>
                            <div style={contextPopoverStyle}>{aiContext.fullText}</div>
                        </div>
                    )}
                    <input 
                        ref={aiInputRef} 
                        type="text" 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)} 
                        placeholder={aiContext ? "Pregunta sobre esto..." : "Escribe tu consulta..."} 
                        style={{ 
                            flex: 1, margin: 0, border: 'none', background: 'transparent', 
                            padding: '8px 0', color: 'var(--text-color)', outline: 'none', fontSize: '0.95rem'
                        }} 
                        disabled={aiLoading} 
                    />
                </div>
                <button type="submit" disabled={aiLoading || !userInput.trim()} style={{...styles.iconButton, backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '50%', width: '36px', height: '36px'}}>
                    {ICONS.send}
                </button>
            </form>
        </div>
    );
};

export default AiAssistantPanel;
