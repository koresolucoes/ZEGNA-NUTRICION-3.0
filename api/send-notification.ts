
import { createClient } from '@supabase/supabase-js';

// ASSUMPTION: The 'web-push' library is available in the serverless environment.
// This is a common library for sending web push notifications and would typically
// be installed as a dependency for a Node.js-based serverless function.
// @ts-ignore - Assuming web-push is available at runtime
import webpush from 'web-push';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BN45Z3gmMkuxi1-ZYf7luR6Je88Nu9sEaFmhrCC_cnKwvqg_cRrh3GEHvPWFaOze-GxOvPWSgkNamJOIYn0vtt4';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!serviceRoleKey) {
        console.error('Server configuration error: SUPABASE_SERVICE_ROLE is not set.');
        return res.status(500).json({ error: 'Internal server configuration error.' });
    }
    if (!vapidPrivateKey) {
        console.error('Server configuration error: VAPID_PRIVATE_KEY is not set.');
        return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    webpush.setVapidDetails(
        'mailto:support@zegna.com',
        vapidPublicKey,
        vapidPrivateKey
    );

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        const { userId, title, body, icon, badge } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields: userId, title, body.' });
        }

        const { data: subscriptions, error: dbError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('subscription_object')
            .eq('user_id', userId);

        if (dbError) throw dbError;

        if (!subscriptions || subscriptions.length === 0) {
            // It's not an error if the user has no subscriptions, just noting it.
            return res.status(200).json({ message: 'No push subscriptions found for this user to notify.' });
        }

        const notificationPayload = JSON.stringify({ title, body, icon, badge });

        const sendPromises = subscriptions.map(sub =>
            webpush.sendNotification(
                sub.subscription_object as any,
                notificationPayload
            ).catch((error: any) => {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log('Subscription has expired or is no longer valid, deleting from DB.');
                    const endpoint = (sub.subscription_object as any).endpoint;
                    return supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
                } else {
                    console.error('Error sending notification to endpoint:', (sub.subscription_object as any).endpoint, error);
                }
            })
        );
        
        await Promise.all(sendPromises);

        res.status(200).json({ message: `Attempted to send notifications to ${subscriptions.length} device(s).` });

    } catch (error: any) {
        console.error('Error in /api/send-notification:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
}