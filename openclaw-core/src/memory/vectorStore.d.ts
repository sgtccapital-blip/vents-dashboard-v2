export declare class VectorStore {
    private index;
    constructor();
    /**
     * Retrieves context from Pinecone based on the query.
     */
    retrieveContext(query: string, topK?: number): Promise<string>;
    /**
     * Stores a conversation or information in Pinecone for long term memory.
     */
    storeMemory(text: string, metadata?: any): Promise<void>;
    /**
     * Captures a snapshot of the Dashboard DB and forces it into long-term Episodic Memory.
     */
    syncDashboardSnapshot(): Promise<void>;
}
export declare const memory: VectorStore;
//# sourceMappingURL=vectorStore.d.ts.map