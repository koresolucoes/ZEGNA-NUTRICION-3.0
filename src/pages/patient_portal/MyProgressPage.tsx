import React, { FC, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { ConsultationWithLabs, GamificationLog, DailyCheckin } from '../../types';
import ProgressChart from '../../components/shared/ProgressChart';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import DailyCheckinFormModal from '../../components/patient_portal/DailyCheckinFormModal';
import { styles } from '../../constants';
import { ICONS } from '../AuthPage';

const RatingDisplay: FC<{ rating: number | null; icon: 'star' | 'energy' }> = ({ rating, icon }) => {
    if (rating === null || rating === undefined) return <span style={{ color: 'var(--text-light)' }}>N/A</span>;

    const iconChar = icon === 'star' ? '⭐' : '⚡️';

    return (
        <div style={{ fontSize: '1.2rem' }}>
            {iconChar.repeat(rating || 0)}
        </div>
    );
};

// FIX: Define the props interface for the component.
interface MyProgressPageProps {
    consultations: ConsultationWithLabs[];
    gamificationLogs: GamificationLog[];
    checkins: DailyCheckin[];
    onDataRefresh: () => void;
}

const MyProgressPage: FC<MyProgressPageProps> = ({ consultations, gamificationLogs, checkins, onDataRefresh }) => {
    const [activeTab, setActiveTab] = useState('recompensas');
    const [editingCheckin, setEditingCheckin] = useState<DailyCheckin | null>(null);
    const [deletingCheckin, setDeletingCheckin] = useState<DailyCheckin | null>(null);

    const handleConfirmDelete = async () => {
        if (!deletingCheckin) return;
        const { error } = await supabase.from('daily_checkins').delete().eq('id', deletingCheckin.id);
        if (error) console.error("Error deleting checkin:", error);
        else onDataRefresh();
        setDeletingCheckin(null);
    };

    const weightData = useMemo(() =>
        consultations
            .filter(c => c.weight_kg != null)
            .map(c => ({ date: c.consultation_date, value: c.weight_kg! }))
        , [consultations]);

    const imcData = useMemo(() =>
        consultations
            .filter(c => c.imc != null)
            .map(c => ({ date: c.consultation_date, value: c.imc! }))
        , [consultations]);

    const getGamificationIcon = (reason: string) => {
        const lowerCaseReason = reason.toLowerCase();
        if (lowerCaseReason.includes('bienvenido al rango') || lowerCaseReason.includes('subiste a rango') || lowerCaseReason.includes('¡leyenda!')) {
            return '⭐'; // Rank up, matching screenshot
        }
        if (lowerCaseReason.includes('asistencia a consulta')) {
            return '🗓️'; // Consultation attendance
        }
        if (lowerCaseReason.includes('plan alimenticio completado')) {
            return '🍎'; // Diet plan completed
        }
        if (lowerCaseReason.includes('rutina de ejercicio completada')) {
            return '💪'; // Exercise plan completed
        }
        return '⭐'; // Default star for daily check-in and others
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'metricas':
                return (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        <ProgressChart title="Evolución del Peso (kg)" data={weightData} unit="kg" />
                        <ProgressChart title="Evolución del IMC (pts)" data={imcData} unit="pts" />
                    </div>
                );
            case 'recompensas':
                return (
                    <section className="fade-in">
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                            Historial de Puntos y Recompensas
                        </h2>
                        {gamificationLogs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {gamificationLogs.map(log => {
                                    const icon = getGamificationIcon(log.reason);
                                    return (
                                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--surface-color)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '1.75rem', flexShrink: 0 }}>{icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontWeight: 600, wordBreak: 'break-word', fontSize: '0.95rem' }}>{log.reason}</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', gap: '1rem', marginTop: '0.25rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                        {new Date(log.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {log.points_awarded > 0 && (
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                                                            +{log.points_awarded}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p>Aún no has ganado puntos. ¡Completa tus planes y asiste a tus citas para empezar!</p>
                        )}
                    </section>
                );
            case 'registros':
                return (
                     <section className="fade-in">
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                            Historial de Registros Diarios
                        </h2>
                        {checkins.length > 0 ? (
                            <div className="info-grid">
                                {checkins.map(checkin => (
                                    <div key={checkin.id} className="info-card">
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)' }}>{new Date(checkin.checkin_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { dateStyle: 'full' })}</h4>
                                            <div style={{display: 'flex', gap: '1.5rem', marginBottom: '0.75rem'}}>
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Ánimo</span>
                                                    <RatingDisplay rating={checkin.mood_rating} icon="star" />
                                                </div>
                                                 <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                                                    <span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>Energía</span>
                                                    <RatingDisplay rating={checkin.energy_level_rating} icon="energy" />
                                                </div>
                                            </div>
                                            {checkin.notes && <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem'}}>{checkin.notes}</p>}
                                        </div>
                                        <div className="card-actions">
                                            <button onClick={() => setEditingCheckin(checkin)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                            <button onClick={() => setDeletingCheckin(checkin)} style={{ ...styles.iconButton, color: 'var(--error-color)' }} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No tienes registros diarios en tu historial. ¡Comienza a registrar tu día desde el dashboard!</p>
                        )}
                    </section>
                );
            default: return null;
        }
    }

    return (
        <div className="fade-in">
            {editingCheckin && <DailyCheckinFormModal isOpen={!!editingCheckin} onClose={() => setEditingCheckin(null)} onSave={() => { setEditingCheckin(null); onDataRefresh(); }} checkinToEdit={editingCheckin} />}
            {deletingCheckin && <ConfirmationModal isOpen={!!deletingCheckin} onClose={() => setDeletingCheckin(null)} onConfirm={handleConfirmDelete} title="Confirmar Eliminación" message={<p>¿Estás seguro de que quieres eliminar tu registro del día {new Date((deletingCheckin.checkin_date as string).replace(/-/g, '/')).toLocaleDateString('es-MX', { dateStyle: 'long' })}?</p>} confirmText="Sí, eliminar" />}

            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Mi Progreso</h1>
                <p style={{ color: 'var(--text-light)', marginTop: '0.25rem', marginBottom: '2rem' }}>
                    Visualiza la evolución de tus métricas a lo largo del tiempo.
                </p>
            </div>
            
            <nav className="tabs">
                <button className={`tab-button ${activeTab === 'metricas' ? 'active' : ''}`} onClick={() => setActiveTab('metricas')}>Métricas</button>
                <button className={`tab-button ${activeTab === 'recompensas' ? 'active' : ''}`} onClick={() => setActiveTab('recompensas')}>Recompensas</button>
                <button className={`tab-button ${activeTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveTab('registros')}>Registros Diarios</button>
            </nav>
            
            <div style={{marginTop: '2rem'}}>
                <div style={{maxWidth: '900px', margin: '0 auto'}}>
                    {renderContent()}
                </div>
            </div>

        </div>
    );
};

export default MyProgressPage;