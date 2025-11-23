
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
      .select('provider_api_key, model_name')
      .eq('clinic_id', clinic_id)
      .single();

    if (agentError && agentError.code !== 'PGRST116') throw new Error(`Could not fetch AI agent configuration: ${agentError.message}`);
    
    // Default to system key if not provided by the user
    const apiKey = (agent?.provider_api_key || process.env.API_KEY)?.trim();
    
    if (!apiKey) {
      console.error('Gemini API key (API_KEY) is not configured in environment variables or database.');
      return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    
    // Default to Gemini 2.5 Flash if not specified
    const model = agent?.model_name || 'gemini-2.5-flash';

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: config,
    });
    
    res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error('Error calling AI API:', error);
    res.status(500).json({ error: `An error occurred while communicating with the AI service: ${error.message}` });
  }
}
