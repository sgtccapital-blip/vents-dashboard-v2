/**
 * RAG Indexer — Procesamiento In-Browser de Documentos
 * Lee archivos, extrae texto y lo guarda localmente (LocalStorage)
 * para ser utilizado por el NativeBrainService.
 */

class RagIndexer {
    static STORAGE_KEY = '__openclaw_rag_store';

    /**
     * Obtiene todos los documentos guardados en un namespace
     */
    static getDocuments(namespace = 'default') {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return [];
            const data = JSON.parse(raw);
            return data.filter(doc => doc.namespace === namespace);
        } catch (e) {
            console.error('Error reading RAG store:', e);
            return [];
        }
    }

    /**
     * Guarda un documento en LocalStorage
     */
    static saveDocument(doc) {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            const data = raw ? JSON.parse(raw) : [];
            data.push(doc);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to RAG store:', e);
            throw new Error('No hay suficiente espacio local para guardar el documento.');
        }
    }

    /**
     * Procesa un archivo File (desde un input type="file")
     */
    static async processFile(file, namespace = 'default') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const text = e.target.result;
                
                // En un sistema avanzado haríamos "chunking" (partir en trozos de 1000 tokens)
                // y "embeddings". Aquí usaremos almacenamiento en crudo para inyección directa de contexto.
                const doc = {
                    id: `doc_${Date.now()}`,
                    filename: file.name,
                    namespace,
                    content: text.substring(0, 50000), // Límite por seguridad de LocalStorage
                    addedAt: new Date().toISOString()
                };

                try {
                    this.saveDocument(doc);
                    resolve({ success: true, doc });
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = (e) => reject(new Error('Error leyendo el archivo.'));

            // Dependiendo del tipo, leemos como texto
            // (Para PDFs complejos requeriría pdf.js, pero para txt/csv/md funciona directo)
            reader.readAsText(file);
        });
    }

    /**
     * Borra todo el conocimiento de un namespace
     */
    static clearNamespace(namespace = 'default') {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return;
            let data = JSON.parse(raw);
            data = data.filter(doc => doc.namespace !== namespace);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error clearing RAG store:', e);
        }
    }
}

export default RagIndexer;
