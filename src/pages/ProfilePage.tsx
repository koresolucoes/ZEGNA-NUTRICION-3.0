import React, { FC, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { NutritionistProfile } from '../types';

interface ProfilePageProps {
    user: User;
    onEditProfile: () => void;
}

const ProfilePage: FC<ProfilePageProps> = ({ user, onEditProfile }) => {
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('nutritionist_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
                    throw error;
                }
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user.id]);
    
    const infoItemStyle: React.CSSProperties = {
        padding: '0.75rem 0',
        borderBottom: `1px solid var(--border-color)`
    };

    if (loading) return <p>Cargando perfil...</p>;
    if (error) return <p style={styles.error}>{error}</p>;

    return (
        <div className="fade-in">
            <div style={styles.pageHeader}>
                <h1>Mi Perfil Profesional</h1>
                <button onClick={onEditProfile}>{ICONS.edit} Editar Perfil</button>
            </div>

            {profile ? (
                 <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem 3rem', alignItems: 'flex-start', maxWidth: '800px'}}>
                    <div style={{gridRow: 'span 2'}}>
                        <img 
                            src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || user.email}&radius=50&backgroundColor=28a745`} 
                            alt="Foto de perfil" 
                            style={{width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary-color)'}}
                        />
                    </div>
                    <div>
                        <h2 style={{margin: 0, fontSize: '1.8rem'}}>{profile.full_name || 'Nombre no definido'}</h2>
                        <p style={{margin: '0.25rem 0', color: 'var(--primary-color)', fontWeight: 500}}>{profile.professional_title || 'Título no definido'}</p>
                    </div>

                    <div style={{gridColumn: '1 / -1'}}>
                        <div style={infoItemStyle}>
                            <p style={styles.detailGroupTitle}>Cédula Profesional</p>
                            <p style={{margin: 0}}>{profile.license_number || '-'}</p>
                        </div>
                         <div style={infoItemStyle}>
                            <p style={styles.detailGroupTitle}>Correo Electrónico</p>
                            <p style={{margin: 0}}>{user.email}</p>
                        </div>
                        <div style={infoItemStyle}>
                            <p style={styles.detailGroupTitle}>Teléfono de Contacto</p>
                            <p style={{margin: 0}}>{profile.contact_phone || '-'}</p>
                        </div>
                         <div style={infoItemStyle}>
                            <p style={styles.detailGroupTitle}>Dirección del Consultorio</p>
                            <p style={{margin: 0}}>{profile.office_address || '-'}</p>
                        </div>
                        <div style={{...infoItemStyle, borderBottom: 'none'}}>
                            <p style={styles.detailGroupTitle}>Biografía Profesional</p>
                            <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{profile.biography || '-'}</p>
                        </div>
                    </div>
                 </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px'}}>
                    <h2 style={{color: 'var(--primary-color)'}}>Completa tu perfil</h2>
                    <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>Añade tu información profesional para que tus pacientes y colaboradores te conozcan mejor.</p>
                    <button onClick={onEditProfile}>{ICONS.add} Crear mi Perfil</button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;