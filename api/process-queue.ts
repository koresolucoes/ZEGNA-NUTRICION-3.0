
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";

// Cliente admin de Supabase, necesario para operaciones del lado del servidor que eluden RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://yjhqvpaxlcjtddjasepb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE || ''
);

// Función auxiliar para formatear el historial de chat para Gemini
const formatHistoryForGemini = (history: any[]): Content[] => {
    return history.map(msg => ({
        role: msg.sender === 'agent' ? 'model' : 'user',
        parts: [{ text: msg.message_content }],
    }));
};

// Función auxiliar para enviar la respuesta por WhatsApp
async function sendWhatsappReply(connectionDetails: any, recipientPhone: string, message: string) {
    if (connectionDetails.provider === 'twilio') {
        const twilioCreds = connectionDetails.credentials as { accountSid: string, authToken: string };
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.accountSid}/Messages.json`;
        
        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + btoa(`${twilioCreds.accountSid}:${twilioCreds.authToken}`), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: `whatsapp:${recipientPhone}`, From: `whatsapp:${connectionDetails.phone_number}`, Body: message }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Error de la API de Twilio: ${errorBody.message}`); }

    } else if (connectionDetails.provider === 'meta') {
        const metaCreds = connectionDetails.credentials as { phoneNumberId: string, accessToken: string };
        const metaUrl = `https://graph.facebook.com/v19.0/${metaCreds.phoneNumberId}/messages`;
        
        const response = await fetch(metaUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${metaCreds.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to: recipientPhone, type: "text", text: { body: message } }),
        });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Error de la API de Meta: ${errorBody.error.message}`); }
    }
}


// Handler principal para el procesador de colas
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // Seguridad: Verificar que la solicitud provenga de una fuente confiable (nuestro cron job o webhook interno)
    const authToken = req.headers.authorization?.split(' ')[1];
    const VERCEL_AUTOMATION_SECRET = process.env.VERCEL_AUTOMATION_SECRET;
    if (VERCEL_AUTOMATION_SECRET && authToken !== VERCEL_AUTOMATION_SECRET) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    const queue = req.body.record;

    try {
        console.log(`[Procesador de Cola] Procesando cola ${queue.id} para el contacto ${queue.contact_id}`);
        const combinedMessage = queue.messages.join('\n');

        const { data: contact, error: contactError } = await supabaseAdmin
            .from('whatsapp_contacts')
            .select('*, persons(*), clinics!inner(*, whatsapp_connections(*), ai_agents(*))')
            .eq('id', queue.contact_id)
            .single();
        
        if (contactError || !contact) {
            console.error(`[Procesador de Cola] No se pudo encontrar el contacto para el ID de cola ${queue.id}. Eliminando cola.`, contactError);
            await supabaseAdmin.from('whatsapp_message_queue').delete().eq('id', queue.id);
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }
        
        const personData = contact.persons;
        const clinicData = (contact as any).clinics;
        const connection = clinicData?.whatsapp_connections?.[0];
        const agent = clinicData?.ai_agents?.[0];
        const clinicId = clinicData?.id;

        const isPlanActive = personData?.subscription_end_date ? new Date(personData.subscription_end_date) >= new Date() : false;
        const shouldAiRespond = agent?.is_active && contact.ai_is_active && (!personData || isPlanActive);

        if (!agent || !shouldAiRespond || !connection) {
            console.log(`[Procesador de Cola] Agente o conexión inactivos para el contacto ${contact.id}. Eliminando cola sin respuesta.`);
            await supabaseAdmin.from('whatsapp_message_queue').delete().eq('id', queue.id);
            return res.status(200).json({ message: 'Agente inactivo, cola limpiada.' });
        }

        // --- Inicio de la Lógica de IA ---
        // UPDATED: Use GEMINI_API_KEY
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
        // Use the user-selected model or fallback
        const modelName = agent.model_name || 'gemini-3-flash-preview';
        
        // INCREASED HISTORY LIMIT FOR MEMORY
        const { data: history, error: historyError } = await supabaseAdmin
            .from('whatsapp_conversations')
            .select('sender, message_content')
            .eq('contact_id', contact.id)
            .order('sent_at', { ascending: false })
            .limit(30);

        if (historyError) throw historyError;
        const formattedHistory = formatHistoryForGemini(history.reverse());
        
        const agentTools = agent.tools as { [key: string]: { enabled: boolean } } | null;
        const functionDeclarations: FunctionDeclaration[] = [];
        
        if (personData && agentTools?.get_my_data_for_ai?.enabled) { functionDeclarations.push({ name: 'get_my_data_for_ai', description: 'Obtiene un resumen de MIS DATOS como paciente para un día específico (plan de comidas, ejercicio, estado del plan).', parameters: { type: Type.OBJECT, properties: { day_offset: { type: Type.INTEGER, description: 'Desfase de días desde hoy. 0=hoy, 1=mañana, -1=ayer. Default 0.' } }, required: [] } }); }
        
        if (personData && agentTools?.get_patient_progress?.enabled) {
            functionDeclarations.push({
                name: 'get_patient_progress',
                description: "Obtiene un análisis histórico del progreso del paciente (peso, IMC, laboratorios, racha). ÚSALO para preguntas como '¿cómo voy?' o '¿he bajado de peso?'.",
                parameters: { type: Type.OBJECT, properties: {}, required: [] }
            });
        }

        if (agentTools?.get_available_slots?.enabled) { functionDeclarations.push({ name: 'get_available_slots', description: 'Consulta los horarios de citas disponibles para una fecha específica.', parameters: { type: Type.OBJECT, properties: { target_date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD.' } }, required: ['target_date'] }, }); }
        if (personData && agentTools?.book_appointment?.enabled) { functionDeclarations.push({ name: 'book_appointment', description: 'Agenda una nueva cita para el paciente actual en un horario específico.', parameters: { type: Type.OBJECT, properties: { start_time: { type: Type.STRING, description: 'Fecha y hora en formato ISO 8601.' }, notes: { type: Type.STRING, description: 'Notas adicionales.' } }, required: ['start_time'] }, }); }
        
        // 7. Get knowledge base context if enabled
        let knowledgeBaseContext = "";
        if (agent.use_knowledge_base) {
            const keywords = combinedMessage.toLowerCase().split(' ').filter(word => word.length > 3);
            if (keywords.length > 0) {
                const titleQuery = keywords.map(kw => `title.ilike.%${kw}%`).join(',');
                const { data: resources, error: resourceError } = await supabaseAdmin.from('knowledge_base_resources').select('title, content').eq('clinic_id', clinicId).or(titleQuery).limit(3);
                if (resourceError) console.warn(`[Procesador de Cola] Error querying knowledge base: ${resourceError.message}`);
                else if (resources && resources.length > 0) {
                    knowledgeBaseContext = "--- INICIO DE BASE DE CONOCIMIENTO ---\nUtiliza la siguiente información de la base de conocimiento de la clínica como fuente principal para formular tu respuesta.\n\n" +
                        resources.map(r => `DOCUMENTO: "${r.title}"\nCONTENIDO: ${r.content}\n---`).join('\n') + "\n--- FIN DE BASE DE CONOCIMIENTO ---";
                }
            }
        }

        // --- TIME CONTEXT INJECTION ---
        const now = new Date();
        const dateOptions: Intl.DateTimeFormatOptions = { 
            timeZone: 'America/Mexico_City', 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        };
        const todayString = now.toLocaleString('es-MX', dateOptions);
        const todayISO = now.toISOString().split('T')[0];
        const currentDayName = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' });

        let systemInstruction = (agent.system_prompt || 'Eres una secretaria virtual.') + (knowledgeBaseContext ? `\n\n${knowledgeBaseContext}` : '');
        
        // Add Memory and Time Instructions
        systemInstruction += `\n\n=== CONTEXTO TEMPORAL OBLIGATORIO ===
        - FECHA Y HORA ACTUAL: ${todayString} (Zona Horaria: CDMX/México).
        - DÍA DE LA SEMANA: ${currentDayName}.
        - FECHA ISO: ${todayISO}.
        
        INSTRUCCIÓN CRÍTICA: Si el usuario pregunta "¿qué día es hoy?", "¿qué hora es?" o hace referencia a "mañana/ayer", DEBES usar EXCLUSIVAMENTE la información de "FECHA Y HORA ACTUAL" proporcionada arriba.
        
        INSTRUCCIONES DE MEMORIA Y CONTEXTO:
        - Tienes acceso al historial reciente de la conversación. ÚSALO.
        - Si el usuario hace referencia a algo dicho anteriormente (ej. "hazlo", "sí", "gracias"), revisa el historial para entender el contexto.
        - Mantén una conversación fluida y natural.`;

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
                `- ${new Date(appt.start_time).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' })}: ${appt.title}`
            ).join('\n') || 'No hay citas próximas programadas.';

            systemInstruction += `\n\nIMPORTANTE: Estás conversando con un paciente registrado: ${personData.full_name}.
            
            ⚠️ **ALERTA DE SEGURIDAD CLÍNICA - CONTEXTO DEL PACIENTE** ⚠️
            - ALERGIAS/INTOLERANCIAS: ${allergiesList}
            - CONDICIONES MÉDICAS: ${conditionsList}
            - PREFERENCIAS/HÁBITOS: ${preferences || 'Sin datos'}
            - OBJETIVO DE SALUD: ${personData.health_goal || 'No especificado'}
            
            📅 **PRÓXIMAS CITAS PROGRAMADAS**:
            ${appointmentsList}

            **INSTRUCCIONES CRÍTICAS:**
            1. ANTES de sugerir cualquier alimento o receta, VERIFICA las alergias e intolerancias listadas arriba. NUNCA sugieras algo que contenga un alérgeno del paciente.
            2. Si el usuario pregunta sobre una dieta o ejercicio, considera sus condiciones médicas.
            3. Si no estás seguro si un alimento es seguro, advierte al paciente.
            4. Si el paciente pregunta "¿Cuándo es mi cita?" o "¿Tengo cita?", consulta la lista de "PRÓXIMAS CITAS PROGRAMADAS" provista arriba.

            Tu función principal es ayudarle con su plan de salud.
            - Para cualquier pregunta sobre su plan de comidas ESPECÍFICO DEL DÍA, rutina de ejercicio, estado del plan de servicio, DEBES usar la herramienta 'get_my_data_for_ai'.
            - Para preguntas sobre PROGRESO, peso, historia o cambios a lo largo del tiempo, DEBES usar la herramienta 'get_patient_progress'.
            - Para agendar una NUEVA cita, DEBES usar la herramienta 'book_appointment'.`;
        } else {
            systemInstruction += `\n\nEstás conversando con un usuario no registrado. Puedes proporcionar información general sobre la clínica, pero no puedes acceder o proporcionar datos de ningún paciente.`;
        }
        
        let currentMessages = [...formattedHistory, { role: 'user' as const, parts: [{ text: combinedMessage }] }];
        
        while (true) {
            const response = await ai.models.generateContent({ model: modelName, contents: currentMessages, config: { systemInstruction, tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined } });
            
            const candidate = response.candidates[0];
            currentMessages.push(candidate.content);

            const functionCalls = candidate.content.parts.filter(part => part.functionCall).map(part => part.functionCall);
            if (functionCalls.length === 0) break;
            
            const functionResponses: any[] = [];
            for (const funcCall of functionCalls) {
                let functionResult;
                try {
                    if (!personData) { functionResult = { error: 'No puedo usar herramientas porque no estás registrado.'}; }
                    else if (funcCall.name === 'get_my_data_for_ai') { const { data, error } = await supabaseAdmin.rpc('get_my_data_for_ai', { p_person_id: personData.id, day_offset: funcCall.args.day_offset || 0 }); if (error) throw error; functionResult = { result: data }; }
                    else if (funcCall.name === 'get_patient_progress') { const { data, error } = await supabaseAdmin.rpc('get_patient_progress', { p_person_id: personData.id }); if (error) throw error; functionResult = { result: data }; }
                    else if (funcCall.name === 'get_available_slots') { const { data, error } = await supabaseAdmin.rpc('get_available_slots', { p_clinic_id: clinicId, p_target_date: funcCall.args.target_date }); if (error) throw error; functionResult = { result: data || [] }; }
                    else if (funcCall.name === 'book_appointment') { const { data, error } = await supabaseAdmin.rpc('book_appointment', { p_clinic_id: clinicId, p_person_id: personData.id, p_start_time: funcCall.args.start_time, p_notes: funcCall.args.notes || null }); if (error) throw error; functionResult = { result: data }; }
                    else { functionResult = { error: `Función desconocida: ${funcCall.name}` }; }
                } catch (rpcError: any) { functionResult = { error: `Error al ejecutar la función: ${rpcError.message}` }; }
                functionResponses.push({ name: funcCall.name, response: functionResult });
            }
            currentMessages.push({ role: 'tool', parts: functionResponses.map(fr => ({ functionResponse: { name: fr.name, response: fr.response } })) });
        }

        const agentReplyText = currentMessages[currentMessages.length - 1].parts.map(p => p.text).join('') || "No pude procesar la respuesta.";

        await supabaseAdmin.from('whatsapp_conversations').insert({ clinic_id: clinicId, contact_id: contact.id, contact_phone_number: contact.phone_number, message_content: agentReplyText, sender: 'agent' });
        await sendWhatsappReply(connection, contact.phone_number, agentReplyText);
        
        await supabaseAdmin.from('whatsapp_message_queue').delete().eq('id', queue.id);
        console.log(`[Procesador de Cola] Procesamiento de cola ${queue.id} finalizado.`);
        
        res.status(200).json({ success: true, message: `Cola ${queue.id} procesada.` });

    } catch (error: any) {
        console.error(`[Procesador de Cola] Error crítico al procesar la cola ${queue.id}:`, error);
        // Intentar eliminar la cola para evitar bucles de error
        await supabaseAdmin.from('whatsapp_message_queue').delete().eq('id', queue.id);
        res.status(500).json({ error: error.message });
    }
}
