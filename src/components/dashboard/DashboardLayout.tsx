
import React, { useState, useEffect, FC, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';
import { NutritionistProfile, Person } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';
import HomePage from '../../pages/HomePage';
import ClientsPage from '../../pages/ClientsPage';
import ClientFormPage from '../../pages/ClientFormPage';
import LogFormPage from '../../pages/LogFormPage';
import ConsultationFormPage from '../../pages/ConsultationFormPage';
import SettingsPage from '../../pages/SettingsPage';
import AfiliadosPage from '../../pages/MembersPage';
import AfiliadoFormPage from '../../pages/MemberFormPage';
import CollaboratorsPage from '../../pages/CollaboratorsPage';
import CollaboratorFormPage from '../../pages/CollaboratorFormPage';
import AfiliadoConsultationFormPage from '../../pages/MemberConsultationFormPage';
import AfiliadoLogFormPage from '../../pages/MemberLogFormPage';
import ProfilePage from '../../pages/ProfilePage';
import ProfileFormPage from '../../pages/ProfileFormPage';
import KnowledgeBasePage from '../../pages/KnowledgeBasePage';
import CalculatorsPage from '../../pages/CalculatorsPage';
import QuickConsultationModal from '../shared/QuickConsultationModal';
import FloatingActionButton from '../FloatingActionButton';
import AgendaPage from '../../pages/AgendaPage';
import WaitingQueuePage from '../../pages/WaitingQueuePage';
import PersonDetailPage from '../../pages/PersonDetailPage'; 
import ClinicNetworkPage from '../../pages/ClinicNetworkPage';
import ChatPage from '../../pages/ChatPage';
import FinanzasPage from '../../pages/FinanzasPage'; 
import ClinicSettingsPage from '../../pages/ClinicSettingsPage';
import ServiceManagement from '../dashboard/ServiceManagement';
import ServicePlansManagement from '../dashboard/ServicePlansManagement';
import DisplayManagement from '../dashboard/DisplayManagement';
import SubscriptionPage from '../../pages/SubscriptionPage';
import AffiliatesPage from '../../pages/AffiliatesPage';
import BetaFeedbackModal from '../shared/BetaFeedbackModal';
import UserGuidePage from '../../pages/UserGuidePage';
import { useThemeManager } from '../../contexts/ThemeContext';

const PlanLockedView: FC<{ onGoToBilling: () => void }> = ({ onGoToBilling }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        textAlign: 'center',
        color: 'var(--text-color)',
        padding: '2rem'
    }}>
        <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1.5rem', 
            color: 'var(--text-light)', 
            backgroundColor: 'var(--surface-hover-color)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {ICONS.lock}
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--text-light)', maxWidth: '450px', marginBottom: '2rem', lineHeight: 1.6 }}>
            Tu plan actual ha vencido o no tienes una suscripción activa. Para acceder a este módulo y continuar gestionando tu clínica, por favor actualiza tu plan.
        </p>
        <button onClick={onGoToBilling} className="button-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
            Ver Planes de Suscripción
        </button>
    </div>
);

