import React, { FC } from 'react';
import PushNotificationManager from '../../components/shared/PushNotificationManager';

const PatientNotificationsPage: FC = () => {
    return (
        <div className="fade-in" style={{ maxWidth: '700px' }}>
            <h1 style={{ color: 'var(--primary-color)' }}>Notificaciones</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Activa las notificaciones para recibir recordatorios de tus citas, avisos de nuevos planes y mensajes importantes de tu nutriólogo directamente en tu dispositivo.
            </p>
            <PushNotificationManager />
        </div>
    );
};

export default PatientNotificationsPage;
