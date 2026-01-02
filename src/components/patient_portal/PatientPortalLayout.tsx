
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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
import { useThemeManager } from '../../contexts/ThemeContext';
import PatientAiChatModal from './PatientAiChatModal';
import PatientPortalFAB from './PatientPortalFAB';
import SkeletonLoader from '../shared/SkeletonLoader';

type PatientPortalView = 'home' | 'plans' | 'progress' | 'files' | 'appointments' | 'notifications';

const PatientPortalLayout: FC<{ session: Session }> = ({ session }) => {
    const [view, setView] = useState<PatientPortalView>('home');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
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
        // 1. The clinic must have the AI feature in their subscription (SaaS level)
        const clinicHasAiFeature = subscription?.plans?.features 
            ? (subscription.plans.features as any).ai_assistant === true 
            : false;

        // 2. The specific agent for the portal must be active in clinic settings
        const isAgentActiveInSettings = agentConfig?.is_patient_portal_agent_active === true;

        // 3. The patient's specific plan must allow AI
        // Logic: If patient has a plan, check its features. If no plan, default to FALSE (unless we want to allow free usage)
        const currentPlan = servicePlans.find(p => p.id === person?.current_plan_id);
        const patientPlanHasAi = currentPlan?.features 
            ? (currentPlan.features as any).patient_portal_ai_enabled === true 
            : false; // Default to false if no plan or explicit setting

        // Special Case: If the clinic has AI but the patient has NO plan, should they have AI? 
        // Usually no, to incentivize plans. So the strict check is correct.
        
        return clinicHasAiFeature && isAgentActiveInSettings && patientPlanHasAi;
    }, [subscription, agentConfig, servicePlans, person]);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
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
                <div style={{paddingBottom: isMobile ? '100px' : '40px'}}>
                    {(() => {
                        switch (view) {
                            case 'home': return <PatientHomePage user={session.user} person={person} dietLogs={dietLogs} exerciseLogs={exerciseLogs} checkins={checkins} consultations={consultations} appointments={appointments} servicePlans={servicePlans} onDataRefresh={() => fetchData(person.id, person.clinic_id)} isMobile={isMobile} isAiEnabled={isPatientAiEnabled} />;
                            case 'plans': return <MyPlansPage dietLogs={dietLogs} exerciseLogs={exerciseLogs} />;
                            case 'progress': return <MyProgressPage consultations={consultations} gamificationLogs={gamificationLogs} checkins={checkins} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'files': return <MyFilesPage person={person} user={session.user} files={files} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'appointments': return <AppointmentsPage appointments={appointments} person={person} servicePlans={servicePlans} consultations={consultations} onDataRefresh={() => fetchData(person.id, person.clinic_id)} />;
                            case 'notifications': return <PatientNotificationsPage person={person} user={session.user} onLogout={handleLogout} />;
                            default: return <PatientHomePage user={session.user} person={person} dietLogs={dietLogs} exerciseLogs={exerciseLogs} checkins={checkins} consultations={consultations} appointments={appointments} servicePlans={servicePlans} onDataRefresh={() => fetchData(person.id, person.clinic_id)} isMobile={isMobile} isAiEnabled={isPatientAiEnabled} />;
                        }
                    })()}
                </div>
            </>
        );
    };
    
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
                    padding: '0.5rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    gap: '4px'
                }}
            >
                <span style={{ fontSize: '1.4rem', transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>{icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>
            </button>
        );
    };

    const NavItem: FC<{ viewName: PatientPortalView; icon: React.ReactNode; label: string }> = ({ viewName, icon, label }) => {
         const isActive = view === viewName;
         return (
             <button
                 onClick={() => setView(viewName)}
                 className="nav-item-hover"
                 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'var(--surface-hover-color)' : 'transparent',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem'
                 }}
             >
                 <span style={{fontSize: '1.1rem'}}>{icon}</span>
                 {label}
             </button>
         )
    }

    return (
        <div style={{...styles.patientPortalLayout, flexDirection: 'column'}}>
            {showConsentModal && person && <ConsentModal personName={person.full_name} onAccept={handleAcceptConsent} onLogout={handleLogout} />}
            
            {/* Desktop Navbar */}
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <img 
                            src={person?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person?.full_name || '?'}&radius=50`} 
                            alt="Avatar" 
                            style={{width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover'}}
                        />
                        <div>
                            <h2 style={{fontSize: '1rem', margin: 0, color: 'var(--text-color)'}}>{person?.full_name?.split(' ')[0]}</h2>
                            <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-light)'}}>Portal Paciente</p>
                        </div>
                    </div>
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <NavItem viewName="home" icon={ICONS.home} label="Inicio" />
                        <NavItem viewName="plans" icon={ICONS.book} label="Planes" />
                        <NavItem viewName="progress" icon={ICONS.activity} label="Progreso" />
                        <NavItem viewName="files" icon={ICONS.file} label="Archivos" />
                        <NavItem viewName="appointments" icon={ICONS.calendar} label="Consultas" />
                        <NavItem viewName="notifications" icon={ICONS.settings} label="Mi Cuenta" />
                    </nav>
                    <button onClick={handleLogout} style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}} className="nav-item-hover">
                        {ICONS.logout} Salir
                    </button>
                </header>
            )}
            
            <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {isMobile && (
                     <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                            <img 
                                src={person?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${person?.full_name || '?'}&radius=50`} 
                                alt="Avatar" 
                                style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}}
                            />
                            <span style={{fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-color)'}}>Zegna</span>
                        </div>
                        <div style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)'}}>
                            {view === 'home' ? 'Inicio' : view === 'plans' ? 'Mis Planes' : view === 'progress' ? 'Progreso' : view === 'appointments' ? 'Citas' : view === 'files' ? 'Archivos' : 'Ajustes'}
                        </div>
                     </header>
                )}
                {renderContent()}
            </main>

            {/* Mobile Bottom Nav */}
            {isMobile && (
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
                    boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
                }}>
                    <BottomNavItem viewName="home" icon={ICONS.home} label="Inicio" />
                    <BottomNavItem viewName="plans" icon={ICONS.book} label="Planes" />
                    <BottomNavItem viewName="progress" icon={ICONS.activity} label="Progreso" />
                    <BottomNavItem viewName="appointments" icon={ICONS.calendar} label="Agenda" />
                    <BottomNavItem viewName="notifications" icon={ICONS.settings} label="Cuenta" />
                </nav>
            )}
        </div>
    );
};

export default PatientPortalLayout;
