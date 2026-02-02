
import React, { FC, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { ConsultationWithLabs, GamificationLog, DailyCheckin } from '../../types';
import ProgressChart from '../../components/shared/ProgressChart';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

interface MyProgressPageProps {
    consultations: ConsultationWithLabs[];
    gamificationLogs: GamificationLog[];
    checkins: DailyCheckin[];
    onDataRefresh: () => void;
}

const modalRoot = document.getElementById('modal-root');

const MyProgressPage: FC<MyProgressPageProps> = ({ consultations, gamificationLogs, checkins, onDataRefresh }) => {
    const [viewRange, setViewRange] = useState<'1m' | '3m' | 'all'>('3m');
    const [connectedApps, setConnectedApps] = useState<{ apple: boolean; google: boolean }>({ apple: false, google: false });
    const [showWipModal, setShowWipModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Init from local storage for demo persistence
    useEffect(() => {
        const apple = localStorage.getItem('apple_health_connected') === 'true';
        const google = localStorage.getItem('google_fit_connected') === 'true';
        setConnectedApps({ apple, google });
    }, []);

    // Filter and sort data for charts
    const sortedConsultations = useMemo(() => 
        [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime()), 
    [consultations]);

    const filteredConsultations = useMemo(() => {
        if (viewRange === 'all') return sortedConsultations;
        const now = new Date();
        const cutoff = new Date();
        if (viewRange === '1m') cutoff.setMonth(now.getMonth() - 1);
        if (viewRange === '3m') cutoff.setMonth(now.getMonth() - 3);
        return sortedConsultations.filter(c => new Date(c.consultation_date) >= cutoff);
    }, [sortedConsultations, viewRange]);

    const weightData = useMemo(() => filteredConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! })), [filteredConsultations]);
    
    // Stats Calculation
    const stats = useMemo(() => {
        if (sortedConsultations.length < 1) return null;
        const start = sortedConsultations[0];
        const current = sortedConsultations[sortedConsultations.length - 1];
        
        const startWeight = start.weight_kg || 0;
        const currentWeight = current.weight_kg || 0;
        const diff = currentWeight - startWeight;
        const isLoss = diff < 0;

        return {
            startWeight,
            currentWeight,
            diff: Math.abs(diff).toFixed(1),
            realDiffValue: diff, // Valor numérico real para lógica
            trend: isLoss ? 'down' : 'up',
            startDate: new Date(start.consultation_date).toLocaleDateString('es-MX', {month: 'short', year: 'numeric'}),
            currentDate: new Date(current.consultation_date).toLocaleDateString('es-MX', {month: 'short', day: 'numeric'})
        };
    }, [sortedConsultations]);

    // --- LOGIC REFACOR: Semantic Points ---
    const { totalPoints, nutritionPoints, fitnessPoints, checkinStreak } = useMemo(() => {
        const total = gamificationLogs.reduce((acc, l) => acc + l.points_awarded, 0);
        
        // Puntos específicos por categoría según el 'reason' guardado en BD
        const nutrition = gamificationLogs
            .filter(l => l.reason.toLowerCase().includes('plan alimenticio') || l.reason.toLowerCase().includes('dieta'))
            .reduce((acc, l) => acc + l.points_awarded, 0);

        const fitness = gamificationLogs
            .filter(l => l.reason.toLowerCase().includes('ejercicio') || l.reason.toLowerCase().includes('actividad'))
            .reduce((acc, l) => acc + l.points_awarded, 0);

        // Cálculo de Racha (Streak) basado en checkins
        let currentStreak = 0;
        if (checkins.length > 0) {
            const uniqueDates = [...new Set(checkins.map(c => c.checkin_date))].sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime());
            
            // Comprobamos si el último checkin fue hoy o ayer
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
                currentStreak = 1;
                let lastDate = new Date(uniqueDates[0] as string);
                
                for (let i = 1; i < uniqueDates.length; i++) {
                    const thisDate = new Date(uniqueDates[i] as string);
                    const diffTime = Math.abs(lastDate.getTime() - thisDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays === 1) {
                        currentStreak++;
                        lastDate = thisDate;
                    } else {
                        break;
                    }
                }
            }
        }

        return { totalPoints: total, nutritionPoints: nutrition, fitnessPoints: fitness, checkinStreak: currentStreak };
    }, [gamificationLogs, checkins]);

    const handleConnect = (provider: 'apple' | 'google') => {
        const isConnected = connectedApps[provider];
        if (isConnected) {
            // Disconnect (Simulated)
            setConnectedApps(prev => {
                const newState = { ...prev, [provider]: false };
                localStorage.setItem(`${provider}_${provider === 'apple' ? 'health' : 'fit'}_connected`, 'false');
                return newState;
            });
        } else {
            // Show WIP Modal instead of connecting
            setShowWipModal(true);
        }
    };

    const StatCard = ({ label, value, color, icon }: { label: string, value: string, color: string, icon: string }) => (
        <div style={{
            backgroundColor: 'white', borderRadius: '20px', padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{fontSize: '2rem', marginBottom: '0.5rem', backgroundColor: `${color}20`, padding: '10px', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {icon}
            </div>
            <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)'}}>{value}</div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>{label}</div>
        </div>
    );

    const AchievementCard = ({ title, requirement, progress, icon, unlocked }: { title: string, requirement: string, progress: string, icon: string, unlocked: boolean }) => (
        <div style={{
            backgroundColor: unlocked ? 'white' : '#F9FAFB', 
            borderRadius: '16px', padding: '1rem',
            border: unlocked ? '1px solid #10B981' : '1px dashed #D1D5DB',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity: unlocked ? 1 : 0.7,
            boxShadow: unlocked ? '0 4px 10px rgba(16, 185, 129, 0.1)' : 'none',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {unlocked && (
                <div style={{position: 'absolute', top: 5, right: 5, color: '#10B981', fontSize: '0.8rem'}}>✓</div>
            )}
            <div style={{fontSize: '2rem', marginBottom: '0.5rem', filter: unlocked ? 'none' : 'grayscale(100%)'}}>
                {icon}
            </div>
            <h4 style={{margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)'}}>{title}</h4>
            
            <p style={{margin: 0, fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.5rem'}}>
                {requirement}
            </p>

            <span style={{
                fontSize: '0.7rem', 
                fontWeight: 600, 
                color: unlocked ? '#047857' : 'var(--text-light)', 
                backgroundColor: unlocked ? '#D1FAE5' : '#E5E7EB', 
                padding: '2px 8px', 
                borderRadius: '10px'
            }}>
                {unlocked ? '¡Completado!' : progress}
            </span>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            
            {showWipModal && modalRoot && createPortal(
                <div style={{...styles.modalOverlay, zIndex: 2000}}>
                    <div style={{...styles.modalContent, maxWidth: '400px', textAlign: 'center', padding: '2rem', borderRadius: '24px'}} className="fade-in">
                        <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🚧</div>
                        <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-color)'}}>Funcionalidad Futura</h3>
                        <p style={{color: 'var(--text-light)', marginBottom: '2rem', lineHeight: 1.5, fontSize: '0.95rem'}}>
                            La integración nativa con <strong>Apple Health</strong> y <strong>Google Fit</strong> está actualmente en desarrollo. Pronto podrás sincronizar tus datos de actividad automáticamente.
                        </p>
                        <button 
                            onClick={() => setShowWipModal(false)} 
                            className="button-primary" 
                            style={{width: '100%', padding: '0.8rem', justifyContent: 'center', fontSize: '1rem', borderRadius: '12px'}}
                        >
                            Entendido
                        </button>
                    </div>
                </div>,
                modalRoot
            )}

            {/* Header / Range Selector */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h1 style={{margin: 0, fontSize: '1.5rem', fontWeight: 800}}>Mi Progreso</h1>
                <div style={{backgroundColor: '#F3F4F6', borderRadius: '20px', padding: '4px', display: 'flex'}}>
                    {['1m', '3m', 'all'].map((r) => (
                        <button 
                            key={r} 
                            onClick={() => setViewRange(r as any)}
                            style={{
                                padding: '6px 12px', borderRadius: '16px', border: 'none',
                                backgroundColor: viewRange === r ? '#111827' : 'transparent',
                                color: viewRange === r ? 'white' : '#6B7280',
                                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {r === 'all' ? 'Todo' : r.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Weight Chart Card */}
            <div style={{backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '2rem', border: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem'}}>
                    <div>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>Peso Actual</p>
                        <h2 style={{margin: 0, fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-color)'}}>
                            {stats?.currentWeight || '-'} <span style={{fontSize: '1rem', fontWeight: 500}}>kg</span>
                        </h2>
                    </div>
                    {stats && (
                        <div style={{textAlign: 'right'}}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                backgroundColor: stats.trend === 'down' ? '#ECFDF5' : '#FEF2F2',
                                color: stats.trend === 'down' ? '#059669' : '#DC2626',
                                padding: '6px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem'
                            }}>
                                {stats.trend === 'down' ? '↓' : '↑'} {stats.diff} kg
                            </div>
                        </div>
                    )}
                </div>
                {weightData.length > 1 ? (
                    <ProgressChart title="" data={weightData} unit="kg" color="#10B981" />
                ) : (
                    <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>
                        <p>Registra más consultas para ver tu gráfica de peso.</p>
                    </div>
                )}
            </div>

            {/* WEARABLES SECTION */}
            <div style={{marginBottom: '2.5rem'}}>
                <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700}}>Dispositivos y Apps</h3>
                
                <div style={{backgroundColor: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)'}}>
                    
                    {/* Apple Health */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                             <div style={{width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#EF4444'}}>❤️</div>
                             <div>
                                 <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 700}}>Apple Health</h4>
                                 <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Sincronizar pasos y actividad</p>
                             </div>
                        </div>
                        <button 
                            onClick={() => handleConnect('apple')}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid',
                                borderColor: connectedApps.apple ? '#10B981' : '#E5E7EB',
                                backgroundColor: connectedApps.apple ? '#ECFDF5' : 'transparent',
                                color: connectedApps.apple ? '#047857' : 'var(--text-color)',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            {connectedApps.apple ? 'Conectado' : 'Conectar'}
                        </button>
                    </div>

                    {/* Google Fit */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                             <div style={{width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0284C7'}}>👟</div>
                             <div>
                                 <h4 style={{margin: 0, fontSize: '1rem', fontWeight: 700}}>Google Fit</h4>
                                 <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Sincronizar movimiento</p>
                             </div>
                        </div>
                        <button 
                            onClick={() => handleConnect('google')}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid',
                                borderColor: connectedApps.google ? '#10B981' : '#E5E7EB',
                                backgroundColor: connectedApps.google ? '#ECFDF5' : 'transparent',
                                color: connectedApps.google ? '#047857' : 'var(--text-color)',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            {connectedApps.google ? 'Conectado' : 'Conectar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Achievements Section - REFACTORED LOGIC */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700}}>Logros Desbloqueables</h3>
                    <span style={{fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 600}}>Ver todos</span>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                    <StatCard label="Nivel Actual" value={`${gamificationLogs.length > 0 ? 'Bronce' : 'Novato'}`} icon="🏆" color="#F59E0B" />
                    <StatCard label="Puntos Totales" value={`${totalPoints}`} icon="⭐" color="#8B5CF6" />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem'}}>
                    {/* Inicio: Logro base */}
                    <AchievementCard 
                        title="Inicio" 
                        requirement="Acumula 100 puntos totales"
                        progress={`${totalPoints}/100`}
                        icon="🚀" 
                        unlocked={totalPoints >= 100} 
                    />
                    
                    {/* -5kg: Basado en diferencia real de peso */}
                    <AchievementCard 
                        title="-5kg" 
                        requirement="Bajar 5kg de peso inicial"
                        progress={stats?.realDiffValue ? `${Math.abs(stats.realDiffValue).toFixed(1)}/5 kg` : '0/5 kg'}
                        icon="⚖️" 
                        unlocked={stats ? (stats.trend === 'down' && Math.abs(stats.realDiffValue) >= 5) : false} 
                    />
                    
                    {/* Racha: Basado en días consecutivos */}
                    <AchievementCard 
                        title="Racha 7" 
                        requirement="7 días seguidos de Check-in"
                        progress={`${checkinStreak}/7 días`}
                        icon="🔥" 
                        unlocked={checkinStreak >= 7} 
                    />
                    
                    {/* Gym Pro: Basado en puntos de EJERCICIO */}
                    <AchievementCard 
                        title="Gym Pro" 
                        requirement="500 puntos de Ejercicio"
                        progress={`${fitnessPoints}/500 pts`}
                        icon="💪" 
                        unlocked={fitnessPoints >= 500} 
                    />
                    
                    {/* Chef: Basado en puntos de NUTRICIÓN */}
                    <AchievementCard 
                        title="Chef" 
                        requirement="500 puntos de Nutrición"
                        progress={`${nutritionPoints}/500 pts`}
                        icon="👨‍🍳" 
                        unlocked={nutritionPoints >= 500} 
                    />
                    
                    {/* Constante: Basado en checkins generales */}
                    <AchievementCard 
                        title="Constante" 
                        requirement="20 días de registro"
                        progress={`${checkins.length}/20 días`}
                        icon="📅" 
                        unlocked={checkins.length >= 20} 
                    />
                </div>

                {/* Recent Activity Log */}
                <h4 style={{marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-light)', textTransform: 'uppercase'}}>Historial de Puntos</h4>
                <div style={{backgroundColor: 'white', borderRadius: '16px', padding: '1rem', border: '1px solid var(--border-color)', maxHeight: '300px', overflowY: 'auto'}}>
                    {gamificationLogs.length > 0 ? (
                        gamificationLogs.map(log => (
                            <div key={log.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6'}}>
                                <div>
                                    <p style={{margin: 0, fontWeight: 600}}>{log.reason}</p>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>{new Date(log.created_at).toLocaleDateString()}</p>
                                </div>
                                <span style={{color: '#10B981', fontWeight: 700}}>+{log.points_awarded} pts</span>
                            </div>
                        ))
                    ) : (
                        <p style={{textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic'}}>Aún no has ganado puntos.</p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default MyProgressPage;
