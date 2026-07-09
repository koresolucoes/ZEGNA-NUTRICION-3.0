
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

// Helper to map Gemini model names to OpenRouter equivalents
const mapModelToOpenRouter = (modelName: string): string => {
  if (!modelName) return 'google/gemini-2.5-flash-lite';
  if (modelName.includes('/')) return modelName;
  
  switch (modelName) {
    case 'gemini-3.1-flash-lite':
    case 'gemini-3-flash-preview':
    case 'gemini-2.5-flash-lite':
    case 'gemini-1.5-flash-lite':
    case 'gemini-flash-lite':
      return 'google/gemini-2.5-flash-lite';
    case 'gemini-3.1-flash':
    case 'gemini-2.5-flash':
    case 'gemini-1.5-flash':
    case 'gemini-flash-latest':
      return 'google/gemini-2.5-flash';
    case 'gemini-3.1-pro-preview':
    case 'gemini-2.5-pro':
    case 'gemini-1.5-pro':
    case 'gemini-pro':
      return 'google/gemini-2.5-pro';
    default:
      return 'google/gemini-2.5-flash-lite';
  }
};

// Helper to convert Gemini Content history to OpenRouter (OpenAI-compatible) Messages
const convertGeminiHistoryToOpenAi = (contents: Content[]): any[] => {
  const messages: any[] = [];
  const lastToolCallIdByName: { [key: string]: string } = {};

  for (const item of contents) {
    const role = item.role === 'model' ? 'assistant' : (item.role === 'tool' ? 'tool' : 'user');
    
    if (role === 'tool') {
      const parts = item.parts || [];
      for (const part of parts) {
        if (part.functionResponse) {
          const name = part.functionResponse.name;
          const contentStr = JSON.stringify(part.functionResponse.response);
          const toolCallId = lastToolCallIdByName[name] || `call_${Math.random().toString(36).substring(2, 11)}`;
          
          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: name,
            content: contentStr
          });
        }
      }
    } else {
      const parts = item.parts || [];
      const textParts = parts.filter(p => typeof p.text === 'string').map(p => p.text);
      const combinedText = textParts.join('\n') || null;

      const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);

      if (functionCalls.length > 0) {
        const toolCalls = functionCalls.map((fc, idx) => {
          const toolCallId = fc.id || `call_${Math.random().toString(36).substring(2, 11)}_${idx}`;
          lastToolCallIdByName[fc.name] = toolCallId;
          return {
            id: toolCallId,
            type: 'function',
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.args || {})
            }
          };
        });

        messages.push({
          role: 'assistant',
          content: combinedText,
          tool_calls: toolCalls
        });
      } else {
        const hasMedia = parts.some(p => p.inlineData || p.fileData || (p as any).image_url);
        if (hasMedia) {
          const contentArray: any[] = [];
          for (const p of parts) {
            if (typeof p.text === 'string') {
              contentArray.push({ type: 'text', text: p.text });
            } else if (p.inlineData) {
              const mimeType = p.inlineData.mimeType || 'image/jpeg';
              contentArray.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${p.inlineData.data}`
                }
              });
            }
          }
          messages.push({ role, content: contentArray });
        } else {
          messages.push({ role, content: combinedText || '' });
        }
      }
    }
  }
  
  return messages;
};

// Unified AI content generator that utilizes OpenRouter or falls back to GoogleGenAI
const generateAiContent = async ({
  model,
  contents,
  config,
  clinicId,
  reqReferer
}: {
  model: string;
  contents: Content[];
  config?: any;
  clinicId: string;
  reqReferer?: string;
}): Promise<{
  text: string;
  functionCalls?: any[];
  candidates: any[];
}> => {
  // Try to retrieve AI configurations
  let agent: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('ai_agents')
      .select('provider_api_key, model_name')
      .eq('clinic_id', clinicId)
      .single();
    agent = data;
  } catch (err) {
    console.warn('[AI Client] Could not fetch clinic agent profile:', err);
  }

  const openRouterKey = (process.env.OPENROUTER_API_KEY || agent?.provider_api_key)?.trim();

  if (openRouterKey) {
    console.log(`[AI Client] Routing request via OpenRouter for clinic ${clinicId}`);
    
    const openRouterModel = process.env.OPENROUTER_MODEL || mapModelToOpenRouter(model);
    
    // Format tools/function calling schemas if present
    const tools = config?.tools?.[0]?.functionDeclarations ? config.tools[0].functionDeclarations.map((fd: any) => ({
      type: 'function',
      function: {
        name: fd.name,
        description: fd.description,
        parameters: fd.parameters
      }
    })) : undefined;

    // Convert Gemini messages to OpenAI-compatible messages
    let messages = convertGeminiHistoryToOpenAi(contents);
    
    // Handle systemInstructions
    if (config?.systemInstruction) {
      let sysText = '';
      if (typeof config.systemInstruction === 'string') {
        sysText = config.systemInstruction;
      } else if (config.systemInstruction.parts) {
        sysText = config.systemInstruction.parts.map((p: any) => p.text || '').join('\n');
      }
      if (sysText) {
        messages = [{ role: 'system', content: sysText }, ...messages];
      }
    }

    const referer = reqReferer || 'https://openrouter.ai';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': referer,
        'X-Title': 'Clinic AI Ecosystem'
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messages,
        tools: tools,
        temperature: config?.temperature !== undefined ? config.temperature : 0.7,
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API call failed: ${errText}`);
    }

    const resData = await res.json();
    const responseMessage = resData.choices?.[0]?.message;
    const text = responseMessage?.content || '';
    
    const toolCalls = responseMessage?.tool_calls;
    const functionCalls = toolCalls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}')
    }));

    return {
      text: text,
      functionCalls: functionCalls || [],
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              ...(text ? [{ text }] : []),
              ...(functionCalls ? functionCalls.map((fc: any) => ({ functionCall: fc })) : [])
            ]
          }
        }
      ]
    };
  } else {
    console.log(`[AI Client] Falling back to standard GoogleGenAI for clinic ${clinicId}`);
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "Referer": reqReferer || ""
        }
      }
    });
    
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config
    });

    return {
      text: response.text || '',
      functionCalls: response.functionCalls || [],
      candidates: response.candidates || []
    };
  }
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

