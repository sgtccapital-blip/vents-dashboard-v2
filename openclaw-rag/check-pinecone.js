const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function check() {
    try {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const indexes = await pc.listIndexes();
        console.log("Indexes:", JSON.stringify(indexes, null, 2));
    } catch (err) {
        console.error(err);
    }
}
check();
