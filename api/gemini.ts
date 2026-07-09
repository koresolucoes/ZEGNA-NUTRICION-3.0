import { createClient } from '@supabase/supabase-js';

// This is a serverless function, so we can use the service role key.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

function parsePartsToMessage(role: string, parts: any): any {
  if (typeof parts === 'string') {
    return { role, content: parts };
  }

  if (Array.isArray(parts)) {
    // Check if there are any multimodal parts (inlineData, fileData, or image_url)
    const hasMedia = parts.some((p: any) => p && (p.inlineData || p.fileData || p.image_url));
    
    if (hasMedia) {
      const contentArray: any[] = [];
      for (const p of parts) {
        if (!p) continue;
        if (typeof p.text === 'string') {
          contentArray.push({ type: 'text', text: p.text });
        } else if (p.inlineData) {
          const mimeType = p.inlineData.mimeType || 'image/jpeg';
          const base64Data = p.inlineData.data;
          contentArray.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          });
        } else if (p.image_url) {
          contentArray.push({ type: 'image_url', image_url: p.image_url });
        }
      }
      return { role, content: contentArray };
    } else {
      // Just text parts
      const text = parts
        .filter((p: any) => p && typeof p.text === 'string')
        .map((p: any) => p.text)
        .join('\n');
      return { role, content: text };
    }
  }

  return { role, content: String(parts) };
}

function convertGeminiToOpenRouter(contents: any): any[] {
  if (!contents) return [];

  // If contents is a string
  if (typeof contents === 'string') {
    return [{ role: 'user', content: contents }];
  }

  // If contents is a single object (e.g. { parts: [...] })
  if (typeof contents === 'object' && !Array.isArray(contents)) {
    if (contents.parts) {
      return [parsePartsToMessage(contents.role || 'user', contents.parts)];
    }
    return [{ role: 'user', content: JSON.stringify(contents) }];
  }

  // If contents is an array
  if (Array.isArray(contents)) {
    return contents.map((item: any) => {
      if (typeof item === 'string') {
        return { role: 'user', content: item };
      }
      
      const role = item.role === 'model' ? 'assistant' : (item.role || 'user');
      
      if (item.parts) {
        return parsePartsToMessage(role, item.parts);
      } else if (item.content) {
        return { role, content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content) };
      }
      
      return { role, content: JSON.stringify(item) };
    });
  }

  return [{ role: 'user', content: String(contents) }];
}

function mapModelToOpenRouter(modelName: string): string {
  if (!modelName) return 'google/gemini-2.5-flash-lite';
  
  // If model name is already a full path (contains slash), keep it
  if (modelName.includes('/')) {
    return modelName;
  }
  
  // Map common names
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
}

function convertGeminiSchemaToStandard(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const copy: any = Array.isArray(schema) ? [] : { ...schema };

  if (Array.isArray(schema)) {
    return schema.map(item => convertGeminiSchemaToStandard(item));
  }

  if (typeof copy.type === 'string') {
    copy.type = copy.type.toLowerCase();
  }

  if (copy.properties && typeof copy.properties === 'object') {
    const newProps: any = {};
    for (const [key, val] of Object.entries(copy.properties)) {
      newProps[key] = convertGeminiSchemaToStandard(val);
    }
    copy.properties = newProps;
  }

  if (copy.items && typeof copy.items === 'object') {
    copy.items = convertGeminiSchemaToStandard(copy.items);
  }

  return copy;
}

function generateSchemaPromptInstructions(schema: any): string {
  if (!schema) return '';
  
  const describeSchema = (s: any, indent = ''): string => {
    if (!s) return '';
    const type = String(s.type || '').toLowerCase();
    const desc = s.description ? ` // ${s.description}` : '';
    
    if (type === 'object' && s.properties) {
      let lines = [`{` + desc];
      for (const [key, val] of Object.entries(s.properties)) {
        const isRequired = Array.isArray(s.required) && s.required.includes(key);
        const reqStr = isRequired ? ' [REQUIRED]' : '';
        lines.push(`${indent}  "${key}": ${describeSchema(val, indent + '  ')}${reqStr}`);
      }
      lines.push(`${indent}}`);
      return lines.join('\n');
    }
    
    if (type === 'array' && s.items) {
      return `[\n${indent}  ${describeSchema(s.items, indent + '  ')}\n${indent}]${desc}`;
    }
    
    return `"${type}"${desc}`;
  };

  try {
    const stdSchema = convertGeminiSchemaToStandard(schema);
    return `\n\nDebes responder ESTRICTAMENTE con un objeto JSON que cumpla exactamente con la siguiente estructura de datos:\n\`\`\`json\n${describeSchema(stdSchema)}\n\`\`\``;
  } catch (err) {
    return '';
  }
}