// Helper to convert base64 to Uint8Array (replaces Buffer.from for compatibility)
const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
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
  // Ensure we have at least one valid AI provider key
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error('Server configuration error: Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is set.');
    return res.status(500).json({ error: 'Internal server configuration error: AI provider key is not configured.' });
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
            messageBody = message.image.caption || "Imagen enviada";
            pendingMedia = { id: message.image.id, type: 'image', mimeType: message.image.mime_type };
        } else if (message.type === 'audio') {
            messageBody = "Audio enviado";
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
                messageBody = messageBody || "Imagen enviada";
                pendingMedia = { url: mediaUrl, type: 'image', mimeType: mediaType };
            } else if (mediaType.startsWith('audio/')) {
                messageBody = messageBody || "Audio enviado";
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
        .select('id, full_name, subscription_end_date, health_goal, birth_date')
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

    // --- PROCESS MEDIA (Download & Upload to Supabase) ---
    let storedMediaUrl = null;
    let messageType = 'text';
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
                const creds = connection.credentials as any;
                const authHeader = 'Basic ' + btoa(`${creds.accountSid}:${creds.authToken}`);
                mediaData = await downloadMedia(pendingMedia.url, { Authorization: authHeader });
            }

            if (mediaData) {
                // Prepare for Gemini
                inlineDataPart = {
                    inlineData: {
                        mimeType: mediaData.mimeType,
                        data: mediaData.data
                    }
                };

                // Upload to Supabase Storage for persistent chat history
                const fileExt = mediaData.mimeType.split('/')[1] || 'bin';
                const fileName = `${clinicId}/${contact.id}/${Date.now()}.${fileExt}`;
                const fileData = base64ToUint8Array(mediaData.data);
                
                const { error: uploadError } = await supabaseAdmin.storage
                    .from('chat-media')
                    .upload(fileName, fileData, { 
                        contentType: mediaData.mimeType,
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabaseAdmin.storage
                        .from('chat-media')
                        .getPublicUrl(fileName);
                    
                    storedMediaUrl = publicUrlData.publicUrl;
                    messageType = pendingMedia.type;
                } else {
                    console.error('[Webhook] Failed to upload media to Supabase:', uploadError);
                }
            }
        } catch (e) {
            console.error('[Webhook] Failed to process media:', e);
        }
    }

    // 3. Fetch history BEFORE inserting the new message to avoid duplicates
    const { data: history, error: historyError } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('sender, message_content')
        .eq('contact_id', contact.id)
        .order('sent_at', { ascending: false })
        .limit(40); 

    if (historyError) throw historyError;
    
    // Helper to merge consecutive messages of the same role
    const rawHistory = history.reverse();
    const mergedHistory: any[] = [];
    for (const msg of rawHistory) {
        const role = msg.sender === 'agent' ? 'model' : 'user';
        if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === role) {
            mergedHistory[mergedHistory.length - 1].parts[0].text += `\n\n${msg.message_content}`;
        } else {
            mergedHistory.push({ role, parts: [{ text: msg.message_content }] });
        }
    }

    // 4. Log user's message (with media URL if available)
    await supabaseAdmin.from('whatsapp_conversations').insert({ 
        clinic_id: clinicId, 
        contact_id: contact.id, 
        contact_phone_number: userPhoneNumber, 
        message_content: messageBody, 
        sender: 'user',
        message_type: messageType,
        media_url: storedMediaUrl,
        mime_type: pendingMedia?.mimeType
    });

    // 5. Check if AI agent should respond
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
    
    // 6. Define and check for enabled tools
    const agentTools = agent.tools as { [key: string]: { enabled: boolean } } | null;
    const functionDeclarations: FunctionDeclaration[] = [];
    
    if (personData && agentTools?.get_my_data_for_ai?.enabled) {
        functionDeclarations.push({
            name: 'get_my_data_for_ai',
            description: "Obtiene un resumen del plan y actividades del paciente para un día específico (comidas, ejercicio, estado plan). Útil para 'qué me toca hoy' o 'qué comí ayer'.",
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
    
    if (personData && agentTools?.get_patient_progress?.enabled) {
        functionDeclarations.push({
            name: 'get_patient_progress',
            description: "Obtiene un análisis histórico del progreso del paciente (peso, IMC, laboratorios, racha). ÚSALO cuando el paciente pregunte 'cómo voy', 'he bajado de peso', 'mi progreso' o comparaciones en el tiempo.",
            parameters: {
                type: Type.OBJECT,
                properties: {},
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

    // FETCH CLINIC AND NUTRITIONIST DATA
    const { data: clinicInfo } = await supabaseAdmin.from('clinics').select('*').eq('id', clinicId).single();
    let nutritionistInfo = null;
    if (clinicInfo?.owner_id) {
        const { data: nutInfo } = await supabaseAdmin.from('nutritionist_profiles').select('*').eq('user_id', clinicInfo.owner_id).single();
        nutritionistInfo = nutInfo;
    }

    // --- TIME CONTEXT INJECTION ---
    const now = new Date();
    const clinicTimezone = clinicInfo?.timezone || 'America/Mexico_City';
    const dateOptions: Intl.DateTimeFormatOptions = { 
        timeZone: clinicTimezone, 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    const todayString = now.toLocaleString('es-MX', dateOptions);
    const todayISO = now.toLocaleString('sv', { timeZone: clinicTimezone }).split(' ')[0];
    const currentDayName = now.toLocaleDateString('es-MX', { timeZone: clinicTimezone, weekday: 'long' });

    let systemInstruction = agent.system_prompt + (knowledgeBaseContext ? `\n\n${knowledgeBaseContext}` : '');
    
    // Añadir información de la clínica y el nutriólogo
    systemInstruction += `\n\n=== INFORMACIÓN DE LA CLÍNICA Y NUTRIÓLOGO ===
    - Clínica: ${clinicInfo?.name || 'No especificada'}
    - Dirección: ${clinicInfo?.address || 'No especificada'}
    - Teléfono: ${clinicInfo?.phone_number || 'No especificado'}
    - Email: ${clinicInfo?.email || 'No especificado'}
    - Horario: ${clinicInfo?.operating_hours_start || 'No especificado'} a ${clinicInfo?.operating_hours_end || 'No especificado'}
    - Nutriólogo(a) Titular: ${nutritionistInfo?.full_name || 'No especificado'} ${nutritionistInfo?.professional_title ? `(${nutritionistInfo.professional_title})` : ''}
    - Cédula Profesional: ${nutritionistInfo?.license_number || 'No especificada'}
    
    INSTRUCCIÓN: Si el paciente pregunta por los datos de contacto de la clínica, la dirección, los horarios o el nombre de su nutriólogo, utiliza esta información para responder de forma natural y servicial.`;

    // Añadir instrucciones explícitas de memoria, multimodalidad y contexto temporal
    systemInstruction += `\n\n=== CONTEXTO TEMPORAL OBLIGATORIO ===
    - FECHA Y HORA ACTUAL: ${todayString} (Zona Horaria: ${clinicTimezone}).
    - DÍA DE LA SEMANA: ${currentDayName}.
    - FECHA ISO: ${todayISO}.
    
    INSTRUCCIÓN CRÍTICA: Si el usuario pregunta "¿qué día es hoy?", "¿qué hora es?" o hace referencia a "mañana/ayer", DEBES usar EXCLUSIVAMENTE la información de "FECHA Y HORA ACTUAL" proporcionada arriba. Ignora cualquier fecha interna de tu entrenamiento.
    
    INSTRUCCIONES DE MEMORIA Y CONTEXTO:
    - Tienes acceso al historial de la conversación. ÚSALO.
    - Si el usuario dice "sí", "hazlo", "gracias" o hace referencias a mensajes anteriores, revisa el historial para entender el contexto.
    - Mantén el hilo de la conversación de forma natural y fluida.
    - Tienes capacidades multimodales. Si el usuario envía una imagen o audio, analízalo y responde acorde al contexto clínico o administrativo.`;

    if (personData) {
        // FETCH CRITICAL CLINICAL CONTEXT AND APPOINTMENTS
        const [allergiesRes, historyRes, lifestyleRes, appointmentsRes] = await Promise.all([
            supabaseAdmin.from('allergies_intolerances').select('substance, severity').eq('person_id', personData.id),
            supabaseAdmin.from('medical_history').select('condition').eq('person_id', personData.id),
            supabaseAdmin.from('lifestyle_habits').select('*').eq('person_id', personData.id).single(),
            supabaseAdmin.from('appointments')
                .select('start_time, title')
                .eq('person_id', personData.id)
                .eq('status', 'scheduled')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(3)
        ]);

        const allergiesList = allergiesRes.data?.map(a => `${a.substance} (${a.severity || 'Moderada'})`).join(', ') || 'Ninguna registrada';
        const conditionsList = historyRes.data?.map(h => h.condition).join(', ') || 'Ninguna registrada';
        const habits = lifestyleRes.data || {};
        const preferences = [
            habits.smokes ? 'Fumador' : null,
            habits.alcohol_frequency ? `Alcohol: ${habits.alcohol_frequency}` : null
        ].filter(Boolean).join(', ');
        
        const appointmentsList = appointmentsRes.data?.map(appt => 
            `- ${new Date(appt.start_time).toLocaleString('es-MX', { timeZone: clinicTimezone, dateStyle: 'medium', timeStyle: 'short' })}: ${appt.title}`
        ).join('\n') || 'No hay citas próximas programadas.';

        systemInstruction += `\n\n=== PERFIL DEL PACIENTE ACTUAL ===
        Nombre: ${personData.full_name}
        
        ⚠️ **ALERTA DE SEGURIDAD CLÍNICA - CONTEXTO DEL PACIENTE** ⚠️
        - ALERGIAS/INTOLERANCIAS: ${allergiesList}
        - CONDICIONES MÉDICAS: ${conditionsList}
        - PREFERENCIAS/HÁBITOS: ${preferences || 'Sin datos'}
        - OBJETIVO DE SALUD: ${personData.health_goal || 'No especificado'}
        
        📅 **PRÓXIMAS CITAS PROGRAMADAS**:
        ${appointmentsList}

        🛑 **REGLAS DE ORO: APEGO 100% AL PLAN Y SEGURIDAD** 🛑
        1. **APEGO ESTRICTO:** DEBES apegarte 100% al plan de alimentación y a las porciones EXACTAS que devuelve la herramienta 'get_my_data_for_ai'. 
        2. **CERO INVENTOS:** BAJO NINGUNA CIRCUNSTANCIA debes inventar, sugerir, agregar o modificar porciones, alimentos o equivalentes que no estén explícitamente en el plan del paciente.
        3. **FUERA DEL PLAN:** Si el paciente te pide comer algo fuera del plan (ej. "¿puedo comer pizza?", "¿puedo cambiar X por Y?"), indícale amablemente pero con firmeza que tu deber es mantener su seguridad y apego al plan nutricional establecido por su nutriólogo, y no puedes autorizar alimentos o porciones fuera de lo indicado.
        4. **SEGURIDAD CLÍNICA:** Nunca des diagnósticos médicos, no recetes medicamentos, y respeta estrictamente las alergias e intolerancias listadas arriba. NUNCA sugieras algo que contenga un alérgeno del paciente.
        5. **PRIVACIDAD:** Está estrictamente prohibido proporcionar información sobre CUALQUIER otro paciente.

        **INSTRUCCIONES DE HERRAMIENTAS:**
        - Para cualquier pregunta sobre su plan de comidas ESPECÍFICO DEL DÍA, porciones, rutina de ejercicio, DEBES usar la herramienta 'get_my_data_for_ai'. Lee cuidadosamente la respuesta de la herramienta y repite las porciones exactamente como vienen ahí.
        - Para preguntas sobre PROGRESO, peso, historia o cambios a lo largo del tiempo, DEBES usar la herramienta 'get_patient_progress'.
        - Para agendar una NUEVA cita, DEBES usar la herramienta 'book_appointment'.
        - Si la pregunta es un saludo o conversación casual (ej. 'Hola'), responde de forma natural y pregunta en qué puedes ayudar.`;
    } else {
        systemInstruction += `\n\nEstás conversando con un usuario no registrado. Puedes proporcionar información general sobre la clínica, pero no puedes acceder o proporcionar datos de ningún paciente.`;
    }
    
    // 8. First call to AI (OpenRouter with Gemini SDK fallback)
    const referer = req.headers.referer || req.headers.origin || `https://${req.headers.host}`;
    // Use the user-selected model or fallback to the most secure/capable model for adherence
    const modelName = agent.model_name || 'gemini-3.1-pro-preview';

    // Construct user message with optional media
    const userParts: any[] = [{ text: messageBody }];
    if (inlineDataPart) userParts.push(inlineDataPart);

    // Ensure alternating roles: if the last message in history is 'user', merge the new message into it
    let finalContents: Content[] = [...mergedHistory];
    if (finalContents.length > 0 && finalContents[finalContents.length - 1].role === 'user') {
        finalContents[finalContents.length - 1].parts.push(...userParts);
    } else {
        finalContents.push({ role: 'user', parts: userParts });
    }

    const firstResponse = await generateAiContent({ 
        model: modelName, 
        contents: finalContents, 
        config: { 
            systemInstruction: systemInstruction,
            tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
        },
        clinicId: clinicId,
        reqReferer: referer
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
                } else if (funcCall.name === 'get_patient_progress') {
                    if (!personData) {
                        functionResult = { error: 'No se puede usar esta herramienta porque no se ha identificado al paciente.' };
                    } else {
                        const { data, error } = await supabaseAdmin.rpc('get_patient_progress', { p_person_id: personData.id });
                        if (error) throw error;
                        functionResult = { result: data };
                    }
                } else if (funcCall.name === 'get_available_slots') {
                    const { data, error } = await supabaseAdmin.rpc('get_available_slots', { p_clinic_id: clinicId, p_target_date: funcCall.args.target_date, p_timezone: clinicTimezone });
                    if (error) throw error;
                    functionResult = { result: data || [] };
                } else if (funcCall.name === 'book_appointment') {
                    // Gemini returns start_time in ISO format based on the timezone we gave it.
                    // If the clinic is in Mazatlan (UTC-7), and the user asks for 15:00,
                    // Gemini might return "2026-03-10T15:00:00.000-07:00" or just "2026-03-10T15:00:00".
                    // We need to ensure it's correctly interpreted as the clinic's local time before saving.
                    let startTimeISO = funcCall.args.start_time;
                    
                    // If Gemini returns a naive datetime (no timezone offset), append the clinic's offset
                    // or parse it in the clinic's timezone to get the correct UTC time for the database.
                    // A simple way is to let the DB handle it if we pass the correct offset, 
                    // but since we only have the IANA timezone name (e.g., 'America/Mazatlan'), 
                    // we can use Intl.DateTimeFormat to find the current offset, or just pass the timezone name to the RPC.
                    // For now, we'll pass the timezone name to the RPC so the database can handle the conversion correctly.
                    
                    let rpcParams: any = {
                        p_clinic_id: clinicId,
                        p_start_time: startTimeISO,
                        p_notes: funcCall.args.notes || null,
                        p_timezone: clinicTimezone // Pass timezone to RPC
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
        
        // 10. Second call to AI with function results
        const historyForSecondCall: Content[] = [
            ...finalContents,
            firstResponse.candidates[0].content,
            {
                role: 'tool',
                parts: functionResponses.map(fr => ({
                    functionResponse: { name: fr.name, response: fr.response }
                }))
            }
        ];

        const secondResponse = await generateAiContent({
            model: modelName,
            contents: historyForSecondCall,
            config: { systemInstruction: systemInstruction },
            clinicId: clinicId,
            reqReferer: referer
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