const DashboardLayout: FC<{ session: Session }> = ({ session }) => {
    const { clinic, role, subscription } = useClinic(); 
    const [view, setView] = useState({ page: 'home', context: {} as any });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1100); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const { setTheme } = useThemeManager();

    // State for Dropdowns in Navbar
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownTimeoutRef = useRef<number | null>(null);

    const [isQuickConsultModalOpen, setQuickConsultModalOpen] = useState(false);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [clients, setClients] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);
    const [afiliados, setAfiliados] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);

    // State for collapsible sidebar categories
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        'gestion-clinica': true,
        'administracion': true,
        'red': false,
        'recursos': false,
        'crecimiento': false,
        'mi-clinica': false
    });

    const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    // Pages that are always accessible even without an active plan
    const unrestrictedPages = ['profile', 'profile-form', 'settings', 'clinic-settings', 'billing', 'displays'];

    const toggleCategory = (key: string) => {
        setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const fetchPersons = useCallback(async () => {
        if (!clinic) return;
        const { data, error } = await supabase
            .from('persons')
            .select('id, full_name, person_type, avatar_url')
            .eq('clinic_id', clinic.id)
            .order('full_name');
        
        if (error) {
            console.error("Error fetching persons for layout:", error);
            return;
        }
        
        const allPersons = data || [];
        setClients(allPersons.filter(p => p.person_type === 'client'));
        setAfiliados(allPersons.filter(p => p.person_type === 'member'));
    }, [clinic]);

    useEffect(() => {
        fetchPersons();
    }, [fetchPersons]);

    useEffect(() => {
        if (clinic?.theme) {
            setTheme(clinic.theme);
        } else {
            setTheme('default');
        }
    }, [clinic, setTheme]);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('nutritionist_profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
            setProfile(data);
        };
        fetchProfile();
    }, [session.user.id]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1100;
            if (isMobile !== mobile) {
                setIsMobile(mobile);
                if (!mobile) setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);
    
    const navigate = (page: string, context = {}) => {
        setView({ page, context });
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
        window.scrollTo(0, 0);
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
        const { page, context } = view;

        // Check if access is restricted
        if (!isSubscriptionActive && !unrestrictedPages.includes(page)) {
             return <PlanLockedView onGoToBilling={() => navigate('billing')} />;
        }

        switch (page) {
            case 'home': return <HomePage user={session.user} isMobile={isMobile} navigate={navigate} openQuickConsult={() => setQuickConsultModalOpen(true)} />;
            case 'clients': return <ClientsPage onAddClient={() => navigate('client-form')} onEditClient={(personId) => navigate('client-form', { personId })} onViewDetails={(personId) => navigate('client-detail', { personId })} isMobile={isMobile} />;
            
            case 'client-detail':
            case 'afiliado-detail':
                const personType = page === 'client-detail' ? 'client' : 'member';
                return <PersonDetailPage
                    user={session.user}
                    personId={context.personId}
                    personType={personType}
                    isMobile={isMobile}
                    nutritionistProfile={profile}
                    navigate={navigate}
                    initialConsultationMode={!!context.startInConsultation}
                    onBack={() => navigate(personType === 'client' ? 'clients' : 'afiliados')}
                    onStartConsultation={() => {}}
                />;
            
            case 'client-form': return <ClientFormPage clientToEditId={context.personId} onBack={() => navigate('clients')} referralData={context.referralData} />;

            case 'log-form':
                return context.personType === 'client'
                    ? <LogFormPage clientId={context.personId} logToEditId={context.logId} onBack={() => navigate('client-detail', { personId: context.personId })} />
                    : <AfiliadoLogFormPage afiliadoId={context.personId} logToEditId={context.logId} onBack={() => navigate('afiliado-detail', { personId: context.personId })} />;

            case 'consultation-form':
                return context.personType === 'client'
                    ? <ConsultationFormPage clientId={context.personId} consultationToEditId={context.consultationId} onBack={() => navigate('client-detail', { personId: context.personId })} />
                    : <AfiliadoConsultationFormPage afiliadoId={context.personId} consultationToEditId={context.consultationId} onBack={() => navigate('afiliado-detail', { personId: context.personId })} />;
            
            case 'afiliados': return <AfiliadosPage onAddAfiliado={() => navigate('afiliado-form')} onEditAfiliado={(personId) => navigate('afiliado-form', { personId })} onViewDetails={(personId) => navigate('afiliado-detail', { personId })} isMobile={isMobile} />;
            case 'afiliado-form': return <AfiliadoFormPage afiliadoToEditId={context.personId} onBack={() => navigate('afiliados')} referralData={context.referralData} />;

            case 'aliados': return <CollaboratorsPage onAddCollaborator={() => navigate('aliado-form')} onAcceptReferral={(referralData) => navigate('afiliado-form', { referralData })} isMobile={isMobile} />;
            case 'aliado-form': return <CollaboratorFormPage onBack={() => navigate('aliados')} />;

            case 'clinic-network': return <ClinicNetworkPage navigate={navigate} />;
            
            case 'knowledge-base': return <KnowledgeBasePage user={session.user} isMobile={isMobile} />;
            case 'calculators': return <CalculatorsPage isMobile={isMobile} initialPlanToLoad={context.planToLoad} />;
            case 'agenda': return <AgendaPage user={session.user} isMobile={isMobile} />;
            case 'queue': return <WaitingQueuePage user={session.user} isMobile={isMobile} navigate={navigate} />;
            case 'chat': return <ChatPage isMobile={isMobile} />;
            case 'finanzas': return <FinanzasPage isMobile={isMobile} navigate={navigate} />;
            case 'affiliates': return <AffiliatesPage navigate={navigate} />;

            case 'profile': return <ProfilePage user={session.user} onEditProfile={() => navigate('profile-form')} />;
            case 'profile-form': return <ProfileFormPage user={session.user} onBack={() => navigate('profile')} />;
            case 'settings': return <SettingsPage user={session.user} initialTab={context.initialTab} />;
            case 'clinic-settings': return <ClinicSettingsPage user={session.user} isMobile={isMobile} />;
            case 'services': return <ServiceManagement navigate={navigate} />;
            case 'service-plans': return <ServicePlansManagement />;
            case 'displays': return <DisplayManagement />;
            case 'billing': return <SubscriptionPage navigate={navigate} />;
            case 'user-guide': return <UserGuidePage />;
            default: return <HomePage user={session.user} isMobile={isMobile} navigate={navigate} openQuickConsult={() => setQuickConsultModalOpen(true)} />;
        }
    }

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean, context?: any }> = ({ name, pageName, icon, isSubItem = false, context }) => {
        const isActive = (view.page === pageName) && (context?.initialTab ? view.context?.initialTab === context.initialTab : true);
        const isLocked = !isSubscriptionActive && !unrestrictedPages.includes(pageName);
        
        const containerStyle: React.CSSProperties = {
            ...styles.navItem,
            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
            color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-color)',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            marginBottom: '0.25rem',
            transition: 'all 0.2s ease',
            opacity: isLocked ? 0.6 : 1,
            cursor: isLocked ? 'not-allowed' : 'pointer',
            ...(isSubItem && { paddingLeft: '2.75rem', fontSize: '0.9rem', color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-light)' })
        };

        return (
            <div
                onClick={isLocked ? undefined : () => navigate(pageName, context)}
                style={containerStyle}
                className={!isLocked ? "nav-item-hover" : ""}
                role="button"
                aria-label={`Navegar a ${name}`}
                title={isLocked ? "Requiere plan activo" : ""}
            >
                {icon && (
                    <span style={{
                        color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-light)', 
                        fontSize: isSubItem ? '1rem' : '1.2rem',
                        minWidth: '24px',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        {icon}
                    </span>
                )}
                <span style={{ flex: 1 }}>{name}</span>
                {isLocked && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{ICONS.lock}</span>
                )}
                {isActive && !isSubItem && !isLocked && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }} />
                )}
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
        const isActive = pageNames.some(page => view.page.startsWith(page));
        const isOpen = openCategories[categoryKey];

        return (
            <div style={{ marginBottom: '0.5rem' }}>
                <div
                    onClick={() => toggleCategory(categoryKey)}
                    style={{
                        ...styles.navItem,
                        justifyContent: 'space-between',
                        backgroundColor: 'transparent',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        opacity: isOpen ? 1 : 0.8
                    }}
                    className="nav-item-hover"
                    role="button"
                    aria-expanded={isOpen}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        {icon && <span style={{color: isActive ? 'var(--primary-color)' : 'var(--text-light)', fontSize: '1.2rem', minWidth: '24px', display: 'flex', justifyContent: 'center'}}>{icon}</span>}
                        {name}
                    </div>
                    <span style={{ 
                        fontSize: '0.8rem', 
                        transition: 'transform 0.3s ease', 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--text-light)'
                    }}>
                        {ICONS.chevronDown}
                    </span>
                </div>
                <div style={{
                    maxHeight: isOpen ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                }}>
                    {children}
                </div>
            </div>
        );
    };

    const pagesWithoutFab = ['client-form', 'afiliado-form', 'aliado-form', 'consultation-form', 'log-form', 'profile-form', 'settings', 'calculators', 'agenda', 'queue', 'client-detail', 'afiliado-detail', 'chat', 'finanzas', 'clinic-settings', 'affiliates', 'user-guide'];
    const isFabHidden = pagesWithoutFab.includes(view.page);

    // Sidebar Footer - User Profile Widget
    const UserProfileWidget = () => (
        <div style={{
            padding: '1rem',
            marginTop: 'auto', // Pushes to bottom
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'background-color 0.2s',
        }}
        className="nav-item-hover"
        onClick={(e) => { e.stopPropagation(); navigate('settings', { initialTab: 'account' }); }}
        >
            <img 
                src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                alt="Profile" 
                style={{width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--surface-color)', objectFit: 'cover', flexShrink: 0}}
            />
            <div style={{flex: 1, minWidth: 0}}>
                <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-color)'}}>
                    {profile?.full_name || 'Usuario'}
                </p>
                <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'capitalize'}}>
                    {role === 'admin' ? 'Administrador' : role}
                </p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); supabase.auth.signOut(); }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-light)',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    cursor: 'pointer',
                }}
                title="Cerrar Sesión"
                className="icon-button"
            >
                {ICONS.logout}
            </button>
        </div>
    );

    return (
        <div style={{ ...styles.dashboardLayout, flexDirection: 'column' }}>
             {isQuickConsultModalOpen && (
                 <QuickConsultationModal
                    isOpen={isQuickConsultModalOpen}
                    onClose={() => setQuickConsultModalOpen(false)}
                    onSave={() => setQuickConsultModalOpen(false)}
                    clients={clients}
                    afiliados={afiliados}
                />
            )}
            {isFeedbackModalOpen && (
                <BetaFeedbackModal 
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setFeedbackModalOpen(false)}
                />
            )}
            
            {/* --- MOBILE HEADER --- */}
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
                    zIndex: 1000,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => setIsMobileMenuOpen(true)} style={{...styles.hamburger, padding: '0.5rem', marginRight: '-0.5rem'}}>
                            {ICONS.menu}
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px', 
                                background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '1rem', fontWeight: 800,
                            }}>
                                {clinic?.name ? clinic.name.charAt(0).toUpperCase() : 'Z'}
                            </div>
                             <h2 style={{ color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                                {clinic?.name || 'Zegna'}
                            </h2>
                        </div>
                    </div>
                    {isSubscriptionActive && (
                        <button onClick={() => setQuickConsultModalOpen(true)} style={{...styles.iconButton, backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderRadius: '50%', width: '36px', height: '36px'}} title="Consulta Rápida">
                            +
                        </button>
                    )}
                </header>
            )}

            {/* --- DESKTOP SIDEBAR --- */}
            <aside style={{
                ...styles.sidebar,
                ...(isMobile ? {
                    transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
                    position: 'fixed',
                    boxShadow: isMobileMenuOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none'
                } : {
                    transform: 'none',
                    position: 'fixed',
                    boxShadow: '1px 0 0 var(--border-color)'
                })
            }}>
                 {/* Sidebar Header */}
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 1.5rem 0.5rem', marginBottom: '1rem' }}>
                     {isMobile && (
                         <button onClick={() => setIsMobileMenuOpen(false)} style={{...styles.iconButton, marginRight: '0.5rem'}}>{ICONS.back}</button>
                     )}
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px', 
                        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.2rem', fontWeight: 800,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                            {clinic?.name ? clinic.name.charAt(0).toUpperCase() : 'Z'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <h2 style={{ color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {clinic?.name || 'Zegna Nutrición'}
                        </h2>
                         <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>Panel de Control</p>
                    </div>
                </div>

                {/* Navigation Content */}
                <nav style={{flex: 1, overflowY: 'auto', paddingRight: '0.5rem'}} className="hide-scrollbar">
                    <NavItem name="Dashboard" pageName="home" icon={ICONS.home} />
                    
                    <CollapsibleCategory name="Gestión Clínica" icon={ICONS.users} categoryKey="gestion-clinica" pageNames={['clients', 'afiliados', 'agenda', 'queue']}>
                        <NavItem name="Pacientes" pageName="clients" isSubItem />
                        <NavItem name="Afiliados" pageName="afiliados" isSubItem />
                        <NavItem name="Agenda" pageName="agenda" isSubItem />
                        <NavItem name="Sala de Espera" pageName="queue" isSubItem />
                    </CollapsibleCategory>
                    
                     <CollapsibleCategory name="Administración" icon={ICONS.dollar} categoryKey="administracion" pageNames={['finanzas', 'chat']}>
                        <NavItem name="Finanzas" pageName="finanzas" isSubItem />
                        <NavItem name="Conversaciones" pageName="chat" isSubItem />
                    </CollapsibleCategory>

                    <CollapsibleCategory name="Red & Comunidad" icon={ICONS.network} categoryKey="red" pageNames={['aliados', 'clinic-network', 'affiliates']}>
                        <NavItem name="Colaboradores" pageName="aliados" isSubItem />
                        <NavItem name="Red de Clínicas" pageName="clinic-network" isSubItem />
                        <NavItem name="Programa Afiliados" pageName="affiliates" isSubItem />
                    </CollapsibleCategory>
                    
                     <CollapsibleCategory name="Recursos" icon={ICONS.book} categoryKey="recursos" pageNames={['knowledge-base', 'calculators', 'user-guide']}>
                        <NavItem name="Biblioteca" pageName="knowledge-base" isSubItem />
                        <NavItem name="Herramientas" pageName="calculators" isSubItem />
                        <NavItem name="Guía de Uso" pageName="user-guide" isSubItem />
                    </CollapsibleCategory>

                    {role === 'admin' && (
                        <CollapsibleCategory name="Configuración" icon={ICONS.settings} categoryKey="mi-clinica" pageNames={['clinic-settings', 'services', 'service-plans', 'displays', 'billing']}>
                            <NavItem name="Datos de la Clínica" pageName="clinic-settings" isSubItem />
                            <NavItem name="Servicios" pageName="services" isSubItem />
                            <NavItem name="Planes de Servicio" pageName="service-plans" isSubItem />
                            <NavItem name="Pantallas" pageName="displays" isSubItem />
                            <NavItem name="Suscripción" pageName="billing" isSubItem />
                        </CollapsibleCategory>
                    )}

                </nav>
                 
                 {/* User Profile Widget at Bottom */}
                 <UserProfileWidget />
            </aside>

            {isMobile && isMobileMenuOpen && (
                 <div style={{...styles.modalOverlay, zIndex: 1050}} onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main style={{
                flex: 1,
                padding: isMobile ? '1rem' : '2rem',
                maxWidth: '1600px',
                margin: '0 auto',
                width: '100%',
                overflowX: 'hidden',
                marginLeft: isMobile ? 0 : '260px', // Adjusted for sidebar width
                transition: 'margin-left 0.3s ease'
            }}>
                {renderContent()}
            </main>
            
            {isSubscriptionActive && !isFabHidden && (
                <FloatingActionButton
                    onNewClient={() => navigate('client-form')}
                    onNewAfiliado={() => navigate('afiliado-form')}
                    onQuickConsult={() => setQuickConsultModalOpen(true)}
                    onFeedback={() => setFeedbackModalOpen(true)}
                />
            )}
        </div>
    );
}

export default DashboardLayout;
