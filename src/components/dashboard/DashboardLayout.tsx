
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

const DashboardLayout: FC<{ session: Session }> = ({ session }) => {
    const { clinic, role } = useClinic(); 
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

    // --- Navbar Components ---

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

    const NavItem: FC<{ name: string, pageName: string, icon?: React.ReactNode, context?: any }> = ({ name, pageName, icon, context }) => {
        const isActive = (view.page === pageName) && (context?.initialTab ? view.context?.initialTab === context.initialTab : true);
        return (
            <div
                onClick={() => navigate(pageName, context)}
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
            >
                {icon && <span style={{fontSize: '1.1rem'}}>{icon}</span>}
                {name}
            </div>
        );
    };

    // Mobile Drawer Items
    const MobileNavItem: FC<{name: string, pageName: string, icon?: React.ReactNode, isSubItem?: boolean, context?: any}> = ({ name, pageName, icon, isSubItem = false, context }) => {
        const isActive = (view.page === pageName) && (context?.initialTab ? view.context?.initialTab === context.initialTab : true);
        return (
        <div
            onClick={() => navigate(pageName, context)}
            style={{
                ...styles.navItem, 
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', 
                color: isActive ? 'var(--primary-color)' : 'var(--text-light)',
                fontWeight: isActive ? 700 : 500,
                ...(isSubItem && {paddingLeft: '3rem', fontSize: '0.9rem'})
            }}
            className="nav-item-hover"
        >
            {icon && <span style={{color: isActive ? 'var(--primary-color)' : 'var(--text-light)', fontSize: '1.2rem'}}>{icon}</span>}
            {name}
        </div>
    )};

    const pagesWithoutFab = ['client-form', 'afiliado-form', 'aliado-form', 'consultation-form', 'log-form', 'profile-form', 'settings', 'calculators', 'agenda', 'queue', 'client-detail', 'afiliado-detail', 'chat', 'finanzas', 'clinic-settings', 'affiliates', 'user-guide'];
    const isFabHidden = pagesWithoutFab.includes(view.page);

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
            
            {/* --- TOP NAVBAR --- */}
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
                {/* Logo & Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     {isMobile && (
                        <button onClick={() => setIsMobileMenuOpen(true)} style={{...styles.hamburger, padding: '0.5rem', marginRight: '-0.5rem'}}>
                            {ICONS.menu}
                        </button>
                    )}
                    <div 
                        onClick={() => navigate('home')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.1rem', fontWeight: 800,
                        }}>
                             {clinic?.name ? clinic.name.charAt(0).toUpperCase() : 'Z'}
                        </div>
                        {!isMobile && (
                            <h2 style={{ color: 'var(--text-color)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                {clinic?.name || 'Zegna'}
                            </h2>
                        )}
                    </div>
                </div>

                {/* Desktop Navigation */}
                {!isMobile && (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                        <div onClick={() => navigate('home')} className="nav-item-hover" style={{padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '8px', color: view.page === 'home' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: 500, display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                            {ICONS.home} Inicio
                        </div>
                        
                        <NavDropdown title="Pacientes" icon={ICONS.users} id="patients">
                            <NavItem name="Lista de Pacientes" pageName="clients" icon={ICONS.user} />
                            <NavItem name="Lista de Afiliados" pageName="afiliados" icon={ICONS.users} />
                            <NavItem name="Sala de Espera" pageName="queue" icon={ICONS.clock} />
                        </NavDropdown>
                        
                        <div onClick={() => navigate('agenda')} className="nav-item-hover" style={{padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '8px', color: view.page === 'agenda' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: 500, display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                            {ICONS.calendar} Agenda
                        </div>

                        <NavDropdown title="Gestión" icon={ICONS.briefcase} id="management">
                            <NavItem name="Finanzas" pageName="finanzas" icon={ICONS.dollar} />
                            <NavItem name="Mensajes" pageName="chat" icon={ICONS.chat} />
                        </NavDropdown>

                        <NavDropdown title="Red" icon={ICONS.network} id="network">
                            <NavItem name="Mis Colaboradores" pageName="aliados" icon={ICONS.users} />
                            <NavItem name="Clínicas Aliadas" pageName="clinic-network" icon={ICONS.clinic} />
                            <NavItem name="Programa Afiliados" pageName="affiliates" icon={ICONS.sparkles} />
                        </NavDropdown>

                        <NavDropdown title="Recursos" icon={ICONS.book} id="resources">
                             <NavItem name="Biblioteca" pageName="knowledge-base" icon={ICONS.book} />
                             <NavItem name="Herramientas" pageName="calculators" icon={ICONS.calculator} />
                             <NavItem name="Guía de Uso" pageName="user-guide" icon={ICONS.book} />
                        </NavDropdown>
                    </nav>
                )}

                {/* User Profile & Admin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setQuickConsultModalOpen(true)} style={{...styles.iconButton, backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderRadius: '50%', width: '36px', height: '36px'}} title="Consulta Rápida">
                        +
                    </button>
                    
                    {!isMobile && (
                        <NavDropdown 
                            title="" 
                            id="profile" 
                            icon={
                                <img 
                                    src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.user.email}`} 
                                    alt="Profile" 
                                    style={{width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-color)'}}
                                />
                            }
                        >
                             <div style={{padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem'}}>
                                 <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem'}}>{profile?.full_name || 'Usuario'}</p>
                                 <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>{role}</p>
                             </div>
                             <NavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                             <NavItem name="Configuración" pageName="settings" icon={ICONS.settings} context={{ initialTab: 'account' }} />
                             {role === 'admin' && (
                                <div style={{borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem'}}>
                                    <p style={{padding: '0 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700}}>Administración</p>
                                    <NavItem name="Mi Clínica" pageName="clinic-settings" icon={ICONS.clinic} />
                                    <NavItem name="Servicios" pageName="services" icon={ICONS.briefcase} />
                                    <NavItem name="Suscripción" pageName="billing" icon={ICONS.dollar} />
                                </div>
                             )}
                             <div onClick={() => navigate('settings')} style={{marginTop: '0.5rem', padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'}} className="nav-item-hover">
                                 {ICONS.logout} Cerrar Sesión
                             </div>
                        </NavDropdown>
                    )}
                </div>
            </header>

            {/* --- MOBILE DRAWER --- */}
            {isMobile && isMobileMenuOpen && (
                <>
                    <div style={{...styles.modalOverlay, zIndex: 1050, justifyContent: 'flex-start', alignItems: 'flex-start'}} onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0, width: '80%', maxWidth: '300px',
                        backgroundColor: 'var(--surface-color)', zIndex: 1100, boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out'
                    }}>
                        <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                             <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)' }}>Zegna Nutrición</h2>
                             <button onClick={() => setIsMobileMenuOpen(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-light)'}}>&times;</button>
                        </div>
                        <div style={{flex: 1, overflowY: 'auto', padding: '1rem'}}>
                            <MobileNavItem name="Dashboard" pageName="home" icon={ICONS.home} />
                            <MobileNavItem name="Agenda" pageName="agenda" icon={ICONS.calendar} />
                            
                            <p style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700, margin: '1rem 0 0.5rem 1rem'}}>Pacientes</p>
                            <MobileNavItem name="Lista de Pacientes" pageName="clients" icon={ICONS.users} />
                            <MobileNavItem name="Lista de Afiliados" pageName="afiliados" icon={ICONS.users} />
                            <MobileNavItem name="Sala de Espera" pageName="queue" icon={ICONS.clock} />

                            <p style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700, margin: '1rem 0 0.5rem 1rem'}}>Gestión</p>
                            <MobileNavItem name="Finanzas" pageName="finanzas" icon={ICONS.dollar} />
                            <MobileNavItem name="Mensajes" pageName="chat" icon={ICONS.chat} />
                            
                            <p style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700, margin: '1rem 0 0.5rem 1rem'}}>Recursos y Red</p>
                            <MobileNavItem name="Biblioteca" pageName="knowledge-base" icon={ICONS.book} />
                            <MobileNavItem name="Herramientas" pageName="calculators" icon={ICONS.calculator} />
                            <MobileNavItem name="Colaboradores" pageName="aliados" icon={ICONS.network} />
                            <MobileNavItem name="Red de Clínicas" pageName="clinic-network" icon={ICONS.clinic} />

                            {role === 'admin' && (
                                <>
                                    <p style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 700, margin: '1rem 0 0.5rem 1rem'}}>Administración</p>
                                    <MobileNavItem name="Configuración Clínica" pageName="clinic-settings" icon={ICONS.settings} />
                                    <MobileNavItem name="Servicios" pageName="services" icon={ICONS.briefcase} />
                                    <MobileNavItem name="Suscripción" pageName="billing" icon={ICONS.dollar} />
                                </>
                            )}
                        </div>
                        <div style={{padding: '1rem', borderTop: '1px solid var(--border-color)'}}>
                             <MobileNavItem name="Mi Perfil" pageName="profile" icon={ICONS.user} />
                             <div onClick={() => navigate('settings')} style={{padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-light)'}}>
                                 {ICONS.logout} Cerrar Sesión
                             </div>
                        </div>
                    </div>
                    <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
                </>
            )}


            <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', maxWidth: '1600px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
                {renderContent()}
            </main>
            
            {!isFabHidden && (
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
