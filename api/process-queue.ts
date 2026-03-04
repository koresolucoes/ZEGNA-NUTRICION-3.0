
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

    // Seguridad: Verificar que la solicitud provenga de una fuente confiable (nuestro cron job)
    const authToken = req.headers.authorization?.split(' ')[1];
    const VERCEL_AUTOMATION_SECRET = process.env.VERCEL_AUTOMATION_SECRET;
    if (!VERCEL_AUTOMATION_SECRET || authToken !== VERCEL_AUTOMATION_SECRET) {
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
        
        let systemInstruction = (agent.system_prompt || 'Eres una secretaria virtual.');
        
        // Add Memory Instructions
        systemInstruction += `\n\nMEMORIA Y CONTEXTO:
        - Tienes acceso al historial reciente de la conversación. ÚSALO.
        - Si el usuario hace referencia a algo dicho anteriormente (ej. "hazlo", "sí", "gracias"), revisa el historial para entender el contexto.
        - Mantén una conversación fluida y natural.`;

        if (personData) {
            systemInstruction += `\n\nIMPORTANTE: Estás conversando con un paciente registrado: ${personData.full_name}. 
            - Para consultar su plan del día o estado de suscripción, usa 'get_my_data_for_ai'.
            - Para consultas sobre su progreso, peso histórico o cambios, usa 'get_patient_progress'.
            - Para agendar cita, usa 'book_appointment'.`;
        } else {
            systemInstruction += ` Estás conversando con un usuario desconocido.`;
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
