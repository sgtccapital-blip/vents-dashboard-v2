import fs from 'fs';
import path from 'path';
import { agentTools } from '../tools/nativeTools.js';
// Convert Gemini-style tools to OpenAI/Ollama-style tools
export const openAITools = (agentTools[0]?.functionDeclarations || []).map((tool) => {
    const formattedProperties = {};
    if (tool.parameters && tool.parameters.properties) {
        for (const [key, value] of Object.entries(tool.parameters.properties)) {
            // Type.STRING -> "string", Type.OBJECT -> "object"
            const typeStr = String(value.type).toLowerCase() === 'string' ? 'string' : 'object';
            formattedProperties[key] = {
                type: typeStr,
                description: value.description
            };
        }
    }
    return {
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: "object",
                properties: formattedProperties,
                required: tool.parameters?.required || []
            }
        }
    };
});
/**
 * Llama al motor local de OpenClaw (vía Ollama) con soporte para Tool Calling
 */
export async function callOpenClawEngine(systemPrompt, userMessage, modelName = 'claude') {
    const endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
    const payload = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        tools: openAITools,
        // Algunos modelos requieren esto o simplemente seleccionan auto
        tool_choice: "auto"
    };
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Error en motor OpenClaw HTTP ${response.statusText}`);
    }
    const data = await response.json();
    return data;
}
/**
 * Segunda llamada después de ejecutar una herramienta, para que sintetice la respuesta.
 */
export async function callOpenClawSynthesizer(systemPrompt, toolResultPrompt, modelName = 'claude') {
    const endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
    const payload = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: toolResultPrompt },
        ]
    };
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Error en motor OpenClaw Synthesizer HTTP ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response derived from tool execution.";
}
//# sourceMappingURL=openclawBridge.js.map