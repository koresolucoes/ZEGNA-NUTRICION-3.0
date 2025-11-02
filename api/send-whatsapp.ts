import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE) {
    console.error('Server configuration error: Missing Supabase service role key.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  try {
    const { clinic_id, contact_id, contact_phone_number, message_body } = req.body;

    if (!clinic_id || !contact_phone_number || !message_body || !contact_id) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // 1. Fetch the clinic's WhatsApp connection details
    const { data: connection, error: connError } = await supabaseAdmin
      .from('whatsapp_connections')
      .select('provider, credentials, phone_number, is_active')
      .eq('clinic_id', clinic_id)
      .single();

    if (connError || !connection || !connection.is_active) {
      return res.status(404).json({ error: 'WhatsApp connection for this clinic is not active or not found.' });
    }
    
    // 2. Log the manual message to the database
    const { error: logError } = await supabaseAdmin.from('whatsapp_conversations').insert({
        clinic_id: clinic_id,
        contact_id: contact_id,
        contact_phone_number: contact_phone_number,
        message_content: message_body,
        sender: 'agent', // Manual replies are still from the 'agent'
    });
    if (logError) throw new Error(`Failed to log message: ${logError.message}`);

    // 3. Send the message via the correct provider
    if (connection.provider === 'twilio') {
        const twilioCreds = connection.credentials as { accountSid: string, authToken: string };
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.accountSid}/Messages.json`;
        
        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + btoa(`${twilioCreds.accountSid}:${twilioCreds.authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: `whatsapp:${contact_phone_number}`, From: `whatsapp:${connection.phone_number}`, Body: message_body }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Twilio API error: ${errorBody.message}`); }

    } else if (connection.provider === 'meta') {
        const metaCreds = connection.credentials as { phoneNumberId: string, accessToken: string };
        const metaUrl = `https://graph.facebook.com/v19.0/${metaCreds.phoneNumberId}/messages`;
        
        const response = await fetch(metaUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${metaCreds.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to: contact_phone_number, type: "text", text: { body: message_body } }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Meta API error: ${errorBody.error.message}`); }
    } else {
        throw new Error(`Unsupported provider: ${connection.provider}`);
    }

    res.status(200).json({ success: true, message: 'Message sent successfully.' });

  } catch (error: any) {
    console.error('[Send WhatsApp API] Error:', error);
    return res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
}