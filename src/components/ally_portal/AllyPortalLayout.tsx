import React, { useState, FC, useEffect, useCallback } from 'react';
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
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [allyProfile, setAllyProfile] = useState<Ally | null>(null);
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const { setTheme } = useThemeManager();

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
                setSidebarOpen(!mobile);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    const navigate = (page: string) => {
        setView(page);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };
    
    const handleProfileUpdate = () => {
        fetchProfile();
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

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean }> = ({ name, pageName, icon, isSubItem = false }) => {
        const isActive = view.startsWith(pageName);
        return (
            <div
                onClick={() => navigate(pageName)}
                style={{ ...styles.navItem, backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', color: isActive ? 'var(--primary-color)' : 'var(--text-color)', gap: '0.75rem', ...(isSubItem && {paddingLeft: '2.5rem'}) }}
                className="nav-item-hover"
                role="button"
                aria-label={`Navegar a ${name}`}
            >
                {icon && <span style={{color: 'var(--primary-color)'}}>{icon}</span>}
                {name}
            </div>
        );
    };

    const CollapsibleCategory: FC<{
        name: string;
        icon: React.ReactNode;
        categoryKey: string;
        pageNames: string[];
        children: React.ReactNode;
    }> = ({ name, icon, categoryKey, pageNames, children }) => {
        const isActive = pageNames.some(page => view.startsWith(page));
        const isOpen = openCategory === categoryKey;

        return (
            <div>
                <div
                    onClick={() => setOpenCategory(isOpen ? null : categoryKey)}
                    style={{...styles.navItem, backgroundColor: isActive && !isOpen ? 'var(--primary-light)' : 'transparent', color: isActive && !isOpen ? 'var(--primary-color)' : 'var(--text-color)', borderLeft: isActive && !isOpen ? '4px solid var(--primary-color)' : '4px solid transparent'}}
                    className="nav-item-hover category-header"
                    role="button"
                    aria-expanded={isOpen}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        {icon && <span style={{color: 'var(--primary-color)'}}>{icon}</span>}
                        {name}
                    </div>
                    <span className={`category-chevron ${isOpen ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                </div>
                {isOpen && <div className="submenu-container">{children}</div>}
            </div>
        );
    };
    
    const mainContentStyle: React.CSSProperties = {
        ...styles.mainContent,
        ...(isMobile ? styles.mainContentMobile : (isSidebarOpen ? styles.mainContentDesktop : { ...styles.mainContentDesktop, marginLeft: '0' }))
    };

    return (
        <div style={styles.dashboardLayout}>
            {isMobile && isSidebarOpen && <div style={{ ...styles.modalOverlay, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }} onClick={() => setSidebarOpen(false)}></div>}
            
            <div style={{ ...styles.sidebar, ...(!isSidebarOpen && styles.sidebarHidden) }}>
                <div style={styles.sidebarHeader}>
                    <h2 style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }}>Portal de Colaborador</h2>
                </div>
                <nav style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
                    <NavItem name="Gestión de Referidos" pageName="referrals" icon={ICONS.transfer} />
                    <NavItem name="Mis Vínculos" pageName="partnerships" icon={ICONS.network} />
                    <NavItem name="Directorio de Clínicas" pageName="directory" icon={ICONS.clinic} />
                    <NavItem name="Directorio de Aliados" pageName="ally-directory" icon={ICONS.users} />
                    
                    <CollapsibleCategory name="Crecimiento" icon={ICONS.sparkles} categoryKey="crecimiento" pageNames={['affiliates']}>
                        <NavItem name="Programa de Afiliados" pageName="affiliates" isSubItem />
                    </CollapsibleCategory>
                    
                    <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                </nav>
                <div>
                    <NavItem name="Notificaciones" pageName="notifications" icon={ICONS.settings} />
                    <div onClick={() => supabase.auth.signOut()} style={{...styles.navItem, gap: '0.75rem'}} className="nav-item-hover" role="button">
                        {ICONS.logout}Cerrar Sesión
                    </div>
                </div>
            </div>

            <main style={mainContentStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', minHeight: '40px' }}>
                    {!isSidebarOpen && (
                        <button onClick={() => setSidebarOpen(true)} style={styles.hamburger} aria-label="Abrir menú">
                            {ICONS.menu}
                        </button>
                    )}
                </div>
                {renderContent()}
            </main>
        </div>
    );
};

export default AllyPortalLayout;