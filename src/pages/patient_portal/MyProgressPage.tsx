import React, { FC, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { ConsultationWithLabs, GamificationLog, DailyCheckin } from '../../types';
import ProgressChart from '../../components/shared/ProgressChart';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

interface MyProgressPageProps {
    consultations: ConsultationWithLabs[];
    gamificationLogs: GamificationLog[];
    checkins: DailyCheckin[];
    onDataRefresh: () => void;
}

const MyProgressPage: FC<MyProgressPageProps> = ({ consultations, gamificationLogs, checkins, onDataRefresh }) => {
    const [activeTab, setActiveTab] = useState<'metricas' | 'recompensas' | 'registros'>('metricas');
    const [editingCheckin, setEditingCheckin] = useState<DailyCheckin | null>(null);
    const [deletingCheckin, setDeletingCheckin] = useState<DailyCheckin | null>(null);

    const handleConfirmDelete = async () => {
        if (!deletingCheckin) return;
        const { error } = await supabase.from('daily_checkins').delete().eq('id', deletingCheckin.id);
        if (error) console.error("Error deleting checkin:", error);
        else onDataRefresh();
        setDeletingCheckin(null);
    };

    // Filter and sort data for charts
    const sortedConsultations = useMemo(() => 
        [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime()), 
    [consultations]);

    const weightData = useMemo(() => sortedConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! })), [sortedConsultations]);
    const imcData = useMemo(() => sortedConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! })), [sortedConsultations]);
    
    // Calculate key stats for the summary cards
    const stats = useMemo(() => {
        if (weightData.length < 1) return null;
        const currentWeight = weightData[weightData.length - 1].value;
        const startWeight = weightData[0].value;
        const diff = currentWeight - startWeight;
        const isLoss = diff < 0;
        return {
            current: currentWeight,
            start: startWeight,
            diff: Math.abs(diff).toFixed(1),
            trend: isLoss ? 'down' : 'up'
        };
    }, [weightData]);

    const getGamificationIcon = (reason: string) => {
        const lower = reason.toLowerCase();
        if (lower.includes('rango') || lower.includes('leyenda')) return '🏆';
        if (lower.includes('asistencia')) return '📅';
        if (lower.includes('plan')) return '🥗';
        if (lower.includes('rutina')) return '💪';
        if (lower.includes('registro')) return '📝';
        return '⭐';
    };
    
    const renderEmptyState = (text: string, icon: string) => (
        <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            color: 'var(--text-light)', 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '16px', 
            border: '1px dashed var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{fontSize: '3rem', opacity: 0.5}}>{icon}</div>
            <p style={{margin: 0, fontSize: '1.1rem'}}>{text}</p>
        </div>
    );
    
    const StatCard: FC<{ label: string; value: string; subtext?: React.ReactNode; icon: React.ReactNode }> = ({ label, value, subtext, icon }) => (
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <span style={{fontSize: '0.8rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px'}}>{label}</span>
                <span style={{color: 'var(--primary-color)'}}>{icon}</span>
            </div>
            <div style={{fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-color)'}}>{value}</div>
            {subtext && <div style={{fontSize: '0.85rem'}}>{subtext}</div>}
        </div>
    );

    const TabButton: FC<{ id: typeof activeTab; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
        <button 
            onClick={() => setActiveTab(id)}
            style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === id ? 'var(--surface-color)' : 'transparent',
                color: activeTab === id ? 'var(--primary-color)' : 'var(--text-light)',
                fontWeight: activeTab === id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem'
            }}
        >
            <span style={{fontSize: '1.1rem'}}>{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar el registro del {new Date((deletingCheckin.checkin_date as string).replace(/-/g, '/')).toLocaleDateString('es-MX')}?</p>} confirmText="Sí, eliminar" />}

            <div style={{marginBottom: '2rem'}}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800 }}>Mi Progreso</h1>
                <p style={{ margin: 0, color: 'var(--text-light)' }}>
                    Tu evolución en cifras y logros.
                </p>
            </div>
            
            {/* Segmented Control Navigation */}
            <div style={{ 
                backgroundColor: 'var(--surface-hover-color)', 
                padding: '4px', 
                borderRadius: '16px', 
                display: 'flex', 
                marginBottom: '2rem',
                border: '1px solid var(--border-color)'
            }}>
                <TabButton id="metricas" label="Métricas" icon={ICONS.activity} />
                <TabButton id="recompensas" label="Logros" icon={ICONS.sparkles} />
                <TabButton id="registros" label="Diario" icon={ICONS.edit} />
            </div>
            
            <div className="fade-in">
                {activeTab === 'metricas' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                        {/* Quick Stats Cards */}
                        {stats && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <StatCard 
                                    label="Peso Actual" 
                                    value={`${stats.current} kg`} 
                                    icon={ICONS.user}
                                    subtext={
                                        <span style={{color: stats.trend === 'down' ? '#10B981' : '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            {stats.trend === 'down' ? '↘' : '↗'} {stats.diff} kg {stats.trend === 'down' ? 'perdidos' : 'cambio'}
                                        </span>
                                    }
                                />
                                <StatCard 
                                    label="IMC Actual" 
                                    value={`${imcData[imcData.length-1]?.value || '-'}`} 
                                    icon={ICONS.activity} 
                                    subtext={<span style={{color: 'var(--text-light)'}}>Índice de Masa Corporal</span>}
                                />
                            </div>
                        )}

                        {/* Charts */}
                        {weightData.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                <ProgressChart title="Evolución de Peso" data={weightData} unit="kg" />
                                <ProgressChart title="Historial de IMC" data={imcData} unit="pts" color="#8B5CF6" />
                            </div>
                        ) : renderEmptyState("Registra tu peso en consultas para ver tu evolución.", ICONS.activity)}
                    </div>
                )}

                {activeTab === 'recompensas' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Historial de Puntos</h2>
                            <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem' }}>
                                Total: {gamificationLogs.reduce((acc, l) => acc + l.points_awarded, 0)}
                            </div>
                        </div>

                        {gamificationLogs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {gamificationLogs.map(log => (
                                    <div key={log.id} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '1rem', 
                                        backgroundColor: 'var(--surface-color)', padding: '1.25rem', 
                                        borderRadius: '16px', border: '1px solid var(--border-color)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ 
                                            fontSize: '1.5rem', backgroundColor: 'var(--surface-hover-color)', 
                                            width: '50px', height: '50px', borderRadius: '16px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: 'inset 0 0 0 1px var(--border-color)'
                                        }}>
                                            {getGamificationIcon(log.reason)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)', fontSize: '1rem' }}>{log.reason}</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                {new Date(log.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                        </div>
                                        <div style={{ fontWeight: 800, color: '#10B981', fontSize: '1.1rem' }}>
                                            +{log.points_awarded}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : renderEmptyState("Completa actividades para ganar puntos y subir de nivel.", "🏆")}
                    </div>
                )}

                {activeTab === 'registros' && (
                    <div>
                         <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Tu Diario</h2>
                        {checkins.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {checkins.map(checkin => {
                                    const date = new Date(checkin.checkin_date.replace(/-/g, '/'));
                                    return (
                                    <div key={checkin.id} style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover-color)' }}>
                                            <div>
                                                <span style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase'}}>{date.toLocaleDateString('es-MX', { month: 'short' })}</span>
                                                <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)', lineHeight: 1}}>{date.getDate()}</div>
                                            </div>
                                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                                <button onClick={() => setEditingCheckin(checkin)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)'}}>{ICONS.edit}</button>
                                                <button onClick={() => setDeletingCheckin(checkin)} style={{...styles.iconButton, backgroundColor: 'var(--surface-color)', color: 'var(--error-color)'}}>{ICONS.delete}</button>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1.25rem', flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 700, display: 'block', marginBottom: '4px'}}>ÁNIMO</span>
                                                    <div style={{color: '#2DD4BF', letterSpacing: '2px'}}>{'★'.repeat(checkin.mood_rating || 0)}<span style={{color: 'var(--border-color)'}}>{'★'.repeat(5 - (checkin.mood_rating || 0))}</span></div>
                                                </div>
                                                 <div>
                                                    <span style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 700, display: 'block', marginBottom: '4px'}}>ENERGÍA</span>
                                                    <div style={{color: '#F59E0B', letterSpacing: '2px'}}>{'⚡'.repeat(checkin.energy_level_rating || 0)}<span style={{color: 'var(--border-color)'}}>{'⚡'.repeat(5 - (checkin.energy_level_rating || 0))}</span></div>
                                                </div>
                                            </div>
                                            {checkin.notes ? (
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color)', fontStyle: 'italic', lineHeight: 1.5 }}>"{checkin.notes}"</p>
                                            ) : <span style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>Sin notas adicionales.</span>}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : renderEmptyState("Registra cómo te sientes cada día para llevar un control.", "📝")}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyProgressPage;