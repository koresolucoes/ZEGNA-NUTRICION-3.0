

import { createClient } from '@supabase/supabase-js';

// Helper function to convert ArrayBuffer to base64, removing dependency on Node.js Buffer
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};


// @ts-ignore - Assuming vercel types are available at runtime
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

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
    
    const getPaymentFormCode = (method: string): string => {
        switch (method) {
            case 'cash': return '01'; // Efectivo
            case 'transfer': return '03'; // Transferencia
            case 'card': return '04'; // Tarjeta de crédito / débito
            default: return '99'; // Por definir
        }
    };

    const extractZipCode = (address: string | null | undefined): string | null => {
        if (!address) return null;
        // This regex looks for a 5-digit sequence, which is standard for Mexican postal codes.
        const match = address.match(/\b\d{5}\b/);
        return match ? match[0] : null;
    };


    try {
        const { payment_id, cfdi_use, rfc, fiscal_address, fiscal_regime } = req.body;
        if (!payment_id || !cfdi_use || !rfc || !fiscal_address || !fiscal_regime) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos para la facturación (payment_id, cfdi_use, y datos fiscales del receptor).' });
        }
        
        // 1. Fetch all necessary data in one go
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .select('*, persons(*), services(*), clinics!inner(*, fiscal_credentials!inner(*))')
            .eq('id', payment_id)
            .single();

        if (paymentError || !payment) throw new Error(`Pago no encontrado o error al obtener datos: ${paymentError?.message}`);
        
        const person = payment.persons;
        const service = payment.services;
        const clinic = (payment as any).clinics;
        const fiscalCreds = clinic.fiscal_credentials[0];

        if (!person || !clinic || !fiscalCreds) throw new Error("Faltan datos del paciente, la clínica o las credenciales fiscales.");
        if (!clinic.rfc || !clinic.fiscal_regime) throw new Error("Los datos fiscales del emisor (clínica) están incompletos.");
        if (!fiscalCreds.certificate_path || !fiscalCreds.private_key_path || !fiscalCreds.private_key_password) throw new Error("El certificado CSD, la clave privada o la contraseña de la clínica no están configurados.");
        if (!fiscalCreds.fiscal_api_key) {
            throw new Error("La API key para facturación de esta clínica no está configurada. Por favor, guarda de nuevo las credenciales fiscales para generarla.");
        }
        
        const expeditionZipCode = extractZipCode(clinic.address);
        if (!expeditionZipCode) throw new Error("No se pudo extraer un código postal válido de la dirección de la clínica.");
        
        // 2. Compare and update person's fiscal data if it has changed
        if (
            person.rfc !== rfc ||
            person.fiscal_address !== fiscal_address ||
            person.fiscal_regime !== fiscal_regime
        ) {
            const { error: updateError } = await supabaseAdmin
                .from('persons')
                .update({ rfc, fiscal_address, fiscal_regime })
                .eq('id', person.id);
            if (updateError) throw new Error(`Error al actualizar los datos fiscales del paciente: ${updateError.message}`);
        }

        // 3. Fetch CSD files from storage
        const [certFile, keyFile] = await Promise.all([
            supabaseAdmin.storage.from('fiscal-files').download(fiscalCreds.certificate_path),
            supabaseAdmin.storage.from('fiscal-files').download(fiscalCreds.private_key_path)
        ]);
        
        if (certFile.error || !certFile.data) throw new Error(`Error al descargar el archivo de certificado: ${certFile.error.message}`);
        if (keyFile.error || !keyFile.data) throw new Error(`Error al descargar el archivo de clave privada: ${keyFile.error.message}`);

        const certificate = arrayBufferToBase64(await certFile.data.arrayBuffer());
        const privateKey = arrayBufferToBase64(await keyFile.data.arrayBuffer());
        const privateKeyPassword = decryptPassword(fiscalCreds.private_key_password);
        const clinicApiKey = decryptPassword(fiscalCreds.fiscal_api_key);
        
        // 4. Construct FiscalAPI payload according to CFDI 4.0 and tax-exempt rules for nutrition services
        const recipientZipCode = extractZipCode(fiscal_address);
        if(!recipientZipCode) throw new Error("No se pudo extraer un código postal válido de la dirección fiscal del receptor.");

        const fiscalApiPayload = {
            versionCode: "4.0",
            series: "F", // Could be made configurable in the future
            date: new Date().toISOString().slice(0, 19),
            paymentFormCode: getPaymentFormCode(payment.payment_method),
            paymentConditions: "Contado",
            currencyCode: "MXN",
            typeCode: "I", // 'I' for Ingreso (Income)
            expeditionZipCode: expeditionZipCode,
            paymentMethodCode: "PUE", // Pago en una sola exhibición
            exportCode: "01", // "No aplica"
            issuer: {
                tin: clinic.rfc,
                legalName: clinic.name,
                taxRegimeCode: clinic.fiscal_regime,
                taxCredentials: [
                    { base64File: certificate, fileType: 0, password: privateKeyPassword },
                    { base64File: privateKey, fileType: 1, password: privateKeyPassword }
                ]
            },
            recipient: {
                tin: rfc,
                legalName: person.full_name,
                zipCode: recipientZipCode,
                taxRegimeCode: fiscal_regime,
                cfdiUseCode: cfdi_use,
            },
            items: [{
                itemCode: "85101702", // SAT code for 'Servicios de nutricionistas o dietistas'
                quantity: 1,
                unitOfMeasurementCode: "E48", // Service unit
                description: service?.name || 'Consulta Nutricional',
                unitPrice: parseFloat(Number(payment.amount).toFixed(6)), // The full amount is the unit price
                taxObjectCode: "02", // '02' - No objeto de impuesto, as nutrition services are exempt.
                // No 'itemTaxes' array is included, making it tax-exempt.
            }]
        };

        // 5. Call FiscalAPI v4
        const fiscalApiBaseUrl = fiscalCreds.environment === 'production' 
            ? 'https://live.fiscalapi.com'
            : 'https://test.fiscalapi.com';
        const fiscalApiUrl = `${fiscalApiBaseUrl}/api/v4/invoices/income`;
            
        const apiResponse = await fetch(fiscalApiUrl, {
            method: 'POST',
            headers: {
                'X-TENANT-KEY': process.env.ZEGNA_FISCALAPI_TENANT_KEY!,
                'X-API-KEY': clinicApiKey,
                'Content-Type': 'application/json',
                'X-TIME-ZONE': 'America/Mexico_City',
            },
            body: JSON.stringify(fiscalApiPayload)
        });

        const result = await apiResponse.json();

        if (!apiResponse.ok) {
            const errorMessage = result?.message || JSON.stringify(result);
            // Attempt to store the error for debugging, but don't let this block the response
            try {
                await supabaseAdmin.from('invoices').upsert({
                    clinic_id: clinic.id,
                    payment_id: payment.id,
                    status: 'error',
                    error_message: `FiscalAPI Error (${apiResponse.status}): ${errorMessage}`
                }, { onConflict: 'payment_id' });
            } catch (dbError) {
                console.error("Failed to log FiscalAPI error to DB:", dbError);
            }
            throw new Error(`Error de FiscalAPI: ${errorMessage}`);
        }

        // 6. Save success response to DB
        const { error: invoiceInsertError } = await supabaseAdmin
            .from('invoices')
            .upsert({
                clinic_id: clinic.id,
                payment_id: payment.id,
                fiscal_uuid: result.uuid,
                status: result.status?.description || 'Timbrada',
                pdf_url: result.pdfUrl,
                xml_url: result.xmlUrl
            }, { onConflict: 'payment_id' });
        
        if (invoiceInsertError) {
            // Log this critical error, as the invoice was generated but not saved.
            console.error(`CRÍTICO: No se pudo guardar la factura generada ${result.uuid} para el pago ${payment.id}. Error: ${invoiceInsertError.message}`);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Factura generada exitosamente.',
            uuid: result.uuid,
            pdf: result.pdfUrl,
            xml: result.xmlUrl,
        });

    } catch (error: any) {
        console.error('Error in /api/generate-invoice:', error);
        res.status(500).json({ success: false, error: error.message || 'Ocurrió un error inesperado en el servidor.' });
    }
}