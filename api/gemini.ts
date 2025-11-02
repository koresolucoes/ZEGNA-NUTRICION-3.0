import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// This is a serverless function, so we can use the service role key.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Vercel exports a handler function from files in the api/ directory
// The types would normally be `import type { VercelRequest, VercelResponse } from '@vercel/node';`
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { contents, config, clinic_id } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Request body must contain "contents".' });
    }
    if (!clinic_id) {
        return res.status(400).json({ error: 'Request body must contain "clinic_id".' });
    }

    // Fetch agent configuration for the clinic
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('model_provider, provider_api_key, model_name')
      .eq('clinic_id', clinic_id)
      .single();

    if (agentError && agentError.code !== 'PGRST116') throw new Error(`Could not fetch AI agent configuration: ${agentError.message}`);
    
    const provider = agent?.model_provider || 'gemini';
    const dbApiKey = agent?.provider_api_key;
    const model = agent?.model_name;

    if (provider === 'openai' || provider === 'openrouter') {
        const apiKey = (dbApiKey || process.env.API_KEY)?.trim();
        if (!apiKey) {
            throw new Error(`La clave API para ${provider} no está configurada en la base de datos ni en las variables de entorno.`);
        }
        
        // Simple translation from Gemini `contents` to OpenAI `messages`
        const messages = (Array.isArray(contents) ? contents : [{ role: 'user', parts: [{text: contents}] }]).map((c: any) => ({
            role: c.role === 'model' ? 'assistant' : c.role,
            content: c.parts.map((p: any) => p.text).join('\n')
        }));
        
        if(config?.systemInstruction) {
            messages.unshift({ role: 'system', content: config.systemInstruction });
        }
        
        if (config?.responseSchema) {
            // Find the last user message and append the JSON instruction
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                    let jsonInstruction = '\n\nIMPORTANT: You MUST respond with a valid JSON object. Do not include any other text or markdown formatting (like ```json...```) outside of the JSON object.';
                    
                    // A simple heuristic to detect if it's the meal plan schema
                    if (config.responseSchema.properties?.plan_semanal) {
                        jsonInstruction += ` The root object must have a key named "plan_semanal" which is an array of day objects. Each day object should contain keys like "dia", "desayuno", "comida", and "cena". Example: { "plan_semanal": [ { "dia": "Día 1", "desayuno": "...", ... } ] }`;
                    }
                    
                    messages[i].content += jsonInstruction;
                    break;
                }
            }
        }

        const body: any = {
            model: model || (provider === 'openai' ? 'gpt-4o-mini' : 'openai/gpt-4o-mini'),
            messages: messages,
        };
        
        if (config?.responseSchema) {
            body.response_format = { type: "json_object" };
        }

        const apiUrl = provider === 'openai' 
            ? 'https://api.openai.com/v1/chat/completions' 
            : 'https://openrouter.ai/api/v1/chat/completions';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                 ...(provider === 'openrouter' && { 
                    'HTTP-Referer': req.headers.host || 'zegnanutricion.com', 
                    'X-Title': 'Zegna Nutricion' 
                 })
            },
            body: JSON.stringify(body),
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = `Error desde ${provider} (${response.status}): `;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage += errorJson.error?.message || responseText;
            } catch (parseError) {
                errorMessage += responseText;
            }
            throw new Error(errorMessage);
        }
        
        const data = JSON.parse(responseText);
        const textContent = data.choices?.[0]?.message?.content;
        
        if (textContent === undefined) {
            throw new Error(`Respuesta inesperada de ${provider}: No se encontró el contenido del mensaje.`);
        }
        
        // The frontend expects the JSON string in a 'text' property.
        res.status(200).json({ text: textContent });

    } else { // Gemini Provider
        const geminiApiKey = (dbApiKey || process.env.API_KEY)?.trim();
        if (!geminiApiKey) {
          console.error('Gemini API key (API_KEY) is not configured in environment variables or database.');
          return res.status(500).json({ error: 'API key not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const response = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: contents,
          config: config,
        });
        
        res.status(200).json({ text: response.text });
    }

  } catch (error: any) {
    console.error('Error calling AI API:', error);
    res.status(500).json({ error: `An error occurred while communicating with the AI service: ${error.message}` });
  }
}