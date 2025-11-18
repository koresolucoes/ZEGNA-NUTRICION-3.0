
import React, { useState, FC, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Ally } from '../../types';
import AllyReferralsPage from '../../pages/ally_portal/AllyReferralsPage';
import AllyPartnershipsPage from '../../pages/ally_portal/AllyPartnershipsPage';
import AllyProfileEditPage from '../../pages/ally_portal/AllyProfileEditPage';
import AllyClinicDirectoryPage from '../../pages/ally_portal/AllyClinicDirectoryPage';
import AllyNotificationsPage from '../../pages/ally_portal/AllyNotificationsPage';
import AllyDirectoryPage from '../../pages/ally_portal/AllyDirectoryPage';
import { useThemeManager } from '../../contexts/ThemeContext';
import AffiliatesPage from '../../pages/AffiliatesPage';

const AllyPortalLayout: FC<{ session: Session }> = ({ session }) => {
    const [view, setView] = useState('referrals');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 960);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [allyProfile, setAllyProfile] = useState<Ally | null>(null);
    const { setTheme } = useThemeManager();
    
    // Dropdown state
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownTimeoutRef = useRef<number | null>(null);

    const fetchProfile = useCallback(async () => {
        const { data } = await supabase.from('allies').select('*').eq('user_id', session.user.id).single();
        setAllyProfile(data);
    }, [session.user.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);
    
    useEffect(() => {
        if (allyProfile?.theme) {
            setTheme(allyProfile.theme);
        } else {
            setTheme('default');
        }
    }, [allyProfile, setTheme]);


    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 960;
            if (isMobile !== mobile) {
                setIsMobile(mobile);
                if (!mobile) setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    const navigate = (page: string) => {
        setView(page);
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
    };
    
    const handleProfileUpdate = () => {
        fetchProfile();
    };
    
    // Dropdown Logic
    const handleMouseEnter = (key: string) => {
        if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
        setActiveDropdown(key);
    };

    const handleMouseLeave = () => {
        dropdownTimeoutRef.current = window.setTimeout(() => {
            setActiveDropdown(null);
        }, 200);
    };


    const renderContent = () => {
        switch (view) {
            case 'referrals':
                return <AllyReferralsPage />;
            case 'partnerships':
                return <AllyPartnershipsPage />;
            case 'directory':
                return <AllyClinicDirectoryPage />;
            case 'ally-directory':
                return <AllyDirectoryPage navigate={navigate} />;
            case 'profile':
                return <AllyProfileEditPage onProfileUpdate={handleProfileUpdate} />;
            case 'notifications':
                return <AllyNotificationsPage />;
            case 'affiliates':
                return <AffiliatesPage navigate={navigate} />;
            default:
                return <AllyReferralsPage />;
        }
    };

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode }> = ({ name, pageName, icon }) => {
        const isActive = view.startsWith(pageName);
        return (
            <div
                onClick={() => navigate(pageName)}
                style={{ 
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                    fontWeight: isActive ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    backgroundColor: isActive ? 'var(--surface-hover-color)' : 'transparent'
                }}
                className="nav-item-hover"
                role="button"
                aria-label={`Navegar a ${name}`}
            >
                {icon && <span style={{fontSize: '1.1rem'}}>{icon}</span>}
                {name}
            </div>
        );
    };
    
    // Mobile Nav Item
    const MobileNavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean }> = ({ name, pageName, icon, isSubItem = false }) => {
        const isActive = view.startsWith(pageName);
        return (
            <div
                onClick={() => navigate(pageName)}
                style={{ ...styles.navItem, backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', color: isActive ? 'var(--primary-color)' : 'var(--text-color)', gap: '0.75rem', ...(isSubItem && {paddingLeft: '2.5rem'}) }}
                className="nav-item-hover"
            >
                {icon && <span style={{color: 'var(--primary-color)'}}>{icon}</span>}
                {name}
            </div>
        );
    };

    const NavDropdown: FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; id: string }> = ({ title, icon, children, id }) => {
        const isOpen = activeDropdown === id;
        return (
            <div 
                onMouseEnter={() => handleMouseEnter(id)} 
                onMouseLeave={handleMouseLeave}
                style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            >
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: isOpen ? 'var(--primary-color)' : 'var(--text-color)',
                        fontWeight: 500,
                        height: '40px',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                    className="nav-item-hover"
                >
                    <span style={{fontSize: '1.1rem'}}>{icon}</span>
                    {title}
                    <span style={{ fontSize: '0.7rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>{ICONS.chevronDown}</span>
                </button>
                
                {isOpen && (
                    <div className="fade-in" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        backgroundColor: 'var(--surface-color)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '220px',
                        border: '1px solid var(--border-color)',
                        zIndex: 1000,
                        marginTop: '5px'
                    }}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ ...styles.dashboardLayout, flexDirection: 'column' }}>
            
            {/* TOP NAVBAR */}
            <header style={{
                height: '70px',
                backgroundColor: 'var(--surface-color)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     {isMobile && (
                        <button onClick={() => setIsMobileMenuOpen(true)} style={{...styles.hamburger, padding: '0.5rem', marginRight: '-0.5rem'}}>
                            {ICONS.menu}
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.1rem', fontWeight: 800,
                        }}>
                             {allyProfile?.full_name ? allyProfile.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        {!isMobile && <h2 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', margin: 0 }}>Portal de Aliado</h2>}
                    </div>
                </div>

                {!isMobile && (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                        <NavItem name="Referidos" pageName="referrals" icon={ICONS.transfer} />
                        <NavItem name="Mis Vínculos" pageName="partnerships" icon={ICONS.network} />
                        
                        <NavDropdown title="Directorios" icon={ICONS.book} id="directories">
                            <NavItem name="Clínicas" pageName="directory" icon={ICONS.clinic} />
                            <NavItem name="Aliados" pageName="ally-directory" icon={ICONS.users} />
                        </NavDropdown>
                        
                        <NavItem name="Afiliados" pageName="affiliates" icon={ICONS.sparkles} />
                    </nav>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     {!isMobile && (
                         <NavDropdown 
                            title="" 
                            id="profile" 
                            icon={
                                <img 
                                    src={allyProfile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                                    alt="Profile" 
                                    style={{width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-color)'}}
                                />
                            }
                        >
                            <div style={{padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem'}}>
                                 <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem'}}>{allyProfile?.full_name || 'Colaborador'}</p>
                                 <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>{allyProfile?.specialty}</p>
                             </div>
                             <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                             <NavItem name="Notificaciones" pageName="notifications" icon={ICONS.settings} />
                             <div onClick={() => supabase.auth.signOut()} style={{marginTop: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'}} className="nav-item-hover">
                                 {ICONS.logout} Cerrar Sesión
                             </div>
                        </NavDropdown>
                     )}
                </div>
            </header>

            {/* MOBILE MENU DRAWER */}
            {isMobile && isMobileMenuOpen && (
                <>
                    <div style={{...styles.modalOverlay, zIndex: 1050, justifyContent: 'flex-start', alignItems: 'flex-start'}} onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0, width: '80%', maxWidth: '300px',
                        backgroundColor: 'var(--surface-color)', zIndex: 1100, boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out'
                    }}>
                        <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                             <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)' }}>Menú</h2>
                             <button onClick={() => setIsMobileMenuOpen(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-light)'}}>&times;</button>
                        </div>
                        <div style={{flex: 1, overflowY: 'auto', padding: '1rem'}}>
                            <MobileNavItem name="Gestión de Referidos" pageName="referrals" icon={ICONS.transfer} />
                            <MobileNavItem name="Mis Vínculos" pageName="partnerships" icon={ICONS.network} />
                            <MobileNavItem name="Directorio de Clínicas" pageName="directory" icon={ICONS.clinic} />
                            <MobileNavItem name="Directorio de Aliados" pageName="ally-directory" icon={ICONS.users} />
                            <MobileNavItem name="Programa de Afiliados" pageName="affiliates" icon={ICONS.sparkles} />
                        </div>
                        <div style={{padding: '1rem', borderTop: '1px solid var(--border-color)'}}>
                            <MobileNavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                            <MobileNavItem name="Notificaciones" pageName="notifications" icon={ICONS.settings} />
                            <div onClick={() => supabase.auth.signOut()} style={{...styles.navItem, gap: '0.75rem'}} className="nav-item-hover" role="button">
                                {ICONS.logout}Cerrar Sesión
                            </div>
                        </div>
                    </div>
                    <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
                </>
            )}

            <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
                {renderContent()}
            </main>
        </div>
    );
};

export default AllyPortalLayout;
