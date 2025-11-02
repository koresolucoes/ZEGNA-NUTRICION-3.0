import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

const themeOptions = [
    { id: 'default', name: 'Zegna Azul (Default)', colors: ['#007BFF', '#17A2B8', '#343A40', '#212529'] },
    { id: 'natural', name: 'Salud y Frescura', colors: ['#8FBC8F', '#F4A261', '#3a423a', '#242b24'] },
    { id: 'clinical', name: 'Serenidad Clínica', colors: ['#6A8EAE', '#C5A169', '#383f45', '#272d31'] },
    { id: 'vitality', name: 'Energía y Vitalidad', colors: ['#E57A44', '#48B2A7', '#443d3a', '#2c2826'] },
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

    return (
        <div className="fade-in">
            <div style={styles.pageHeader}>
                <h1>Editar Perfil Profesional</h1>
            </div>
            
            <form id="ally-profile-edit-form" onSubmit={handleSubmit} style={{maxWidth: '700px'}}>
                {error && <p style={styles.error}>{error}</p>}
                {success && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{success}</p>}

                 <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <img
                        src={avatarPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.full_name || '?'}&radius=50`}
                        alt="Vista previa del avatar"
                        style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}}
                    />
                    <div style={{flex: 1}}>
                        <label htmlFor="avatar">Foto de Perfil</label>
                        <input id="avatar" name="avatar" type="file" onChange={handleFileChange} accept="image/*" />
                    </div>
                </div>

                <label htmlFor="full_name">Nombre Completo*</label>
                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required />
                
                <label htmlFor="specialty">Especialidad*</label>
                <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleChange} required />

                <label htmlFor="phone_number">Teléfono</label>
                <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} />

                <label htmlFor="office_address">Dirección de Consultorio</label>
                <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleChange} placeholder="Calle, Número, Ciudad" />

                <label htmlFor="website">Sitio Web o Red Social Profesional</label>
                <input id="website" name="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://ejemplo.com" />
                
                <label htmlFor="biography">Biografía Profesional Breve</label>
                <textarea id="biography" name="biography" value={formData.biography} onChange={handleChange} rows={4} placeholder="Describe tus servicios..." />
                
                <h3 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '2rem' }}>Tema del Portal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
                    {themeOptions.map(theme => {
                        const isSelected = formData.theme === theme.id;
                        return (
                            <div 
                                key={theme.id} 
                                onClick={() => setFormData(prev => ({...prev, theme: theme.id}))}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : 'none'
                                }}
                            >
                                <p style={{fontWeight: 600, margin: '0 0 1rem 0'}}>{theme.name}</p>
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                    <div style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: theme.colors[0]}} title={`Primario: ${theme.colors[0]}`}></div>
                                    <div style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: theme.colors[1]}} title={`Acento: ${theme.colors[1]}`}></div>
                                    <div style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: theme.colors[2]}} title={`Superficie: ${theme.colors[2]}`}></div>
                                    <div style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: theme.colors[3]}} title={`Fondo: ${theme.colors[3]}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{...styles.formActions, justifyContent: 'flex-end', marginTop: '2rem'}}>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AllyProfileEditPage;