
import React, { useState, useEffect, FC, useCallback, useRef } from 'react';
// FIX: In Supabase v2, Session and User types are exported via `import type`.
import type { Session, User } from '@supabase/supabase-js';
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
import FiscalApiManagement from '../components/dashboard/FiscalApiManagement';
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

    const [isQuickConsultModalOpen, setQuickConsultModalOpen] = useState(false);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [clients, setClients] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);
    const [afiliados, setAfiliados] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);

    // State for collapsible sidebar categories
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        'gestion-clinica': true,
        'administracion': false,
        'red': false,
        'recursos': false,
        'crecimiento': false,
        'mi-clinica': false
    });

    const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const unrestrictedPages = ['profile', 'profile-form', 'settings', 'clinic-settings', 'billing', 'displays', 'fiscal-settings'];

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
        window.scrollTo(0, 0);
    };

    const renderContent = () => {
        const { page, context } = view;

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
            case 'clinic-settings': return <ClinicSettingsPage user={session.user} isMobile={isMobile} navigate={navigate} />;
            case 'fiscal-settings': return (
                <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                     <div style={styles.pageHeader}>
                        <h1>Configuración de Facturación</h1>
                    </div>
                    <p style={{marginTop: '-1.5rem', marginBottom: '2rem', color: 'var(--text-light)'}}>
                        Configura tus certificados digitales para emitir facturas fiscales.
                    </p>
                    <FiscalApiManagement />
                </div>
            );
            case 'services': return <ServiceManagement navigate={navigate} />;
            case 'service-plans': return <ServicePlansManagement />;
            case 'displays': return <DisplayManagement />;
            case 'billing': return <SubscriptionPage navigate={navigate} />;
            case 'user-guide': return <UserGuidePage />;
            default: return <HomePage user={session.user} isMobile={isMobile} navigate={navigate} openQuickConsult={() => setQuickConsultModalOpen(true)} />;
        }
    }

    // --- Modern Nav Components ---

    const SectionLabel: FC<{ label: string }> = ({ label }) => (
        <div style={{
            padding: '1.5rem 1rem 0.5rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            opacity: 0.8
        }}>
            {label}
        </div>
    );

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean, context?: any }> = ({ name, pageName, icon, isSubItem = false, context }) => {
        const isActive = (view.page === pageName) && (context?.initialTab ? view.context?.initialTab === context.initialTab : true);
        const isLocked = !isSubscriptionActive && !unrestrictedPages.includes(pageName);
        
        return (
            <div
                onClick={isLocked ? undefined : () => navigate(pageName, context)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: isSubItem ? '0.6rem 1rem 0.6rem 3rem' : '0.75rem 1rem',
                    margin: '0 0.5rem 2px 0.5rem',
                    borderRadius: '8px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                    color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-color)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: isSubItem ? '0.9rem' : '0.95rem',
                    transition: 'all 0.2s ease',
                    opacity: isLocked ? 0.6 : 1
                }}
                className={!isLocked ? "nav-item-hover" : ""}
                role="button"
                aria-label={`Navegar a ${name}`}
                title={isLocked ? "Requiere plan activo" : ""}
            >
                {icon && (
                    <span style={{
                        fontSize: '1.2rem',
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-light)'
                    }}>
                        {icon}
                    </span>
                )}
                <span style={{ flex: 1 }}>{name}</span>
                {isLocked && <span style={{ fontSize: '0.8rem' }}>{ICONS.lock}</span>}
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
            <div style={{ marginBottom: '2px' }}>
                <div
                    onClick={() => toggleCategory(categoryKey)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        margin: '0 0.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                        backgroundColor: 'transparent', // Categories don't get bg, only children or NavItems
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                    }}
                    className="nav-item-hover"
                    role="button"
                    aria-expanded={isOpen}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                        <span style={{
                            fontSize: '1.2rem', 
                            width: '20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: isActive ? 'var(--primary-color)' : 'var(--text-light)'
                        }}>
                            {icon}
                        </span>
                        {name}
                    </div>
                    <span style={{ 
                        fontSize: '0.8rem', 
                        transition: 'transform 0.3s ease', 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--text-light)',
                        opacity: 0.7
                    }}>
                        {ICONS.chevronDown}
                    </span>
                </div>
                <div style={{
                    maxHeight: isOpen ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: isOpen ? 1 : 0,
                }}>
                    {children}
                </div>
            </div>
        );
    };

    const pagesWithoutFab = ['client-form', 'afiliado-form', 'aliado-form', 'consultation-form', 'log-form', 'profile-form', 'settings', 'calculators', 'agenda', 'queue', 'client-detail', 'afiliado-detail', 'chat', 'finanzas', 'clinic-settings', 'affiliates', 'user-guide'];
    const isFabHidden = pagesWithoutFab.includes(view.page);

    // User Profile Widget
    const UserProfileWidget = () => (
        <div style={{
            padding: '1rem',
            marginTop: 'auto', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            backgroundColor: 'var(--surface-color)', // Slightly distinct bg
            transition: 'background-color 0.2s',
        }}
        className="nav-item-hover"
        onClick={(e) => { e.stopPropagation(); navigate('settings', { initialTab: 'account' }); }}
        >
            <img 
                src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                alt="Profile" 
                style={{width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--border-color)', objectFit: 'cover', flexShrink: 0}}
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
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Cerrar Sesión"
                className="nav-item-hover"
            >
                {ICONS.logout}
            </button>
        </div>
    );

    return (
        <div style={styles.dashboardLayout}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img 
                                src={clinic?.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic?.name}&radius=50`} 
                                alt="Logo" 
                                style={{width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover'}}
                            />
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

            {/* --- SIDEBAR --- */}
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
                 <div style={{ padding: '0.5rem 1rem 1.5rem 1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                     {isMobile && (
                         <button onClick={() => setIsMobileMenuOpen(false)} style={{...styles.iconButton, marginBottom: '1rem'}}>{ICONS.back}</button>
                     )}
                     <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.2rem', fontWeight: 800,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
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
                </div>

                {/* Navigation Content */}
                <nav style={{flex: 1, overflowY: 'auto', paddingBottom: '1rem'}} className="hide-scrollbar">
                    <NavItem name="Dashboard" pageName="home" icon={ICONS.home} />
                    
                    <SectionLabel label="Clínica" />
                    <NavItem name="Agenda" pageName="agenda" icon={ICONS.calendar} />
                    <NavItem name="Pacientes" pageName="clients" icon={ICONS.user} />
                    <CollapsibleCategory name="Gestión Diaria" icon={ICONS.list} categoryKey="gestion-clinica" pageNames={['afiliados', 'queue']}>
                        <NavItem name="Afiliados" pageName="afiliados" isSubItem />
                        <NavItem name="Sala de Espera" pageName="queue" isSubItem />
                    </CollapsibleCategory>
                    
                    <SectionLabel label="Administración" />
                    <NavItem name="Finanzas" pageName="finanzas" icon={ICONS.dollar} />
                    <NavItem name="Conversaciones" pageName="chat" icon={ICONS.phone} />

                    <SectionLabel label="Recursos" />
                     <CollapsibleCategory name="Herramientas" icon={ICONS.book} categoryKey="recursos" pageNames={['knowledge-base', 'calculators', 'user-guide']}>
                        <NavItem name="Biblioteca" pageName="knowledge-base" isSubItem />
                        <NavItem name="Calculadoras" pageName="calculators" isSubItem />
                        <NavItem name="Guía de Uso" pageName="user-guide" isSubItem />
                    </CollapsibleCategory>
                    
                    <CollapsibleCategory name="Crecimiento" icon={ICONS.sparkles} categoryKey="red" pageNames={['aliados', 'clinic-network', 'affiliates']}>
                        <NavItem name="Colaboradores" pageName="aliados" isSubItem />
                        <NavItem name="Red de Clínicas" pageName="clinic-network" isSubItem />
                        <NavItem name="Programa Afiliados" pageName="affiliates" isSubItem />
                    </CollapsibleCategory>

                    {role === 'admin' && (
                        <>
                            <SectionLabel label="Configuración" />
                            <CollapsibleCategory name="Mi Clínica" icon={ICONS.settings} categoryKey="mi-clinica" pageNames={['clinic-settings', 'fiscal-settings', 'services', 'service-plans', 'displays', 'billing']}>
                                <NavItem name="Datos Generales" pageName="clinic-settings" isSubItem />
                                <NavItem name="Facturación" pageName="fiscal-settings" isSubItem />
                                <NavItem name="Servicios" pageName="services" isSubItem />
                                <NavItem name="Planes" pageName="service-plans" isSubItem />
                                <NavItem name="Pantallas" pageName="displays" isSubItem />
                                <NavItem name="Suscripción" pageName="billing" isSubItem />
                            </CollapsibleCategory>
                        </>
                    )}
                </nav>
                 
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
                marginLeft: isMobile ? 0 : '260px',
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
