import { useState, useMemo } from 'react';
import { Dna, Copy, Check, Download, Palette, Target, Mic2, Layers, Link2, ShieldCheck, Sparkles } from 'lucide-react';
import {
    normalizeDna, dnaCompleteness, dnaToMarkdown, accountSlug,
    linesToList, listToLines, linesToReferences, referencesToLines, parsePalette,
} from '../lib/accountDna';
import { useBrandForAccount } from '../lib/useBrand';
import BrandLinePanel from './BrandLinePanel';

// El formulario trabaja con texto plano (listas = una entrada por línea) y se convierte al guardar.
function toForm(dna) {
    const d = normalizeDna(dna);
    return {
        concept: d.concept, mission: d.mission, audience: d.audience, voice: d.voice, language: d.language,
        cadence: d.cadence, hashtags: d.hashtags, notes: d.notes,
        pillars: listToLines(d.pillars), formats: listToLines(d.formats), hooks: listToLines(d.hooks),
        ctas: listToLines(d.ctas), dos: listToLines(d.dos), donts: listToLines(d.donts),
        references: referencesToLines(d.references),
        palette: d.visual.palette.join(' '),
        typography: d.visual.typography, logoUrl: d.visual.logoUrl, style: d.visual.style,
        editing: d.visual.editing, subtitles: d.visual.subtitles, music: d.visual.music,
    };
}

function fromForm(f, prevDna) {
    return {
        ...normalizeDna(prevDna),
        concept: f.concept.trim(), mission: f.mission.trim(), audience: f.audience.trim(),
        voice: f.voice.trim(), language: f.language.trim(), cadence: f.cadence.trim(),
        hashtags: f.hashtags.trim(), notes: f.notes.trim(),
        pillars: linesToList(f.pillars), formats: linesToList(f.formats), hooks: linesToList(f.hooks),
        ctas: linesToList(f.ctas), dos: linesToList(f.dos), donts: linesToList(f.donts),
        references: linesToReferences(f.references),
        visual: {
            palette: parsePalette(f.palette),
            typography: f.typography.trim(), logoUrl: f.logoUrl.trim(), style: f.style.trim(),
            editing: f.editing.trim(), subtitles: f.subtitles.trim(), music: f.music.trim(),
        },
        updatedAt: new Date().toISOString(),
    };
}

function Field({ label, hint, value, onChange, rows, placeholder, full = true }) {
    return (
        <div className={`social-field ${full ? 'full' : ''}`}>
            <label>{label}{hint && <span className="dna-hint">{hint}</span>}</label>
            {rows ? (
                <textarea rows={rows} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
            ) : (
                <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
            )}
        </div>
    );
}

function Section({ icon, title, color, children }) {
    const Icon = icon;
    return (
        <div className="dna-section" style={{ '--dna-accent': color }}>
            <div className="dna-section-title"><Icon size={14} /> {title}</div>
            <div className="dna-section-grid">{children}</div>
        </div>
    );
}