function cleanJsonResponseText(responseText: string): string {
  let cleaned = responseText.trim();
  
  // Strip ```json and ``` wraps if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  // Extract the first '{' to last '}' or '[' to ']' to handle any surrounding commentary
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    if (firstBracket !== -1 && firstBracket < firstBrace && lastBracket > lastBrace) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    } else {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned;
}

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

    if (agentError && agentError.code !== 'PGRST116') {
      throw new Error(`Could not fetch AI agent configuration: ${agentError.message}`);
    }
    
    // Secure OpenRouter API key prioritized over standard keys
    const apiKey = (process.env.OPENROUTER_API_KEY || agent?.provider_api_key || process.env.GEMINI_API_KEY)?.trim();
    
    if (!apiKey) {
      console.error('OpenRouter API key (OPENROUTER_API_KEY) is not configured.');
      return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    
    // Determine the model
    // User can set OPENROUTER_MODEL in environment variables to override
    const defaultModel = agent?.model_name ? mapModelToOpenRouter(agent.model_name) : 'google/gemini-2.5-flash-lite';
    const model = process.env.OPENROUTER_MODEL || defaultModel;
    
    // Add HTTP referer from the request to bypass API key restrictions
    const referer = req.headers.referer || req.headers.origin || `https://${req.headers.host}` || 'https://openrouter.ai';
    
    // Convert contents to OpenRouter messages
    let messages = convertGeminiToOpenRouter(contents);

    // Extract systemInstruction if present
    let systemInstructionText = '';
    if (config?.systemInstruction) {
      if (typeof config.systemInstruction === 'string') {
        systemInstructionText = config.systemInstruction;
      } else if (config.systemInstruction.parts) {
        const parts = config.systemInstruction.parts;
        if (Array.isArray(parts)) {
          systemInstructionText = parts.map((p: any) => p.text || '').join('\n');
        } else if (typeof parts === 'string') {
          systemInstructionText = parts;
        }
      }
    }

    if (systemInstructionText) {
      messages = [{ role: 'system', content: systemInstructionText }, ...messages];
    }

    // Handle file URL (RAG)
    if (file_url) {
      console.log(`[OpenRouter API] Processing file RAG for URL: ${file_url}`);
      try {
        const fileResponse = await fetch(file_url);
        if (fileResponse.ok) {
          const mimeType = fileResponse.headers.get('content-type') || '';
          if (mimeType.startsWith('image/')) {
            const arrayBuffer = await fileResponse.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            // Attach image to the last user message
            const lastMsg = messages[messages.length - 1];
            if (lastMsg) {
              if (typeof lastMsg.content === 'string') {
                lastMsg.content = [
                  { type: 'text', text: lastMsg.content },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ];
              } else if (Array.isArray(lastMsg.content)) {
                lastMsg.content.push({ type: 'image_url', image_url: { url: dataUrl } });
              }
            }
            console.log(`[OpenRouter API] Attached image from file_url directly as base64`);
          } else {
            console.log(`[OpenRouter API] Non-image file URL detected (${mimeType}). Text content is expected to be inline in the prompt context from client.`);
          }
        }
      } catch (fileErr) {
        console.error('[OpenRouter API] Error fetching/processing file_url:', fileErr);
      }
    }

    // Handle response formats (JSON mode)
    let responseFormat: any = undefined;
    if (config?.responseMimeType === "application/json") {
      responseFormat = { type: "json_object" };
      
      // If a schema is provided, we can convert and pass it to OpenRouter
      if (config.responseSchema) {
        try {
          const standardSchema = convertGeminiSchemaToStandard(config.responseSchema);
          responseFormat.schema = standardSchema;
          
          // Also generate a visual string blueprint to append to the last user instruction
          const schemaInstructions = generateSchemaPromptInstructions(config.responseSchema);
          if (schemaInstructions) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg) {
              if (typeof lastMsg.content === 'string') {
                lastMsg.content += schemaInstructions;
              } else if (Array.isArray(lastMsg.content)) {
                lastMsg.content.push({ type: 'text', text: schemaInstructions });
              }
            }
          }
        } catch (schemaErr) {
          console.error('[OpenRouter API] Error parsing or injecting schema:', schemaErr);
        }
      } else {
        // Append general instruction to make sure the model outputs valid JSON matching the format
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          const jsonInstruction = "\n\nIMPORTANT: Return your response strictly as a single JSON object. Do not include markdown code block formatting (like ```json ... ```) in your raw response.";
          if (typeof lastMsg.content === 'string') {
            lastMsg.content += jsonInstruction;
          } else if (Array.isArray(lastMsg.content)) {
            lastMsg.content.push({ type: 'text', text: jsonInstruction });
          }
        }
      }
    }

    console.log(`[OpenRouter API] Calling model ${model}`);
    
    // Make request to OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': referer,
        'X-Title': 'Clinic AI Ecosystem'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: responseFormat,
        temperature: config?.temperature !== undefined ? config.temperature : 0.7,
        max_tokens: config?.maxOutputTokens !== undefined ? config.maxOutputTokens : undefined,
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      throw new Error(`OpenRouter API error (${openRouterResponse.status}): ${errorText}`);
    }

    const responseData = await openRouterResponse.json();
    let responseText = responseData.choices?.[0]?.message?.content || '';

    if (config?.responseMimeType === "application/json") {
      responseText = cleanJsonResponseText(responseText);
    }

    // Reconstruct the response format to match Gemini's structure expected by client
    res.status(200).json({ 
      text: responseText,
      functionCalls: [],
      candidateContent: {
        role: 'model',
        parts: [{ text: responseText }]
      }
    });

  } catch (error: any) {
    console.error('Error calling OpenRouter AI API:', error);
    
    let errorMessage = error.message;
    if (errorMessage.includes('429')) {
      errorMessage = 'El servicio de IA está saturado (Cuota excedida). Por favor intenta de nuevo en unos minutos.';
    }

    res.status(500).json({ error: errorMessage });
  }
}
