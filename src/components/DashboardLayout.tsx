
import React, { useState, useEffect, FC, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
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
import PersonDetailPage from '../pages/PersonDetailPage';
import ClinicNetworkPage from '../pages/ClinicNetworkPage';
import ChatPage from '../pages/ChatPage';
import FinanzasPage from '../pages/FinanzasPage';
import ClinicSettingsPage from '../pages/ClinicSettingsPage';
import ServiceManagement from '../components/dashboard/ServiceManagement';
import ServicePlansManagement from '../components/dashboard/ServicePlansManagement';
import DisplayManagement from '../components/dashboard/DisplayManagement';
import FiscalApiManagement from '../components/dashboard/FiscalApiManagement';
import SubscriptionPage from '../pages/SubscriptionPage';
import AffiliatesPage from '../pages/AffiliatesPage';
import BetaFeedbackModal from './shared/BetaFeedbackModal';
import UserGuidePage from '../pages/UserGuidePage';
import NotificationsCenterPage from '../pages/NotificationsCenterPage';
import NotificationsMenu from '../components/dashboard/NotificationsMenu';
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
    const { clinic, role, subscription } = useClinic();
    const [view, setView] = useState({ page: 'home', context: {} as any });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const { setTheme } = useThemeManager();
    
    // Dropdown state for horizontal menu
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownTimeoutRef = React.useRef<number | null>(null);

    const [isQuickConsultModalOpen, setQuickConsultModalOpen] = useState(false);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [clients, setClients] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);
    const [afiliados, setAfiliados] = useState<Pick<Person, 'id' | 'full_name' | 'avatar_url'>[]>([]);

    const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const unrestrictedPages = ['profile', 'profile-form', 'settings', 'clinic-settings', 'billing', 'fiscal-settings', 'notifications-center'];

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
            const mobile = window.innerWidth < 1024;
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
    
    // --- Dropdown Logic for Horizontal Menu ---
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
            case 'notifications-center': return <NotificationsCenterPage navigate={navigate} />;
            default: return <HomePage user={session.user} isMobile={isMobile} navigate={navigate} openQuickConsult={() => setQuickConsultModalOpen(true)} />;
        }
    }

    // --- Navigation Components ---

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, context?: any }> = ({ name, pageName, icon, context }) => {
        const isActive = (view.page === pageName);
        const isLocked = !isSubscriptionActive && !unrestrictedPages.includes(pageName);
        
        return (
            <div
                onClick={isLocked ? undefined : () => navigate(pageName, context)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    backgroundColor: isActive ? 'var(--surface-hover-color)' : 'transparent',
                    color: isActive ? 'var(--primary-color)' : isLocked ? 'var(--text-light)' : 'var(--text-color)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    opacity: isLocked ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                }}
                className={!isLocked ? "nav-item-hover" : ""}
                role="button"
            >
                {icon}
                {name}
                {isLocked && <span style={{ fontSize: '0.7rem' }}>{ICONS.lock}</span>}
            </div>
        );
    };
    
    const NavDropdown: FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; id: string }> = ({ title, icon, children, id }) => {
        const isActive = activeDropdown === id;
        
        return (
            <div 
                onMouseEnter={() => handleMouseEnter(id)} 
                onMouseLeave={handleMouseLeave}
                style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        borderRadius: '20px',
                        backgroundColor: isActive ? 'var(--surface-hover-color)' : 'transparent',
                        transition: 'all 0.2s ease'
                    }}
                    className="nav-item-hover"
                >
                    {icon}
                    {title}
                    <span style={{ fontSize: '0.7rem', transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>{ICONS.chevronDown}</span>
                </div>
                
                {isActive && (
                    <div className="fade-in" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        backgroundColor: 'var(--surface-color)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '200px',
                        border: '1px solid var(--border-color)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const isFabHidden = ['client-form', 'afiliado-form', 'aliado-form', 'consultation-form', 'log-form', 'profile-form', 'settings', 'calculators', 'agenda', 'queue', 'client-detail', 'afiliado-detail', 'chat', 'finanzas', 'clinic-settings', 'affiliates', 'user-guide'].includes(view.page);

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
            
            {/* --- HORIZONTAL NAVIGATION HEADER --- */}
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
                    {/* Logo & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.2rem', fontWeight: 800,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                             {clinic?.name ? clinic.name.charAt(0).toUpperCase() : 'Z'}
                        </div>
                        <h2 style={{ color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                            {clinic?.name || 'Zegna Nutrición'}
                        </h2>
                    </div>

                    {/* Center Navigation */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
                        <NavItem name="Dashboard" pageName="home" icon={ICONS.home} />
                        <NavItem name="Agenda" pageName="agenda" icon={ICONS.calendar} />
                        
                        <NavDropdown title="Pacientes" icon={ICONS.users} id="patients">
                            <NavItem name="Lista de Pacientes" pageName="clients" />
                            <NavItem name="Afiliados" pageName="afiliados" />
                            <NavItem name="Sala de Espera" pageName="queue" />
                        </NavDropdown>

                        <NavDropdown title="Recursos" icon={ICONS.book} id="resources">
                             <NavItem name="Biblioteca" pageName="knowledge-base" />
                             <NavItem name="Calculadoras" pageName="calculators" />
                             <NavItem name="Guía de Uso" pageName="user-guide" />
                        </NavDropdown>

                        <NavDropdown title="Red & Crecimiento" icon={ICONS.network} id="network">
                            <NavItem name="Colaboradores" pageName="aliados" />
                            <NavItem name="Red de Clínicas" pageName="clinic-network" />
                            <NavItem name="Programa Afiliados" pageName="affiliates" />
                        </NavDropdown>

                        <NavDropdown title="Gestión" icon={ICONS.briefcase} id="admin">
                            <NavItem name="Finanzas" pageName="finanzas" />
                            <NavItem name="Chat" pageName="chat" />
                            {role === 'admin' && (
                                <>
                                    <div style={{height: '1px', backgroundColor: 'var(--border-color)', margin: '0.5rem 0'}}></div>
                                    <NavItem name="Mi Clínica" pageName="clinic-settings" />
                                    <NavItem name="Facturación" pageName="fiscal-settings" />
                                    <NavItem name="Servicios" pageName="services" />
                                    <NavItem name="Planes" pageName="service-plans" />
                                    <NavItem name="Pantallas" pageName="displays" />
                                    <NavItem name="Suscripción" pageName="billing" />
                                </>
                            )}
                        </NavDropdown>
                    </nav>

                    {/* Right Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <NotificationsMenu onNavigate={navigate} />
                         
                         <NavDropdown 
                            title="" 
                            id="profile" 
                            icon={
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    <img 
                                        src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                                        alt="Profile" 
                                        style={{width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--surface-hover-color)', objectFit: 'cover'}}
                                    />
                                    <span style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)'}}>{profile?.full_name?.split(' ')[0] || 'Perfil'}</span>
                                </div>
                            }
                        >
                             <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                             <NavItem name="Configuración" pageName="settings" icon={ICONS.settings} context={{ initialTab: 'account' }} />
                             <div onClick={() => supabase.auth.signOut()} style={{padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}} className="nav-item-hover">
                                 {ICONS.logout} Cerrar Sesión
                             </div>
                        </NavDropdown>
                    </div>
                </header>
            )}

            {/* --- MOBILE HEADER & SIDEBAR --- */}
            {isMobile && (
                <>
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
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                             <NotificationsMenu onNavigate={navigate} />
                             {isSubscriptionActive && (
                                <button onClick={() => setQuickConsultModalOpen(true)} style={{...styles.iconButton, backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderRadius: '50%', width: '36px', height: '36px'}} title="Consulta Rápida">
                                    +
                                </button>
                            )}
                        </div>
                    </header>

                    {isMobileMenuOpen && (
                         <div style={{...styles.modalOverlay, zIndex: 1050, justifyContent: 'flex-start'}} onClick={() => setIsMobileMenuOpen(false)}>
                             <div 
                                style={{width: '280px', height: '100%', backgroundColor: 'var(--surface-color)', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}
                                onClick={e => e.stopPropagation()}
                             >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h3 style={{margin: 0}}>Menú</h3>
                                    <button onClick={() => setIsMobileMenuOpen(false)} style={{...styles.iconButton}}>{ICONS.close}</button>
                                </div>
                                
                                <NavItem name="Dashboard" pageName="home" icon={ICONS.home} />
                                <NavItem name="Agenda" pageName="agenda" icon={ICONS.calendar} />
                                <NavItem name="Pacientes" pageName="clients" icon={ICONS.users} />
                                <NavItem name="Afiliados" pageName="afiliados" icon={ICONS.list} />
                                <NavItem name="Finanzas" pageName="finanzas" icon={ICONS.dollar} />
                                <NavItem name="Chat" pageName="chat" icon={ICONS.phone} />
                                <div style={{height: '1px', backgroundColor: 'var(--border-color)', margin: '0.5rem 0'}}></div>
                                <NavItem name="Centro Notificaciones" pageName="notifications-center" icon="🔔" />
                                <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                                <NavItem name="Configuración" pageName="settings" icon={ICONS.settings} />
                                <button onClick={() => supabase.auth.signOut()} style={{marginTop: 'auto', ...styles.iconButton, justifyContent: 'flex-start', width: '100%', color: 'var(--error-color)'}}>
                                    {ICONS.logout} Cerrar Sesión
                                </button>
                             </div>
                         </div>
                    )}
                </>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main style={{
                flex: 1,
                padding: isMobile ? '1rem' : '2rem',
                maxWidth: '1400px',
                margin: '0 auto',
                width: '100%',
                overflowX: 'hidden',
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
