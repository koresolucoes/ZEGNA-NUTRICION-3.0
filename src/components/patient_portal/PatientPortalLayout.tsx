
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
        const fetchClinicTheme = async () => {
            if (person?.clinic_id) {
                const { data: clinicData } = await supabase.from('clinics').select('theme').eq('id', person.clinic_id).single();
                if (clinicData) setTheme(clinicData.theme || 'default');
            } else { setTheme('default'); }
        };
        fetchClinicTheme();
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
                    paddingBottom: isMobile ? '110px' : '40px', // Extra padding for bottom bar
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
    
    // --- Modern Tab Bar Components ---
    const BottomNavItem: FC<{ viewName: PatientPortalView; icon: React.ReactNode; label: string }> = ({ viewName, icon, label }) => {
        const isActive = view === viewName;
        return (
            <button
                onClick={() => setView(viewName)}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-light)',
                    padding: '8px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    opacity: isActive ? 1 : 0.7
                }}
            >
                <div style={{
                    fontSize: '1.5rem', 
                    marginBottom: '2px',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    transition: 'transform 0.2s'
                }}>
                    {icon}
                </div>
                <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 600,
                    opacity: isActive ? 1 : 0.8
                }}>
                    {label}
                </span>
                {isActive && (
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        width: '40%',
                        height: '3px',
                        backgroundColor: 'var(--primary-color)',
                        borderRadius: '0 0 4px 4px',
                        boxShadow: '0 2px 8px var(--primary-color)'
                    }} />
                )}
            </button>
        );
    };

    const DesktopNavItem: FC<{ viewName: PatientPortalView; icon: React.ReactNode; label: string }> = ({ viewName, icon, label }) => {
         const isActive = view === viewName;
         return (
             <button
                 onClick={() => setView(viewName)}
                 className="nav-item-hover"
                 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? 'var(--surface-hover-color)' : 'transparent',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.95rem'
                 }}
             >
                 <span style={{fontSize: '1.2rem'}}>{icon}</span>
                 {label}
             </button>
         )
    }

    return (
        <div style={{...styles.patientPortalLayout, flexDirection: 'column'}}>
            {showConsentModal && person && <ConsentModal personName={person.full_name} onAccept={handleAcceptConsent} onLogout={handleLogout} />}
            
            {/* Desktop Navbar (Sidebar Style) */}
            {!isMobile && (
                <aside style={{
                    width: '280px',
                    backgroundColor: 'var(--surface-color)',
                    borderRight: '1px solid var(--border-color)',
                    padding: '2rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                         <img 
                            src={person?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person?.full_name || '?'}&radius=50`} 
                            alt="Avatar" 
                            style={{width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        />
                        <div>
                            <h2 style={{fontSize: '1rem', margin: 0, color: 'var(--text-color)', fontWeight: 700}}>{person?.full_name?.split(' ')[0]}</h2>
                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Portal Paciente</p>
                        </div>
                    </div>
                    
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <DesktopNavItem viewName="home" icon={ICONS.home} label="Inicio" />
                        <DesktopNavItem viewName="plans" icon={ICONS.book} label="Mis Planes" />
                        <DesktopNavItem viewName="progress" icon={ICONS.activity} label="Mi Progreso" />
                        <DesktopNavItem viewName="files" icon={ICONS.file} label="Archivos" />
                        <DesktopNavItem viewName="appointments" icon={ICONS.calendar} label="Citas" />
                        <div style={{height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0'}}></div>
                        <DesktopNavItem viewName="notifications" icon={ICONS.settings} label="Mi Cuenta" />
                    </nav>

                    <button onClick={handleLogout} style={{background: 'var(--surface-hover-color)', border: 'none', color: 'var(--error-color)', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, marginTop: 'auto'}} className="nav-item-hover">
                        {ICONS.logout} Cerrar Sesión
                    </button>
                </aside>
            )}
            
            <main style={{ 
                flex: 1, 
                maxWidth: '100%', 
                marginLeft: isMobile ? 0 : '280px',
                width: isMobile ? '100%' : 'calc(100% - 280px)',
                position: 'relative'
            }}>
                {renderContent()}
            </main>

            {/* Mobile Bottom Tab Bar (App-like) */}
            {isMobile && (
                <nav style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '85px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Glassmorphism base (adjust for dark mode via theme vars)
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    paddingBottom: '20px', // Safe area for iPhone home bar
                    zIndex: 1000,
                    boxShadow: '0 -5px 20px rgba(0,0,0,0.03)'
                }}>
                    <BottomNavItem viewName="home" icon={ICONS.home} label="Hoy" />
                    <BottomNavItem viewName="plans" icon={ICONS.book} label="Plan" />
                    <BottomNavItem viewName="progress" icon={ICONS.activity} label="Progreso" />
                    <BottomNavItem viewName="appointments" icon={ICONS.calendar} label="Citas" />
                    <BottomNavItem viewName="notifications" icon={ICONS.settings} label="Perfil" />
                </nav>
            )}
        </div>
    );
};

export default PatientPortalLayout;
