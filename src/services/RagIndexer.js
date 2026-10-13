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
     * Sube un archivo (PDF, TXT, MD, CSV) al servidor, que extrae el texto y lo indexa.
     */
    static async processFile(file, namespace = 'default') {
        const form = new FormData();
        form.append('file', file);
        form.append('namespace', namespace);
        const res = await fetch(`${API_BASE}/brain/upload`, { method: 'POST', body: form, credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `No se pudo indexar el archivo (${res.status})`);
        return { success: true, ...data };
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
