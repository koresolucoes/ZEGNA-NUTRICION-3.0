import React, { FC, useState, FormEvent, useEffect, useMemo } from 'react';
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
    
    // Account settings states
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSuccess, setSuccess] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
    };

    const handleEmailUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setEmailLoading(true);
        setEmailError(null);
        setSuccess(null);

        if (!newEmail || newEmail === user.email) {
            setEmailError("Por favor, introduce un nuevo correo electrónico diferente al actual.");
            setEmailLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ email: newEmail });

        if (error) {
            setEmailError(error.message);
        } else {
            setSuccess("Se ha enviado un enlace de confirmación a tu correo actual y al nuevo. Por favor, revisa ambas bandejas de entrada para completar el cambio.");
            setNewEmail('');
        }
        setEmailLoading(false);
    };

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordError(null);
        setPasswordSuccess(null);
    
        if (!currentPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
            if (!currentPassword) setPasswordError("Debes introducir tu contraseña actual.");
            else if (!newPassword || newPassword.length < 6) setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
            else if (newPassword !== confirmPassword) setPasswordError("Las nuevas contraseñas no coinciden.");
            setPasswordLoading(false);
            return;
        }
    
        try {
            // Step 1: Verify the current password by trying to sign in.
            // This won't create a new session if one is active, it just validates credentials.
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword,
            });
    
            if (signInError) {
                throw new Error("La contraseña actual es incorrecta.");
            }
    
            // Step 2: If verification is successful, update to the new password.
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    
            if (updateError) {
                throw updateError;
            }
    
            setPasswordSuccess("Tu contraseña ha sido actualizada exitosamente.");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
    
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const successMessageStyle: React.CSSProperties = {
        ...styles.error,
        backgroundColor: 'var(--primary-light)',
        color: 'var(--primary-dark)',
        borderColor: 'var(--primary-color)'
    };

    const renderAccountSettings = () => (
        <div style={{ maxWidth: '600px', marginTop: '1.5rem' }}>
            <section style={{ marginBottom: '2.5rem' }}>
                <h2>Cambiar Correo Electrónico</h2>
                <p style={{color: 'var(--text-light)'}}>Correo actual: <strong>{user.email}</strong></p>
                <form onSubmit={handleEmailUpdate}>
                    {emailError && <p style={styles.error}>{emailError}</p>}
                    {emailSuccess && <p style={successMessageStyle}>{emailSuccess}</p>}
                    <label htmlFor="new-email">Nuevo Correo Electrónico</label>
                    <input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                    <button type="submit" disabled={emailLoading} style={{marginTop: '0.5rem'}}>
                        {emailLoading ? 'Actualizando...' : 'Actualizar Correo'}
                    </button>
                </form>
            </section>
            <section style={{ marginBottom: '2.5rem' }}>
                <h2>Cambiar Contraseña</h2>
                <form onSubmit={handlePasswordUpdate}>
                    {passwordError && <p style={styles.error}>{passwordError}</p>}
                    {passwordSuccess && <p style={successMessageStyle}>{passwordSuccess}</p>}
                    <label htmlFor="current-password">Contraseña Actual</label>
                    <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    <label htmlFor="new-password">Nueva Contraseña</label>
                    <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
                    <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
                    <button type="submit" disabled={passwordLoading} style={{marginTop: '0.5rem'}}>
                        {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </section>
            <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '2.5rem 0'}} />
            <section>
                <h2>Cerrar Sesión</h2>
                <p style={{color: 'var(--text-light)'}}>Cierra la sesión en el dispositivo actual.</p>
                <button onClick={handleLogout} className="button-danger">{ICONS.logout} Cerrar Sesión</button>
            </section>
        </div>
    );
    
    const renderNotificationsSettings = () => (
        <div style={{ maxWidth: '700px', marginTop: '1.5rem' }}>
            <h2>Gestión de Notificaciones Push</h2>
            <p style={{color: 'var(--text-light)'}}>
                Activa las notificaciones para recibir alertas importantes en este dispositivo, como nuevas solicitudes de citas o mensajes de pacientes.
            </p>
            <PushNotificationManager />
        </div>
    );

    return (
        <div className="fade-in">
            <div style={styles.pageHeader}>
                <h1>Ajustes del Sistema</h1>
            </div>

            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>Mi Cuenta</button>
                {role === 'admin' && <button className={`tab-button ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>Gestión de Equipo</button>}
                {role === 'admin' && <button className={`tab-button ${activeTab === 'ai_agent' ? 'active' : ''}`} onClick={() => setActiveTab('ai_agent')}>Agente IA</button>}
                <button className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Notificaciones</button>
                {role === 'admin' && <button className={`tab-button ${activeTab === 'complianceGuide' ? 'active' : ''}`} onClick={() => setActiveTab('complianceGuide')}>Cumplimiento Normativo</button>}
                {role === 'admin' && <button className={`tab-button ${activeTab === 'privacyGenerator' ? 'active' : ''}`} onClick={() => setActiveTab('privacyGenerator')}>Generador de Aviso de Privacidad</button>}
            </nav>
            
            {activeTab === 'account' && renderAccountSettings()}
            {activeTab === 'team' && role === 'admin' && <TeamManagement user={user} />}
            {activeTab === 'ai_agent' && role === 'admin' && <AiAgentManagement />}
            {activeTab === 'notifications' && renderNotificationsSettings()}
            {activeTab === 'complianceGuide' && role === 'admin' && <ComplianceManagement view="guide" />}
            {activeTab === 'privacyGenerator' && role === 'admin' && <ComplianceManagement view="generator" />}

        </div>
    );
};

export default SettingsPage;