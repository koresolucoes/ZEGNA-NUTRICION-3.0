
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
    handleAiSubmit: (e: FormEvent) => Promise<void>;
    aiContext: { displayText: string; fullText: string; } | null;
    setAiContext: React.Dispatch<React.SetStateAction<{ displayText: string; fullText: string; } | null>>;
    userInput: string;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    aiInputRef: RefObject<HTMLInputElement>;
}

const AiAssistantPanel: FC<AiAssistantPanelProps> = ({
    messages, aiLoading, chatEndRef, handleAiSubmit,
    aiContext, setAiContext, userInput, setUserInput, aiInputRef
}) => {
    const [isContextPopoverVisible, setContextPopoverVisible] = useState(false);

    const contextCapsuleStyle: React.CSSProperties = {
        backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)',
        borderRadius: '16px', padding: '2px 8px 2px 10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0, position: 'relative', fontSize: '0.85rem',
    };
    const contextPopoverStyle: React.CSSProperties = {
        position: 'absolute', bottom: '120%', left: 0, backgroundColor: 'var(--surface-color)',
        border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10, width: '300px',
        whiteSpace: 'pre-wrap', fontSize: '0.9rem', textAlign: 'left',
        visibility: isContextPopoverVisible ? 'visible' : 'hidden', opacity: isContextPopoverVisible ? 1 : 0, transition: 'opacity 0.2s, visibility 0.2s',
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <h3 style={{ ...styles.detailCardHeader, margin: 0 }}>Asistente IA</h3>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '1rem', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            maxWidth: '85%', padding: '0.5rem 1rem', borderRadius: '12px',
                            backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                            color: msg.role === 'user' ? 'var(--white)' : 'var(--text-color)',
                            textAlign: 'left',
                        }}>
                           {msg.role === 'user' ? <AiUserMessage text={msg.content} context={msg.context || null} /> : msg.content}
                        </div>
                    </div>
                ))}
                {aiLoading && <div style={{textAlign: 'center'}}>...</div>}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleAiSubmit} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    backgroundColor: 'var(--background-color)', borderRadius: '8px', 
                    padding: '0 0.5rem', border: '1px solid var(--border-color)',
                    transition: 'border-color 0.2s'
                }}>
                    {aiContext && (
                         <div style={contextCapsuleStyle} onMouseEnter={() => setContextPopoverVisible(true)} onMouseLeave={() => setContextPopoverVisible(false)}>
                            <span>{aiContext.displayText}</span>
                            <button type="button" onClick={() => setAiContext(null)} style={{...styles.iconButton, color: 'var(--primary-color)', width: '20px', height: '20px' }}>&times;</button>
                            <div style={contextPopoverStyle}>{aiContext.fullText}</div>
                        </div>
                    )}
                    <input 
                        ref={aiInputRef} 
                        type="text" 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)} 
                        placeholder={aiContext ? "Haz una pregunta sobre el contexto..." : "Pregunta al asistente..."} 
                        style={{ 
                            flex: 1, margin: 0, border: 'none', background: 'transparent', 
                            padding: '10px 8px', color: 'var(--text-color)', outline: 'none' 
                        }} 
                        disabled={aiLoading} 
                    />
                </div>
                <button type="submit" disabled={aiLoading || !userInput.trim()}>Enviar</button>
            </form>
        </div>
    );
};

export default AiAssistantPanel;
