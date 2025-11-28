
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
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        
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
            
            setSuccess("¡Perfil actualizado con éxito!");
            onProfileUpdate();
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && !formData.full_name) {
        return <p>Cargando perfil...</p>;
    }
    
    const inputStyle: React.CSSProperties = {
        ...styles.input,
        backgroundColor: 'var(--background-color)',
        borderColor: 'var(--border-color)',
        borderRadius: '8px',
        padding: '0.8rem 1rem',
        fontSize: '1rem',
        marginBottom: 0
    };
    
    const labelStyle: React.CSSProperties = {
        ...styles.label,
        fontSize: '0.9rem',
        marginBottom: '0.5rem',
        color: 'var(--text-color)'
    };

    return (
        <div className="fade-in" style={{maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem'}}>
            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Mi Perfil Profesional</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Esta información será visible para otros profesionales en la red.
                </p>
            </div>
            
            <div style={{backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '2rem', boxShadow: 'var(--shadow)'}}>
                <form id="ally-profile-edit-form" onSubmit={handleSubmit}>
                    {error && <p style={styles.error}>{error}</p>}
                    {success && <div style={{padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600, textAlign: 'center'}}>{success}</div>}

                     <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px'}}>
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
                            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.2rem'}}>Foto Pública</h3>
                            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>Tu imagen de presentación en el directorio.</p>
                        </div>
                    </div>

                    <div style={{display: 'grid', gap: '1.5rem', marginBottom: '2rem'}}>
                         <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                             <div>
                                <label style={labelStyle} htmlFor="full_name">Nombre Completo *</label>
                                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor="specialty">Especialidad *</label>
                                <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>
                        
                         <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                             <div>
                                <label style={labelStyle} htmlFor="phone_number">Teléfono</label>
                                <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor="website">Sitio Web</label>
                                <input id="website" name="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://" style={inputStyle} />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="office_address">Dirección de Consultorio</label>
                            <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleChange} style={inputStyle} />
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="biography">Biografía Profesional</label>
                            <textarea id="biography" name="biography" value={formData.biography} onChange={handleChange} rows={5} placeholder="Describe tu experiencia y servicios..." style={{...inputStyle, resize: 'vertical', minHeight: '100px'}} />
                        </div>
                    </div>
                    
                    <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1rem' }}>Tema del Portal</h3>
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
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <p style={{fontWeight: 600, margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>{theme.name}</p>
                                    <div style={{display: 'flex', gap: '4px'}}>
                                        <div style={{width: '20px', height: '20px', borderRadius: '50%', backgroundColor: theme.colors[0]}}></div>
                                        <div style={{width: '20px', height: '20px', borderRadius: '50%', backgroundColor: theme.colors[1]}}></div>
                                        <div style={{width: '20px', height: '20px', borderRadius: '50%', backgroundColor: theme.colors[2], border: '1px solid #ddd'}}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                        <button type="submit" disabled={loading} className="button-primary" style={{padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '10px'}}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AllyProfileEditPage;
