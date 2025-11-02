import React, { useState, FormEvent, FC } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';

const SetPasswordPage: FC<{ onPasswordSet: () => void; }> = ({ onPasswordSet }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(`Error al actualizar la contraseña: ${error.message}`);
        } else {
            setSuccess("¡Contraseña actualizada exitosamente! Serás redirigido en un momento.");
            setTimeout(() => {
                onPasswordSet();
            }, 2000);
        }
        setLoading(false);
    };

    const inputLightStyle: React.CSSProperties = {
        backgroundColor: '#f1f3f5',
        color: '#212529',
        border: '1px solid #ced4da'
    };

    return (
        <div style={styles.authContainer}>
            <div style={{...styles.authBox}} className="fade-in">
                <div style={styles.header}>
                    <img src="https://i.imgur.com/NOdUorv.png" alt="Zegna Nutrición Logo" style={{ maxWidth: '250px', height: 'auto', margin: '0 auto 1.5rem auto', display: 'block' }} />
                    <h1 style={styles.title}>Establecer Nueva Contraseña</h1>
                    <p style={{color: '#495057'}}>Crea una contraseña segura para tu cuenta.</p>
                </div>
                {error && <p style={styles.error}>{error}</p>}
                {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}
                <form onSubmit={handleSetPassword} style={styles.form}>
                    <div>
                        <label style={styles.label} htmlFor="password">Nueva Contraseña</label>
                        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputLightStyle} />
                    </div>
                    <div style={{marginTop: '1rem'}}>
                        <label style={styles.label} htmlFor="confirm-password">Confirmar Contraseña</label>
                        <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputLightStyle} />
                    </div>
                    <div style={{...styles.formActions, justifyContent: 'flex-end', marginTop: '2rem'}}>
                        <button type="submit" disabled={loading || !!success}>{loading ? 'Guardando...' : 'Guardar Contraseña'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SetPasswordPage;