
import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Clinic, NutritionistProfileForAllyView } from '../../types';

interface ClinicDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinic: Clinic;
}

const modalRoot = document.getElementById('modal-root');

const ClinicDetailsModal: FC<ClinicDetailsModalProps> = ({ isOpen, onClose, clinic }) => {
    const [nutritionists, setNutritionists] = useState<NutritionistProfileForAllyView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchNutritionists = async () => {
            setLoading(true);
            setError(null);
            try {
                // Step 1: Get user_ids of relevant members from the clinic
                const { data: members, error: membersError } = await supabase
                    .from('clinic_members')
                    .select('user_id')
                    .eq('clinic_id', clinic.id)
                    .in('role', ['nutritionist', 'admin']);

                if (membersError) throw membersError;

                const userIds = members.map(m => m.user_id);

                // Step 2: If we found members, fetch their profiles
                if (userIds.length > 0) {
                    const { data: profiles, error: profilesError } = await supabase
                        .from('nutritionist_profiles')
                        .select('full_name, avatar_url, professional_title, biography')
                        .in('user_id', userIds);
                    
                    if (profilesError) throw profilesError;
                    setNutritionists(profiles || []);
                } else {
                    // If no members found, the team is empty
                    setNutritionists([]);
                }
            } catch (err: any) {
                setError(`Error al cargar el equipo: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchNutritionists();
    }, [isOpen, clinic.id]);

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '700px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                         <img 
                            src={clinic.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic.name?.charAt(0) || 'C'}&radius=50`} 
                            alt="logo" 
                            style={{width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover'}} 
                        />
                        <div>
                            <h2 style={{...styles.modalTitle, margin: 0}}>{clinic.name}</h2>
                            <p style={{margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem'}}>{clinic.address}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        {clinic.phone_number && <span style={{display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.phone}{clinic.phone_number}</span>}
                        {clinic.email && <a href={`mailto:${clinic.email}`} style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.send}{clinic.email}</a>}
                        {clinic.website && <a href={clinic.website} target="_blank" rel="noopener noreferrer" style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.35rem'}}>{ICONS.link}Sitio Web</a>}
                    </div>

                    <h3 style={{fontSize: '1.1rem', color: 'var(--primary-color)', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>Equipo de Nutricionistas</h3>
                    {loading && <p>Cargando equipo...</p>}
                    {error && <p style={styles.error}>{error}</p>}
                    {!loading && nutritionists.length > 0 && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            {nutritionists.map((profile, index) => (
                                <div key={index} style={{display: 'flex', gap: '1rem', alignItems: 'flex-start'}}>
                                     <img 
                                        src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || '?'}&radius=50`}
                                        alt="avatar"
                                        style={{width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover'}}
                                    />
                                    <div>
                                        <h4 style={{margin: 0}}>{profile.full_name}</h4>
                                        <p style={{margin: '0.25rem 0 0.5rem 0', color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.9rem'}}>{profile.professional_title}</p>
                                        <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>{profile.biography}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                     {!loading && nutritionists.length === 0 && <p>No se encontró información del equipo de nutricionistas.</p>}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ClinicDetailsModal;
