
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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Changed breakpoint to standard tablet/mobile split
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
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navigate = (page: string) => {
        setView(page);
        setActiveDropdown(null);
        window.scrollTo(0,0);
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
        const isActive = view === pageName;
        return (
            <div
                onClick={() => navigate(pageName)}
                style={{ 
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-light)',
                    fontWeight: isActive ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    backgroundColor: isActive ? 'var(--surface-hover-color)' : 'transparent',
                    transition: 'all 0.2s ease'
                }}
                className="nav-item-hover"
                role="button"
            >
                {icon}
                {name}
            </div>
        );
    };
    
    // Mobile Bottom Nav Item
    const BottomNavItem: FC<{ name: string, pageName: string, icon: React.ReactNode }> = ({ name, pageName, icon }) => {
        const isActive = view === pageName;
        return (
            <button
                onClick={() => navigate(pageName)}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-light)',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    gap: '4px'
                }}
            >
                <span style={{ fontSize: '1.4rem', transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>{icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{name}</span>
            </button>
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
                        padding: '0.5rem 0.8rem',
                        cursor: 'pointer',
                        color: isOpen ? 'var(--primary-color)' : 'var(--text-light)',
                        fontWeight: 500,
                        height: '40px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                    className="nav-item-hover"
                >
                    {icon}
                    {title}
                    <span style={{ fontSize: '0.7rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>{ICONS.chevronDown}</span>
                </button>
                
                {isOpen && (
                    <div className="fade-in" style={{
                        position: 'absolute',
                        top: '90%',
                        left: 0,
                        backgroundColor: 'var(--surface-color)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '220px',
                        border: '1px solid var(--border-color)',
                        zIndex: 1000,
                    }}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ ...styles.dashboardLayout, flexDirection: 'column' }}>
            
            {/* DESKTOP TOP NAVBAR */}
            {!isMobile && (
                <header style={{
                    height: '70px',
                    backgroundColor: 'var(--surface-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.2rem', fontWeight: 800,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                             Z
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>Portal Colaborador</h2>
                            <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>Red Zegna Nutrición</p>
                        </div>
                    </div>

                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
                        <NavItem name="Dashboard" pageName="referrals" icon={ICONS.home} />
                        <NavItem name="Vínculos" pageName="partnerships" icon={ICONS.network} />
                        
                        <NavDropdown title="Directorios" icon={ICONS.book} id="directories">
                            <NavItem name="Clínicas" pageName="directory" icon={ICONS.clinic} />
                            <NavItem name="Aliados" pageName="ally-directory" icon={ICONS.users} />
                        </NavDropdown>
                        
                        <NavItem name="Afiliados" pageName="affiliates" icon={ICONS.sparkles} />
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <NavDropdown 
                            title="" 
                            id="profile" 
                            icon={
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                    <span style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)'}}>{allyProfile?.full_name?.split(' ')[0] || 'Perfil'}</span>
                                    <img 
                                        src={allyProfile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                                        alt="Profile" 
                                        style={{width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--surface-hover-color)', objectFit: 'cover'}}
                                    />
                                </div>
                            }
                        >
                            <div style={{padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem'}}>
                                 <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)'}}>{allyProfile?.full_name || 'Colaborador'}</p>
                                 <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>{allyProfile?.specialty}</p>
                             </div>
                             <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                             <NavItem name="Notificaciones" pageName="notifications" icon={ICONS.settings} />
                             <div onClick={() => supabase.auth.signOut()} style={{marginTop: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'}} className="nav-item-hover">
                                 {ICONS.logout} Cerrar Sesión
                             </div>
                        </NavDropdown>
                    </div>
                </header>
            )}

            {/* MOBILE HEADER */}
            {isMobile && (
                <header style={{
                    height: '64px',
                    backgroundColor: 'var(--surface-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                            src={allyProfile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                            alt="Profile" 
                            style={{width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover'}}
                        />
                        <span style={{fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-color)'}}>
                            {view === 'referrals' ? 'Inicio' : view === 'partnerships' ? 'Vínculos' : view === 'profile' ? 'Mi Perfil' : 'Zegna'}
                        </span>
                    </div>
                </header>
            )}

            <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
                {renderContent()}
            </main>

            {/* MOBILE BOTTOM NAVIGATION */}
            {isMobile && (
                <div style={{ height: '70px' }}> {/* Spacer */}
                    <nav style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--surface-color)',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-around',
                        padding: '0.5rem 0',
                        zIndex: 1000,
                        boxShadow: '0 -4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <BottomNavItem name="Inicio" pageName="referrals" icon={ICONS.home} />
                        <BottomNavItem name="Vínculos" pageName="partnerships" icon={ICONS.network} />
                        <BottomNavItem name="Explorar" pageName="directory" icon={ICONS.clinic} />
                        <BottomNavItem name="Perfil" pageName="profile" icon={ICONS.user} />
                    </nav>
                </div>
            )}
        </div>
    );
};

export default AllyPortalLayout;
