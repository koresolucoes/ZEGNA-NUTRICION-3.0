
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";
import processQueueHandler from './process-queue.js';

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
    if (!process.env.GEMINI_API_KEY) {
        console.error('Server configuration error: Gemini API key (GEMINI_API_KEY) is not set.');
        return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    try {
        let clinicPhoneNumber: string, userPhoneNumber: string, messageBody: string, messageId: string | null = null;
        // Placeholder to store temporary media info before we have the credentials to download it
        let pendingMedia: { id?: string; url?: string; type: 'image' | 'audio'; mimeType?: string } | null = null;

        if (req.body.object === 'whatsapp_business_account') {
            // META Parsing
            const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            if (!message) return res.status(200).send('OK');
            
            messageId = message.id;
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
                return res.status(200).send('OK - Unsupported type');
            }

        } else {
            // TWILIO Parsing
            messageId = req.body.MessageSid || req.body.SmsMessageSid;
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

    // 3. Log user's message (with deduplication check)
    // We use the whatsapp_message_queue as a lock mechanism.
    // If we can insert the messageId, it's the first time we see it.
    const finalMessageId = messageId || `msg_${contact.id}_${Date.now()}`;
    const { error: lockError } = await supabaseAdmin
        .from('whatsapp_message_queue')
        .insert({
            id: finalMessageId,
            contact_id: contact.id,
            messages: [messageBody],
            status: 'pending',
            process_at: new Date().toISOString()
        });

    if (lockError) {
        // If it's a duplicate key error, it's a retry from Meta/Twilio
        if (lockError.code === '23505') {
            console.log(`[Webhook] Duplicate messageId detected: ${messageId}. Ignoring retry.`);
            return res.status(200).send('OK - Duplicate ignored');
        }
        // For other errors, we check the 15s window as fallback
        const { data: existingMessage } = await supabaseAdmin
            .from('whatsapp_conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('message_content', messageBody)
            .eq('sender', 'user')
            .gt('sent_at', new Date(Date.now() - 15000).toISOString())
            .limit(1);

        if (existingMessage && existingMessage.length > 0) {
            console.log(`[Webhook] Duplicate content detected for contact ${userPhoneNumber}. Ignoring retry.`);
            return res.status(200).send('OK - Duplicate ignored');
        }
    }

    // Log to history
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

    // 4. Trigger Asynchronous Processing
    // We call the process-queue API handler directly without awaiting it.
    // This avoids network issues and allows us to return 200 OK to Meta/Twilio immediately.
    
    // We fetch the record we just created to pass it to the processor
    const { data: queueRecord } = await supabaseAdmin
        .from('whatsapp_message_queue')
        .select('*')
        .eq('id', finalMessageId)
        .single();

    if (queueRecord) {
        const mockReq = {
            method: 'POST',
            headers: { authorization: `Bearer ${process.env.VERCEL_AUTOMATION_SECRET}` },
            body: { record: queueRecord }
        };
        const mockRes = {
            status: (code: number) => mockRes,
            json: (data: any) => { console.log(`[Background Queue] Status: ${data.message || data.error}`); },
            send: (data: any) => { console.log(`[Background Queue] Status: ${data}`); }
        };
        
        // Execute in background
        processQueueHandler(mockReq, mockRes).catch(err => console.error('[Webhook] Error in background process-queue:', err));
    }

    // Return 200 OK immediately to prevent retries
    return res.status(200).send('OK - Queued for processing');

    /* --- THE REST OF THE SYNC LOGIC IS NOW HANDLED BY process-queue.ts ---
       We keep it commented out or remove it to avoid confusion.
       Actually, I will remove it from this file to keep it clean.
    */
  } catch (error: any) {
    console.error('[Whatsapp Webhook] Critical Error:', error);
    return res.status(500).json({ error: 'An internal error occurred.' });
  }
}
