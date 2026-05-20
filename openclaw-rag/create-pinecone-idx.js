const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function createIndex() {
    try {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        console.log("Creating main-dashboard-index with dimension 768...");
        await pc.createIndex({
            name: 'main-dashboard-index',
            dimension: 768, 
            metric: 'cosine',
            spec: { 
                serverless: { 
                    cloud: 'aws', 
                    region: 'us-east-1' 
                }
            } 
        });
        console.log("Index created successfully!");
    } catch (err) {
        console.error(err);
    }
}
createIndex();
