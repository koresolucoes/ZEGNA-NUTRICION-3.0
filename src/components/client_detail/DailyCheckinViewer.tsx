
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-light)', width: '60px', textAlign: 'right' }}>{label}</span>
            {rating ? (
                <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(5)].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i < rating ? "var(--accent-color)" : "var(--border-color)"} stroke="none"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    ))}
                </div>
            ) : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>-</span>}
        </div>
    );

    return (
        <div className="fade-in">
             {previewingAttachment && <AttachmentPreviewModal attachment={previewingAttachment} onClose={() => setPreviewingAttachment(null)} />}
            <div style={{ ...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{margin:0}}>Auto-Registro del Paciente</h2>
            </div>
            {checkins.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {checkins.map(item => {
                        const attachments = (item.attachments as unknown as Attachment[] | null) || [];
                        return (
                            <div key={item.id} className="info-card" style={{padding: '1rem'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
                                    <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--primary-color)'}}>
                                        {new Date(item.checkin_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </h4>
                                </div>
                                
                                <div style={{display: 'flex', gap: '2rem', marginBottom: '0.75rem'}}>
                                    {renderRating("Ánimo", item.mood_rating)}
                                    {renderRating("Energía", item.energy_level_rating)}
                                </div>
                                
                                {item.notes && (
                                    <div style={{backgroundColor: 'var(--surface-hover-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-color)', fontStyle: 'italic'}}>
                                        "{item.notes}"
                                    </div>
                                )}
                                
                                {attachments.length > 0 && (
                                    <div style={{marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                                        {attachments.map((att, idx) => (
                                            <button key={idx} onClick={() => setPreviewingAttachment(att)} className="button-secondary" style={{padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                {ICONS.file} {att.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '12px'}}>
                    <p>No hay registros diarios del paciente.</p>
                </div>
            )}
        </div>
    );
};

export default DailyCheckinViewer;
