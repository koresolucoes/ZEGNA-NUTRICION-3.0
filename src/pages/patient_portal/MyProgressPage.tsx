import React, { FC, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { ConsultationWithLabs, GamificationLog, DailyCheckin } from '../../types';
import ProgressChart from '../../components/shared/ProgressChart';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

const RatingDisplay: FC<{ rating: number | null; icon: 'star' | 'energy' }> = ({ rating, icon }) => {
    if (rating === null || rating === undefined) return <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>-</span>;
    const activeColor = icon === 'star' ? 'var(--accent-color)' : '#F59E0B'; // Teal or Orange/Gold
    
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {[...Array(5)].map((_, i) => (
                <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={i < rating ? activeColor : "var(--border-color)"} stroke="none">
                    <path d={icon === 'star' 
                        ? "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
                        : "M13 2L3 14h9l-1 8 10-12h-9l1-8z"} />
                </svg>
            ))}
        </div>
    );
};

interface MyProgressPageProps {
    consultations: ConsultationWithLabs[];
    gamificationLogs: GamificationLog[];
    checkins: DailyCheckin[];
    onDataRefresh: () => void;
}

const MyProgressPage: FC<MyProgressPageProps> = ({ consultations, gamificationLogs, checkins, onDataRefresh }) => {
    const [activeTab, setActiveTab] = useState('metricas');
    const [editingCheckin, setEditingCheckin] = useState<DailyCheckin | null>(null);
    const [deletingCheckin, setDeletingCheckin] = useState<DailyCheckin | null>(null);

    const handleConfirmDelete = async () => {
        if (!deletingCheckin) return;
        const { error } = await supabase.from('daily_checkins').delete().eq('id', deletingCheckin.id);
        if (error) console.error("Error deleting checkin:", error);
        else onDataRefresh();
        setDeletingCheckin(null);
    };

    const weightData = useMemo(() => consultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! })), [consultations]);
    const imcData = useMemo(() => consultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! })), [consultations]);

    const getGamificationIcon = (reason: string) => {
        const lower = reason.toLowerCase();
        if (lower.includes('rango') || lower.includes('leyenda')) return '🏆';
        if (lower.includes('asistencia')) return '📅';
        if (lower.includes('plan')) return '🥗';
        if (lower.includes('rutina')) return '💪';
        return '⭐';
    };
    
    const renderEmptyState = (text: string) => (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <p style={{margin: 0}}>{text}</p>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'metricas':
                return (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {weightData.length > 0 ? (
                            <>
                                <ProgressChart title="Peso Corporal" data={weightData} unit="kg" />
                                <ProgressChart title="IMC" data={imcData} unit="pts" />
                            </>
                        ) : renderEmptyState("Aún no hay suficientes datos de consultas para generar gráficas.")}
                    </div>
                );
            case 'recompensas':
                return (
                    <section className="fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Actividad de Puntos</h2>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Total: {gamificationLogs.reduce((acc, l) => acc + l.points_awarded, 0)} pts</span>
                        </div>
                        {gamificationLogs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {gamificationLogs.map(log => (
                                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '1.5rem', backgroundColor: 'var(--surface-hover-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {getGamificationIcon(log.reason)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-color)' }}>{log.reason}</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                {new Date(log.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {log.points_awarded > 0 && (
                                            <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.1rem', backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '12px' }}>
                                                +{log.points_awarded}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : renderEmptyState("Aún no has ganado puntos. ¡Completa planes y asiste a consultas!")}
                    </section>
                );
            case 'registros':
                return (
                     <section className="fade-in">
                        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem' }}>Diario Personal</h2>
                        {checkins.length > 0 ? (
                            <div className="info-grid">
                                {checkins.map(checkin => (
                                    <div key={checkin.id} className="info-card" style={{position: 'relative'}}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                                <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>
                                                    {new Date(checkin.checkin_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </h4>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem', borderRadius: '8px' }}>
                                                <div>
                                                    <span style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 600, display: 'block', marginBottom: '4px'}}>Ánimo</span>
                                                    <RatingDisplay rating={checkin.mood_rating} icon="star" />
                                                </div>
                                                 <div>
                                                    <span style={{fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 600, display: 'block', marginBottom: '4px'}}>Energía</span>
                                                    <RatingDisplay rating={checkin.energy_level_rating} icon="energy" />
                                                </div>
                                            </div>
                                            
                                            {checkin.notes ? (
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: 1.5, fontStyle: 'italic' }}>"{checkin.notes}"</p>
                                            ) : <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>Sin notas.</p>}
                                        </div>
                                        <div className="card-actions" style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                                            <button onClick={() => setEditingCheckin(checkin)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                            <button onClick={() => setDeletingCheckin(checkin)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : renderEmptyState("No hay registros diarios. ¡Empieza hoy!")}
                    </section>
                );
            default: return null;
        }
    }

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Eliminar el registro del {new Date((deletingCheckin.checkin_date as string).replace(/-/g, '/')).toLocaleDateString('es-MX')}?</p>} confirmText="Sí, eliminar" />}

            <div style={styles.pageHeader}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mi Progreso</h1>
            </div>
            <p style={{ color: 'var(--text-light)', marginTop: '-1.5rem', marginBottom: '2rem' }}>
                Visualiza tus logros, recompensas y el historial de tus registros diarios.
            </p>
            
            <nav className="tabs" style={{ marginBottom: '2rem' }}>
                <button className={`tab-button ${activeTab === 'metricas' ? 'active' : ''}`} onClick={() => setActiveTab('metricas')}>Gráficas</button>
                <button className={`tab-button ${activeTab === 'recompensas' ? 'active' : ''}`} onClick={() => setActiveTab('recompensas')}>Puntos</button>
                <button className={`tab-button ${activeTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveTab('registros')}>Diario</button>
            </nav>
            
            {renderContent()}
        </div>
    );
};

export default MyProgressPage;