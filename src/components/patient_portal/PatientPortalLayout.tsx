
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { ICONS } from '../../pages/AuthPage';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, PatientFile, AppointmentWithPerson, PatientServicePlan, PopulatedReferralConsentRequest, PatientJournalEntry, GamificationLog, Clinic, AiAgent, ClinicSubscription, Plan } from '../../types';
import { styles } from '../../constants';
import PatientHomePage from '../../pages/patient_portal/PatientHomePage';
import MyPlansPage from '../../pages/patient_portal/MyPlansPage';
import MyProgressPage from '../../pages/patient_portal/MyProgressPage';
import MyFilesPage from '../../pages/patient_portal/MyFilesPage';
import AppointmentsPage from '../../pages/patient_portal/AppointmentsPage';
import ConsentModal from './ConsentModal';
import PatientNotificationsPage from '../../pages/patient_portal/PatientNotificationsPage';
import { useThemeManager } from '../../contexts/ThemeContext';
import PatientAiChatModal from './PatientAiChatModal';
import PatientPortalFAB from './PatientPortalFAB';
import SkeletonLoader from '../shared/SkeletonLoader';

type PatientPortalView = 'home' | 'plans' | 'progress' | 'files' | 'appointments' | 'notifications';

const PatientPortalLayout: FC<{ session: Session }> = ({ session }) => {
    const [view, setView] = useState<PatientPortalView>('home');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024); // Increased breakpoint for tablet support
    
    // Data states
    const [person, setPerson] = useState<Person | null>(null);
    const [clinicInfo, setClinicInfo] = useState<{name: string, logo_url: string | null}>({ name: 'Zegna Nutrición', logo_url: null });
    const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
    const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
    const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
    const [consultations, setConsultations] = useState<ConsultationWithLabs[]>([]);
    const [files, setFiles] = useState<PatientFile[]>([]);
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);
    const [gamificationLogs, setGamificationLogs] = useState<GamificationLog[]>([]);
    const [subscription, setSubscription] = useState<(ClinicSubscription & { plans: Plan | null }) | null>(null);
    const [agentConfig, setAgentConfig] = useState<AiAgent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const { setTheme } = useThemeManager();

    const isPatientAiEnabled = useMemo(() => {
        const clinicHasAiFeature = subscription?.plans?.features 
            ? (subscription.plans.features as any).ai_assistant === true 
            : false;
        const isAgentActiveInSettings = agentConfig?.is_patient_portal_agent_active === true;
        const currentPlan = servicePlans.find(p => p.id === person?.current_plan_id);
        const patientPlanHasAi = currentPlan?.features 
            ? (currentPlan.features as any).patient_portal_ai_enabled === true 
            : false; 
        
        return clinicHasAiFeature && isAgentActiveInSettings && patientPlanHasAi;
    }, [subscription, agentConfig, servicePlans, person]);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => {
        const fetchClinicDetails = async () => {
            if (person?.clinic_id) {
                const { data: clinicData } = await supabase.from('clinics').select('name, logo_url, theme').eq('id', person.clinic_id).single();
                if (clinicData) {
                    setTheme(clinicData.theme || 'default');
                    setClinicInfo({ name: clinicData.name, logo_url: clinicData.logo_url });
                }
            } else { setTheme('default'); }
        };
        fetchClinicDetails();
    }, [person, setTheme]);


    const fetchData = useCallback(async (personId: string, clinicId: string) => {
        setError(null);
        try {
            const [dietRes, exerciseRes, checkinsRes, consultationsRes, filesRes, appointmentsRes, plansRes, gamificationRes, subRes, agentRes] = await Promise.all([
                supabase.from('diet_logs').select('*').eq('person_id', personId).order('log_date', { ascending: false }),
                supabase.from('exercise_logs').select('*').eq('person_id', personId).order('log_date', { ascending: false }),
                supabase.from('daily_checkins').select('*').eq('person_id', personId).order('checkin_date', { ascending: false }),
                supabase.from('consultations').select('*, lab_results(*)').eq('person_id', personId).order('consultation_date', { ascending: true }),
                supabase.from('files').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('person_id', personId).order('start_time', { ascending: false }),
                supabase.from('patient_service_plans').select('*').eq('clinic_id', clinicId),
                supabase.from('gamification_log').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
                supabase.from('clinic_subscriptions').select('*, plans(*)').eq('clinic_id', clinicId).single(),
                supabase.from('ai_agents').select('*').eq('clinic_id', clinicId).single(),
            ]);

            setDietLogs(dietRes.data || []);
            setExerciseLogs(exerciseRes.data || []);
            setCheckins(checkinsRes.data || []);
            setConsultations(consultationsRes.data || []);
            setFiles(filesRes.data || []);
            setAppointments(appointmentsRes.data as AppointmentWithPerson[] || []);
            setServicePlans(plansRes.data || []);
            setGamificationLogs(gamificationRes.data || []);
            setSubscription(subRes.data as any);
            setAgentConfig(agentRes.data);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        const fetchPersonProfile = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('persons').select('*').eq('user_id', session.user.id).single();
            if (error && error.code !== 'PGRST116') {
                setError(error.message);
                setLoading(false);
            } else if (data) {
                setPerson(data);
                if (!data.consent_given_at) setShowConsentModal(true);
                fetchData(data.id, data.clinic_id);
            } else {
                setLoading(false);
            }
        };
        fetchPersonProfile();
    }, [session.user.id, fetchData]);

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
    };

    const handleAcceptConsent = async () => {
        if (!person) return;
        const { data: updatedPerson } = await supabase.from('persons').update({ consent_given_at: new Date().toISOString() }).eq('id', person.id).select().single();
        setPerson(updatedPerson);
        setShowConsentModal(false);
    };

    const renderContent = () => {
        if (loading && !person) return <div style={{ padding: '2rem' }}><SkeletonLoader type="detail" count={4} /></div>;
        if (error) return <div style={{ padding: '2rem', textAlign: 'center' }}><p style={styles.error}>{error}</p></div>;
        if (!person) return <div style={{ padding: '2rem', textAlign: 'center' }}>Perfil no encontrado.</div>;

        return (
            <>
                {isPatientAiEnabled && isAiChatOpen && person && <PatientAiChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} person={person} />}
                {isPatientAiEnabled && <PatientPortalFAB onOpenChat={() => setIsAiChatOpen(true)} isMobile={isMobile} />}
                
                {/* Main Scrollable Container */}
                <div style={{
                    paddingBottom: isMobile ? '120px' : '40px', // Extra padding for bottom floating bar
                    minHeight: '100vh',
                    backgroundColor: 'var(--background-color)'
                }}>
                    {(() => {
                        switch (view) {
                            case 'home': return <PatientHomePage 
                                user={session.user} 
                                person={person} 
                                dietLogs={dietLogs} 
                                exerciseLogs={exerciseLogs} 
                                checkins={checkins} 
                                consultations={consultations} 
                                appointments={appointments} 
                                servicePlans={servicePlans} 
                                onDataRefresh={() => fetchData(person.id, person.clinic_id)} 
                                isMobile={isMobile} 
                                isAiEnabled={isPatientAiEnabled}
                                onNavigate={(v) => setView(v as PatientPortalView)}
                                onOpenAiChat={() => setIsAiChatOpen(true)}
                            />;
                            case 'plans': return <MyPlansPage dietLogs={dietLogs} exerciseLogs={exerciseLogs} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'progress': return <MyProgressPage consultations={consultations} gamificationLogs={gamificationLogs} checkins={checkins} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'files': return <MyFilesPage person={person} user={session.user} files={files} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'appointments': return <AppointmentsPage appointments={appointments} person={person} servicePlans={servicePlans} consultations={consultations} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'notifications': return <PatientNotificationsPage person={person} user={session.user} onLogout={handleLogout} />;
                            default: return <PatientHomePage 
                                user={session.user} 
                                person={person} 
                                dietLogs={dietLogs} 
                                exerciseLogs={exerciseLogs} 
                                checkins={checkins} 
                                consultations={consultations} 
                                appointments={appointments} 
                                servicePlans={servicePlans} 
                                onDataRefresh={() => fetchData(person.id, person.clinic_id)} 
                                isMobile={isMobile} 
                                isAiEnabled={isPatientAiEnabled} 
                                onNavigate={(v) => setView(v as PatientPortalView)}
                                onOpenAiChat={() => setIsAiChatOpen(true)}
                            />;
                        }
                    })()}
                </div>
            </>
        );
    };
    
    // --- Visual Components ---

    const SectionLabel: FC<{ label: string }> = ({ label }) => (
        <div style={{
            padding: '1.5rem 1rem 0.5rem 1rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--text-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            opacity: 0.6
        }}>
            {label}
        </div>
    );

    const PatientProfileWidget = () => (
        <div style={{
            padding: '1rem',
            marginTop: 'auto', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--surface-color)', 
            transition: 'background-color 0.2s',
        }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface-color) 100%)',
                color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.2rem', flexShrink: 0,
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}>
                {person?.full_name ? person.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
                <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-color)'}}>
                    {person?.full_name || 'Paciente'}
                </p>
                <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>
                    Cuenta Personal
                </p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
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

    const DesktopNavItem: FC<{ viewName: PatientPortalView; icon: React.ReactNode; label: string }> = ({ viewName, icon, label }) => {
         const isActive = view === viewName;
         return (
             <div
                 onClick={() => setView(viewName)}
                 className="nav-item-hover"
                 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    margin: '0 0.5rem 2px 0.5rem'
                 }}
             >
                 <span style={{
                     fontSize: '1.2rem',
                     display: 'flex', 
                     alignItems: 'center',
                     justifyContent: 'center',
                     width: '20px',
                     color: isActive ? 'var(--primary-color)' : 'var(--text-light)'
                 }}>{icon}</span>
                 {label}
             </div>
         )
    }

    // Modern Floating Mobile Navigation
    const MobileNavBar = () => {
        const navItems = [
            { id: 'home', label: 'Hoy', icon: ICONS.home },
            { id: 'plans', label: 'Plan', icon: ICONS.clipboard }, 
            { id: 'progress', label: 'Progreso', icon: ICONS.activity }, // Restored Progress
            { id: 'appointments', label: 'Citas', icon: ICONS.calendar },
            { id: 'notifications', label: 'Perfil', icon: ICONS.user },
        ];

        return (
            <nav style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '400px',
                height: '70px',
                backgroundColor: '#FFFFFF', 
                borderRadius: '35px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 10px',
                zIndex: 1000,
                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)', 
                border: '1px solid rgba(0, 0, 0, 0.05)' 
            }}>
                {navItems.map((item) => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as PatientPortalView)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: isActive ? 'var(--primary-color)' : '#94A3B8',
                                padding: '0',
                                cursor: 'pointer',
                                width: '60px',
                                height: '100%',
                                position: 'relative'
                            }}
                        >
                            {/* Active Indicator */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary-color)',
                                    boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.5)'
                                }} />
                            )}
                            
                            <div style={{
                                fontSize: '1.4rem',
                                marginBottom: isActive ? '2px' : '0',
                                transform: isActive ? 'translateY(2px)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}>
                                {item.icon}
                            </div>
                            
                            {isActive && (
                                <span style={{ 
                                    fontSize: '0.65rem', 
                                    fontWeight: 600,
                                    opacity: 1,
                                    transform: 'translateY(-2px)',
                                    animation: 'fadeIn 0.3s ease-out'
                                }}>
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        );
    };

    return (
        <div style={{...styles.patientPortalLayout, flexDirection: 'column'}}>
            {showConsentModal && person && <ConsentModal personName={person.full_name} onAccept={handleAcceptConsent} onLogout={handleLogout} />}
            
            {/* Desktop Navbar (Sidebar Style) */}
            {!isMobile && (
                <aside style={{
                    width: '260px',
                    backgroundColor: 'var(--surface-color)',
                    borderRight: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    zIndex: 1000
                }}>
                    {/* Clinic Brand Header */}
                    <div style={{ 
                         padding: '1.5rem 1rem', 
                         marginBottom: '0.5rem', 
                         borderBottom: '1px solid var(--border-color)',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.75rem'
                     }}>
                        <div style={{
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.2rem', fontWeight: 800,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            flexShrink: 0
                        }}>
                             {clinicInfo.logo_url ? <img src={clinicInfo.logo_url} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px'}} /> : (clinicInfo.name.charAt(0) || 'C')}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h2 style={{ color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {clinicInfo.name}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)' }}>Portal Paciente</p>
                        </div>
                    </div>
                    
                    <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem', display: 'flex', flexDirection: 'column' }} className="hide-scrollbar">
                        <SectionLabel label="NAVEGACIÓN" />
                        <DesktopNavItem viewName="home" icon={ICONS.home} label="Inicio" />
                        <DesktopNavItem viewName="plans" icon={ICONS.clipboard} label="Mis Planes" />
                        <DesktopNavItem viewName="progress" icon={ICONS.activity} label="Mi Progreso" />
                        <DesktopNavItem viewName="appointments" icon={ICONS.calendar} label="Citas" />
                        
                        <SectionLabel label="GESTIÓN" />
                        <DesktopNavItem viewName="files" icon={ICONS.folder} label="Archivos" />
                        <DesktopNavItem viewName="notifications" icon={ICONS.settings} label="Mi Cuenta" />
                    </nav>

                    <PatientProfileWidget />
                </aside>
            )}
            
            <main style={{ 
                flex: 1, 
                maxWidth: '100%', 
                marginLeft: isMobile ? 0 : '260px',
                width: isMobile ? '100%' : 'calc(100% - 260px)',
                position: 'relative'
            }}>
                {renderContent()}
            </main>

            {/* Mobile Bottom Tab Bar (Floating Island Style) */}
            {isMobile && <MobileNavBar />}
        </div>
    );
};

export default PatientPortalLayout;
