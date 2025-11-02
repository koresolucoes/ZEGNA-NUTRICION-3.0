import { createClient } from '@supabase/supabase-js';

// This function needs to run in a secure environment with access to Supabase service role key.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Placeholder for a real encryption function. In a real-world scenario, you would
// use a library like 'crypto' in Node.js and a secret key stored in environment variables.
const encryptPassword = (password: string): string => {
  // SIMULATION: In a real app, this would return an encrypted string.
  // For this exercise, we'll just return the password base64 encoded as a mock "encryption".
  // DO NOT DO THIS IN PRODUCTION.
  return btoa(password);
};

// @ts-ignore - Assuming vercel types are available at runtime
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      clinic_id,
      certificate_path,
      private_key_path,
      private_key_password,
      environment
    } = req.body;

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required.' });
    }

    // 1. Fetch clinic details and existing fiscal_person_id
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('name, rfc, fiscal_credentials(fiscal_person_id)')
      .eq('id', clinic_id)
      .single();

    if (clinicError) throw new Error(`No se pudieron obtener los datos de la clínica: ${clinicError.message}`);
    if (!clinicData.rfc || !clinicData.name) {
      throw new Error('La clínica debe tener un Nombre y un RFC configurados antes de guardar las credenciales fiscales.');
    }

    let fiscalPersonId = (clinicData.fiscal_credentials as any)?.fiscal_person_id;

    const fiscalApiBaseUrl = environment === 'production' 
        ? 'https://live.fiscalapi.com'
        : 'https://test.fiscalapi.com';

    // 2. Create a "Person" entity in FiscalAPI if it doesn't exist for this clinic yet
    if (!fiscalPersonId) {
        const createPersonUrl = `${fiscalApiBaseUrl}/api/v4/people`;
        
        const generatedEmail = `${clinicData.rfc.toLowerCase()}@zegna.app`; // Unique, non-functional email
        const generatedPassword = `${crypto.randomUUID()}A1!`; // Strong random password

        const personResponse = await fetch(createPersonUrl, {
            method: 'POST',
            headers: {
                'X-TENANT-KEY': process.env.ZEGNA_FISCALAPI_TENANT_KEY!,
                'X-API-KEY': process.env.ZEGNA_FISCALAPI_MASTER_KEY!,
                'Content-Type': 'application/json',
                'X-TIME-ZONE': 'America/Mexico_City',
            },
            body: JSON.stringify({
                tin: clinicData.rfc,
                legalName: clinicData.name,
                email: generatedEmail,
                password: generatedPassword,
            })
        });

        if (!personResponse.ok) {
            const errorText = await personResponse.text();
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson?.details || errorJson?.message || JSON.stringify(errorJson);
            } catch (e) {
                // Not a JSON error, use the raw text
            }
            throw new Error(`Error de FiscalAPI al crear la entidad fiscal: ${errorMessage}`);
        }
        
        const personResult = await personResponse.json();
        fiscalPersonId = personResult.data.id;
    }

    if (!fiscalPersonId) {
        throw new Error("No se pudo obtener o crear el ID de la entidad fiscal en FiscalAPI.");
    }
    
    // 3. Create a new API Key for the Person entity on every save.
    const createApiKeyUrl = `${fiscalApiBaseUrl}/api/v4/apikeys`;
    const apiKeyResponse = await fetch(createApiKeyUrl, {
        method: 'POST',
        headers: {
            'X-TENANT-KEY': process.env.ZEGNA_FISCALAPI_TENANT_KEY!,
            'X-API-KEY': process.env.ZEGNA_FISCALAPI_MASTER_KEY!,
            'Content-Type': 'application/json',
            'X-TIME-ZONE': 'America/Mexico_City',
        },
        body: JSON.stringify({
            personId: fiscalPersonId,
            description: `API Key para Zegna - ${clinicData.name}`
        })
    });
    
    if (!apiKeyResponse.ok) {
        const errorText = await apiKeyResponse.text();
        let errorMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson?.details || errorJson?.message || JSON.stringify(errorJson);
        } catch(e) { /* was not json */ }
        throw new Error(`Error de FiscalAPI al crear la API key: ${errorMessage}`);
    }

    const apiKeyResult = await apiKeyResponse.json();
    const newApiKey = apiKeyResult.data.apiKeyValue;

    // 4. Prepare payload for Supabase
    const payload: any = {
      clinic_id,
      environment,
      certificate_path: certificate_path || null,
      private_key_path: private_key_path || null,
      // Add the new fields
      fiscal_person_id: fiscalPersonId,
      fiscal_api_key: encryptPassword(newApiKey), // Encrypt and store the new key
    };

    if (private_key_password) {
      payload.private_key_password = encryptPassword(private_key_password);
    }

    // 5. Upsert credentials to Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('fiscal_credentials')
      .upsert(payload, { onConflict: 'clinic_id' });

    if (upsertError) {
      throw upsertError;
    }
    
    res.status(200).json({ success: true, message: 'Credenciales guardadas y API key generada con éxito.' });

  } catch (error: any) {
    console.error('Error in /api/save-fiscal-credentials:', error);
    res.status(500).json({ success: false, error: error.message || 'Ocurrió un error inesperado en el servidor.' });
  }
}