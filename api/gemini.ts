
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// This is a serverless function, so we can use the service role key.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { contents, config, clinic_id, file_url } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Request body must contain "contents".' });
    }
    if (!clinic_id) {
        return res.status(400).json({ error: 'Request body must contain "clinic_id".' });
    }

    // Fetch agent configuration for the clinic
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('provider_api_key, model_name')
      .eq('clinic_id', clinic_id)
      .single();

    if (agentError && agentError.code !== 'PGRST116') throw new Error(`Could not fetch AI agent configuration: ${agentError.message}`);
    
    // Default to system key if not provided by the user
    // UPDATED: Use GEMINI_API_KEY environment variable
    const apiKey = (agent?.provider_api_key || process.env.GEMINI_API_KEY)?.trim();
    
    if (!apiKey) {
      console.error('Gemini API key (GEMINI_API_KEY) is not configured in environment variables or database.');
      return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    
    // Force usage of gemini-2.5-flash to prevent 429 Resource Exhausted errors on Free Tier
    // This overrides the database setting temporarily to ensure reliability
    const model = 'gemini-2.5-flash';
    
    const ai = new GoogleGenAI({ apiKey: apiKey });

    let finalContents = contents;

    // --- RAG / FILE HANDLING START ---
    if (file_url) {
        console.log(`[Gemini API] Processing file RAG for URL: ${file_url}`);
        
        // 1. Fetch file from Supabase
        // file_url is expected to be the public URL or a signed URL.
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) throw new Error(`Failed to fetch file from Supabase: ${fileResponse.statusText}`);
        
        const arrayBuffer = await fileResponse.arrayBuffer();
        
        // Determine mime type from response or default
        const mimeType = fileResponse.headers.get('content-type') || 'application/pdf';

        // 2. Upload to Gemini Files API
        // Note: For production, consider caching these URIs or checking if file already exists to save bandwidth/time.
        const uploadResult = await ai.files.upload({
            file: new Blob([arrayBuffer], { type: mimeType }), // GoogleGenAI expects a Blob or File object in Node env via polyfill or Buffer logic
            config: { mimeType: mimeType }
        });
        
        console.log(`[Gemini API] File uploaded to Google: ${uploadResult.name} (${uploadResult.uri})`);

        // 3. Attach File URI to the content generation request
        // If 'contents' is a string, wrap it. If it's an array, append to the user part.
        if (typeof finalContents === 'string') {
            finalContents = [
                {
                    role: 'user',
                    parts: [
                        { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                        { text: finalContents }
                    ]
                }
            ];
        } else if (Array.isArray(finalContents)) {
            // Find the last user message and attach the file
            const lastUserMsg = finalContents[finalContents.length - 1];
            if (lastUserMsg && lastUserMsg.role === 'user') {
                // Ensure parts is an array
                if (!Array.isArray(lastUserMsg.parts)) {
                    lastUserMsg.parts = [{ text: lastUserMsg.parts }];
                }
                lastUserMsg.parts.unshift({ 
                    fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } 
                });
            } else {
                 finalContents.push({
                    role: 'user',
                    parts: [
                        { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                        { text: "Analiza este documento." }
                    ]
                });
            }
        }
    }
    // --- RAG / FILE HANDLING END ---

    const response = await ai.models.generateContent({
      model: model,
      contents: finalContents,
      config: config,
    });
    
    // Extract relevant data to send back to client
    // We need the text AND potential function calls
    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
    
    res.status(200).json({ 
        text: response.text,
        functionCalls: functionCalls || [],
        // Send back the raw content part to easily append to history in client
        candidateContent: candidate?.content
    });

  } catch (error: any) {
    console.error('Error calling AI API:', error);
    
    // Improve error message for client
    let errorMessage = error.message;
    if (errorMessage.includes('429')) {
        errorMessage = 'El servicio de IA está saturado (Cuota excedida). Por favor intenta de nuevo en unos minutos.';
    }

    res.status(500).json({ error: errorMessage });
  }
}
