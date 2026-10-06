import { useState } from 'react';
import { BookOpen, FolderOpen, Clapperboard, Dna, ExternalLink, X } from 'lucide-react';
import RawLibrary from './RawLibrary';
import ProductionBoard from './ProductionBoard';
import BrandLinePanel from '../BrandLinePanel';
import { useBrandForAccount } from '../../lib/useBrand';
import './Studio.css';

const TABS = [
    { id: 'brandbook', label: 'Brandbook', icon: BookOpen },
    { id: 'raw', label: 'Material raw → Ideas', icon: FolderOpen },
    { id: 'production', label: 'Producción', icon: Clapperboard },
    { id: 'dna', label: 'ADN', icon: Dna },
];

/** Espacio de trabajo de una cuenta: brandbook, material raw, ideas, producción y ADN en un solo lugar. */
export default function AccountWorkspace({ account, accounts, tasks, initialTab = 'brandbook', onClose, onApproveIdea, onTaskChange, onOpenTask, onEditDna }) {
    const [tab, setTab] = useState(initialTab);
    const { brand, avatarSvg } = useBrandForAccount(account.id);
    const accountTasks = tasks.filter(t => t.accountId === account.id || t.accountHandler === account.handler);
    const brandbookUrl = brand ? `/brands/${brand.slug}/` : null;

    return (
        <div className="ws-overlay animate-in">
            <div className="ws">
                <header className="ws-head">
                    <div className="ws-id">
                        {avatarSvg && <div className="ws-avatar" dangerouslySetInnerHTML={{ __html: avatarSvg }} />}
                        <div>
                            <b>{account.handler}</b>
                            <span>{brand ? `${brand.name} · ${brand.tagline}` : account.type}</span>
                        </div>
                    </div>
                    <nav className="ws-tabs">
                        {TABS.map(t => {
                            const Icon = t.icon;
                            const badge = t.id === 'production' ? accountTasks.filter(x => x.status !== 'published').length : null;
                            return (
                                <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                                    <Icon size={14} /> {t.label}{badge ? <span className="ws-badge">{badge}</span> : null}
                                </button>
                            );
                        })}
                    </nav>
                    <div className="ws-tools">
                        {brandbookUrl && <a className="social-btn-secondary" href={brandbookUrl} target="_blank" rel="noreferrer" title="Abrir brandbook en otra pestaña"><ExternalLink size={13} /></a>}
                        <button className="social-modal-close" onClick={onClose} title="Cerrar"><X size={18} /></button>
                    </div>
                </header>

                {/* Las pestañas quedan montadas para no perder ideas generadas ni scroll al cambiar. */}
                <div className="ws-body">
                    <div className="ws-panel" hidden={tab !== 'brandbook'}>
                        {brandbookUrl
                            ? <iframe className="ws-brandbook" src={brandbookUrl} title={`Brandbook ${brand.name}`} />
                            : <div className="raw-empty">Esta cuenta todavía no tiene línea gráfica en <code>brands/</code>.</div>}
                    </div>
                    <div className="ws-panel ws-pad" hidden={tab !== 'raw'}>
                        <RawLibrary account={account} accounts={accounts} onApproveIdea={idea => onApproveIdea(account, idea)} />
                    </div>
                    <div className="ws-panel ws-pad" hidden={tab !== 'production'}>
                        <ProductionBoard account={account} tasks={accountTasks} onTaskChange={onTaskChange} onOpenTask={onOpenTask} />
                    </div>
                    <div className="ws-panel ws-pad ws-dna" hidden={tab !== 'dna'}>
                        <BrandLinePanel brand={brand} avatarSvg={avatarSvg} />
                        <button className="social-btn-primary" onClick={() => onEditDna(account)}><Dna size={14} /> Editar ADN de {account.handler}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
