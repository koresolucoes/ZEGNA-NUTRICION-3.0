import React, { FC, useState, useEffect, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Database } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';

const ProfileFormPage: FC<{ onBack: () => void; user: User; }> = ({ onBack, user }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        professional_title: '',
        license_number: '',
        contact_phone: '',
        office_address: '',
        biography: '',
        avatar_url: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('nutritionist_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                setError(error.message);
            } else if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    professional_title: data.professional_title || '',
                    license_number: data.license_number || '',
                    contact_phone: data.contact_phone || '',
                    office_address: data.office_address || '',
                    biography: data.biography || '',
                    avatar_url: data.avatar_url || '',
                });
            }
            setLoading(false);
        };
        fetchProfile();
    }, [user.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            let newAvatarUrl = formData.avatar_url;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`; // Add timestamp to bust cache
            }

            const payload: Database['public']['Tables']['nutritionist_profiles']['Insert'] = {
                user_id: user.id,
                full_name: formData.full_name || null,
                professional_title: formData.professional_title || null,
                license_number: formData.license_number || null,
                contact_phone: formData.contact_phone || null,
                office_address: formData.office_address || null,
                biography: formData.biography || null,
                avatar_url: newAvatarUrl || null,
            };

            const { error: dbError } = await supabase.from('nutritionist_profiles').upsert(payload, { onConflict: 'user_id'});
            
            if (dbError) throw dbError;
            
            onBack();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '7rem' }}>
            <div style={styles.pageHeader}>
                <h1>Editar Perfil Profesional</h1>
                <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
            </div>
            <form id="profile-form" onSubmit={handleSubmit} style={{maxWidth: '700px'}}>
                {error && <p style={styles.error}>{error}</p>}
                
                <label htmlFor="avatar">Foto de Perfil</label>
                <input id="avatar" name="avatar" type="file" onChange={handleFileChange} accept="image/*" />

                <label htmlFor="full_name">Nombre Completo</label>
                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} />
                
                <label htmlFor="professional_title">Título Profesional</label>
                <input id="professional_title" name="professional_title" type="text" value={formData.professional_title} onChange={handleChange} placeholder="Ej: Nutriólogo Clínico"/>

                <label htmlFor="license_number">Cédula Profesional</label>
                <input id="license_number" name="license_number" type="text" value={formData.license_number} onChange={handleChange} />
                
                <label htmlFor="contact_phone">Teléfono de Contacto</label>
                <input id="contact_phone" name="contact_phone" type="tel" value={formData.contact_phone} onChange={handleChange} />

                <label htmlFor="office_address">Dirección del Consultorio</label>
                <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleChange} />
                
                <label htmlFor="biography">Biografía / Resumen Profesional</label>
                <textarea id="biography" name="biography" value={formData.biography} onChange={handleChange} rows={4}></textarea>
            </form>
            <div style={styles.floatingActions}>
                <button type="button" onClick={onBack} className="button-secondary">Cancelar</button>
                <button type="submit" form="profile-form" disabled={loading} style={styles.floatingSaveButton} aria-label="Guardar Cambios">
                    {loading ? '...' : ICONS.save}
                </button>
            </div>
        </div>
    );
};

export default ProfileFormPage;