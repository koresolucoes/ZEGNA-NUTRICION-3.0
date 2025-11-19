
import React, { FC, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { NutritionistProfile } from '../types';
import SkeletonLoader from '../components/shared/SkeletonLoader';

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

                if (error && error.code !== 'PGRST116') {
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
    
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        maxWidth: '1000px',
        margin: '0 auto'
    };

    const headerBackgroundStyle: React.CSSProperties = {
        background: 'linear-gradient(to right, var(--surface-hover-color), var(--surface-color))',
        padding: '2.5rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '2rem',
        justifyContent: 'center'
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '1.1rem',
        color: 'var(--primary-color)',
        marginBottom: '1.5rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const DetailItem: FC<{ icon: React.ReactNode, label: string, value: string | null }> = ({ icon, label, value }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--primary-color)', backgroundColor: 'var(--surface-color)', padding: '0.6rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div style={{flex: 1, overflow: 'hidden'}}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-color)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '-'}</p>
            </div>
        </div>
    );

    if (loading) return <div className="fade-in" style={{padding: '2rem'}}><SkeletonLoader type="detail" count={1} /></div>;
    if (error) return <div className="fade-in" style={{padding: '2rem'}}><p style={styles.error}>{error}</p></div>;

    return (
        <div className="fade-in" style={{ paddingBottom: '4rem' }}>
            <div style={{...styles.pageHeader, maxWidth: '1000px', margin: '0 auto 1.5rem auto'}}>
                <h1 style={{margin: 0, fontSize: '1.8rem', fontWeight: 700}}>Mi Perfil Profesional</h1>
                <button onClick={onEditProfile} className="button-primary" style={{padding: '0.6rem 1.2rem'}}>
                    {ICONS.edit} Editar Perfil
                </button>
            </div>

            {profile ? (
                <div style={cardStyle}>
                    <div style={headerBackgroundStyle}>
                        <div style={{position: 'relative'}}>
                            <div style={{
                                position: 'absolute', inset: -4, borderRadius: '50%', 
                                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', 
                                opacity: 0.5, filter: 'blur(4px)'
                            }}></div>
                            <img 
                                src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || user.email}&radius=50&backgroundColor=ffffff`} 
                                alt="Foto de perfil" 
                                style={{position: 'relative', width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', boxShadow: 'var(--shadow)', backgroundColor: 'var(--surface-color)'}}
                            />
                        </div>
                        <div style={{flex: 1, minWidth: '250px', textAlign: window.innerWidth < 600 ? 'center' : 'left'}}>
                            <h2 style={{margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-color)'}}>
                                {profile.full_name || 'Nombre no definido'}
                            </h2>
                            <p style={{margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)', fontWeight: 500}}>
                                {profile.professional_title || 'Título Profesional'}
                            </p>
                             {profile.license_number && (
                                <div style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', backgroundColor: 'var(--surface-color)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                    <span style={{color: 'var(--primary-color)'}}>{ICONS.briefcase}</span>
                                    <span style={{fontWeight: 600}}>Cédula:</span> {profile.license_number}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{padding: '2.5rem'}}>
                        <h3 style={sectionTitleStyle}>{ICONS.user} Información de Contacto</h3>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem'}}>
                            <DetailItem icon={ICONS.send} label="Correo Electrónico" value={user.email || ''} />
                            <DetailItem icon={ICONS.phone} label="Teléfono" value={profile.contact_phone} />
                            <DetailItem icon={ICONS.mapPin} label="Consultorio" value={profile.office_address} />
                        </div>

                        <h3 style={sectionTitleStyle}>{ICONS.book} Acerca de Mí</h3>
                        <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '2rem', borderRadius: '16px', lineHeight: 1.7, color: 'var(--text-color)', border: '1px solid var(--border-color)'}}>
                            {profile.biography ? (
                                <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{profile.biography}</p>
                            ) : (
                                <div style={{textAlign: 'center', padding: '1rem'}}>
                                    <p style={{margin: '0 0 1rem 0', color: 'var(--text-light)', fontStyle: 'italic'}}>No has añadido una biografía aún.</p>
                                    <button onClick={onEditProfile} className="button-secondary" style={{fontSize: '0.9rem'}}>Añadir Biografía</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', maxWidth: '600px', margin: '2rem auto'}}>
                    <div style={{fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary-color)'}}>{ICONS.user}</div>
                    <h2 style={{margin: '0 0 1rem 0', color: 'var(--text-color)'}}>Completa tu perfil profesional</h2>
                    <p style={{color: 'var(--text-light)', marginBottom: '2rem', lineHeight: 1.6}}>Añade tu información profesional, foto y biografía para que tus pacientes y colaboradores te conozcan mejor y generar confianza.</p>
                    <button onClick={onEditProfile} className="button-primary" style={{padding: '0.8rem 2rem', fontSize: '1rem'}}>Crear mi Perfil</button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
