
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/database.types';

const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { planId, clinicId, billingCycle } = req.body;
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!planId || !clinicId || !billingCycle) {
      return res.status(400).json({ error: 'Faltan planId, clinicId o billingCycle.' });
    }
    if (!accessToken) {
        return res.status(500).json({ error: 'La clave de acceso de Mercado Pago no está configurada en el servidor.' });
    }

    // 1. Fetch plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan no encontrado.' });
    }

    // 2. Get user from JWT sent in the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación no proporcionado.' });
    }
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
        return res.status(401).json({ error: userError?.message || 'Usuario no autenticado o token inválido.' });
    }

    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const frequency = billingCycle === 'yearly' ? 1 : 1;
    const frequency_type = billingCycle === 'yearly' ? 'years' : 'months';

    // 3. Create Mercado Pago subscription preference payload
    const preference = {
      reason: `Suscripción Zegna - Plan ${plan.name} (${billingCycle})`,
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequency_type,
        transaction_amount: price,
        currency_id: 'MXN',
      },
      back_url: `${req.headers.origin}/`, // The user will be redirected here after payment
      payer_email: user.email,
      external_reference: JSON.stringify({ clinicId, planId, billingCycle }), // Pass clinic and plan info
      notification_url: `${req.headers.origin}/api/mercadopago-webhook`,
    };
    
    // 4. Call Mercado Pago API using the correct global endpoint
    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
        // More descriptive error logging for debugging
        console.error('Mercado Pago API Error:', mpData);
        throw new Error(mpData.message || 'Error al crear la preferencia de Mercado Pago.');
    }
    
    // 5. Return the checkout URL
    res.status(200).json({ init_point: mpData.init_point });

  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    res.status(500).json({ error: error.message });
  }
}
