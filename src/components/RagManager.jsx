import { useState } from 'react';
import { UploadCloud, FolderSync, Database, BrainCircuit, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RagManager() {
    const [namespace, setNamespace] = useState('default');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);
    const [vaultPath, setVaultPath] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus(null);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('namespace', namespace);

        try {
            const res = await fetch('/api/brain/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', msg: `Uploaded successfully to namespace: ${namespace}` });
                setFile(null);
            } else {
                setStatus({ type: 'error', msg: data.error || 'Upload failed' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
        setUploading(false);
    };

    const handleSyncVault = async () => {
        if (!vaultPath) return;
        setUploading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/brain/sync-vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: vaultPath, namespace })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', msg: `Vault synced to namespace: ${namespace}. Processed ${data.processed || 0} files.` });
            } else {
                setStatus({ type: 'error', msg: data.error || 'Sync failed' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
        setUploading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '16px' }}>
                    <BrainCircuit size={20} style={{ color: 'var(--accent-purple)' }} />
                    Knowledge Base Namespaces
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Select the target namespace before uploading documents or syncing your Obsidian vault. This ensures data is isolated per brand or company.
                </p>
                
                <div className="form-group" style={{ maxWidth: '300px' }}>
                    <label>Target Namespace</label>
                    <select 
                        className="form-control" 
                        value={namespace} 
                        onChange={(e) => setNamespace(e.target.value)}
                    >
                        <option value="default">Default</option>
                        <option value="mupa">MUPA</option>
                        <option value="panamerican">Panamerican BC</option>
                        <option value="novatech">NovaTech Solutions</option>
                        <option value="sgtc">SGTC Capital</option>
                        <option value="goldenstar">Golden Star</option>
                        <option value="gabmar">GABMAR Investments</option>
                        <option value="lbl">LBL / Sabores Panamá</option>
                        <option value="metro">Metro Supply</option>
                    </select>
                </div>
            </div>

            {status && (
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-md)', 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: status.type === 'success' ? 'var(--accent-green)20' : 'var(--accent-red)20',
                    color: status.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontSize: '14px'
                }}>
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {status.msg}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Upload Section */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'var(--accent-blue)15', padding: '8px', borderRadius: '8px' }}>
                            <UploadCloud size={20} style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <h4 style={{ margin: 0 }}>Upload Document</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                        Upload PDF, TXT, or MD files directly to the selected namespace. The RAG engine will chunk and index them automatically.
                    </p>
                    <div className="form-group">
                        <input 
                            type="file" 
                            className="form-control" 
                            accept=".pdf,.txt,.md,.csv" 
                            onChange={handleFileChange} 
                        />
                    </div>
                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', marginTop: '8px', display: 'flex', justifyContent: 'center' }}
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? 'Processing...' : 'Upload & Index'}
                    </button>
                </div>

                {/* Obsidian Sync Section */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'var(--accent-cyan)15', padding: '8px', borderRadius: '8px' }}>
                            <FolderSync size={20} style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        <h4 style={{ margin: 0 }}>Obsidian Vault Sync</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                        Provide the absolute path to your Obsidian vault. We will parse all markdown files and sync them to Pinecone.
                    </p>
                    <div className="form-group">
                        <label>Vault Path</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="/Users/username/Documents/Obsidian" 
                            value={vaultPath}
                            onChange={(e) => setVaultPath(e.target.value)}
                        />
                    </div>
                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', marginTop: '8px', display: 'flex', justifyContent: 'center', background: 'var(--accent-cyan)' }}
                        onClick={handleSyncVault}
                        disabled={!vaultPath || uploading}
                    >
                        {uploading ? 'Syncing Vault...' : 'Start Vault Sync'}
                    </button>
                </div>
            </div>
        </div>
    );
}
