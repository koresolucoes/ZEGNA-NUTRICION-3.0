import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
// FIX: In Supabase v2, Session is exported via `import type`.
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { ICONS } from '../../pages/AuthPage';
import { Person, DietLog, ExerciseLog, DailyCheckin, ConsultationWithLabs, PatientFile, AppointmentWithPerson, PatientServicePlan, GamificationLog, Clinic, AiAgent, ClinicSubscription, Plan, PopulatedReferralConsentRequest } from '../../types';
import { styles } from '../../constants';
import PatientHomePage from '../../pages/patient_portal/PatientHomePage';
import MyPlansPage from '../../pages/patient_portal/MyPlansPage';
import MyProgressPage from '../../pages/patient_portal/MyProgressPage';
import MyFilesPage from '../../pages/patient_portal/MyFilesPage';
import AppointmentsPage from '../../pages/patient_portal/AppointmentsPage';
import ConsentModal from './ConsentModal';
import PatientNotificationsPage from '../../pages/patient_portal/PatientNotificationsPage';
import { applyTheme } from '../../theme';
import PatientAiChatModal from './PatientAiChatModal';
import PatientPortalFAB from './PatientPortalFAB';

type PatientPortalView = 'home' | 'plans' | 'progress' | 'files' | 'appointments' | 'notifications';

