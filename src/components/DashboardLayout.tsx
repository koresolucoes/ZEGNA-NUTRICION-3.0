
import React, { useState, useEffect, FC, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { styles } from '../constants';
import { ICONS } from '../pages/AuthPage';
import { supabase } from '../supabase';
import { NutritionistProfile, Person } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import HomePage from '../pages/HomePage';
import ClientsPage from '../pages/ClientsPage';
import ClientFormPage from '../pages/ClientFormPage';
import LogFormPage from '../pages/LogFormPage';
import ConsultationFormPage from '../pages/ConsultationFormPage';
import SettingsPage from '../pages/SettingsPage';
import AfiliadosPage from '../pages/MembersPage';
import AfiliadoFormPage from '../pages/MemberFormPage';
import CollaboratorsPage from '../pages/CollaboratorsPage';
import CollaboratorFormPage from '../pages/CollaboratorFormPage';
import AfiliadoConsultationFormPage from '../pages/MemberConsultationFormPage';
import AfiliadoLogFormPage from '../pages/MemberLogFormPage';
import ProfilePage from '../pages/ProfilePage';
import ProfileFormPage from '../pages/ProfileFormPage';
import KnowledgeBasePage from '../pages/KnowledgeBasePage';
import CalculatorsPage from '../pages/CalculatorsPage';
import QuickConsultationModal from './shared/QuickConsultationModal';
import FloatingActionButton from './FloatingActionButton';
import AgendaPage from '../pages/AgendaPage';
import WaitingQueuePage from '../pages/WaitingQueuePage';
import PersonDetailPage from '../pages/PersonDetailPage'; // Import the new unified component
import ClinicNetworkPage from '../pages/ClinicNetworkPage';
import ChatPage from '../pages/ChatPage';
import FinanzasPage from '../pages/FinanzasPage'; // Import the new finance page
import ClinicSettingsPage from '../pages/ClinicSettingsPage';
import ServiceManagement from '../components/dashboard/ServiceManagement';
import ServicePlansManagement from '../components/dashboard/ServicePlansManagement';
import DisplayManagement from '../components/dashboard/DisplayManagement';
import FiscalApiManagement from '../components/dashboard/FiscalApiManagement';
import SubscriptionPage from '../pages/SubscriptionPage';
import AffiliatesPage from '../pages/AffiliatesPage';
import BetaFeedbackModal from './shared/BetaFeedbackModal';
import UserGuidePage from '../pages/UserGuidePage'; // Importar la nueva página de guía
import { useThemeManager } from '../contexts/ThemeContext';

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
    const { clinic, role, subscription } = useClinic(); // Use clinic context
    const [view, setView] = useState({ page: 'home', context: {} as any });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 960);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const { setTheme } = useThemeManager();

    // State for new collapsible sidebar
    const [openCategory, setOpenCategory] = useState<string | null>(null);

    // State lifted for FAB and Quick Consultation Modal
    const [isQuickConsultModalOpen, setQuickConsultModalOpen] = useState(false);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [clients, setClients] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);
    const [afiliados, setAfiliados] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);

    const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    // List of pages that are allowed even when subscription is inactive
    const unrestrictedPages = ['profile', 'profile-form', 'settings', 'clinic-settings', 'billing', 'fiscal-settings'];

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

    const toggleSidebar = () => setSidebarOpen(prevState => !prevState);
    const closeSidebar = () => setSidebarOpen(false);

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
    
    const navigate = (page: string, context = {}) => {
        setView({ page, context });
        // Smarter sidebar: close for content-heavy pages or on mobile
        const contentHeavyPages = ['client-detail', 'afiliado-detail', 'calculators', 'consultation-form', 'log-form', 'profile-form', 'aliado-form', 'afiliado-form', 'client-form', 'agenda', 'queue', 'clinic-network', 'chat', 'finanzas', 'affiliates', 'user-guide', 'fiscal-settings'];
        if (contentHeavyPages.includes(page) || isMobile) {
            setSidebarOpen(false);
        }
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
                    onStartConsultation={closeSidebar}
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
            case 'user-guide': return <UserGuidePage />;

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
            default: return <HomePage user={session.user} isMobile={isMobile} navigate={navigate} openQuickConsult={() => setQuickConsultModalOpen(true)} />;
        }
    }

    const NavItem: FC<{name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean, context?: any}> = ({ name, pageName, icon, isSubItem = false, context }) => {
        const isActive = (view.page === pageName) && (context?.initialTab ? view.context?.initialTab === context.initialTab : true);
        const isLocked = !isSubscriptionActive && !unrestrictedPages.includes(pageName);

        return (
        <div
            onClick={isLocked ? () => navigate('billing') : () => navigate(pageName, context)}
            style={{
                ...styles.navItem, 
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', 
                color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-color)', 
                borderLeft: isActive ? '4px solid var(--primary-color)' : '4px solid transparent', 
                ...(isSubItem && {paddingLeft: '2.5rem'}),
                opacity: isLocked ? 0.7 : 1,
                cursor: 'pointer'
            }}
            className="nav-item-hover"
            role="button"
            aria-label={`Navegar a ${name}`}
        >
            {icon && <span style={{color: isActive ? 'var(--primary-color)' : 'inherit'}}>{icon}</span>}
            <span style={{flex: 1}}>{name}</span>
            {isLocked && <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{ICONS.lock}</span>}
        </div>
    )};
    
    const CollapsibleCategory: FC<{
        name: string;
        icon: React.ReactNode;
        categoryKey: string;
        pageNames: string[];
        children: React.ReactNode;
    }> = ({ name, icon, categoryKey, pageNames, children }) => {
        const isActive = pageNames.some(page => view.page.startsWith(page));
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

    const pagesWithoutFab = ['client-form', 'afiliado-form', 'aliado-form', 'consultation-form', 'log-form', 'profile-form', 'settings', 'calculators', 'agenda', 'queue', 'client-detail', 'afiliado-detail', 'chat', 'finanzas', 'clinic-settings', 'affiliates', 'user-guide', 'fiscal-settings'];
    const isFabHidden = pagesWithoutFab.includes(view.page);

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
            {isMobile && isSidebarOpen && <div style={{...styles.modalOverlay, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050}} onClick={toggleSidebar}></div>}
            
            <div style={{...styles.sidebar, ...(!isSidebarOpen && styles.sidebarHidden)}}>
                 <div style={styles.sidebarHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1, overflow: 'hidden' }}>
                        <img 
                            src={clinic?.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinic?.name || session.user.email}&radius=50&backgroundColor=007BFF`} 
                            alt="Logo de la clínica" 
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <h2 style={{ color: 'var(--primary-color)', fontSize: '1.1rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {clinic?.name || 'zegna nutricion'}
                        </h2>
                    </div>
                    {!isMobile && (
                        <button onClick={toggleSidebar} style={{...styles.sidebarToggleButton, flexShrink: 0}} className="nav-item-hover" aria-label="Ocultar menú">
                            {ICONS.back}
                        </button>
                    )}
                </div>
                <nav style={{flex: 1, overflowY: 'auto'}} className="hide-scrollbar">
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

                    <CollapsibleCategory name="Red" icon={ICONS.network} categoryKey="red" pageNames={['aliados', 'clinic-network']}>
                        <NavItem name="Red de Colaboradores" pageName="aliados" isSubItem />
                        <NavItem name="Red de Clínicas" pageName="clinic-network" isSubItem />
                    </CollapsibleCategory>
                    
                     <CollapsibleCategory name="Recursos" icon={ICONS.book} categoryKey="recursos" pageNames={['knowledge-base', 'calculators']}>
                        <NavItem name="Biblioteca" pageName="knowledge-base" isSubItem />
                        <NavItem name="Herramientas" pageName="calculators" isSubItem />
                    </CollapsibleCategory>
                    
                    <CollapsibleCategory name="Crecimiento" icon={ICONS.sparkles} categoryKey="crecimiento" pageNames={['affiliates']}>
                        <NavItem name="Programa de Afiliados" pageName="affiliates" isSubItem />
                    </CollapsibleCategory>

                    {role === 'admin' && (
                        <CollapsibleCategory name="Mi Clínica" icon={ICONS.clinic} categoryKey="mi-clinica" pageNames={['clinic-settings', 'fiscal-settings', 'services', 'service-plans', 'displays', 'billing']}>
                            <NavItem name="Datos de la Clínica" pageName="clinic-settings" isSubItem />
                            <NavItem name="Facturación" pageName="fiscal-settings" isSubItem />
                            <NavItem name="Servicios" pageName="services" isSubItem />
                            <NavItem name="Planes de Servicio" pageName="service-plans" isSubItem />
                            <NavItem name="Pantallas de Espera" pageName="displays" isSubItem />
                            <NavItem name="Suscripción y Pagos" pageName="billing" isSubItem />
                        </CollapsibleCategory>
                    )}

                </nav>
                 <div>
                     <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                     <NavItem name="Configuración" pageName="settings" icon={ICONS.settings} context={{ initialTab: 'account' }} />
                     <NavItem name="Guía de Uso" pageName="user-guide" icon={ICONS.book} />
                </div>
            </div>

            <main style={mainContentStyle}>
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', minHeight: '40px' /* Prevents layout shift */ }}>
                   {!isSidebarOpen && (
                       <button onClick={toggleSidebar} style={styles.hamburger} aria-label="Abrir menú">
                         {ICONS.menu}
                       </button>
                   )}
                   {isMobile && !isSidebarOpen && (
                       <h2 style={{margin: '0 0 0 1rem', color: 'var(--primary-color)'}}>{clinic?.name || 'zegna nutricion'}</h2>
                   )}
                </div>
                {renderContent()}
            </main>
            {!isFabHidden && isSubscriptionActive && (
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
