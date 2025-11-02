import React, { FC } from 'react';
import PushNotificationManager from '../../components/shared/PushNotificationManager';

const AllyNotificationsPage: FC = () => {
    return (
        <div className="fade-in" style={{ maxWidth: '700px' }}>
            <h1 style={{ color: 'var(--primary-color)' }}>Notificaciones</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Activa las notificaciones para recibir alertas cuando recibas un nuevo referido o una solicitud de vínculo de una clínica.
            </p>
            <PushNotificationManager />
        </div>
    );
};

export default AllyNotificationsPage;
