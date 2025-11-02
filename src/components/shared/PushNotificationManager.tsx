
import React, { FC, useState, useEffect } from 'react';
import { supabase, VAPID_PUBLIC_KEY, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';

// Helper function to convert the VAPID key from a URL-safe base64 string to a Uint8Array
function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const PushNotificationManager: FC = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    
    // State for the test notification feature
    const [testLoading, setTestLoading] = useState(false);
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

    // Check if the VAPID key is still the placeholder, which is a common setup error.
    const isVapidKeyMissing = !VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('REPLACE THIS KEY');

    useEffect(() => {
        const initializePush = async () => {
            if (!('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)) {
                setIsSupported(false);
                setLoading(false);
                return;
            }
            setIsSupported(true);
            setPermissionStatus(Notification.permission);

            if (isVapidKeyMissing) {
                setLoading(false);
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.getSubscription();
                if (sub) {
                    setIsSubscribed(true);
                    setSubscription(sub);
                }
            } catch (err: any) {
                console.error("Error initializing push notifications:", err);
                setError("No se pudo inicializar el servicio de notificaciones. Intenta recargar la página.");
            } finally {
                setLoading(false);
            }
        };

        initializePush();
    }, [isVapidKeyMissing]);

    const subscribeUser = async () => {
        setLoading(true);
        setError(null);
        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission !== 'granted') {
                throw new Error('Permiso para notificaciones no concedido.');
            }

            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado.');

            // Use upsert to handle new subscriptions or updates for the same device
            // FIX: Cast subscription object to `unknown as Json` to match Supabase's expected type.
            const { error: dbError } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    subscription_object: sub.toJSON() as unknown as Json,
                    endpoint: sub.endpoint,
                }, { onConflict: 'endpoint' });

            if (dbError) throw dbError;

            setSubscription(sub);
            setIsSubscribed(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribeUser = async () => {
        setLoading(true);
        setError(null);
        try {
            if (subscription) {
                await subscription.unsubscribe();
                
                const { error: dbError } = await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);
                
                if (dbError) throw dbError;

                setSubscription(null);
                setIsSubscribed(false);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSendTestNotification = async () => {
        setTestLoading(true);
        setTestMessage(null);
        setTestError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No estás autenticado.');

            const response = await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    title: 'Notificación de Prueba 📲',
                    body: '¡Si ves esto, la configuración de notificaciones funciona correctamente!'
                })
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Falló el envío de la notificación de prueba.');
            }
            
            setTestMessage('Notificación de prueba enviada. Deberías recibirla en unos segundos.');

        } catch (err: any) {
            setTestError(err.message);
        } finally {
            setTestLoading(false);
        }
    };


    if (!isSupported) {
        return <p>Las notificaciones push no son compatibles con este navegador.</p>;
    }

    if (isVapidKeyMissing) {
        return (
            <div style={{ ...styles.error, backgroundColor: 'var(--error-bg)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--error-color)' }}>Configuración Requerida</h3>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Para activar las notificaciones, necesitas generar una clave VAPID y añadirla al sistema.
                </p>
                <ol style={{ textAlign: 'left', paddingLeft: '1.5rem', marginTop: '1rem', marginBottom: '0' }}>
                    <li>Abre una terminal y ejecuta: <code>npx web-push generate-vapid-keys</code></li>
                    <li>Copia la <strong>"Public Key"</strong> generada.</li>
                    <li>Abre el archivo <code>src/supabase.ts</code>.</li>
                    <li>Pega la clave pública para reemplazar el valor de <code>VAPID_PUBLIC_KEY</code>.</li>
                    <li>Guarda el archivo y refresca la aplicación.</li>
                </ol>
            </div>
        );
    }
    
    const successMessageStyle: React.CSSProperties = { ...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)' };

    return (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px' }}>
            {error && <p style={styles.error}>{error}</p>}
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: 0, color: 'var(--text-color)' }}>Estado de Notificaciones</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: isSubscribed ? 'var(--primary-color)' : 'var(--text-light)' }}>
                        {isSubscribed ? 'Activadas en este dispositivo' : 'Desactivadas'}
                    </p>
                </div>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={isSubscribed}
                        onChange={isSubscribed ? unsubscribeUser : subscribeUser}
                        disabled={loading || permissionStatus === 'denied'}
                    />
                    <span className="slider round"></span>
                </label>
            </div>
            
            {isSubscribed && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>Verificar Funcionamiento</h4>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                        Usa este botón para enviarte una notificación y confirmar que tu dispositivo las está recibiendo correctamente. Si no la recibes, revisa los permisos de notificación y la configuración de batería para la app en los ajustes de tu teléfono.
                    </p>
                    <button onClick={handleSendTestNotification} disabled={testLoading} className="button-secondary">
                        {testLoading ? 'Enviando...' : <>{ICONS.send} Enviar Notificación de Prueba</>}
                    </button>
                    {testMessage && <p style={{...successMessageStyle, marginTop: '1rem'}}>{testMessage}</p>}
                    {testError && <p style={{...styles.error, marginTop: '1rem'}}>{testError}</p>}
                </div>
            )}
            
            {permissionStatus === 'denied' && (
                <p style={{ ...styles.error, marginTop: '1rem', backgroundColor: 'var(--error-bg)' }}>
                    <strong>El interruptor está desactivado porque has bloqueado los permisos de notificación en el navegador.</strong> Para activarlo, debes ir a la configuración de permisos de este sitio y cambiar "Notificaciones" a "Permitir".
                </p>
            )}
        </div>
    );
};

export default PushNotificationManager;