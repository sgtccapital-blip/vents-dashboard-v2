import dotenv from 'dotenv';
import path from 'path';

// Load the .env file that we copied from the master dashboard
dotenv.config({ path: path.join(import.meta.dirname, '../../.env') }); // Ensure we find .env even if run from different cwd, though we have cp'd it to openclaw-core/.env so dotenv.config() defaults to it if run from openclaw-core.

// Safer to just run dotenv.config() which looks in current working directory (openclaw-core)
dotenv.config();

export const config = {
    PORT: process.env.OPENCLAW_PORT || 18790,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
    PINECONE_INDEX: process.env.PINECONE_INDEX || 'superbrain',
    AGENT_INBOX_PATH: path.join(import.meta.dirname, '../../../_agent_inbox')
};
