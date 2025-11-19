
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
            setPassMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            setPassLoading(false);
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setPassMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            setPassLoading(false);
            return;
        }

        try {
            // First verify current password by signing in (re-authentication)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: passwords.current
            });

            if (signInError) throw new Error('La contraseña actual es incorrecta.');

            const { error: updateError } = await supabase.auth.updateUser({ password: passwords.new });
            if (updateError) throw updateError;

            setPassMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
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
            setEmailMessage({ type: 'error', text: 'El nuevo correo debe ser diferente al actual.' });
            setEmailLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            setEmailMessage({ type: 'success', text: 'Se ha enviado un enlace de confirmación a tu nuevo correo. Revisa tu bandeja de entrada.' });
            setNewEmail('');
        } catch (err: any) {
            setEmailMessage({ type: 'error', text: err.message });
        } finally {
            setEmailLoading(false);
        }
    };
    
    const SectionHeader: FC<{ icon: React.ReactNode, label: string, sectionId: string, danger?: boolean }> = ({ icon, label, sectionId, danger }) => (
        <div 
            onClick={() => toggleSection(sectionId)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem',
                backgroundColor: 'var(--surface-color)',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                color: danger ? 'var(--error-color)' : 'var(--text-color)',
                userSelect: 'none'
            }}
            className="nav-item-hover"
        >
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <span style={{fontSize: '1.2rem', color: danger ? 'var(--error-color)' : 'var(--primary-color)'}}>{icon}</span>
                <span style={{fontSize: '1rem', fontWeight: 500}}>{label}</span>
            </div>
            <span style={{ 
                transform: activeSection === sectionId ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.2s',
                color: 'var(--text-light)'
            }}>
                {ICONS.chevronDown}
            </span>
        </div>
    );

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-color)',
        fontSize: '1rem',
        marginBottom: '1rem'
    };

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Profile Header Card */}
            <div style={{ 
                backgroundColor: 'var(--surface-color)', 
                borderRadius: '16px', 
                padding: '2rem', 
                textAlign: 'center', 
                marginBottom: '2rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)'
            }}>
                 <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                    <img 
                        src={person.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person.full_name}&radius=50`} 
                        alt="Avatar" 
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--background-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                 </div>
                 <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 700 }}>{person.full_name}</h2>
                 <p style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontWeight: 500 }}>{user.email}</p>
                 {person.phone_number && <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem' }}>{person.phone_number}</p>}
            </div>

            <h3 style={{ margin: '0 0 1rem 1rem', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '1px', fontWeight: 700 }}>Configuración</h3>
            
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                 {/* Notifications Section */}
                 <SectionHeader icon="🔔" label="Notificaciones Push" sectionId="notifications" />
                 <div style={{
                     maxHeight: activeSection === 'notifications' ? '500px' : '0', 
                     opacity: activeSection === 'notifications' ? 1 : 0,
                     transition: 'all 0.3s ease-in-out',
                     overflow: 'hidden',
                     backgroundColor: 'var(--surface-hover-color)'
                }}>
                     <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                         <PushNotificationManager />
                     </div>
                 </div>

                 {/* Security Section */}
                 <SectionHeader icon={ICONS.lock} label="Seguridad y Contraseña" sectionId="security" />
                 <div style={{
                     maxHeight: activeSection === 'security' ? '500px' : '0', 
                     opacity: activeSection === 'security' ? 1 : 0,
                     transition: 'all 0.3s ease-in-out',
                     overflow: 'hidden',
                     backgroundColor: 'var(--surface-hover-color)'
                }}>
                     <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        {passMessage && (
                            <div style={{ 
                                padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem',
                                backgroundColor: passMessage.type === 'error' ? 'var(--error-bg)' : 'var(--primary-light)',
                                color: passMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-dark)',
                                border: `1px solid ${passMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'}`
                            }}>
                                {passMessage.text}
                            </div>
                        )}
                        <form onSubmit={handleUpdatePassword}>
                            <label style={styles.label}>Contraseña Actual</label>
                            <input type="password" placeholder="••••••••" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} required style={inputStyle} />
                            
                            <label style={styles.label}>Nueva Contraseña</label>
                            <input type="password" placeholder="Mínimo 6 caracteres" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required style={inputStyle} />
                            
                            <label style={styles.label}>Confirmar Nueva Contraseña</label>
                            <input type="password" placeholder="Repite la nueva contraseña" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required style={inputStyle} />

                            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                                <button type="submit" disabled={passLoading} className="button-primary" style={{padding: '0.75rem 1.5rem'}}>
                                    {passLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </button>
                            </div>
                        </form>
                     </div>
                 </div>

                 {/* Email Section */}
                 <SectionHeader icon={ICONS.send} label="Cambiar Correo Electrónico" sectionId="email" />
                 <div style={{
                     maxHeight: activeSection === 'email' ? '500px' : '0', 
                     opacity: activeSection === 'email' ? 1 : 0,
                     transition: 'all 0.3s ease-in-out',
                     overflow: 'hidden',
                     backgroundColor: 'var(--surface-hover-color)'
                }}>
                     <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        {emailMessage && (
                            <div style={{ 
                                padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem',
                                backgroundColor: emailMessage.type === 'error' ? 'var(--error-bg)' : 'var(--primary-light)',
                                color: emailMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-dark)',
                                border: `1px solid ${emailMessage.type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'}`
                            }}>
                                {emailMessage.text}
                            </div>
                        )}
                        <form onSubmit={handleUpdateEmail}>
                            <p style={{fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem'}}>
                                Tu correo actual es <strong>{user.email}</strong>. Recibirás un enlace de confirmación en la nueva dirección.
                            </p>
                            <label style={styles.label}>Nuevo Correo Electrónico</label>
                            <input type="email" placeholder="nuevo@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={inputStyle} />
                            
                            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                                <button type="submit" disabled={emailLoading} className="button-secondary" style={{padding: '0.75rem 1.5rem'}}>
                                    {emailLoading ? 'Enviando...' : 'Solicitar Cambio'}
                                </button>
                            </div>
                        </form>
                     </div>
                 </div>

                 {/* Help Section */}
                 <SectionHeader icon={ICONS.book} label="Ayuda y Soporte" sectionId="help" />
                 <div style={{
                     maxHeight: activeSection === 'help' ? '200px' : '0', 
                     opacity: activeSection === 'help' ? 1 : 0,
                     transition: 'all 0.3s ease-in-out',
                     overflow: 'hidden',
                     backgroundColor: 'var(--surface-hover-color)'
                }}>
                     <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                         <p>Si necesitas asistencia, contacta a tu clínica directamente a través del chat de WhatsApp o solicita ayuda en tu próxima consulta.</p>
                         <p style={{marginTop: '0.5rem'}}>Versión de la App: <strong>v3.1</strong></p>
                     </div>
                 </div>
            </div>
            
            <button onClick={onLogout} className="button-danger" style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
                {ICONS.logout} Cerrar Sesión
            </button>
            
            <p style={{textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem', marginTop: '2rem', opacity: 0.6}}>
                Zegna Nutrición v3.1
            </p>
        </div>
    );
};

export default PatientNotificationsPage;