const PatientPortalLayout: FC<{ session: Session }> = ({ session }) => {
    const [view, setView] = useState<PatientPortalView>('home');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);
    
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

    const toggleSidebar = () => setSidebarOpen(prevState => !prevState);

    const isPatientAiEnabled = useMemo(() => {
        // 1. Check if the clinic's master subscription includes the AI feature.
        const clinicHasAiFeature = subscription?.plans?.features ? (subscription.plans.features as any).ai_assistant === true : false;
        
        // 2. Check if the AI agent for the patient portal is globally enabled in the clinic's settings.
        const isAgentActiveInSettings = agentConfig?.is_patient_portal_agent_active === true;
        
        // 3. Check if the specific service plan assigned to this patient has the AI feature enabled.
        const currentPlan = servicePlans.find(p => p.id === person?.current_plan_id);
        const patientPlanHasAi = currentPlan?.features ? (currentPlan.features as any).patient_portal_ai_enabled === true : false;
        
        return clinicHasAiFeature && isAgentActiveInSettings && patientPlanHasAi;
    }, [subscription, agentConfig, servicePlans, person]);
    
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            if (isMobile !== mobile) {
                setIsMobile(mobile);
                setSidebarOpen(!mobile);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);
    
    useEffect(() => {
        const fetchClinicTheme = async () => {
            if (person?.clinic_id) {
                const { data: clinicData, error } = await supabase
                    .from('clinics')
                    .select('theme')
                    .eq('id', person.clinic_id)
                    .single();
                if (clinicData) {
                    applyTheme(clinicData.theme || 'default');
                }
            } else {
                 applyTheme('default');
            }
        };
        fetchClinicTheme();
    }, [person]);


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

            const responses = [dietRes, exerciseRes, checkinsRes, consultationsRes, filesRes, appointmentsRes, plansRes, gamificationRes, subRes, agentRes];
            const firstError = responses.map(res => res.error).find(err => err && err.code !== 'PGRST116');
            if (firstError) throw firstError;

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
                if (!data.consent_given_at) {
                    setShowConsentModal(true);
                }
                fetchData(data.id, data.clinic_id);
            } else {
                setLoading(false);
            }
        };
        fetchPersonProfile();
    }, [session.user.id, fetchData]);
    
    useEffect(() => {
        if (!person?.id || !person?.clinic_id) return;
        
        const personId = person.id;
        const clinicId = person.clinic_id;
    
        const handleRelatedDataChange = (payload: any) => {
            console.log('Realtime change on related table, refetching data:', payload);
            fetchData(personId, clinicId);
        };
    
        const handlePersonDataChange = async (payload: any) => {
            console.log('Realtime change on person, refetching person object:', payload);
            const { data, error } = await supabase.from('persons').select('*').eq('id', personId).single();
            if (error) {
                console.error("Error refetching person data on realtime update:", error);
            } else if (data) {
                setPerson(data);
            }
        };
        
        const tablesWithPersonId = ['diet_logs', 'exercise_logs', 'daily_checkins', 'consultations', 'files', 'appointments', 'gamification_log'];
        const subscriptions = tablesWithPersonId.map(table => 
            supabase.channel(`patient-${table}-${personId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `person_id=eq.${personId}` }, handleRelatedDataChange)
                .subscribe()
        );

        const personSubscription = supabase.channel(`patient-person-${personId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'persons', filter: `id=eq.${personId}`}, handlePersonDataChange)
            .subscribe();

        subscriptions.push(personSubscription);
    
        return () => {
            subscriptions.forEach(sub => supabase.removeChannel(sub));
        };
    }, [person?.id, person?.clinic_id, fetchData]);


    const handleLogout = async () => {
        // FIX: Correctly call signOut() from supabase.auth
        await supabase.auth.signOut({ scope: 'local' });
    };

    const handleAcceptConsent = async () => {
        if (!person) return;
        const { data: updatedPerson, error } = await supabase
            .from('persons')
            .update({ consent_given_at: new Date().toISOString() })
            .eq('id', person.id)
            .select()
            .single();

        if (error) {
            setError('No se pudo guardar el consentimiento. Inténtalo de nuevo.');
        } else {
            setPerson(updatedPerson);
            setShowConsentModal(false);
        }
    };


    const navigate = (page: PatientPortalView) => {
        setView(page);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };
    
    const NavItem: FC<{ name: string; viewName: PatientPortalView; icon: React.ReactNode }> = ({ name, viewName, icon }) => {
        const isActive = view.startsWith(viewName);
        return (
            <button
                onClick={() => navigate(viewName)}
                style={{ ...styles.patientNavItem, backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', color: isActive ? 'var(--primary-color)' : 'var(--text-color)', borderLeft: isActive ? `3px solid var(--primary-color)` : '3px solid transparent' }}
                className="nav-item-hover"
            >
                <span style={{color: 'var(--primary-color)'}}>{icon}</span>
                {name}
            </button>
        );
    };

    const renderContent = () => {
        if (loading && !person) return <div style={{ padding: '2rem' }}>Cargando tus datos...</div>;
        if (error) return <div style={{ padding: '2rem' }}><p style={styles.error}>{error}</p></div>;
        if (!person) return <div style={{ padding: '2rem' }}>No se encontró tu perfil de paciente. Por favor, contacta a tu nutriólogo.</div>;

        return (
            <>
                {isPatientAiEnabled && isAiChatOpen && person && (
                    <PatientAiChatModal 
                        isOpen={isAiChatOpen} 
                        onClose={() => setIsAiChatOpen(false)} 
                        person={person}
                    />
                )}
                {isPatientAiEnabled && <PatientPortalFAB onOpenChat={() => setIsAiChatOpen(true)} />}
                {(() => {
                    switch (view) {
                        case 'home': return <PatientHomePage user={session.user} person={person} dietLogs={dietLogs} exerciseLogs={exerciseLogs} checkins={checkins} consultations={consultations} appointments={appointments} servicePlans={servicePlans} onDataRefresh={() => fetchData(person.id, person.clinic_id)} isMobile={isMobile} isAiEnabled={isPatientAiEnabled} />;
                        case 'plans': return <MyPlansPage dietLogs={dietLogs} exerciseLogs={exerciseLogs} />;
                        case 'progress': return <MyProgressPage consultations={consultations} gamificationLogs={gamificationLogs} checkins={checkins} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                        case 'files': return <MyFilesPage person={person} user={session.user} files={files} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                        case 'appointments': return <AppointmentsPage appointments={appointments} person={person} servicePlans={servicePlans} consultations={consultations} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                        case 'notifications': return <PatientNotificationsPage />;
                        default: return <PatientHomePage user={session.user} person={person} dietLogs={dietLogs} exerciseLogs={exerciseLogs} checkins={checkins} consultations={consultations} appointments={appointments} servicePlans={servicePlans} onDataRefresh={() => fetchData(person.id, person.clinic_id)} isMobile={isMobile} isAiEnabled={isPatientAiEnabled} />;
                    }
                })()}
            </>
        );
    };
    
    const mainContentStyle: React.CSSProperties = {
        ...styles.patientPortalMain,
        padding: isMobile ? '1rem' : '1.5rem 2rem',
        marginLeft: isMobile ? 0 : (isSidebarOpen ? '220px' : '0'),
    };

    const sidebarStyle: React.CSSProperties = {
        ...styles.patientSidebar,
        ...(!isSidebarOpen && styles.sidebarHidden),
    };
    
    const viewTitles = {
        home: 'Dashboard',
        plans: 'Mis Planes',
        progress: 'Mi Progreso',
        files: 'Mis Archivos',
        appointments: 'Mis Citas',
        notifications: 'Notificaciones'
    }

    return (
        <div style={styles.patientPortalLayout}>
            {showConsentModal && person && (
                <ConsentModal
                    personName={person.full_name}
                    onAccept={handleAcceptConsent}
                    onLogout={handleLogout}
                />
            )}
            {isMobile && isSidebarOpen && <div style={{...styles.modalOverlay, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050}} onClick={toggleSidebar}></div>}

            <aside style={sidebarStyle}>
                <div style={{...styles.sidebarHeader, padding: '0 0.5rem', marginBottom: '2rem'}}>
                    <h2 style={{color: 'var(--primary-color)', fontSize: '1.1rem'}}>Portal Paciente</h2>
                    {!isMobile && (
                        <button onClick={toggleSidebar} style={{...styles.sidebarToggleButton, background: 'none', border: 'none'}} className="nav-item-hover" aria-label="Ocultar menú">
                            {ICONS.back}
                        </button>
                    )}
                </div>
                <nav style={{flex: 1, overflowY: 'auto'}} className="hide-scrollbar">
                    <NavItem name="Dashboard" viewName="home" icon={ICONS.home} />
                    <NavItem name="Mis Planes" viewName="plans" icon={ICONS.book} />
                    <NavItem name="Mi Progreso" viewName="progress" icon={ICONS.activity} />
                    <NavItem name="Mis Archivos" viewName="files" icon={ICONS.file} />
                    <NavItem name="Mis Citas" viewName="appointments" icon={ICONS.calendar} />
                </nav>
                 <div>
                    <NavItem name="Notificaciones" viewName="notifications" icon={ICONS.settings} />
                </div>
            </aside>
            
            <main style={mainContentStyle}>
                 <header style={{...styles.patientPortalHeader, marginBottom: '2rem', padding: '0.5rem 0', backgroundColor: 'transparent', boxShadow: 'none', border: 'none'}} className="patient-portal-header-content">
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                       {!isSidebarOpen && (
                           <button onClick={toggleSidebar} style={{...styles.hamburger, color: 'var(--text-light)'}} aria-label="Abrir menú">
                             {ICONS.menu}
                           </button>
                       )}
                       <h1 style={{ color: 'var(--text-color)', fontSize: isMobile ? '1.5rem' : '1.8rem', margin: 0 }}>
                          {view === 'home' ? 'Bienvenido' : viewTitles[view]}
                       </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="user-info-desktop" style={{textAlign: 'right'}}>
                            <span style={{ color: 'var(--text-color)', fontWeight: 600, fontSize: '0.9rem' }}>{person?.full_name || session.user.email}</span>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-light)' }}>{person?.folio || ''}</span>
                        </div>
                         <img 
                            src={person?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person?.full_name || '?'}&radius=50`} 
                            alt="Avatar" 
                            style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}}
                        />
                        <button onClick={handleLogout} style={{ ...styles.iconButton, color: 'var(--text-light)', border: '1px solid var(--border-color)'}} title="Cerrar sesión">
                            <span className="sr-only">Salir</span>
                             {ICONS.logout}
                        </button>
                    </div>
                </header>
                {renderContent()}
            </main>
        </div>
    );
};

export default PatientPortalLayout;