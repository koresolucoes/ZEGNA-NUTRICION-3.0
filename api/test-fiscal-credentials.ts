// @ts-ignore - Assuming vercel types are available at runtime
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { apiKey, apiSecret, environment } = req.body;

    if (!apiKey || !apiSecret || !environment) {
      return res.status(400).json({ error: 'apiKey, apiSecret, and environment are required.' });
    }

    const fiscalApiUrl = environment === 'production'
      ? 'https://api.fiscalapi.com/v1/user'
      : 'https://sandbox.fiscalapi.com/v1/user';

    // The Authorization header for FiscalAPI is 'Basic' + base64(apiKey + ':' + apiSecret)
    const encodedCredentials = btoa(`${apiKey}:${apiSecret}`);

    const response = await fetch(fiscalApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
      },
    });
    
    const responseData = await response.json();

    if (!response.ok) {
        // Attempt to parse FiscalAPI's error message
        const errorMessage = responseData?.message || `Error de FiscalAPI: ${response.statusText}`;
        throw new Error(errorMessage);
    }
    
    // If the request is successful, FiscalAPI returns user info.
    // We just need to confirm it worked.
    res.status(200).json({ success: true, message: '¡Credenciales validadas con éxito!' });

  } catch (error: any) {
    console.error('Error in /api/test-fiscal-credentials:', error);
    res.status(500).json({ success: false, error: error.message || 'Ocurrió un error inesperado en el servidor.' });
  }
}