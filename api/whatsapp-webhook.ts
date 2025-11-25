
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";

// Supabase admin client, necessary for server-side operations that bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE || ''
);

// Helper function to normalize phone numbers by stripping non-digit characters
const normalizePhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};


// Helper to format conversation history for Gemini
const formatHistoryForGemini = (history: any[]): Content[] => {
    return history.map(msg => ({
        role: msg.sender === 'agent' ? 'model' : 'user',
        parts: [{ text: msg.message_content }],
    }));
};

// Helper to convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Helper to download media and convert to base64
const downloadMedia = async (url: string, headers: any = {}): Promise<{ data: string; mimeType: string }> => {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Failed to download media: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const data = arrayBufferToBase64(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    return { data, mimeType };
};

// Vercel Serverless Function handler
export default async function handler(req: any, res: any) {
  // --- Meta Webhook Verification (GET request) ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
        const { data, error } = await supabaseAdmin.from('whatsapp_connections').select('id').eq('credentials->>verifyToken', token).limit(1);
        if (error) { console.error('[Webhook Verify] DB Error:', error); return res.status(500).end(); }
        if (data && data.length > 0) { console.log('[Webhook Verify] Successful verification.'); return res.status(200).send(challenge); } 
        else { console.warn('[Webhook Verify] Failed verification: Token not found.'); return res.status(403).end(); }
    }
    return res.status(403).end();
  }
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // --- Basic Security Checks ---
  if (!process.env.SUPABASE_SERVICE_ROLE) {
    console.error('Server configuration error: SUPABASE_SERVICE_ROLE is not set.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }
  if (!process.env.API_KEY) {
    console.error('Server configuration error: Gemini API key (API_KEY) is not set.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  try {
    let clinicPhoneNumber: string, userPhoneNumber: string, messageBody: string;
    // Placeholder to store temporary media info before we have the credentials to download it
    let pendingMedia: { id?: string; url?: string; type: 'image' | 'audio'; mimeType?: string } | null = null;

    if (req.body.object === 'whatsapp_business_account') {
        // META Parsing
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return res.status(200).send('OK');
        
        clinicPhoneNumber = req.body.entry[0].changes[0].value.metadata.display_phone_number;
        userPhoneNumber = message.from;

        if (message.type === 'text') {
            messageBody = message.text.body;
        } else if (message.type === 'image') {
            messageBody = message.image.caption || "Analiza esta imagen.";
            pendingMedia = { id: message.image.id, type: 'image', mimeType: message.image.mime_type };
        } else if (message.type === 'audio') {
            messageBody = "[Audio] Por favor escucha y procesa este audio.";
            pendingMedia = { id: message.audio.id, type: 'audio', mimeType: message.audio.mime_type };
        } else {
            // Unsupported type for now, just acknowledge
             return res.status(200).send('OK - Unsupported type');
        }

    } else {
        // TWILIO Parsing
        clinicPhoneNumber = req.body.To?.replace('whatsapp:', '');
        userPhoneNumber = req.body.From?.replace('whatsapp:', '');
        messageBody = req.body.Body;
        
        if (req.body.NumMedia && parseInt(req.body.NumMedia) > 0) {
            const mediaUrl = req.body.MediaUrl0;
            const mediaType = req.body.MediaContentType0;
            if (mediaType.startsWith('image/')) {
                messageBody = messageBody || "Analiza esta imagen.";
                pendingMedia = { url: mediaUrl, type: 'image', mimeType: mediaType };
            } else if (mediaType.startsWith('audio/')) {
                messageBody = messageBody || "Procesa este audio.";
                pendingMedia = { url: mediaUrl, type: 'audio', mimeType: mediaType };
            }
        }
    }

    if (!clinicPhoneNumber || !userPhoneNumber) {
        return res.status(400).json({ error: 'Invalid webhook format.' });
    }

    const normalizedClinicPhone = normalizePhoneNumber(clinicPhoneNumber);
    const { data: connection, error: connError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('clinic_id, credentials, provider')
        .eq('phone_number', normalizedClinicPhone)
        .single();

    if (connError && connError.code !== 'PGRST116') {
        throw connError;
    }

    if (!connection) {
        console.warn(`[Webhook] Received message for unconfigured number: ${clinicPhoneNumber} (Normalized: ${normalizedClinicPhone})`);
        return res.status(404).json({ error: 'Phone number not configured.' });
    }
    const clinicId = connection.clinic_id;

    // 1. Find if the user is an existing person (patient/member) in the clinic by phone number
    const normalizedUserPhone = normalizePhoneNumber(userPhoneNumber);
    const { data: personData, error: personError } = await supabaseAdmin
        .from('persons')
        .select('id, full_name, subscription_end_date')
        .eq('clinic_id', clinicId)
        .eq('normalized_phone_number', normalizedUserPhone)
        .single();

    if (personError && personError.code !== 'PGRST116') {
        throw personError;
    }

    // 2. Upsert the contact, linking the person record if found
    const { data: contact, error: contactError } = await supabaseAdmin
        .from('whatsapp_contacts')
        .upsert({
            clinic_id: clinicId,
            phone_number: userPhoneNumber,
            last_message_at: new Date().toISOString(),
            person_id: personData?.id || null,
            person_name: personData?.full_name || null,
        }, { onConflict: 'clinic_id, phone_number', ignoreDuplicates: false })
        .select('id, ai_is_active')
        .single();

    if (contactError) throw contactError;

    // 3. Log user's message
    // NOTE: We save a text representation for media in DB to keep history clean.
    await supabaseAdmin.from('whatsapp_conversations').insert({ 
        clinic_id: clinicId, 
        contact_id: contact.id, 
        contact_phone_number: userPhoneNumber, 
        message_content: messageBody, 
        sender: 'user' 
    });

    // 4. Check if AI agent should respond
    const { data: agent, error: agentError } = await supabaseAdmin.from('ai_agents').select('*').eq('clinic_id', clinicId).single();
    
    const isPlanActive = personData?.subscription_end_date ? new Date(personData.subscription_end_date) >= new Date() : false;
    const shouldAiRespond = agent?.is_active && contact.ai_is_active && (!personData || isPlanActive);
    
    if (agentError || !agent || !shouldAiRespond) {
      if (!shouldAiRespond && personData && !isPlanActive) {
          console.log(`[Webhook] AI disabled for contact ${userPhoneNumber} because their plan is inactive.`);
      } else {
          console.log(`[Webhook] Agent for clinic ${clinicId} or contact ${userPhoneNumber} is inactive. Ignoring message.`);
      }
      return res.status(200).send('Agent inactive for this conversation.');
    }

    // --- PROCESS MEDIA IF PRESENT ---
    let inlineDataPart = null;
    if (pendingMedia) {
        try {
            let mediaData: { data: string, mimeType: string } | null = null;

            if (connection.provider === 'meta' && pendingMedia.id) {
                const creds = connection.credentials as any;
                // 1. Get Media URL
                const urlRes = await fetch(`https://graph.facebook.com/v19.0/${pendingMedia.id}`, {
                    headers: { Authorization: `Bearer ${creds.accessToken}` }
                });
                if (urlRes.ok) {
                    const urlJson = await urlRes.json();
                    // 2. Download Binary
                    if (urlJson.url) {
                        mediaData = await downloadMedia(urlJson.url, { Authorization: `Bearer ${creds.accessToken}` });
                    }
                }
            } else if (connection.provider === 'twilio' && pendingMedia.url) {
                // Twilio media URLs might require Basic Auth if configured, but often public in webhook context
                // Using standard fetch for now. If 401, we could add Authorization header.
                const creds = connection.credentials as any;
                const authHeader = 'Basic ' + btoa(`${creds.accountSid}:${creds.authToken}`);
                mediaData = await downloadMedia(pendingMedia.url, { Authorization: authHeader });
            }

            if (mediaData) {
                inlineDataPart = {
                    inlineData: {
                        mimeType: mediaData.mimeType,
                        data: mediaData.data
                    }
                };
            }
        } catch (e) {
            console.error('[Webhook] Failed to download media:', e);
            // Continue without media, model will just see text
        }
    }
    
    // 5. Fetch history using contact_id for efficiency
    const { data: history, error: historyError } = await supabaseAdmin.from('whatsapp_conversations').select('sender, message_content').eq('contact_id', contact.id).order('sent_at', { ascending: false }).limit(10);
    if (historyError) throw historyError;
    const formattedHistory = formatHistoryForGemini(history.reverse());
    
    // 6. Define and check for enabled tools
    const agentTools = agent.tools as { [key: string]: { enabled: boolean } } | null;
    const functionDeclarations: FunctionDeclaration[] = [];
    
    if (personData && agentTools?.get_my_data_for_ai?.enabled) {
        functionDeclarations.push({
            name: 'get_my_data_for_ai',
            description: "Obtiene un resumen de MIS datos como paciente para un día específico (plan comidas, ejercicio, estado plan, etc.).",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    day_offset: {
                        type: Type.INTEGER,
                        description: 'El desplazamiento de días desde hoy. 0 es hoy, 1 mañana, -1 ayer.'
                    }
                },
                required: []
            }
        });
    }

    if (agentTools?.get_available_slots?.enabled) {
        functionDeclarations.push({
            name: 'get_available_slots',
            description: 'Consulta los horarios de citas disponibles para una fecha específica.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    target_date: { type: Type.STRING, description: 'La fecha en formato AAAA-MM-DD.' },
                },
                required: ['target_date'],
            },
        });
    }
    if (agentTools?.book_appointment?.enabled) {
        if (personData) {
            functionDeclarations.push({
                name: 'book_appointment',
                description: 'Agenda una nueva cita para mí (el paciente actual).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        start_time: { type: Type.STRING, description: 'La fecha y hora de inicio en formato ISO 8601.' },
                        notes: { type: Type.STRING, description: 'Notas adicionales.' }
                    },
                    required: ['start_time'],
                },
            });
        } else {
            functionDeclarations.push({
                name: 'book_appointment',
                description: 'Agenda una nueva cita para un paciente. Requiere nombre/folio.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        patient_query: { type: Type.STRING, description: 'El nombre completo o folio del paciente.' },
                        start_time: { type: Type.STRING, description: 'La fecha y hora de inicio en formato ISO 8601.' },
                        notes: { type: Type.STRING, description: 'Notas adicionales.' }
                    },
                    required: ['patient_query', 'start_time'],
                },
            });
        }
    }
    
    // 7. Get knowledge base context if enabled
    let knowledgeBaseContext = "";
    if (agent.use_knowledge_base) {
      const keywords = messageBody.toLowerCase().split(' ').filter(word => word.length > 3);
      if (keywords.length > 0) {
        const titleQuery = keywords.map(kw => `title.ilike.%${kw}%`).join(',');
        const { data: resources, error: resourceError } = await supabaseAdmin.from('knowledge_base_resources').select('title, content').eq('clinic_id', clinicId).or(titleQuery).limit(3);
        if (resourceError) console.warn(`[Webhook] Error querying knowledge base: ${resourceError.message}`);
        else if (resources && resources.length > 0) {
          knowledgeBaseContext = "--- INICIO DE BASE DE CONOCIMIENTO ---\nUtiliza la siguiente información de la base de conocimiento de la clínica como fuente principal para formular tu respuesta. Si la pregunta del usuario no se relaciona con esta información, ignórala.\n\n" +
              resources.map(r => `DOCUMENTO: "${r.title}"\nCONTENIDO: ${r.content}\n---`).join('\n') + "\n--- FIN DE BASE DE CONOCIMIENTO ---";
        }
      }
    }

    let systemInstruction = agent.system_prompt + (knowledgeBaseContext ? `\n\n${knowledgeBaseContext}` : '');
    // Add multimodal instruction
    systemInstruction += `\n\nNOTA: Tienes capacidades multimodales. Si el usuario envía una imagen o audio, analízalo y responde acorde al contexto clínico o administrativo.`;

    if (personData) {
        systemInstruction += `\n\nIMPORTANTE: Estás conversando con un paciente registrado: ${personData.full_name}.
Tu función principal es ayudarle con su plan de salud.
- Para cualquier pregunta sobre su plan de comidas, rutina de ejercicio, estado del plan de servicio o progreso, DEBES usar la herramienta 'get_my_data_for_ai'.
- Para agendar una cita, DEBES usar la herramienta 'book_appointment'.
- Si la pregunta es un saludo o conversación casual (ej. 'Hola'), responde de forma natural y pregunta en qué puedes ayudar.
- Está estrictamente prohibido proporcionar información sobre CUALQUIER otro paciente.`;
    } else {
        systemInstruction += `\n\nEstás conversando con un usuario no registrado. Puedes proporcionar información general sobre la clínica, pero no puedes acceder o proporcionar datos de ningún paciente.`;
    }
    
    // 8. First call to Gemini API (Using updated 2.5 Flash model)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-2.5-flash';

    // Construct user message with optional media
    const userParts: any[] = [{ text: messageBody }];
    if (inlineDataPart) userParts.push(inlineDataPart);

    const firstResponse = await ai.models.generateContent({ 
        model: modelName, 
        contents: [...formattedHistory, { role: 'user', parts: userParts }], 
        config: { 
            systemInstruction: systemInstruction,
            tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
        } 
    });
    
    let agentReplyText = firstResponse.text;

    // 9. Handle function calls
    if (firstResponse.functionCalls && firstResponse.functionCalls.length > 0) {
        const functionResponses = [];

        for (const funcCall of firstResponse.functionCalls) {
            let functionResult;
            try {
                if (funcCall.name === 'get_my_data_for_ai') {
                    if (!personData) {
                        functionResult = { error: 'No se puede usar esta herramienta porque no se ha identificado al paciente.' };
                    } else {
                        const { data, error } = await supabaseAdmin.rpc('get_my_data_for_ai', { p_person_id: personData.id, day_offset: funcCall.args.day_offset || 0 });
                        if (error) throw error;
                        functionResult = { result: data };
                    }
                } else if (funcCall.name === 'get_available_slots') {
                    const { data, error } = await supabaseAdmin.rpc('get_available_slots', { p_clinic_id: clinicId, p_target_date: funcCall.args.target_date });
                    if (error) throw error;
                    functionResult = { result: data || [] };
                } else if (funcCall.name === 'book_appointment') {
                    let rpcParams: any = {
                        p_clinic_id: clinicId,
                        p_start_time: funcCall.args.start_time,
                        p_notes: funcCall.args.notes || null
                    };
                    if (personData) {
                        rpcParams.p_person_id = personData.id;
                    } else if (funcCall.args.patient_query) {
                        rpcParams.p_patient_query = funcCall.args.patient_query;
                    } else {
                        functionResult = { error: 'No se especificó un paciente para agendar la cita.' };
                        functionResponses.push({ name: funcCall.name, response: functionResult });
                        continue;
                    }
                    const { data, error } = await supabaseAdmin.rpc('book_appointment', rpcParams);
                    if (error) throw error;
                    functionResult = { result: data };
                } else {
                    functionResult = { error: `Función desconocida: ${funcCall.name}` };
                }
            } catch (rpcError: any) {
                console.error(`[Webhook] Error executing RPC ${funcCall.name}:`, rpcError);
                functionResult = { error: `Error al ejecutar la función: ${rpcError.message}` };
            }
            functionResponses.push({ id: funcCall.id, name: funcCall.name, response: functionResult });
        }
        
        // 10. Second call to Gemini with function results
        const historyForSecondCall: Content[] = [
            ...formattedHistory,
            { role: 'user', parts: userParts }, // Pass the original parts including image if present
            firstResponse.candidates[0].content,
            {
                role: 'tool',
                parts: functionResponses.map(fr => ({
                    functionResponse: { name: fr.name, response: fr.response }
                }))
            }
        ];

        const secondResponse = await ai.models.generateContent({
            model: modelName,
            contents: historyForSecondCall,
            config: { systemInstruction: systemInstruction }
        });
        agentReplyText = secondResponse.text;
    }

    // 11. Log and send final response
    await supabaseAdmin.from('whatsapp_conversations').insert({ clinic_id: clinicId, contact_id: contact.id, contact_phone_number: userPhoneNumber, message_content: agentReplyText, sender: 'agent' });
    
    const { data: fullConnection } = await supabaseAdmin.from('whatsapp_connections').select('provider, credentials, phone_number').eq('clinic_id', clinicId).single();
    if (!fullConnection) throw new Error("Could not retrieve full connection details.");

    if (fullConnection.provider === 'twilio') {
        const twilioCreds = fullConnection.credentials as { accountSid: string, authToken: string };
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.accountSid}/Messages.json`;
        
        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + btoa(`${twilioCreds.accountSid}:${twilioCreds.authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: `whatsapp:${userPhoneNumber}`, From: `whatsapp:${fullConnection.phone_number}`, Body: agentReplyText }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Twilio API error: ${errorBody.message}`); }

    } else if (fullConnection.provider === 'meta') {
        const metaCreds = fullConnection.credentials as { phoneNumberId: string, accessToken: string };
        const metaUrl = `https://graph.facebook.com/v19.0/${metaCreds.phoneNumberId}/messages`;
        
        const response = await fetch(metaUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${metaCreds.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to: userPhoneNumber, type: "text", text: { body: agentReplyText } }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Meta API error: ${errorBody.error.message}`); }
    }

    res.status(200).send('OK');

  } catch (error: any) {
    console.error('[Whatsapp Webhook] Critical Error:', error);
    return res.status(500).json({ error: 'An internal error occurred.' });
  }
}
