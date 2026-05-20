import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake' });
ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
        { role: 'user', parts: [{ text: 'hello' }] }
    ],
    config: { tools: [] }
});
