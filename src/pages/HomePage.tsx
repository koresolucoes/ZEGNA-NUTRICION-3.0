

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

            // FIX: Logs are now from a single table with a join
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

    const navigateToEdit = (type: 'client' | 'member', id: string) => {
        const page = type === 'client' ? 'client-form' : 'afiliado-form';
        navigate(page, { personId: id });
    };
    
    const getDaysRemainingText = (dateString: string) => {
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const endDateUTC = new Date(dateString); // 'YYYY-MM-DD' is parsed as UTC midnight
        const diffTime = endDateUTC.getTime() - todayUTC.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: 'Vence hoy', color: 'orange' };
        if (diffDays === 1) return { text: 'Vence mañana', color: 'orange' };
        if (diffDays > 1) return { text: `Vence en ${diffDays} días`, color: 'var(--text-light)' };
        return { text: `Vencido`, color: 'var(--error-color)' };
    };

    const renderSkeleton = (lines = 3) => (
        <div>
            {[...Array(lines)].map((_, i) => (
                <div key={i} style={{height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', marginBottom: '1rem', width: `${Math.random() * 40 + 50}%`}}></div>
            ))}
        </div>
    );

    const renderExpiringPlans = () => (
        <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Planes Próximos a Vencer</h3></div>
            <div style={styles.infoCardBody}>
                {loading ? renderSkeleton() : (
                    <ul style={styles.activityList}>
                        {expiring.length > 0 ? expiring.map(plan => {
                            const { text, color } = getDaysRemainingText(plan.endDate);
                            return (
                                <li key={`${plan.type}-${plan.id}`} style={{...styles.activityItem, gap: '1rem'}}>
                                    <div style={{flexGrow: 1}}>
                                        <a onClick={() => navigateToDetail(plan.type, plan.id)} style={styles.activityItemLink} role="button">{plan.name}</a>
                                        <span style={{fontSize: '0.85rem', fontWeight: 500, color: color, display: 'block' }}>{text}</span>
                                    </div>
                                    <button onClick={() => navigateToEdit(plan.type, plan.id)} className="button-secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>Renovar</button>
                                </li>
                            )
                        }) : <p>No hay planes por vencer en los próximos 15 días.</p>}
                    </ul>
                )}
            </div>
        </div>
    );
    
    const renderRecentActivity = () => (
         <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Timeline Clínico</h3></div>
            <div style={styles.infoCardBody}>
                 {loading ? renderSkeleton(5) : (
                    <ul style={styles.activityList}>
                        {recentActivity.length > 0 ? recentActivity.map(log => (
                            <li key={log.id} style={{...styles.activityItem, alignItems: 'flex-start', flexDirection: 'column', gap: '0.25rem'}}>
                                <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <p style={{margin: 0, fontWeight: 500}}>{log.log_type}</p>
                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'right' as const, flexShrink: 0}}>{new Date(log.created_at).toLocaleDateString('es-MX')}</span>
                                </div>
                                 <p style={{margin: '0.1rem 0', fontSize: '0.85rem', color: 'var(--text-light)', width: '100%'}}>
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                       {log.description}
                                    </span>
                                </p>
                                <p style={{margin: '0.1rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                    {log.person_type === 'client' ? 'Paciente: ' : 'Afiliado: '}
                                   <a onClick={() => navigateToDetail(log.person_type, log.person_id)} style={{...styles.activityItemLink, marginLeft: '4px'}} role="button">
                                     {log.person_name || 'N/A'}
                                   </a>
                                </p>
                            </li>
                        )) : <p>No hay actividad reciente.</p>}
                    </ul>
                )}
            </div>
        </div>
    );


    return (
        <div className="fade-in">
            <div style={{...styles.pageHeader, borderBottom: 'none', paddingBottom: 0, marginBottom: '2rem', alignItems: 'flex-start'}}>
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    Configuración
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
            
            <section aria-labelledby="activity-summary-title">
                <h2 id="activity-summary-title" style={{...styles.detailCardTitle, fontSize: '1.5rem', marginBottom: '1.5rem'}}>Resumen de Actividad</h2>
                {isMobile ? (
                    <div>
                        <div className="summary-tabs">
                            <button className={`summary-tab-button ${activeSummaryTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('appointments')}>Próximas Citas</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'expiring' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('expiring')}>Planes por Vencer</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('activity')}>Timeline Clínico</button>
                            <button className={`summary-tab-button ${activeSummaryTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('feedback')}>Feedback</button>
                        </div>
                        <div className="fade-in">
                            {activeSummaryTab === 'appointments' && <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />}
                            {activeSummaryTab === 'expiring' && renderExpiringPlans()}
                            {activeSummaryTab === 'activity' && renderRecentActivity()}
                            {activeSummaryTab === 'feedback' && <RecentFeedbackWidget recentFeedback={recentFeedback} loading={loading} navigateToDetail={navigateToDetail} />}
                        </div>
                    </div>
                ) : (
                    <div style={{...styles.dashboardColumns, gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                        <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />
                        {renderExpiringPlans()}
                        {renderRecentActivity()}
                        <RecentFeedbackWidget recentFeedback={recentFeedback} loading={loading} navigateToDetail={navigateToDetail} />
                    </div>
                )}
            </section>

            <section aria-labelledby="actions-title" style={{margin: '2.5rem 0'}}>
                <h2 id="actions-title" style={{...styles.detailCardTitle, fontSize: '1.5rem', marginBottom: '1.5rem'}}>Acciones Rápidas</h2>
                <div className="actions-grid">
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

             <section aria-labelledby="stats-title">
                <h2 id="stats-title" style={{...styles.detailCardTitle, fontSize: '1.5rem', marginBottom: '1.5rem'}}>Estadísticas del Negocio</h2>
                <div style={{...styles.dashboardGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'}} className="dashboard-grid">
                    <div style={styles.summaryCard} className="card-hover"><div style={styles.summaryCardIcon}>{ICONS.users}</div>{loading ? <p>...</p> : <p style={{...styles.summaryCardValue}} className="summary-card-value">{stats.activeClients}</p>}<p style={styles.summaryCardLabel}>Pacientes Activos</p></div>
                    <div style={styles.summaryCard} className="card-hover"><div style={styles.summaryCardIcon}>{ICONS.users}</div>{loading ? <p>...</p> : <p style={{...styles.summaryCardValue}} className="summary-card-value">{stats.activeAfiliados}</p>}<p style={styles.summaryCardLabel}>Afiliados Activos</p></div>
                    <div style={styles.summaryCard} className="card-hover"><div style={styles.summaryCardIcon}>{ICONS.briefcase}</div>{loading ? <p>...</p> : <p style={{...styles.summaryCardValue}} className="summary-card-value">{stats.aliados}</p>}<p style={styles.summaryCardLabel}>Colaboradores Activos</p></div>
                    {/* FIX: Removed erroneous function call () on a string literal. */}
                    <div style={styles.summaryCard} className="card-hover"><div style={styles.summaryCardIcon}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="8" x2="23" y2="14"></line><line x1="23" y1="8" x2="17" y2="14"></line></svg></div>{loading ? <p>...</p> : <p style={{...styles.summaryCardValue, color: stats.expiredClients > 0 ? 'var(--error-color)' : 'var(--primary-color)'}} className="summary-card-value">{stats.totalClients > 0 ? `${((stats.expiredClients / stats.totalClients) * 100).toFixed(0)}%` : '0%'}</p>}<p style={styles.summaryCardLabel}>Pacientes con Plan Vencido</p></div>
                </div>
            </section>

        </div>
    );
};

export default HomePage;