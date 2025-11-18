import React, { FC } from 'react';
import PushNotificationManager from '../../components/shared/PushNotificationManager';
import { styles } from '../../constants';

const PatientNotificationsPage: FC = () => {
    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={styles.pageHeader}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Notificaciones</h1>
            </div>
            <p style={{ color: 'var(--text-light)', marginTop: '-1.5rem', marginBottom: '2rem' }}>
                Gestiona tus preferencias de notificaciones para mantenerte al día con tu tratamiento.
            </p>
            
            <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                <PushNotificationManager />
            </div>
        </div>
    );
};

export default PatientNotificationsPage;