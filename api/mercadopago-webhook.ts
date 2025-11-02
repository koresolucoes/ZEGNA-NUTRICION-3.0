import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/database.types';
import crypto from 'crypto';

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  
  // --- 1. Webhook Signature Validation ---
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Webhook Error: MERCADOPAGO_WEBHOOK_SECRET is not configured on the server.');
    return res.status(500).send('Webhook secret not configured.');
  }

  const signatureHeader = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.body.data?.id;

  if (!signatureHeader || !requestId || !dataId) {
    console.warn('Webhook received without required signature headers or data ID.');
    return res.status(400).send('Missing signature headers.');
  }

  try {
    const parts = signatureHeader.split(',').reduce((acc: { [key: string]: string }, part: string) => {
        const [key, value] = part.split('=');
        acc[key.trim()] = value.trim();
        return acc;
    }, {});
    
    const ts = parts.ts;
    const v1 = parts.v1;

    if (!ts || !v1) {
      return res.status(400).send('Invalid signature format.');
    }
    
    // Create the manifest string to sign
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    
    // Create the HMAC
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(manifest);
    const calculatedSignature = hmac.digest('hex');

    // Compare signatures
    if (calculatedSignature !== v1) {
      console.error('Webhook Error: Invalid signature.');
      return res.status(401).send('Invalid signature.');
    }

    console.log('Webhook signature validated successfully.');

  } catch (err) {
      console.error('Error during signature validation:', err);
      return res.status(400).send('Bad request in signature validation.');
  }
  // --- Validation Passed ---


  const { body } = req;
  console.log('Mercado Pago Webhook Received:', JSON.stringify(body, null, 2));

  // Acknowledge receipt immediately to prevent timeouts from Mercado Pago
  res.status(200).send('OK');

  // Process the webhook asynchronously after responding
  try {
    // We only care about subscription (preapproval) notifications
    if (body.type === 'preapproval') {
      const subscriptionId = body.data.id;
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
          console.error('Webhook Error: MERCADOPAGO_ACCESS_TOKEN is not configured.');
          return; // Stop processing
      }

      // Securely fetch the latest subscription status from Mercado Pago API
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (!mpResponse.ok) {
          console.error(`Webhook: Failed to fetch subscription ${subscriptionId} from Mercado Pago.`);
          return;
      }
      
      const subscriptionData = await mpResponse.json();
      console.log('Fetched MP Subscription Data:', JSON.stringify(subscriptionData, null, 2));

      const { external_reference, status, next_payment_date, preapproval_plan_id, id: mercadopago_subscription_id } = subscriptionData;
      
      let externalRefData;
      try {
        externalRefData = JSON.parse(external_reference);
      } catch (e) {
          console.error(`Webhook: Could not parse external_reference: ${external_reference}`);
          return;
      }
      
      const { clinicId, planId } = externalRefData;
      if (!clinicId || !planId) {
          console.error(`Webhook: clinicId or planId missing in external_reference.`);
          return;
      }

      const subscriptionStatusMapping: { [key: string]: string } = {
        'authorized': 'active',
        'paused': 'past_due',
        'cancelled': 'canceled',
        'pending': 'pending', // A pending status in Mercado Pago
      };
      
      // @ts-ignore
      const newStatus = subscriptionStatusMapping[status] || 'active'; // Default to active if authorized

      const payload = {
        clinic_id: clinicId,
        plan_id: planId,
        status: newStatus,
        current_period_end: next_payment_date,
        mercadopago_subscription_id: mercadopago_subscription_id,
        mercadopago_plan_id: preapproval_plan_id,
        updated_at: new Date().toISOString(),
      };

      // Upsert the subscription record for the clinic
      const { error: upsertError } = await supabaseAdmin
        .from('clinic_subscriptions')
        .upsert(payload, { onConflict: 'clinic_id' });
      
      if (upsertError) {
        console.error(`Webhook: Error upserting subscription for clinic ${clinicId}:`, upsertError);
      } else {
        console.log(`Webhook: Successfully updated subscription for clinic ${clinicId} to status ${newStatus}.`);
      }
    }
  } catch (error: any) {
    console.error('Error processing Mercado Pago webhook:', error.message);
  }
}