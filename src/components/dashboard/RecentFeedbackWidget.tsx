import React, { FC } from 'react';
import { styles } from '../../constants';
import { ChurnFeedback } from '../../types';

interface RecentFeedbackWidgetProps {
    recentFeedback: ChurnFeedback[];
    loading: boolean;
    navigateToDetail: (type: 'client', id: string) => void;
}

const RecentFeedbackWidget: FC<RecentFeedbackWidgetProps> = ({ recentFeedback, loading, navigateToDetail }) => {
    
    const renderSkeleton = (lines = 3) => (
        <div>
            {[...Array(lines)].map((_, i) => (
                <div key={i} style={{height: '40px', backgroundColor: 'var(--surface-hover-color)', borderRadius: '4px', marginBottom: '1rem'}}></div>
            ))}
        </div>
    );

    return (
        <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}><h3 style={{...styles.detailCardTitle, fontSize: '1.1rem'}}>Feedback de Retención</h3></div>
            <div style={styles.infoCardBody}>
                {loading ? renderSkeleton() : (
                    <ul style={styles.activityList}>
                        {recentFeedback.length > 0 ? recentFeedback.map(fb => (
                            <li key={fb.id} style={{...styles.activityItem, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem'}}>
                                <p style={{margin: 0, fontWeight: 500, fontStyle: 'italic'}}>"{fb.reason}"</p>
                                <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-light)'}}>
                                    <span>
                                        - <a onClick={() => navigateToDetail('client', fb.person_id)} style={styles.activityItemLink} role="button">
                                            {fb.persons?.full_name || 'Paciente anónimo'}
                                        </a>
                                    </span>
                                    <span>{new Date(fb.feedback_date).toLocaleDateString('es-MX')}</span>
                                </div>
                            </li>
                        )) : <p>No hay feedback reciente de pacientes.</p>}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default RecentFeedbackWidget;