export default function AccountDnaEditor({ account, onSave, onClose }) {
    const [form, setForm] = useState(() => toForm(account.dna));
    const [copied, setCopied] = useState(false);
    const { brand, avatarSvg } = useBrandForAccount(account.id);
    const set = key => value => setForm(prev => ({ ...prev, [key]: value }));

    const draftDna = useMemo(() => fromForm(form, account.dna), [form, account.dna]);
    const completeness = dnaCompleteness(draftDna);
    const palette = draftDna.visual.palette;

    const markdown = () => dnaToMarkdown({ ...account, dna: draftDna });

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(markdown());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.alert('No se pudo copiar al portapapeles.');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DNA-${accountSlug(account)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = e => {
        e.preventDefault();
        onSave(draftDna);
    };

    return (
        <div className="social-modal-overlay animate-in" onClick={onClose}>
            <div className="social-modal-box dna-modal" onClick={e => e.stopPropagation()}>
                <div className="social-modal-header">
                    <div>
                        <h3 className="social-modal-title">
                            <Dna size={20} style={{ color: '#a78bfa' }} /> ADN de {account.handler}
                        </h3>
                        <p className="social-modal-sub">
                            Todo lo que se cree para esta cuenta sale de aquí: guiones, diseños, motion, edición y prompts.
                        </p>
                    </div>
                    <button className="social-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="dna-progress">
                    <div className="dna-progress-label">
                        <span>ADN completo</span>
                        <strong>{completeness}%</strong>
                    </div>
                    <div className="dna-progress-track">
                        <div className="dna-progress-fill" style={{ width: `${completeness}%` }} />
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="social-modal-body">
                        <BrandLinePanel brand={brand} avatarSvg={avatarSvg} />

                        <Section icon={Target} title="IDENTIDAD Y ESTRATEGIA" color="#a78bfa">
                            <Field label="Concepto" hint="qué es la cuenta en una frase" value={form.concept} onChange={set('concept')}
                                placeholder="Ej: La guía de la electrónica internacional en Panamá" />
                            <Field label="Objetivo del contenido" value={form.mission} onChange={set('mission')} full={false}
                                placeholder="Ej: Vender tickets, crecer comunidad, booking" />
                            <Field label="Frecuencia" value={form.cadence} onChange={set('cadence')} full={false}
                                placeholder="Ej: 4 reels + 3 carruseles por semana" />
                            <Field label="Audiencia" value={form.audience} onChange={set('audience')} rows={2}
                                placeholder="Edad, ciudad, intereses, qué los mueve, qué consumen" />
                        </Section>

                        <Section icon={Mic2} title="VOZ Y MENSAJE" color="#fbbf24">
                            <Field label="Tono de voz" value={form.voice} onChange={set('voice')} rows={2} full={false}
                                placeholder="Ej: Directo, underground, sin clichés de fiesta" />
                            <Field label="Idioma / jerga" value={form.language} onChange={set('language')} rows={2} full={false}
                                placeholder="Ej: Español panameño + términos en inglés de la escena" />
                            <Field label="Fórmulas de hooks que funcionan" hint="una por línea" value={form.hooks} onChange={set('hooks')} rows={4}
                                placeholder={'Ej: "El artista que nadie conoce y va a romper este año..."'} />
                            <Field label="CTAs" hint="uno por línea" value={form.ctas} onChange={set('ctas')} rows={3} />
                        </Section>

                        <Section icon={Layers} title="CONTENIDO" color="#60a5fa">
                            <Field label="Pilares de contenido" hint="uno por línea" value={form.pillars} onChange={set('pillars')} rows={4} full={false}
                                placeholder={'Lineups y anuncios\nRecaps de eventos\nCultura de la escena'} />
                            <Field label="Formatos que sube" hint="uno por línea" value={form.formats} onChange={set('formats')} rows={4} full={false}
                                placeholder={'Reel 9:16\nCarrusel 1080x1350\nYouTube largo\nShorts / clips'} />
                            <Field label="Hashtags base" value={form.hashtags} onChange={set('hashtags')} />
                        </Section>

                        <Section icon={Palette} title="IDENTIDAD VISUAL" color="#e1306c">
                            <div className="social-field full">
                                <label>Paleta de colores <span className="dna-hint">códigos hex</span></label>
                                <div className="dna-palette-row">
                                    <input type="text" placeholder="#0A0A0A #D4AF37 #FFFFFF" value={form.palette} onChange={e => set('palette')(e.target.value)} />
                                    <div className="dna-swatches">
                                        {palette.map(c => <span key={c} className="dna-swatch" style={{ background: c }} title={c} />)}
                                    </div>
                                </div>
                            </div>
                            <Field label="Tipografía" value={form.typography} onChange={set('typography')} full={false}
                                placeholder="Ej: Titulares Druk Wide, texto Inter" />
                            <Field label="Logo (URL)" value={form.logoUrl} onChange={set('logoUrl')} full={false} />
                            <Field label="Estilo visual / diseño" value={form.style} onChange={set('style')} rows={2}
                                placeholder="Ej: Oscuro, grano de película, flashes, tipografía gigante" />
                            <Field label="Edición y ritmo" value={form.editing} onChange={set('editing')} rows={2} full={false}
                                placeholder="Ej: Cortes al beat, 1-2s por toma, transiciones de flash" />
                            <Field label="Subtítulos / texto en pantalla" value={form.subtitles} onChange={set('subtitles')} rows={2} full={false}
                                placeholder="Ej: Palabra por palabra, mayúsculas, blanco con borde negro" />
                            <Field label="Música y sonido" value={form.music} onChange={set('music')} rows={2}
                                placeholder="Ej: Techno melódico, drops sincronizados, SFX de whoosh" />
                        </Section>

                        <Section icon={ShieldCheck} title="REGLAS" color="#34d399">
                            <Field label="Siempre" hint="una por línea" value={form.dos} onChange={set('dos')} rows={4} full={false} />
                            <Field label="Nunca" hint="una por línea" value={form.donts} onChange={set('donts')} rows={4} full={false} />
                        </Section>

                        <Section icon={Link2} title="REFERENCIAS" color="#f97316">
                            <Field label="Referencias" hint="una por línea: URL — qué tomar de ahí" value={form.references} onChange={set('references')} rows={4}
                                placeholder={'https://instagram.com/p/... — ritmo de edición\nhttps://youtube.com/... — estilo de subtítulos'} />
                            <Field label="Notas libres" value={form.notes} onChange={set('notes')} rows={3} />
                        </Section>
                    </div>

                    <div className="social-modal-footer dna-footer">
                        <div className="dna-export-actions">
                            <button type="button" className="social-btn-secondary" onClick={handleCopy}>
                                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar para LLM'}
                            </button>
                            <button type="button" className="social-btn-secondary" onClick={handleDownload}>
                                <Download size={14} /> .md
                            </button>
                        </div>
                        <div className="dna-export-actions">
                            <button type="button" className="social-btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="social-btn-primary">
                                <Sparkles size={14} /> Guardar ADN
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
