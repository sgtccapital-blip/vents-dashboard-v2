const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function check() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: "hola"
    });
    console.log("Length:", response.embeddings[0].values.length);
}
check();
