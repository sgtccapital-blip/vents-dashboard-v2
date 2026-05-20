import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: "test"
    });
    console.log("SUCCESS");
    console.log("EmbedResponse JSON:", JSON.stringify(embedResponse));
  } catch (e) {
    console.error("FAIL", e);
  }
}
run();
