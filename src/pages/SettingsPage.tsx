
import React, { FC, useState, FormEvent, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import TeamManagement from '../components/dashboard/TeamManagement';
import ComplianceManagement from '../components/dashboard/ComplianceManagement';
import PushNotificationManager from '../components/shared/PushNotificationManager';
import AiAgentManagement from '../components/dashboard/AiAgentManagement';

interface SettingsPageProps {
    user: User;
    initialTab?: string;
}

const SettingsPage: FC<SettingsPageProps> = ({ user, initialTab }) => {
    const { role } = useClinic();
    const [activeTab, setActiveTab] = useState(initialTab || 'account');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Account settings states
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
        
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initialTab]);

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
    };

    const handleEmailUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setEmailLoading(true); setEmailError(null); setEmailSuccess(null);

        if (!newEmail || newEmail === user.email) {
            setEmailError("Por favor, introduce un nuevo correo electrónico diferente al actual.");
            setEmailLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ email: newEmail });

        if (error) setEmailError(error.message);
        else {
            setEmailSuccess("Se ha enviado un enlace de confirmación. Revisa ambas bandejas de entrada.");
            setNewEmail('');
        }
        setEmailLoading(false);
    };

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordLoading(true); setPasswordError(null); setPasswordSuccess(null);
    
        if (!currentPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
            if (!currentPassword) setPasswordError("Debes introducir tu contraseña actual.");
            else if (!newPassword || newPassword.length < 6) setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
            else if (newPassword !== confirmPassword) setPasswordError("Las nuevas contraseñas no coinciden.");
            setPasswordLoading(false);
            return;
        }
    
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
            if (signInError) throw new Error("La contraseña actual es incorrecta.");
    
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;
    
            setPasswordSuccess("Tu contraseña ha sido actualizada exitosamente.");
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    // --- Visual Styles ---
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)', // Slightly distinct from main surface
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    };

    const cardHeaderStyle: React.CSSProperties = {
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    };

    const inputGroupStyle: React.CSSProperties = {
        marginBottom: '1.25rem'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--text-color)'
    };

    const inputStyle: React.CSSProperties = {
        ...styles.input,
        backgroundColor: 'var(--background-color)', // Contrast against card
        borderColor: 'var(--border-color)',
        marginBottom: 0
    };

    // --- Subcomponents for Layout ---

    const MenuButton: FC<{ id: string; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '1rem',
                backgroundColor: activeTab === id ? 'var(--surface-hover-color)' : 'transparent',
                color: activeTab === id ? 'var(--primary-color)' : 'var(--text-light)',
                border: 'none',
                borderRadius: '10px',
                fontWeight: activeTab === id ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                marginBottom: '0.25rem'
            }}
        >
            <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span>{label}</span>
            {activeTab === id && <span style={{marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)'}}></span>}
        </button>
    );

    const SectionHeader: FC<{ title: string; description: string }> = ({ title, description }) => (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: 'var(--text-color)', fontWeight: 700 }}>{title}</h2>
            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.5 }}>{description}</p>
        </div>
    );

    const AccountSettings = () => (
        <div className="fade-in" style={{ maxWidth: '800px' }}>
            <SectionHeader title="Mi Cuenta" description="Gestiona tus credenciales de acceso y seguridad personal." />

            {/* Email Section */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={{color: 'var(--primary-color)', fontSize: '1.5rem'}}>✉️</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Correo Electrónico</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Es el canal principal para recuperar tu cuenta.</p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{color: 'var(--primary-color)', fontWeight: 600}}>{user.email}</span>
                    <span style={{fontSize: '0.75rem', backgroundColor: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '12px'}}>Verificado</span>
                </div>

                <form onSubmit={handleEmailUpdate}>
                    {emailError && <p style={styles.error}>{emailError}</p>}
                    {emailSuccess && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{emailSuccess}</p>}
                    
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Nuevo Correo Electrónico</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input 
                                type="email" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)} 
                                required 
                                style={{...inputStyle, flex: 1}}
                                placeholder="ejemplo@correo.com"
                            />
                            <button type="submit" disabled={emailLoading} className="button-secondary" style={{ height: '42px', padding: '0 1.5rem' }}>
                                {emailLoading ? '...' : 'Actualizar'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Password Section */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={{color: 'var(--primary-color)', fontSize: '1.5rem'}}>🔒</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Seguridad</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Actualiza tu contraseña regularmente.</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordUpdate}>
                    {passwordError && <p style={styles.error}>{passwordError}</p>}
                    {passwordSuccess && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{passwordSuccess}</p>}
                    
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Contraseña Actual</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={labelStyle}>Nueva Contraseña</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={inputStyle} placeholder="Mínimo 6 caracteres" />
                        </div>
                        <div>
                            <label style={labelStyle}>Confirmar Nueva Contraseña</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} style={inputStyle} placeholder="Repite la contraseña" />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={passwordLoading} className="button-primary">
                            {passwordLoading ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Session Zone */}
            <div style={{ ...cardStyle, backgroundColor: 'var(--error-bg)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--error-color)', fontSize: '1.1rem' }}>Sesión Activa</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--error-color)', opacity: 0.8 }}>Cerrar sesión en este dispositivo.</p>
                    </div>
                    <button onClick={handleLogout} className="button-danger" style={{ borderColor: 'transparent' }}>
                        {ICONS.logout} Salir
                    </button>
                </div>
            </div>
        </div>
    );

    // --- Main Layout ---

    return (
        <div className="fade-in" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', marginLeft: '0.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Configuración</h1>
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
                gap: '2rem',
                alignItems: 'start'
            }}>
                {/* Sidebar Navigation */}
                <div style={{
                    backgroundColor: 'var(--surface-color)',
                    padding: '1rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    gap: '0.5rem',
                    overflowX: isMobile ? 'auto' : 'visible',
                    position: isMobile ? 'static' : 'sticky',
                    top: '100px',
                    boxShadow: 'var(--shadow)'
                }}>
                    <p style={{ margin: '0.5rem 0 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '1px' }}>Personal</p>
                    <MenuButton id="account" label="Mi Cuenta" icon={ICONS.user} />
                    <MenuButton id="notifications" label="Notificaciones" icon="🔔" />
                    
                    {role === 'admin' && (
                        <>
                            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.5rem 0' }}></div>
                            <p style={{ margin: '0.5rem 0 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '1px' }}>Clínica</p>
                            <MenuButton id="team" label="Equipo" icon={ICONS.users} />
                            <MenuButton id="ai_agent" label="Agente IA" icon={ICONS.sparkles} />
                            <MenuButton id="compliance" label="Cumplimiento" icon={ICONS.check} />
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div style={{ minHeight: '80vh' }}>
                    {activeTab === 'account' && <AccountSettings />}
                    
                    {activeTab === 'notifications' && (
                        <div className="fade-in" style={{ maxWidth: '800px' }}>
                            <SectionHeader title="Notificaciones" description="Configura las alertas que recibes en este dispositivo para estar al día." />
                            <PushNotificationManager />
                        </div>
                    )}

                    {role === 'admin' && (
                        <>
                            {activeTab === 'team' && (
                                <div className="fade-in">
                                    <SectionHeader title="Gestión de Equipo" description="Administra los miembros de tu clínica y asigna roles y permisos." />
                                    <TeamManagement user={user} />
                                </div>
                            )}
                            
                            {activeTab === 'ai_agent' && (
                                <div className="fade-in">
                                    <SectionHeader title="Agente Inteligente" description="Configura el comportamiento, personalidad y herramientas de tu asistente IA." />
                                    <AiAgentManagement />
                                </div>
                            )}
                            
                            {activeTab === 'compliance' && (
                                <div className="fade-in">
                                    <SectionHeader title="Cumplimiento Normativo" description="Herramientas para cumplir con la LFPDPPP y NOM-024 del expediente clínico." />
                                    <div className="sub-tabs" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <button className="sub-tab-button active" style={{borderBottom: '2px solid var(--primary-color)'}}>Recursos Legales</button>
                                    </div>
                                    <ComplianceManagement view="generator" />
                                    <div style={{ marginTop: '3rem' }}>
                                        <ComplianceManagement view="guide" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
