import React, { FC, useState } from 'react';
import { DailyCheckin } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import AttachmentPreviewModal from '../modals/AttachmentPreviewModal';

interface DailyCheckinViewerProps {
    checkins: DailyCheckin[];
}

interface Attachment {
    name: string;
    url: string;
    type: string;
}

const DailyCheckinViewer: FC<DailyCheckinViewerProps> = ({ checkins }) => {
    const [previewingAttachment, setPreviewingAttachment] = useState<Attachment | null>(null);

    const renderRating = (label: string, rating: number | null) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{label}:</span>
            {rating ? (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[...Array(5)].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={i < rating ? "var(--accent-color)" : "var(--border-color)"} stroke="none"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    ))}
                </div>
            ) : <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.9rem' }}>No registrado</span>}
        </div>
    );

    return (
        <div className="fade-in">
             {previewingAttachment && <AttachmentPreviewModal attachment={previewingAttachment} onClose={() => setPreviewingAttachment(null)} />}
            <div style={{ ...styles.pageHeader, padding: 0, border: 'none', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Registros Diarios del Paciente</h3>
            </div>
            {checkins.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {checkins.map(item => {
                        const attachments = (item.attachments as unknown as Attachment[] | null) || [];
                        return (
                            <div key={item.id} style={{...styles.detailCard, marginBottom: 0}}>
                                <div style={styles.detailCardHeader}>
                                    <h4 style={{...styles.detailCardTitle, color: 'var(--primary-color)'}}>
                                        {new Date(item.checkin_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </h4>
                                </div>
                                <div style={{...styles.detailCardBody, display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                    <div style={{display: 'flex', gap: '1.5rem', flexWrap: 'wrap'}}>
                                        {renderRating("Ánimo", item.mood_rating)}
                                        {renderRating("Energía", item.energy_level_rating)}
                                    </div>
                                    {item.notes && (
                                        <div>
                                            <h5 style={styles.detailGroupTitle}>Notas del Paciente</h5>
                                            <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{item.notes}</p>
                                        </div>
                                    )}
                                    {attachments.length > 0 && (
                                        <div>
                                            <h5 style={styles.detailGroupTitle}>Archivos Adjuntos</h5>
                                            <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                                                {attachments.map((att, idx) => (
                                                    <button key={idx} onClick={() => setPreviewingAttachment(att)} className="button-secondary" style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>
                                                        {ICONS.file} {att.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p>No hay registros diarios para este paciente.</p>
            )}
        </div>
    );
};

export default DailyCheckinViewer;
