
import React, { FC, useState, useEffect, FormEvent, useRef } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

const themeOptions = [
    { id: 'default', name: 'Zegna Azul (Default)', colors: ['#007BFF', '#17A2B8', '#343A40', '#212529'] },
    { id: 'natural', name: 'Salud Natural', colors: ['#8FBC8F', '#F4A261', '#3a423a', '#242b24'] },
    { id: 'clinical', name: 'Serenidad Clínica', colors: ['#6A8EAE', '#C5A169', '#383f45', '#272d31'] },
    { id: 'vitality', name: 'Energía Vital', colors: ['#E57A44', '#48B2A7', '#443d3a', '#2c2826'] },
    { id: 'light', name: 'Minimalista Claro', colors: ['#4A90E2', '#50E3C2', '#FFFFFF', '#F4F6F8'] },
];

const AllyProfileEditPage: FC<{ onProfileUpdate: () => void; }> = ({ onProfileUpdate }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'theme'>('profile');
    const [userEmail, setUserEmail] = useState('');
    
    // Profile Form State
    const [formData, setFormData] = useState({
        full_name: '',
        specialty: '',
        phone_number: '',
        biography: '',
        office_address: '',
        website: '',
        avatar_url: '',
        theme: 'default',
    });

    // Security Form State
    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        newEmail: ''
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            setUserEmail(user.email || '');

            const { data } = await supabase.from('allies').select('*').eq('user_id', user.id).single();
            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    specialty: data.specialty || '',
                    phone_number: data.phone_number || '',
                    biography: data.biography || '',
                    office_address: data.office_address || '',
                    website: data.website || '',
                    avatar_url: data.avatar_url || '',
                    theme: data.theme || 'default',
                });
                setAvatarPreview(data.avatar_url || null);
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSecurityData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No hay un usuario autenticado.");

            let newAvatarUrl = formData.avatar_url;
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `ally-avatars/${user.id}/avatar.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const payload = {
                full_name: formData.full_name,
                specialty: formData.specialty,
                phone_number: formData.phone_number || null,
                biography: formData.biography || null,
                office_address: formData.office_address || null,
                website: formData.website || null,
                avatar_url: newAvatarUrl,
                theme: formData.theme,
            };

            const { error: dbError } = await supabase.from('allies').update(payload).eq('user_id', user.id);
            if (dbError) throw dbError;
            
            setMessage({ type: 'success', text: "¡Perfil actualizado con éxito!" });
            onProfileUpdate();
            
            if (payload.theme !== formData.theme) {
                // Force reload if theme changed
                 window.location.reload();
            }

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };
    
    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (securityData.newPassword !== securityData.confirmPassword) {
            setMessage({ type: 'error', text: "Las contraseñas no coinciden." });
            setLoading(false);
            return;
        }

        if (securityData.newPassword.length < 6) {
            setMessage({ type: 'error', text: "La contraseña debe tener al menos 6 caracteres." });
            setLoading(false);
            return;
        }

        try {
            // 1. Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: securityData.currentPassword
            });

            if (signInError) throw new Error("La contraseña actual es incorrecta.");

            // 2. Update password
            const { error: updateError } = await supabase.auth.updateUser({ password: securityData.newPassword });
            if (updateError) throw updateError;

            setMessage({ type: 'success', text: "Contraseña actualizada correctamente." });
            setSecurityData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleEmailUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (securityData.newEmail === userEmail) {
            setMessage({ type: 'error', text: "El nuevo correo debe ser diferente al actual." });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ email: securityData.newEmail });
            if (error) throw error;
            setMessage({ type: 'success', text: "Se ha enviado un enlace de confirmación a tu nuevo correo. Revisa tu bandeja de entrada." });
            setSecurityData(prev => ({ ...prev, newEmail: '' }));
        } catch (err: any) {
             setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };
    
    const inputStyle: React.CSSProperties = {
        ...styles.input,
        backgroundColor: 'var(--background-color)',
        borderColor: 'var(--border-color)',
        borderRadius: '8px',
        padding: '0.8rem 1rem',
        fontSize: '0.95rem',
        marginBottom: 0
    };
    
    const labelStyle: React.CSSProperties = {
        ...styles.label,
        fontSize: '0.9rem',
        marginBottom: '0.5rem',
        color: 'var(--text-color)'
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '2rem',
        boxShadow: 'var(--shadow)',
        marginBottom: '2rem'
    };

    const sectionTitleStyle: React.CSSProperties = {
        color: 'var(--primary-color)', 
        fontSize: '1rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.5rem', 
        marginBottom: '1.5rem', 
        marginTop: '0',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };
    
    const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
        <button 
            onClick={() => { setActiveTab(id); setMessage(null); }}
            style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === id ? 'var(--surface-color)' : 'transparent',
                color: activeTab === id ? 'var(--primary-color)' : 'var(--text-light)',
                borderBottom: activeTab === id ? '3px solid var(--primary-color)' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
            }}
        >
            <span>{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="fade-in" style={{maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem'}}>
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Configuración de Cuenta</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Gestiona tu perfil público, seguridad y preferencias.
                </p>
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', marginBottom: '2rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                <TabButton id="profile" label="Perfil Profesional" icon={ICONS.user} />
                <TabButton id="theme" label="Apariencia" icon={ICONS.sparkles} />
                <TabButton id="security" label="Cuenta y Seguridad" icon={ICONS.lock} />
            </div>

            {/* Feedback Message */}
            {message && (
                <div style={{
                    padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontWeight: 600, textAlign: 'center',
                    backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: message.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`
                }}>
                    {message.text}
                </div>
            )}
            
            {activeTab === 'profile' && (
                <div className="fade-in">
                    <div style={cardStyle}>
                        <h3 style={sectionTitleStyle}>{ICONS.user} Información Pública</h3>
                        <form id="ally-profile-edit-form" onSubmit={handleProfileSubmit}>
                            <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px'}}>
                                <div style={{position: 'relative', width: '100px', height: '100px'}}>
                                    <img
                                        src={avatarPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.full_name || '?'}&radius=50`}
                                        alt="Avatar"
                                        style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)'}}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            position: 'absolute', bottom: 0, right: 0, 
                                            backgroundColor: 'var(--primary-color)', color: 'white', 
                                            border: '2px solid var(--surface-color)', borderRadius: '50%', 
                                            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {ICONS.edit}
                                    </button>
                                    <input ref={fileInputRef} name="avatar" type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                                </div>
                                <div>
                                    <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.2rem'}}>Foto de Perfil</h3>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>Esta imagen será visible para las clínicas en el directorio.</p>
                                </div>
                            </div>

                            <div style={{display: 'grid', gap: '1.5rem', marginBottom: '2rem'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                                    <div>
                                        <label style={labelStyle} htmlFor="full_name">Nombre Completo *</label>
                                        <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleProfileChange} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle} htmlFor="specialty">Especialidad *</label>
                                        <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleProfileChange} required style={inputStyle} />
                                    </div>
                                </div>
                                
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                                    <div>
                                        <label style={labelStyle} htmlFor="phone_number">Teléfono</label>
                                        <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleProfileChange} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle} htmlFor="website">Sitio Web</label>
                                        <input id="website" name="website" type="url" value={formData.website} onChange={handleProfileChange} placeholder="https://" style={inputStyle} />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle} htmlFor="office_address">Dirección de Consultorio</label>
                                    <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleProfileChange} style={inputStyle} />
                                </div>

                                <div>
                                    <label style={labelStyle} htmlFor="biography">Biografía Profesional</label>
                                    <textarea id="biography" name="biography" value={formData.biography} onChange={handleProfileChange} rows={5} placeholder="Describe tu experiencia, enfoque y servicios..." style={{...inputStyle, resize: 'vertical', minHeight: '100px'}} />
                                </div>
                            </div>

                            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                                <button type="submit" disabled={loading} className="button-primary" style={{padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '10px'}}>
                                    {loading ? 'Guardando...' : 'Guardar Perfil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'theme' && (
                 <div className="fade-in">
                    <div style={cardStyle}>
                        <h3 style={sectionTitleStyle}>{ICONS.sparkles} Personalización</h3>
                        <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>Selecciona el tema visual de tu portal.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
                            {themeOptions.map(theme => {
                                const isSelected = formData.theme === theme.id;
                                return (
                                    <div 
                                        key={theme.id} 
                                        onClick={() => setFormData(prev => ({...prev, theme: theme.id}))}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'var(--surface-hover-color)' : 'transparent',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <p style={{fontWeight: 600, margin: 0, fontSize: '0.9rem'}}>{theme.name}</p>
                                            {isSelected && <span style={{color: 'var(--primary-color)'}}>✓</span>}
                                        </div>
                                        <div style={{display: 'flex', gap: '4px'}}>
                                            {theme.colors.map((c, i) => (
                                                <div key={i} style={{width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c, border: '1px solid #ddd'}}></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                             <button onClick={handleProfileSubmit} disabled={loading} className="button-primary" style={{padding: '0.8rem 2rem'}}>
                                {loading ? 'Guardando...' : 'Aplicar Tema'}
                            </button>
                        </div>
                    </div>
                 </div>
            )}

            {activeTab === 'security' && (
                <div className="fade-in">
                    <div style={cardStyle}>
                        <h3 style={sectionTitleStyle}>{ICONS.lock} Cambiar Contraseña</h3>
                        <form onSubmit={handlePasswordUpdate}>
                            <div style={{marginBottom: '1.5rem'}}>
                                <label style={labelStyle}>Contraseña Actual</label>
                                <input type="password" name="currentPassword" value={securityData.currentPassword} onChange={handleSecurityChange} required style={inputStyle} placeholder="••••••••"/>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
                                <div>
                                    <label style={labelStyle}>Nueva Contraseña</label>
                                    <input type="password" name="newPassword" value={securityData.newPassword} onChange={handleSecurityChange} required minLength={6} style={inputStyle} placeholder="Mínimo 6 caracteres"/>
                                </div>
                                <div>
                                    <label style={labelStyle}>Confirmar Contraseña</label>
                                    <input type="password" name="confirmPassword" value={securityData.confirmPassword} onChange={handleSecurityChange} required minLength={6} style={inputStyle} placeholder="Repite la contraseña"/>
                                </div>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                                <button type="submit" disabled={loading} className="button-secondary" style={{padding: '0.8rem 2rem'}}>
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>

                    <div style={cardStyle}>
                        <h3 style={sectionTitleStyle}>{ICONS.send} Cambiar Correo Electrónico</h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                            <span style={{color: 'var(--primary-color)', fontSize: '1.5rem'}}>✉️</span>
                            <div>
                                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--primary-dark)', fontWeight: 600}}>Correo Actual</p>
                                <p style={{margin: 0, fontSize: '1rem'}}>{userEmail}</p>
                            </div>
                        </div>
                        <form onSubmit={handleEmailUpdate}>
                            <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
                                <div style={{flex: 1}}>
                                    <label style={labelStyle}>Nuevo Correo Electrónico</label>
                                    <input type="email" name="newEmail" value={securityData.newEmail} onChange={handleSecurityChange} required style={inputStyle} placeholder="nuevo@ejemplo.com"/>
                                </div>
                                <button type="submit" disabled={loading} className="button-secondary" style={{padding: '0.8rem 1.5rem', height: '42px', marginBottom: 0}}>
                                    Solicitar Cambio
                                </button>
                            </div>
                            <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>Se enviará un enlace de confirmación a tu nueva dirección.</p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllyProfileEditPage;
