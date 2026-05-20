import { agentTools } from '../tools/nativeTools.js';
import { config } from '../config.js';

export async function callOpenClawEngine(
    systemPrompt: string, 
    userMessage: string, 
    modelName: string = 'openclaw/default'
): Promise<any> {
    const endpoint = 'http://127.0.0.1:18789/v1/chat/completions';
    
    // Map existing tools to OpenAI format
    const openaiTools = (agentTools[0]?.functionDeclarations || []).map((t: any) => {
        const formattedProperties: Record<string, any> = {};
        if (t.parameters && t.parameters.properties) {
            for (const [key, value] of Object.entries(t.parameters.properties as any)) {
                formattedProperties[key] = {
                    type: String((value as any).type).toLowerCase() === 'string' ? 'string' : 'object',
                    description: (value as any).description
                };
            }
        }
        return {
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: {
                    type: "object",
                    properties: formattedProperties,
                    required: t.parameters?.required || []
                }
            }
        };
    });

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    const payload = {
        model: "openclaw/default", 
        messages: messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? "auto" : undefined
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout for Gateway
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 4b437eaea5b14ab1c2d52b8f7611e77d05877d8e99b1bebe',
                'x-openclaw-model': 'google/gemini-2.5-flash-preview-09-2025' // force specific fallback if gateway fails inside
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data;
        }
        console.warn(`[OpenClawBridge] Gateway returned ${response.status}. Falling back...`);
    } catch (err: any) {
        console.warn(`[OpenClawBridge] Gateway connection failed (${err.message}). Falling back to Native Gemini API...`);
    }

    // ==========================================
    // FALLBACK TO DIRECT GEMINI
    // ==========================================
    console.log("[OpenClawBridge] Executing fallback via direct Gemini REST API due to OpenClaw Gateway timeout/error.");
    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;
    
    // Convert back to Gemini format
    const geminiPayload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        tools: agentTools.length > 0 ? agentTools : undefined
    };

    const fallbackRes = await fetch(fallbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload)
    });

    if (!fallbackRes.ok) {
        throw new Error(`OpenClaw Engine (and Fallback) Error: ${fallbackRes.status} ${fallbackRes.statusText}`);
    }

    const fallbackData = await fallbackRes.json();
    
    // Map Gemini output back to expected OpenAI structure so dependent code still works natively!
    const funcCall = fallbackData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const textResp = fallbackData.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;

    return {
        choices: [
            {
                message: {
                    content: textResp || null,
                    tool_calls: funcCall ? [
                        {
                            type: "function",
                            function: {
                                name: funcCall.name,
                                arguments: JSON.stringify(funcCall.args)
                            }
                        }
                    ] : undefined
                }
            }
        ]
    };
}

export async function callOpenClawSynthesizer(
    systemPrompt: string, 
    toolResultPrompt: string,
    modelName: string = 'openclaw/default'
): Promise<string> {
    const endpoint = 'http://127.0.0.1:18789/v1/chat/completions';

    const payload = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: toolResultPrompt },
        ]
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 4b437eaea5b14ab1c2d52b8f7611e77d05877d8e99b1bebe',
                'x-openclaw-model': 'google/gemini-2.5-flash-preview-09-2025'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "No response derived from tool execution.";
        }
        console.warn(`[OpenClawBridge SDK] Synthesizer gateway error ${response.status}. Fallback to direct Gemini.`);
    } catch (e: any) {
        console.warn(`[OpenClawBridge SDK] Synthesizer timeout (${e.message}). Fallback to direct Gemini.`);
    }

    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;
    const fallbackRes = await fetch(fallbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: toolResultPrompt }] }]
        })
    });
    
    if (!fallbackRes.ok) throw new Error(`Synthesizer execution failed entirely.`);
    const fallbackData = await fallbackRes.json();
    return fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || "No response derived.";
}
