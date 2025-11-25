
import React, { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { Log, Person, NutritionistProfile, ChurnFeedback, AppointmentWithPerson } from '../types';
import { useClinic } from '../contexts/ClinicContext';
import UpcomingAppointmentsWidget from '../components/dashboard/UpcomingAppointmentsWidget';
import SkeletonLoader from '../components/shared/SkeletonLoader';

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
    const [stats, setStats] = useState({ activeClients: 0, activeAfiliados: 0, totalClients: 0, expiredClients: 0, aliados: 0 });
    const [expiring, setExpiring] = useState<ExpiringPlan[]>([]);
    const [recentActivity, setRecentActivity] = useState<CombinedLog[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithPerson[]>([]);
    const [recentFeedback, setRecentFeedback] = useState<ChurnFeedback[]>([]);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSummaryTab, setActiveSummaryTab] = useState('appointments');
    
    const displayName = useMemo(() => {
        if (profile?.full_name) {
            const firstName = profile.full_name.split(' ')[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        return user.email?.split('@')[0] || '';
    }, [profile, user.email]);

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

            const { data: allPersonsData } = await supabase.from('persons').select('id, person_type, subscription_end_date, full_name').eq('clinic_id', clinic.id);
            const allPersons = allPersonsData || [];
            const allClients = allPersons.filter(p => p.person_type === 'client');
            const totalClients = allClients.length;
            const expiredClients = allClients.filter(p => p.subscription_end_date && new Date(p.subscription_end_date) < today).length;

            const [activeClientsRes, activeAfiliadosRes, aliadosRes, logsRes, profileRes, feedbackRes, appointmentsRes] = await Promise.all([
                supabase.from('persons').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('person_type', 'client').gte('subscription_end_date', todayISO),
                supabase.from('persons').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('person_type', 'member').gte('subscription_end_date', todayISO),
                supabase.from('clinic_ally_partnerships').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('status', 'active'),
                supabase.from('logs').select('*, persons!inner(full_name, clinic_id, person_type)').eq('persons.clinic_id', clinic.id).order('created_at', { ascending: false }).limit(5),
                supabase.from('nutritionist_profiles').select('full_name').eq('user_id', user.id).single(),
                supabase.from('churn_feedback').select('*, persons!inner(full_name, clinic_id)').eq('persons.clinic_id', clinic.id).order('created_at', { ascending: false }).limit(5),
                supabase.from('appointments').select('*, persons(full_name, avatar_url, person_type)').eq('clinic_id', clinic.id).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
            ]);
            
            const expiringPersons = allPersons.filter(p => p.subscription_end_date && p.subscription_end_date >= todayISO && p.subscription_end_date <= fifteenDaysFromNowISO);
            
            if (profileRes.data) setProfile(profileRes.data as NutritionistProfile);
            setRecentFeedback((feedbackRes.data as any[]) || []);
            setUpcomingAppointments((appointmentsRes.data as any[]) || []);
            const allExpiring = (expiringPersons || []).map(p => ({ id: p.id, name: p.full_name, endDate: p.subscription_end_date!, type: p.person_type as 'client' | 'member' })).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
            setExpiring(allExpiring);

            const allLogs = ((logsRes.data as any[]) || []).map(log => ({ ...log, person_type: log.persons.person_type, person_id: log.person_id, person_name: log.persons.full_name }));
            setRecentActivity(allLogs);

            setStats({ activeClients: activeClientsRes.count ?? 0, activeAfiliados: activeAfiliadosRes.count ?? 0, totalClients: totalClients, expiredClients: expiredClients, aliados: aliadosRes.count ?? 0 });
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    }, [clinic, user.id]);

    useEffect(() => {
        if (!clinic) return;
        fetchDashboardData();
    }, [clinic, fetchDashboardData]);
    
    const navigateToDetail = (type: 'client' | 'member', id: string) => { navigate(type === 'client' ? 'client-detail' : 'afiliado-detail', { personId: id }); };
    const navigateToEdit = (type: 'client' | 'member', id: string) => { navigate(type === 'client' ? 'client-form' : 'afiliado-form', { personId: id }); };
    
    const getDaysRemainingText = (dateString: string) => {
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const endDateUTC = new Date(dateString);
        const diffTime = endDateUTC.getTime() - todayUTC.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: 'Vence hoy', color: '#F59E0B' };
        if (diffDays === 1) return { text: 'Vence mañana', color: '#F59E0B' };
        if (diffDays > 1) return { text: `Vence en ${diffDays} días`, color: 'var(--text-light)' };
        return { text: `Vencido`, color: 'var(--error-color)' };
    };

    const renderExpiringPlans = () => (
        <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle}}>Planes por Vencer</h3></div>
            <div style={styles.infoCardBody}>
                {loading ? <SkeletonLoader type="list" count={3} /> : (
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
                        }) : <p style={{color: 'var(--text-light)', fontSize: '0.9rem'}}>Ningún plan vence en los próximos 15 días.</p>}
                    </ul>
                )}
            </div>
        </div>
    );
    
    const renderRecentActivity = () => (
         <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle}}>Actividad Reciente</h3></div>
            <div style={styles.infoCardBody}>
                 {loading ? <SkeletonLoader type="list" count={5} /> : (
                    <ul style={styles.activityList}>
                        {recentActivity.length > 0 ? recentActivity.map(log => (
                            <li key={log.id} style={{...styles.activityItem, alignItems: 'flex-start', flexDirection: 'column', gap: '0.5rem'}}>
                                <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <p style={{margin: 0, fontWeight: 600, fontSize: '0.9rem'}}>{log.log_type}</p>
                                    <span style={{fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'right' as const, flexShrink: 0}}>{new Date(log.created_at).toLocaleDateString('es-MX', {day: '2-digit', month: 'short'})}</span>
                                </div>
                                 <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)', width: '100%', lineHeight: 1.4}}>{log.description}</p>
                                <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--primary-color)'}}>{log.person_name || 'N/A'}</p>
                            </li>
                        )) : <p>Sin actividad reciente.</p>}
                    </ul>
                )}
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            <div style={{...styles.pageHeader, borderBottom: 'none', paddingBottom: 0, marginBottom: '2rem'}}>
                <div>
                    <h1 style={{fontSize: '1.8rem', marginBottom: '0.5rem'}}>Hola, {displayName} 👋</h1>
                    <p style={{ margin: 0, color: 'var(--text-light)' }}>Aquí tienes un resumen de tu clínica hoy.</p>
                </div>
            </div>

            <div style={{...styles.dashboardGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem'}}>
                {loading ? <SkeletonLoader type="widget" count={3} /> : (
                    <>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryCardIcon}>{ICONS.users}</div>
                            <p style={styles.summaryCardValue}>{stats.activeClients}</p>
                            <p style={styles.summaryCardLabel}>Pacientes Activos</p>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryCardIcon}>{ICONS.briefcase}</div>
                            <p style={styles.summaryCardValue}>{stats.aliados}</p>
                            <p style={styles.summaryCardLabel}>Colaboradores</p>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={{...styles.summaryCardIcon, backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--error-color)'}}>{ICONS.clock}</div>
                            <p style={{...styles.summaryCardValue, color: 'var(--error-color)'}}>{stats.expiredClients}</p>
                            <p style={styles.summaryCardLabel}>Planes Vencidos</p>
                        </div>
                    </>
                )}
            </div>

            <h2 style={{fontSize: '1.3rem', marginBottom: '1.5rem', marginTop: '1rem'}}>Visión General</h2>
            
            {isMobile ? (
                <div>
                    <div className="summary-tabs" style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
                        <button className={`tab-button ${activeSummaryTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('appointments')}>Agenda</button>
                        <button className={`tab-button ${activeSummaryTab === 'expiring' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('expiring')}>Vencimientos</button>
                        <button className={`tab-button ${activeSummaryTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveSummaryTab('activity')}>Actividad</button>
                    </div>
                    <div className="fade-in">
                        {activeSummaryTab === 'appointments' && <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />}
                        {activeSummaryTab === 'expiring' && renderExpiringPlans()}
                        {activeSummaryTab === 'activity' && renderRecentActivity()}
                    </div>
                </div>
            ) : (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem'}}>
                    <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} navigateToDetail={navigateToDetail} />
                    {renderExpiringPlans()}
                    {renderRecentActivity()}
                </div>
            )}
        </div>
    );
};

export default HomePage;
