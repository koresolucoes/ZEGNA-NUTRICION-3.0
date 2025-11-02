// api/test-invoice.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Mock decryption. In production, use a proper crypto library.
const decryptPassword = (encoded: string): string => {
    try {
        return atob(encoded);
    } catch (e) {
        console.error("Failed to decode password.", e);
        return encoded;
    }
};

// @ts-ignore
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { clinic_id } = req.body;
    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required.' });
    }

    // 1. Fetch clinic credentials
    const { data: creds, error: credsError } = await supabaseAdmin
      .from('fiscal_credentials')
      .select('environment, fiscal_person_id, fiscal_api_key')
      .eq('clinic_id', clinic_id)
      .single();

    if (credsError || !creds) {
      throw new Error(`Credenciales fiscales no encontradas para la clínica: ${credsError?.message}`);
    }
    if (!creds.fiscal_person_id || !creds.fiscal_api_key) {
      throw new Error("La configuración de la entidad fiscal o la API key de la clínica están incompletas.");
    }
    
    // Ensure we are using the test environment for this operation
    const fiscalApiBaseUrl = 'https://test.fiscalapi.com';
    const clinicApiKey = decryptPassword(creds.fiscal_api_key);

    // 2. Create a generic "PUBLICO EN GENERAL" receiver for the test
    const createPersonUrl = `${fiscalApiBaseUrl}/api/v4/people`;
    const generatedEmail = `test-receiver-${Date.now()}@zegna.app`;
    const generatedPassword = `${crypto.randomUUID()}A1!`;

    const personResponse = await fetch(createPersonUrl, {
        method: 'POST',
        headers: {
            'X-TENANT-KEY': process.env.ZEGNA_FISCALAPI_TENANT_KEY!,
            'X-API-KEY': process.env.ZEGNA_FISCALAPI_MASTER_KEY!,
            'Content-Type': 'application/json',
            'X-TIME-ZONE': 'America/Mexico_City',
        },
        body: JSON.stringify({
            tin: 'XAXX010101000',
            legalName: 'PUBLICO EN GENERAL',
            email: generatedEmail,
            password: generatedPassword,
            satTaxRegimeId: "616", // Sin obligaciones fiscales
            zipCode: "01000" // A valid test zip code
        })
    });
    
    if (!personResponse.ok) {
        const errorText = await personResponse.text();
        throw new Error(`Error de FiscalAPI al crear receptor de prueba: ${errorText}`);
    }
    const personResult = await personResponse.json();
    const receiverPersonId = personResult.data.id;

    // 3. Construct the test invoice payload
    const invoicePayload = {
      series: "TEST",
      date: new Date().toISOString().slice(0, 19),
      paymentFormCode: "01",
      paymentMethodCode: "PUE",
      currencyCode: "MXN",
      expeditionZipCode: "45010", // A valid test zip code
      issuer: {
        id: creds.fiscal_person_id
      },
      recipient: {
        id: receiverPersonId,
        cfdiUseCode: "S01" // Sin efectos fiscales
      },
      items: [{
          itemCode: "01010101", // Código genérico del SAT
          quantity: 1,
          description: "Producto de Prueba",
          unitPrice: 100.00,
          taxObjectCode: "01" // No objeto de impuesto (para simplificar)
      }]
    };
    
    // 4. Call FiscalAPI to generate the test invoice
    const invoiceApiUrl = `${fiscalApiBaseUrl}/api/v4/invoices/income`;
    const invoiceResponse = await fetch(invoiceApiUrl, {
        method: 'POST',
        headers: {
            'X-TENANT-KEY': process.env.ZEGNA_FISCALAPI_TENANT_KEY!,
            'X-API-KEY': clinicApiKey, // Use the clinic-specific key here
            'Content-Type': 'application/json',
            'X-TIME-ZONE': 'America/Mexico_City',
        },
        body: JSON.stringify(invoicePayload)
    });
    
    const result = await invoiceResponse.json();

    if (!invoiceResponse.ok) {
      const errorMessage = result?.details || result?.message || JSON.stringify(result);
      throw new Error(`Error de FiscalAPI al generar factura: ${errorMessage}`);
    }

    res.status(200).json({ 
        success: true, 
        message: 'Factura de prueba generada exitosamente.',
        uuid: result.data.uuid
    });

  } catch (error: any) {
    console.error('Error in /api/test-invoice:', error);
    res.status(500).json({ success: false, error: error.message || 'Ocurrió un error inesperado en el servidor.' });
  }
}