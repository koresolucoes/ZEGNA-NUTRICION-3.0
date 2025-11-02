import React, { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
// FIX: Updated type imports to use new unified types
import { Log, Person, NutritionistProfile, ChurnFeedback, AppointmentWithPerson } from '../types';
import RecentFeedbackWidget from '../components/dashboard/RecentFeedbackWidget';
import { useClinic } from '../contexts/ClinicContext';
import UpcomingAppointmentsWidget from '../components/dashboard/UpcomingAppointmentsWidget';
import FinancialSummaryCard from '../components/finanzas/FinancialSummaryCard';

// FIX: This type is now simpler as logs are unified
type CombinedLog = Log & {
    person_type: 'client' | 'member';
    person_id: string;
    person_name: string | null;
};

interface ExpiringPlan {
    id: string;
    name: string;
    endDate: string;
    type: 'client' | 'member';
}

interface HomePageProps {
    user: User; 
    isMobile: boolean; 
    navigate: (page: string, context?: any) => void;
    openQuickConsult: () => void;
}

const HomePage: FC<HomePageProps> = ({ user, isMobile, navigate, openQuickConsult }) => {
    const { clinic } = useClinic();
    const [stats, setStats] = useState({ 
        activeClients: 0, 
        activeAfiliados: 0,
        totalClients: 0,
        expiredClients: 0,
        aliados: 0,
    });
    const [expiring, setExpiring] = useState<ExpiringPlan[]>([]);
    const [recentActivity, setRecentActivity] = useState<CombinedLog[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithPerson[]>([]);
    const [recentFeedback, setRecentFeedback] = useState<ChurnFeedback[]>([]);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSummaryTab, setActiveSummaryTab] = useState('appointments');
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const displayName = useMemo(() => {
        if (profile?.full_name) {
            const firstName = profile.full_name.split(' ')[0];
            // Ensure proper capitalization, e.g., PEDRO -> Pedro
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        return user.email?.split('@')[0] || '';
    }, [profile, user.email]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
    };

    const fetchDashboardData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const today = new Date();
            const fifteenDaysFromNow = new Date();
            fifteenDaysFromNow.setDate(today.getDate() + 15);
            const todayISO = today.toISOString().split('T')[0];
            const fifteenDaysFromNowISO = fifteenDaysFromNow.toISOString().split('T')[0];

            const { data: allPersonsData, error: allPersonsError } = await supabase
                .from('persons')
                .select('id, person_type, subscription_end_date, full_name')
                .eq('clinic_id', clinic.id);
            if (allPersonsError) throw allPersonsError;
            
            const allPersons = allPersonsData || [];
            const allClients = allPersons.filter(p => p.person_type === 'client');
            const totalClients = allClients.length;
            const expiredClients = allClients.filter(p => p.subscription_end_date && new Date(p.subscription_end_date) < today).length;

            const [
                activeClientsRes, 
                activeAfiliadosRes,
                aliadosRes,
                logsRes,
                profileRes,
                feedbackRes,
                appointmentsRes,
            ] = await Promise.all([
                supabase.from('persons').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('person_type', 'client').gte('subscription_end_date', todayISO),
                supabase.from('persons').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('person_type', 'member').gte('subscription_end_date', todayISO),
                supabase.from('clinic_ally_partnerships').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('status', 'active'),
                supabase.from('logs').select('*, persons!inner(full_name, clinic_id, person_type)').eq('persons.clinic_id', clinic.id).order('created_at', { ascending: false }).limit(5),
                supabase.from('nutritionist_profiles').select('full_name').eq('user_id', user.id).single(),
                supabase.from('churn_feedback').select('*, persons!inner(full_name, clinic_id)').eq('persons.clinic_id', clinic.id).order('created_at', { ascending: false }).limit(5),
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('clinic_id', clinic.id).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
            ]);
            
            const expiringPersons = allPersons.filter(p => p.subscription_end_date && p.subscription_end_date >= todayISO && p.subscription_end_date <= fifteenDaysFromNowISO);

            const errors = [activeClientsRes.error, activeAfiliadosRes.error, aliadosRes.error, logsRes.error, profileRes.error, feedbackRes.error, appointmentsRes.error];
            const firstError = errors.find(e => e && e.code !== 'PGRST116');
            if (firstError) throw firstError;
            
            if (profileRes.data) {
                setProfile(profileRes.data as NutritionistProfile);
            }
            
            setRecentFeedback((feedbackRes.data as any[]) || []);
            setUpcomingAppointments((appointmentsRes.data as any[]) || []);

            const allExpiring = (expiringPersons || []).map(p => ({
                id: p.id, name: p.full_name, endDate: p.subscription_end_date!, type: p.person_type as 'client' | 'member'
            })).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
            setExpiring(allExpiring);

            const allLogs = ((logsRes.data as any[]) || []).map(log => ({
                ...log, 
                person_type: log.persons.person_type,
                person_id: log.person_id,
                person_name: log.persons.full_name
            }));
            setRecentActivity(allLogs);

            setStats({
                activeClients: activeClientsRes.count ?? 0,
                activeAfiliados: activeAfiliadosRes.count ?? 0,
                totalClients: totalClients,
                expiredClients: expiredClients,
                aliados: aliadosRes.count ?? 0,
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic, user.id]);

    useEffect(() => {
        if (!clinic) return;

        fetchDashboardData();

        const handleRealtimeChange = (payload: any) => {
            console.log('Realtime change received for dashboard, refetching data:', payload);
            fetchDashboardData();
        };

        const channel = supabase.channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persons', filter: `clinic_id=eq.${clinic.id}` }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_ally_partnerships', filter: `clinic_id=eq.${clinic.id}` }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'churn_feedback' }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` }, handleRealtimeChange)
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime subscription started for HomePage.');
                }
                if (status === 'CLOSED') {
                    console.log('Realtime subscription closed for HomePage.');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error on HomePage:', err);
                }
            });

        return () => {
            console.log('Cleaning up realtime subscription for HomePage.');
            supabase.removeChannel(channel);
        };
    }, [clinic, fetchDashboardData]);
    
    const navigateToDetail = (type: 'client' | 'member', id: string) => {
        const page = type === 'client' ? 'client-detail' : 'afiliado-detail';
        navigate(page, { personId: id });
    };
    
    return (
        <div className="fade-in">
            <div style={{...styles.pageHeader, borderBottom: 'none', paddingBottom: 0, alignItems: 'flex-start'}}>
                <div>
                    <h1>Dashboard</h1>
                    <p style={{ marginTop: '0.25rem', color: 'var(--text-light)' }}>¡Bienvenido de nuevo, {displayName}!</p>
                </div>
                 {!isMobile && (
                    <div style={styles.profileDropdownContainer} ref={dropdownRef}>
                        <button onClick={() => setDropdownOpen(!isDropdownOpen)} style={styles.profileDropdownButton} className="nav-item-hover" aria-haspopup="true" aria-expanded={isDropdownOpen}>
                             <span style={{fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{user.email}</span>
                             <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: 'var(--primary-color)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                {ICONS.user}
                            </div>
                        </button>
                         {isDropdownOpen && (
                            <div style={styles.profileDropdownMenu} className="fade-in">
                                <button onClick={() => navigate('profile')} style={styles.profileDropdownItem} className="nav-item-hover">
                                    {ICONS.user} Mi Perfil
                                </button>
                                <button onClick={() => navigate('settings')} style={styles.profileDropdownItem} className="nav-item-hover">
                                    {ICONS.settings} Configuración
                                </button>
                                <hr style={{margin: '4px 0', border: 'none', borderTop: '1px solid var(--border-color)'}} />
                                <button onClick={handleLogout} style={{...styles.profileDropdownItem, color: 'var(--error-color)'}} className="nav-item-hover">
                                    {ICONS.logout} Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                 )}
            </div>

            {error && <p style={styles.error}>{error}</p>}
            
             <section aria-labelledby="stats-title" style={{margin: '1rem 0 2.5rem 0'}}>
                <h2 id="stats-title" className="sr-only">Estadísticas del Negocio</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem'}}>
                    <FinancialSummaryCard title="Pacientes Activos" value={loading ? '...' : stats.activeClients.toString()} icon={ICONS.users} />
                    <FinancialSummaryCard title="Afiliados Activos" value={loading ? '...' : stats.activeAfiliados.toString()} icon={ICONS.users} />
                    <FinancialSummaryCard title="Colaboradores" value={loading ? '...' : stats.aliados.toString()} icon={ICONS.briefcase} />
                    <FinancialSummaryCard title="% Pacientes Vencidos" value={loading ? '...' : (stats.totalClients > 0 ? `${((stats.expiredClients / stats.totalClients) * 100).toFixed(0)}%` : '0%')} icon={ICONS.activity} />
                </div>
            </section>
            
            <section aria-labelledby="actions-title" style={{margin: '2.5rem 0'}}>
                <h2 id="actions-title" style={{...styles.detailCardTitle, fontSize: '1.5rem', marginBottom: '1.5rem'}}>Acciones Rápidas</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}} className="actions-grid">
                    <button className="action-card" onClick={() => navigate('client-form')}>
                        {ICONS.add}
                        <span>Nuevo Paciente</span>
                    </button>
                     <button className="action-card" onClick={() => navigate('afiliado-form')}>
                        {ICONS.add}
                        <span>Nuevo Afiliado</span>
                    </button>
                    <button className="action-card" onClick={openQuickConsult}>
                        {ICONS.clinic}
                        <span>Registro de Consulta</span>
                    </button>
                     <button className="action-card" onClick={() => navigate('calculators')}>
                        {ICONS.calculator}
                        <span>Crear Plan Dietético</span>
                    </button>
                </div>
            </section>

             <section aria-labelledby="activity-summary-title" style={{margin: '2.5rem 0'}}>
                <h2 id="activity-summary-title" style={{...styles.detailCardTitle, fontSize: '1.5rem', marginBottom: '1.5rem'}}>Resumen de Actividad</h2>
                {isMobile ? (
                    <div>
                        <div className="summary-tabs" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                            <button className={`summary-tab-button ${activeSummaryTab === 'appointments' ? 'active' : ''}`} style={{backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '1rem', borderRadius: '8px', fontWeight: 600, textAlign: 'center'}} onClick={() => setActiveSummaryTab('appointments')}>Próximas Citas</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'expiring' ? 'active' : ''}`} style={{backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '1rem', borderRadius: '8px', fontWeight: 600, textAlign: 'center'}} onClick={() => setActiveSummaryTab('expiring')}>Planes por Vencer</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'activity' ? 'active' : ''}`} style={{backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '1rem', borderRadius: '8px', fontWeight: 600, textAlign: 'center'}} onClick={() => setActiveSummaryTab('activity')}>Timeline Clínico</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'feedback' ? 'active' : ''}`} style={{backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '1rem', borderRadius: '8px', fontWeight: 600, textAlign: 'center'}} onClick={() => setActiveSummaryTab('feedback')}>Feedback</button>
                        </div>
                        <div className="fade-in">
                            {activeSummaryTab === 'appointments' && <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />}
                            {activeSummaryTab === 'expiring' && <p>Planes por vencer...</p>}
                            {activeSummaryTab === 'activity' && <p>Actividad reciente...</p>}
                            {activeSummaryTab === 'feedback' && <RecentFeedbackWidget recentFeedback={recentFeedback} loading={loading} navigateToDetail={navigateToDetail} />}
                        </div>
                    </div>
                ) : (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                        <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />
                        <RecentFeedbackWidget recentFeedback={recentFeedback} loading={loading} navigateToDetail={navigateToDetail} />
                    </div>
                )}
            </section>
        </div>
    );
};

export default HomePage;