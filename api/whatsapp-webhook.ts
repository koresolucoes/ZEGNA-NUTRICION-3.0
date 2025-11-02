




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

    if (req.body.object === 'whatsapp_business_account') {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message || message.type !== 'text') return res.status(200).send('OK');
        clinicPhoneNumber = req.body.entry[0].changes[0].value.metadata.display_phone_number;
        userPhoneNumber = message.from;
        messageBody = message.text?.body;
    } else {
        clinicPhoneNumber = req.body.To?.replace('whatsapp:', '');
        userPhoneNumber = req.body.From?.replace('whatsapp:', '');
        messageBody = req.body.Body;
    }

    if (!clinicPhoneNumber || !userPhoneNumber || !messageBody) {
        return res.status(400).json({ error: 'Invalid webhook format or empty message body.' });
    }

    const normalizedClinicPhone = normalizePhoneNumber(clinicPhoneNumber);
    const { data: connection, error: connError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('clinic_id')
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
        .eq('normalized_phone_number', normalizedUserPhone) // Use the new normalized column for robust matching
        .single();

    if (personError && personError.code !== 'PGRST116') { // We only throw if it's not a "no rows found" error
        throw personError;
    }

    // 2. Upsert the contact, linking the person record if found
    const { data: contact, error: contactError } = await supabaseAdmin
        .from('whatsapp_contacts')
        .upsert({
            clinic_id: clinicId,
            phone_number: userPhoneNumber, // Store the original number from the provider
            last_message_at: new Date().toISOString(),
            person_id: personData?.id || null,
            person_name: personData?.full_name || null,
        }, { onConflict: 'clinic_id, phone_number', ignoreDuplicates: false })
        .select('id, ai_is_active')
        .single();

    if (contactError) throw contactError;

    // 3. Log user's message
    await supabaseAdmin.from('whatsapp_conversations').insert({ 
        clinic_id: clinicId, 
        contact_id: contact.id, 
        contact_phone_number: userPhoneNumber, 
        message_content: messageBody, 
        sender: 'user' 
    });

    // 4. Check if AI agent should respond
    // FIX: Changed supabase to supabaseAdmin
    const { data: agent, error: agentError } = await supabaseAdmin.from('ai_agents').select('*').eq('clinic_id', clinicId).single();
    
    // Check if the associated person (if any) has an active plan
    const isPlanActive = personData?.subscription_end_date ? new Date(personData.subscription_end_date) >= new Date() : false;

    // AI is active if: clinic agent is on, contact AI is on, AND (it's a new contact OR the patient's plan is active)
    const shouldAiRespond = agent?.is_active && contact.ai_is_active && (!personData || isPlanActive);
    
    if (agentError || !agent || !shouldAiRespond) {
      if (!shouldAiRespond && personData && !isPlanActive) {
          console.log(`[Webhook] AI disabled for contact ${userPhoneNumber} because their plan is inactive.`);
      } else {
          console.log(`[Webhook] Agent for clinic ${clinicId} or contact ${userPhoneNumber} is inactive. Ignoring message.`);
      }
      return res.status(200).send('Agent inactive for this conversation.');
    }
    
    // 5. Fetch history using contact_id for efficiency
    // FIX: Changed supabase to supabaseAdmin
    const { data: history, error: historyError } = await supabaseAdmin.from('whatsapp_conversations').select('sender, message_content').eq('contact_id', contact.id).order('sent_at', { ascending: false }).limit(10);
    if (historyError) throw historyError;
    const formattedHistory = formatHistoryForGemini(history.reverse());
    
    // 6. Define and check for enabled tools
    const agentTools = agent.tools as { [key: string]: { enabled: boolean } } | null;
    const functionDeclarations: FunctionDeclaration[] = [];
    
    if (personData && agentTools?.get_my_data_for_ai?.enabled) {
        functionDeclarations.push({
            name: 'get_my_data_for_ai',
            description: "Obtém um resumo dos MEUS dados como paciente para um dia específico. Use-o para responder a qualquer pergunta sobre meu plano de alimentação, rotina de exercícios, status do meu plano de serviço, progresso recente ou meus últimos resultados de laboratório.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    day_offset: {
                        type: Type.INTEGER,
                        description: 'O deslocamento de dias a partir de hoje. 0 é para hoje, 1 para amanhã, -1 para ontem. O padrão é 0 (hoje).'
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
                    target_date: {
                        type: Type.STRING,
                        description: 'La fecha para la cual se quieren consultar los horarios, en formato AAAA-MM-DD.',
                    },
                },
                required: ['target_date'],
            },
        });
    }
    if (agentTools?.book_appointment?.enabled) {
        if (personData) {
            // Known user tool
            functionDeclarations.push({
                name: 'book_appointment',
                description: 'Agenda una nueva cita para mí (el paciente actual) en un horario específico.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        start_time: { type: Type.STRING, description: 'La fecha y hora de inicio de la cita en formato ISO 8601 (ej. "2024-10-28T10:00:00-06:00").' },
                        notes: { type: Type.STRING, description: 'Notas adicionales o el motivo de la cita (opcional).' }
                    },
                    required: ['start_time'],
                },
            });
        } else {
            // Unknown user tool
            functionDeclarations.push({
                name: 'book_appointment',
                description: 'Agenda una nueva cita para un paciente en un horario específico. Requer o nome ou folio do paciente.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        patient_query: { type: Type.STRING, description: 'El nombre completo o folio del paciente.' },
                        start_time: { type: Type.STRING, description: 'La fecha y hora de inicio de la cita en formato ISO 8601.' },
                        notes: { type: Type.STRING, description: 'Notas adicionales (opcional).' }
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
    if (personData) {
        systemInstruction += `\n\nIMPORTANTE: Estás conversando con un paciente registrado: ${personData.full_name}.
Tu función principal es ayudarle con su plan de salud.
- Para cualquier pregunta sobre su plan de comidas, rutina de ejercicio, estado del plan de servicio o progreso, DEBES usar la herramienta 'get_my_data_for_ai'.
- Para agendar una cita, DEBES usar la herramienta 'book_appointment'.
- Si la pregunta es un saludo o conversación casual (ej. 'Hola'), responde de forma natural y pregunta en qué puedes ayudar.
- Está estrictamente prohibido proporcionar información sobre CUALQUIER otro paciente.
- Si la pregunta es sobre un tema no relacionado (ej. política, deportes), rehúsa educadamente diciendo que tu enfoque es ayudar con su plan de salud.`;
    } else {
        systemInstruction += `\n\nEstás conversando con un usuario no registrado. Puedes proporcionar información general sobre la clínica, pero no puedes acceder o proporcionar datos de ningún paciente.`;
    }
    
    // 8. First call to Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const firstResponse = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash', 
        contents: [...formattedHistory, { role: 'user', parts: [{ text: messageBody }] }], 
        config: { 
            systemInstruction: systemInstruction,
            tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
        } 
    });
    
    let agentReplyText = firstResponse.text; // Default reply if no tool is called

    // 9. Handle function calls if any
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
                        // If we know the person, pass their ID directly.
                        rpcParams.p_person_id = personData.id;
                    } else if (funcCall.args.patient_query) {
                        // If we don't know the person, use the query from the AI.
                        rpcParams.p_patient_query = funcCall.args.patient_query;
                    } else {
                        // If we don't know the person and the AI didn't provide a query, it's an error.
                        functionResult = { error: 'No se especificó un paciente para agendar la cita y no se pudo identificar al usuario actual.' };
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

            functionResponses.push({
                id: funcCall.id,
                name: funcCall.name,
                response: functionResult
            });
        }
        
        // 10. Second call to Gemini with the function results
        const historyForSecondCall: Content[] = [
            ...formattedHistory,
            { role: 'user', parts: [{ text: messageBody }] },
            // This is the model's turn, asking to call the functions.
            firstResponse.candidates[0].content,
            // This is the tool's turn, providing the function results.
            {
                role: 'tool',
                parts: functionResponses.map(fr => ({
                    functionResponse: {
                        name: fr.name,
                        response: fr.response
                    }
                }))
            }
        ];

        const secondResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: historyForSecondCall,
            config: { systemInstruction: systemInstruction }
        });
        agentReplyText = secondResponse.text;
    }

    // 11. Log and send the final response
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