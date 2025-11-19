
import React, { FC, useState, useEffect, FormEvent, useRef } from 'react';
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
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                setAvatarPreview(data.avatar_url || null);
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

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // High elevation
        width: '100%',
        maxWidth: '700px',
        margin: '2rem auto',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
    };

    const sectionTitleStyle: React.CSSProperties = {
        color: 'var(--primary-color)', 
        fontSize: '0.9rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.5rem', 
        marginBottom: '1.5rem', 
        marginTop: '2rem',
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase'
    };

    return (
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: '1rem' }}>
            <div style={modalStyle}>
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={styles.modalTitle}>Editar Perfil Profesional</h2>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>Actualiza tu información pública para pacientes y colegas.</p>
                    </div>
                    <button onClick={onBack} style={{...styles.iconButton, width: '32px', height: '32px', border: 'none'}} title="Cerrar">{ICONS.close}</button>
                </div>
                
                <div style={{ padding: '0', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
                     <form id="profile-form" onSubmit={handleSubmit} style={{padding: '2rem'}}>
                        {error && <p style={styles.error}>{error}</p>}
                        
                        {/* Avatar Section */}
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                             <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                                <img
                                    src={avatarPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.full_name || '?'}&radius=50`}
                                    alt="Avatar"
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                />
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--primary-color)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--surface-color)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                    title="Cambiar foto"
                                >
                                    {ICONS.edit}
                                </button>
                                <input ref={fileInputRef} name="avatar" type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                            </div>
                            <div>
                                <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-color)'}}>Foto de Perfil</h3>
                                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: 1.4}}>Esta imagen será visible en tu tarjeta de presentación digital y en el directorio.</p>
                            </div>
                        </div>

                        <h3 style={{...sectionTitleStyle, marginTop: 0}}>Datos Principales</h3>
                        <div style={{display: 'grid', gap: '1.5rem'}}>
                            <div>
                                <label htmlFor="full_name">Nombre Completo *</label>
                                <input id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} required style={styles.input} placeholder="Dr. Juan Pérez" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label htmlFor="professional_title">Título Profesional</label>
                                    <input id="professional_title" name="professional_title" type="text" value={formData.professional_title} onChange={handleChange} placeholder="Ej: Nutriólogo Clínico" style={styles.input} />
                                </div>
                                <div>
                                    <label htmlFor="license_number">Cédula Profesional</label>
                                    <input id="license_number" name="license_number" type="text" value={formData.license_number} onChange={handleChange} placeholder="12345678" style={styles.input} />
                                </div>
                            </div>
                        </div>

                        <h3 style={sectionTitleStyle}>Contacto y Ubicación</h3>
                        <div style={{display: 'grid', gap: '1.5rem'}}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
                                <div>
                                    <label htmlFor="contact_phone">Teléfono</label>
                                    <input id="contact_phone" name="contact_phone" type="tel" value={formData.contact_phone} onChange={handleChange} style={styles.input} />
                                </div>
                                <div>
                                    <label htmlFor="office_address">Dirección del Consultorio</label>
                                    <input id="office_address" name="office_address" type="text" value={formData.office_address} onChange={handleChange} placeholder="Calle, Número, Colonia..." style={styles.input} />
                                </div>
                            </div>
                        </div>
                        
                        <h3 style={sectionTitleStyle}>Presentación</h3>
                        <label htmlFor="biography">Biografía / Resumen Profesional</label>
                        <textarea 
                            id="biography" 
                            name="biography" 
                            value={formData.biography} 
                            onChange={handleChange} 
                            rows={5} 
                            style={styles.input} 
                            placeholder="Describe tu experiencia, especialidades y enfoque de tratamiento..."
                        ></textarea>
                    </form>
                </div>

                <div style={styles.modalFooter}>
                    <button type="button" onClick={onBack} className="button-secondary">Cancelar</button>
                    <button type="submit" form="profile-form" disabled={loading} style={{minWidth: '140px'}}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileFormPage;
