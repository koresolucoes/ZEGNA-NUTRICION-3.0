
import React, { FC, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { ConsultationWithLabs, GamificationLog, DailyCheckin } from '../../types';
import ProgressChart from '../../components/shared/ProgressChart';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

interface MyProgressPageProps {
    consultations: ConsultationWithLabs[];
    gamificationLogs: GamificationLog[];
    checkins: DailyCheckin[];
    onDataRefresh: () => void;
}

const MyProgressPage: FC<MyProgressPageProps> = ({ consultations, gamificationLogs, checkins, onDataRefresh }) => {
    const [viewRange, setViewRange] = useState<'1m' | '3m' | 'all'>('3m');

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
            trend: isLoss ? 'down' : 'up',
            startDate: new Date(start.consultation_date).toLocaleDateString('es-MX', {month: 'short', year: 'numeric'}),
            currentDate: new Date(current.consultation_date).toLocaleDateString('es-MX', {month: 'short', day: 'numeric'})
        };
    }, [sortedConsultations]);

    const totalPoints = gamificationLogs.reduce((acc, l) => acc + l.points_awarded, 0);

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

    const AchievementCard = ({ title, points, icon, unlocked }: { title: string, points: number, icon: string, unlocked: boolean }) => (
        <div style={{
            backgroundColor: unlocked ? 'white' : '#F3F4F6', 
            borderRadius: '16px', padding: '1rem',
            border: unlocked ? '1px solid #E5E7EB' : '1px dashed #D1D5DB',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity: unlocked ? 1 : 0.6,
            boxShadow: unlocked ? '0 4px 6px rgba(0,0,0,0.05)' : 'none'
        }}>
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem', filter: unlocked ? 'none' : 'grayscale(100%)'}}>
                {icon}
            </div>
            <h4 style={{margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)'}}>{title}</h4>
            <span style={{fontSize: '0.75rem', fontWeight: 600, color: unlocked ? '#10B981' : 'var(--text-light)', backgroundColor: unlocked ? '#ECFDF5' : 'transparent', padding: '2px 8px', borderRadius: '10px'}}>
                {unlocked ? `+${points} pts` : 'Bloqueado'}
            </span>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem 1rem 4rem 1rem' }}>
            
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
                            {stats?.currentWeight} <span style={{fontSize: '1rem', fontWeight: 500}}>kg</span>
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
                <ProgressChart title="" data={weightData} unit="kg" color="#10B981" />
            </div>

            {/* Transformation Summary */}
            {stats && (
                <div style={{marginBottom: '2.5rem'}}>
                    <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700}}>Transformación</h3>
                    <div style={{
                        display: 'flex', backgroundColor: '#1F2937', borderRadius: '24px', padding: '1.5rem', color: 'white',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{flex: 1, position: 'relative', zIndex: 1}}>
                            <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.7}}>ANTES ({stats.startDate})</p>
                            <p style={{margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: 700}}>{stats.startWeight}kg</p>
                        </div>
                        
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem'}}>
                            <div style={{width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>➜</div>
                        </div>

                        <div style={{flex: 1, textAlign: 'right', position: 'relative', zIndex: 1}}>
                            <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.7}}>AHORA</p>
                            <p style={{margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#38BDF8'}}>{stats.currentWeight}kg</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Section */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700}}>Logros</h3>
                    <span style={{fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 600}}>Ver todos</span>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <StatCard label="Racha Actual" value={`${gamificationLogs.length > 0 ? '5' : '0'}`} icon="🔥" color="#F59E0B" />
                    <StatCard label="Puntos Totales" value={`${totalPoints}`} icon="⭐" color="#8B5CF6" />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem'}}>
                    <AchievementCard title="Inicio" points={100} icon="🚀" unlocked={totalPoints >= 100} />
                    <AchievementCard title="-5kg" points={500} icon="⚖️" unlocked={totalPoints >= 500} />
                    <AchievementCard title="Racha 7" points={300} icon="🔥" unlocked={totalPoints >= 300} />
                    <AchievementCard title="Gym Pro" points={1000} icon="💪" unlocked={totalPoints >= 1000} />
                    <AchievementCard title="Chef" points={200} icon="👨‍🍳" unlocked={totalPoints >= 200} />
                    <AchievementCard title="Hidratado" points={150} icon="💧" unlocked={totalPoints >= 150} />
                </div>
            </div>

        </div>
    );
};

export default MyProgressPage;
