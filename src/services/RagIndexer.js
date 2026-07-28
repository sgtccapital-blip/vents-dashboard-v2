/**
 * RAG Indexer — Procesamiento de Documentos con Sincronización en la Nube
 * Lee archivos, extrae texto y lo envía al backend para que Supabase lo persista.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class RagIndexer {
    /**
     * Obtiene todos los documentos guardados en un namespace desde el backend
     */
    static async getDocuments(namespace = 'default') {
        try {
            const res = await fetch(`${API_BASE}/rag/${namespace}`);
            if (!res.ok) throw new Error('Network response was not ok');
            return await res.json();
        } catch (e) {
            console.error('Error reading RAG store from cloud:', e);
            // Fallback en caso de que no haya conexión
            return [];
        }
    }

    /**
     * Guarda un documento en la nube
     */
    static async saveDocument(doc, namespace = 'default') {
        try {
            const res = await fetch(`${API_BASE}/rag/${namespace}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(doc)
            });
            if (!res.ok) throw new Error('Error saving document');
            return await res.json();
        } catch (e) {
            console.error('Error saving to RAG cloud store:', e);
            throw new Error('Error de conexión al guardar el documento en la nube.');
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
                
                const doc = {
                    filename: file.name,
                    content: text.substring(0, 50000), // Límite de seguridad
                    addedAt: new Date().toISOString()
                };

                try {
                    const savedDoc = await this.saveDocument(doc, namespace);
                    resolve({ success: true, doc: savedDoc });
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo el archivo.'));

            // Leer como texto
            reader.readAsText(file);
        });
    }

    /**
     * Borra todo el conocimiento de un namespace en la nube
     */
    static async clearNamespace(namespace = 'default') {
        try {
            await fetch(`${API_BASE}/rag/${namespace}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error('Error clearing RAG store from cloud:', e);
        }
    }
}

export default RagIndexer;
