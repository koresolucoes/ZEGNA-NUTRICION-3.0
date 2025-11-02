
// This is a new serverless function to test WhatsApp API credentials securely.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, credentials } = req.body;

    if (!provider || !credentials) {
      return res.status(400).json({ error: 'Provider and credentials are required.' });
    }

    if (provider === 'twilio') {
      const { accountSid, authToken } = credentials;
      if (!accountSid || !authToken) {
        return res.status(400).json({ error: 'Twilio Account SID and Auth Token are required.' });
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
      const response = await fetch(twilioUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        }
      });

      if (response.ok) {
        return res.status(200).json({ success: true, message: '¡Conexión con Twilio exitosa!' });
      } else if (response.status === 401) {
        return res.status(401).json({ success: false, error: 'Credenciales de Twilio inválidas. Revisa el Account SID y el Auth Token.' });
      } else {
        const errorBody = await response.json();
        return res.status(response.status).json({ success: false, error: `Error de Twilio: ${errorBody.message}` });
      }

    } else if (provider === 'meta') {
        const { accessToken } = credentials;
        if (!accessToken) {
            return res.status(400).json({ error: 'El Access Token de Meta es requerido.' });
        }

        const metaUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`;
        const response = await fetch(metaUrl, { method: 'GET' });

        if (response.ok) {
            return res.status(200).json({ success: true, message: '¡Conexión con Meta exitosa! El token de acceso es válido.' });
        } else {
            const errorBody = await response.json();
            return res.status(response.status).json({ success: false, error: `Error de Meta: ${errorBody.error.message}` });
        }
    } else {
      return res.status(400).json({ error: 'Proveedor no soportado.' });
    }

  } catch (error: any) {
    console.error('Error in /api/test-whatsapp:', error);
    res.status(500).json({ success: false, error: error.message || 'Ocurrió un error inesperado en el servidor.' });
  }
}
