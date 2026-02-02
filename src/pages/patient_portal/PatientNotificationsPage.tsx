
import React, { FC, useState, FormEvent } from 'react';
import PushNotificationManager from '../../components/shared/PushNotificationManager';
import { styles } from '../../constants';
import { Person } from '../../types';
import { User } from '@supabase/supabase-js';
import { ICONS } from '../AuthPage';
import { supabase } from '../../supabase';

interface PatientNotificationsPageProps {
    person: Person;
    user: User;
    onLogout: () => void;
}

const PatientNotificationsPage: FC<PatientNotificationsPageProps> = ({ person, user, onLogout }) => {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    
    // Password Change State
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Email Change State
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
        setPassMessage(null);
        setEmailMessage(null);
        setPasswords({ current: '', new: '', confirm: '' });
        setNewEmail('');
    };

    const handleUpdatePassword = async (e: FormEvent) => {
        e.preventDefault();
        setPassLoading(true);
        setPassMessage(null);

        if (passwords.new.length < 6) {
            setPassMessage({ type: 'error', text: 'Mínimo 6 caracteres.' });
            setPassLoading(false);
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setPassMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            setPassLoading(false);
            return;
        }

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: passwords.current
            });

            if (signInError) throw new Error('Contraseña actual incorrecta.');

            const { error: updateError } = await supabase.auth.updateUser({ password: passwords.new });
            if (updateError) throw updateError;

            setPassMessage({ type: 'success', text: 'Contraseña actualizada.' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            setPassMessage({ type: 'error', text: err.message });
        } finally {
            setPassLoading(false);
        }
    };

    const handleUpdateEmail = async (e: FormEvent) => {
        e.preventDefault();
        setEmailLoading(true);
        setEmailMessage(null);

        if (newEmail === user.email) {
            setEmailMessage({ type: 'error', text: 'Debe ser un correo diferente.' });
            setEmailLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            setEmailMessage({ type: 'success', text: 'Correo de confirmación enviado.' });
            setNewEmail('');
        } catch (err: any) {
            setEmailMessage({ type: 'error', text: err.message });
        } finally {
            setEmailLoading(false);
        }
    };
    
    const SettingItem = ({ icon, title, description, isOpen, onClick, children }: { icon: React.ReactNode, title: string, description?: string, isOpen: boolean, onClick: () => void, children?: React.ReactNode }) => (
        <div style={{
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '16px', 
            border: isOpen ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
            marginBottom: '1rem',
            overflow: 'hidden',
            transition: 'all 0.2s'
        }}>
            <div 
                onClick={onClick}
                style={{
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer'
                }}
            >
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: isOpen ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                    color: isOpen ? 'white' : 'var(--text-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0, transition: 'all 0.2s'
                }}>
                    {icon}
                </div>
                <div style={{flex: 1}}>
                    <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)'}}>{title}</h4>
                    {description && <p style={{margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>{description}</p>}
                </div>
                <div style={{color: isOpen ? 'var(--primary-color)' : 'var(--text-light)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>
                    {ICONS.chevronDown}
                </div>
            </div>
            
            {isOpen && (
                <div className="fade-in" style={{padding: '1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)'}}>
                    {children}
                </div>
            )}
        </div>
    );

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--surface-color)',
        fontSize: '1rem',
        marginBottom: '1rem',
        outline: 'none',
        color: 'var(--text-color)'
    };

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
            
            {/* Profile Header */}
            <div style={{textAlign: 'center', marginBottom: '2.5rem', paddingTop: '1rem'}}>
                <div style={{position: 'relative', display: 'inline-block', marginBottom: '1rem'}}>
                    <img 
                        src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name}&radius=50`} 
                        alt="Avatar" 
                        style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}} 
                    />
                    <div style={{position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', width: '24px', height: '24px', borderRadius: '50%', border: '4px solid var(--background-color)'}}></div>
                </div>
                <h1 style={{fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-color)'}}>{person.full_name}</h1>
                <p style={{color: 'var(--text-light)', margin: 0, fontSize: '0.95rem'}}>{user.email}</p>
                {person.phone_number && <p style={{color: 'var(--text-light)', margin: '0.2rem 0 0 0', fontSize: '0.9rem'}}>{person.phone_number}</p>}
            </div>

            {/* Menu */}
            <div style={{marginBottom: '2.5rem'}}>
                <h3 style={{fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-light)', marginBottom: '1rem', paddingLeft: '0.5rem', fontWeight: 700}}>Ajustes</h3>
                
                <SettingItem 
                    icon="🔔" 
                    title="Notificaciones" 
                    description="Gestionar alertas en este dispositivo"
                    isOpen={activeSection === 'notifications'}
                    onClick={() => toggleSection('notifications')}
                >
                    <PushNotificationManager />
                </SettingItem>
                
                <SettingItem 
                    icon={ICONS.lock} 
                    title="Seguridad" 
                    description="Cambiar contraseña de acceso"
                    isOpen={activeSection === 'security'}
                    onClick={() => toggleSection('security')}
                >
                    {passMessage && (
                        <div style={{ 
                            padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600,
                            backgroundColor: passMessage.type === 'error' ? 'var(--error-bg)' : 'var(--primary-light)',
                            color: passMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-dark)',
                        }}>
                            {passMessage.text}
                        </div>
                    )}
                    <form onSubmit={handleUpdatePassword}>
                        <input type="password" placeholder="Contraseña actual" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} required style={inputStyle} />
                        <input type="password" placeholder="Nueva contraseña (min. 6)" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required style={inputStyle} />
                        <input type="password" placeholder="Confirmar contraseña" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required style={inputStyle} />
                        <button type="submit" disabled={passLoading} className="button-primary" style={{width: '100%', padding: '0.8rem', borderRadius: '12px', fontSize: '1rem'}}>
                            {passLoading ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </form>
                </SettingItem>

                <SettingItem 
                    icon={ICONS.send} 
                    title="Correo Electrónico" 
                    description="Actualizar dirección de contacto"
                    isOpen={activeSection === 'email'}
                    onClick={() => toggleSection('email')}
                >
                     {emailMessage && (
                        <div style={{ 
                            padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600,
                            backgroundColor: emailMessage.type === 'error' ? 'var(--error-bg)' : 'var(--primary-light)',
                            color: emailMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-dark)',
                        }}>
                            {emailMessage.text}
                        </div>
                    )}
                    <form onSubmit={handleUpdateEmail}>
                        <input type="email" placeholder="Nuevo correo electrónico" value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={inputStyle} />
                        <button type="submit" disabled={emailLoading} className="button-secondary" style={{width: '100%', padding: '0.8rem', borderRadius: '12px', fontSize: '1rem'}}>
                            {emailLoading ? 'Enviando...' : 'Solicitar Cambio'}
                        </button>
                    </form>
                </SettingItem>
            </div>

            <button 
                onClick={onLogout} 
                style={{ 
                    width: '100%', padding: '1.2rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    backgroundColor: 'var(--surface-color)', color: 'var(--error-color)',
                    border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', cursor: 'pointer'
                }}
            >
                {ICONS.logout} Cerrar Sesión
            </button>
            
            <p style={{textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '2rem', opacity: 0.6}}>
                Versión 3.1
            </p>
        </div>
    );
};

export default PatientNotificationsPage;
