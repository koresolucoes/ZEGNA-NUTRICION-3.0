import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase, Database } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';

const AllyProfileSetupPage: FC<{ onProfileComplete: () => void; }> = ({ onProfileComplete }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        specialty: '',
        phone_number: '',
        biography: '',
        office_address: '',
        website: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("No se pudo encontrar al usuario.");
                setLoading(false);
                return;
            }
            
            const { data, error } = await supabase
                .from('allies')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                setError(error.message);
            } else if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    specialty: data.specialty || '',
                    phone_number: data.phone_number || '',
                    biography: data.biography || '',
                    office_address: data.office_address || '',
                    website: data.website || '',
                });
                setAvatarPreview(data.avatar_url || null);
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No hay un usuario autenticado.");

            const { data: existingProfile } = await supabase.from('allies').select('avatar_url').eq('user_id', user.id).single();
            let avatar_url = existingProfile?.avatar_url || null;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `ally-avatars/${user.id}/avatar.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatar_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const payload: any = { 
                full_name: formData.full_name,
                specialty: formData.specialty,
                phone_number: formData.phone_number || null,
                biography: formData.biography || null,
                office_address: formData.office_address || null,
                website: formData.website || null,
                avatar_url: avatar_url,
            };

            const { error: dbError } = await supabase
                .from('allies')
                .update(payload)
                .eq('user_id', user.id);
            
            if (dbError) throw dbError;
            
            onProfileComplete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.authContainer}>
            <div style={{...styles.authBox, maxWidth: '700px'}} className="fade-in">
                 <div style={styles.header}>
                    <h1 style={styles.title}>Completa tu Perfil de Colaborador</h1>
                    <p style={{color: '#495057'}}>Esta información será visible para las clínicas en el directorio de aliados.</p>
                </div>

                {error && <p style={styles.error}>{error}</p>}
                
                <form id="ally-profile-form" onSubmit={handleSubmit}>
                    <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem'}}>
                        <img
                            src={avatarPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.full_name || '?'}&radius=50`}
                            alt="Vista previa del avatar"
                            style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}}
                        />
                        <div style={{flex: 1}}>
                            <label htmlFor="avatar">Foto de Perfil</label>
                            <input id="avatar" name="avatar" type="file" onChange={handleFileChange} accept="image/*" style={{backgroundColor: '#f1f3f5', border: 'none', padding: '10px 0'}} />
                        </div>
                    </div>
                    <label htmlFor="full_name">Nombre Completo*</label>
                    <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required style={{backgroundColor: '#f1f3f5'}}/>
                    
                    <label htmlFor="specialty">Especialidad*</label>
                    <input id="specialty" name="specialty" type="text" value={formData.specialty} onChange={handleChange} placeholder="Ej: Médico General, Entrenador Personal" required style={{backgroundColor: '#f1f3f5'}}/>

                    <label htmlFor="phone_number">Teléfono</label>
                    <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} style={{backgroundColor: '#f1f3f5'}}/>
                    
                    <label htmlFor="office_address">Dirección de Consultorio</label>
                    <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleChange} placeholder="Calle, Número, Ciudad" style={{backgroundColor: '#f1f3f5'}}/>

                    <label htmlFor="website">Sitio Web o Red Social Profesional</label>
                    <input id="website" name="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://ejemplo.com" style={{backgroundColor: '#f1f3f5'}}/>
                    
                    <label htmlFor="biography">Biografía Profesional Breve</label>
                    <textarea id="biography" name="biography" value={formData.biography} onChange={handleChange} rows={4} placeholder="Describe tus servicios, experiencia y enfoque." style={{backgroundColor: '#f1f3f5'}}/>
                </form>

                 <div style={{...styles.formActions, justifyContent: 'flex-end'}}>
                    <button type="submit" form="ally-profile-form" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar y Continuar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllyProfileSetupPage;