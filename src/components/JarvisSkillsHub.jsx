import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, Music, Utensils, Zap, Play, Pause, Volume2, VolumeX,
    Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink, Send,
    MessageSquare, Copy, Check, ChevronRight, Sliders, Clock,
    Layers, Bot, ArrowRight, ShieldCheck, RefreshCw, Radio, FileText,
    Headphones, Coffee, Flame, Moon, Award, Info,
    Terminal, Cpu, Server, Download, Activity, PlayCircle, Settings,
    Maximize2, Minimize2, Power, Globe, Database
} from 'lucide-react';
import OpenClawBrainService from '../services/OpenClawBrainService';

// Presets de música con parámetros sonoros y enlaces
const MUSIC_PRESETS = [
    {
        id: 'deep_focus',
        name: 'Deep Focus & Techno',
        bpm: 126,
        genre: 'Hypnotic Deep Techno',
        color: '#8b5cf6',
        icon: Headphones,
        desc: 'Frecuencias bajas binaurales y pulso 4/4 hipnótico para programación y sprints.',
        baseFreq: 110,
        spotifyQuery: 'deep focus techno 126 bpm',
        appleMusicQuery: 'deep techno focus',
        soundcloudQuery: 'deep techno 126 bpm'
    },
    {
        id: 'casco_sunset',
        name: 'Casco Sunset & Afro House',
        bpm: 122,
        genre: 'Afro & Melodic House',
        color: '#f59e0b',
        icon: Coffee,
        desc: 'Vibes cálidas de Terraplén Rooftop, atardecer en Casco Antiguo y percusión tribal.',
        baseFreq: 146.83,
        spotifyQuery: 'afro house sunset casco',
        appleMusicQuery: 'afro house sunset',
        soundcloudQuery: 'afro house sunset vibes'
    },
    {
        id: 'furia',
        name: 'Furia High Energy Club',
        bpm: 130,
        genre: 'Peak Time Nightclub',
        color: '#ef4444',
        icon: Flame,
        desc: 'Energía máxima, sintetizadores contundentes y ambientación para club de alto voltaje.',
        baseFreq: 130.81,
        spotifyQuery: 'peak time techno high energy',
        appleMusicQuery: 'club high energy',
        soundcloudQuery: 'peak time techno furia'
    },
    {
        id: 'lofi',
        name: 'Lofi Coffee Beats',
        bpm: 85,
        genre: 'Lofi Chillhop & Jazz Beats',
        color: '#10b981',
        icon: Moon,
        desc: 'Texturas de vinilo cálidas, acordes relajados y ambiente acústico para brainstorming.',
        baseFreq: 220,
        spotifyQuery: 'lofi beats to study work',
        appleMusicQuery: 'lofi hip hop chill',
        soundcloudQuery: 'lofi study beats'
    },
    {
        id: 'speakeasy_jazz',
        name: 'Speakeasy Jazz & Soul',
        bpm: 90,
        genre: 'Classic Piano Bar Jazz',
        color: '#06b6d4',
        icon: Award,
        desc: 'Ambiente íntimo de Piano Bar Casco, acordes menores de piano y contrabajo.',
        baseFreq: 164.81,
        spotifyQuery: 'speakeasy jazz piano bar',
        appleMusicQuery: 'jazz club speakeasy',
        soundcloudQuery: 'speakeasy jazz piano'
    }
];

// Restaurantes y menús en Panamá / Casco Antiguo
const RESTAURANTS = [
    {
        id: 'sushi_market',
        name: 'Sushi Market Casco',
        cuisine: 'Japonesa & Nikkei',
        eta: '25-35 min',
        rating: '4.9 ★',
        phone: '+50762001122',
        color: '#ec4899',
        menu: [
            { id: 'sm-1', name: 'Dragon Roll Especial (10 pcs)', price: 15.50, desc: 'Langostino tempura, anguila y aguacate con salsa unagi.' },
            { id: 'sm-2', name: 'Spicy Tuna Tartar Bowl', price: 14.00, desc: 'Atún fresco spicy, arroz de sushi, edamame y wakame.' },
            { id: 'sm-3', name: 'Edamame Trufado al Vapor', price: 7.50, desc: 'Edamame con flor de sal marina y aceite de trufa blanca.' },
            { id: 'sm-4', name: 'Kombucha de Maracuyá Orgánica', price: 4.50, desc: 'Bebida fermentada refrescante artesanal.' }
        ]
    },
    {
        id: 'cafe_unido',
        name: 'Café Unido Casco',
        cuisine: 'Especialidad & Brunch',
        eta: '15-25 min',
        rating: '4.9 ★',
        phone: '+50763002233',
        color: '#10b981',
        menu: [
            { id: 'cu-1', name: 'Geisha Cold Brew 12oz', price: 5.50, desc: 'Extracción en frío de café Geisha de Boquete, floral y cítrico.' },
            { id: 'cu-2', name: 'Avocado Sourdough Toast', price: 9.50, desc: 'Pan de masa madre tostado, aguacate, rabanito y queso feta.' },
            { id: 'cu-3', name: 'Burrito de Desayuno Operativo', price: 10.50, desc: 'Huevos revueltos, bacon artesanal, pico de gallo y queso cheddar.' },
            { id: 'cu-4', name: 'Bowl de Açai & Granola Orgánica', price: 8.50, desc: 'Açai silvestre, frutas frescas de temporada y miel de abeja.' }
        ]
    },
    {
        id: 'tacos_neta',
        name: 'Tacos La Neta',
        cuisine: 'Mexicana Auténtica',
        eta: '20-30 min',
        rating: '4.8 ★',
        phone: '+50764003344',
        color: '#f59e0b',
        menu: [
            { id: 'tn-1', name: 'Tacos al Pastor (Orden de 4)', price: 11.50, desc: 'Cerdo marinado al trompo con piña asada, cilantro y cebolla.' },
            { id: 'tn-2', name: 'Quesabirrias con Consomé', price: 13.50, desc: 'Tortillas doradas con queso fundido y carne de birria tierna.' },
            { id: 'tn-3', name: 'Guacamole Supremo con Totopos', price: 7.50, desc: 'Aguacate hass machacado con totopos recién fritos.' },
            { id: 'tn-4', name: 'Agua Fresca de Horchata 16oz', price: 3.50, desc: 'Receta tradicional con canela y leche de arroz.' }
        ]
    },
    {
        id: 'makoto_vip',
        name: 'Makoto Panama VIP',
        cuisine: 'Robata & Fine Dining',
        eta: '30-45 min',
        rating: '5.0 ★',
        phone: '+50765004455',
        color: '#8b5cf6',
        menu: [
            { id: 'mk-1', name: 'Robata Wagyu Skewers (2 pcs)', price: 26.00, desc: 'Brochetas de Wagyu A5 a la parrilla de carbón japonés Binchotan.' },
            { id: 'mk-2', name: 'Truffle Wagyu Slider Box', price: 22.50, desc: 'Mini hamburguesas de Wagyu con queso manchego y trufa.' },
            { id: 'mk-3', name: 'Arroz Frito Makoto con Cangrejo', price: 18.00, desc: 'Arroz al wok con cangrejo de nieve y aceite de sésamo.' },
            { id: 'mk-4', name: 'Té Matcha Ceremonial Frío', price: 6.00, desc: 'Matcha Uji grado ceremonial batido al momento.' }
        ]
    },
    {
        id: 'american_bites',
        name: 'American Bites & Smash',
        cuisine: 'Gourmet Smash Burgers',
        eta: '20-35 min',
        rating: '4.7 ★',
        phone: '+50766005566',
        color: '#ef4444',
        menu: [
            { id: 'ab-1', name: 'Double Bacon Cheddar Smash', price: 12.50, desc: 'Doble carne smash caramelizada, bacon crujiente y salsa especial.' },
            { id: 'ab-2', name: 'Papas Trufadas con Parmesano', price: 6.50, desc: 'Papas fritas con romero fresco, aceite de trufa y queso parmesano.' },
            { id: 'ab-3', name: 'Tenders Crujientes de Pollo (6 pcs)', price: 9.50, desc: 'Pechuga rebozada en panko con salsa honey mustard artesanal.' },
            { id: 'ab-4', name: 'Milkshake de Caramelo Salado', price: 5.50, desc: 'Helado premium de vainilla con sirope de caramelo salado.' }
        ]
    }
];

// Miembros frecuentes del equipo de ARRIVE
const TEAM_MEMBERS = [
    'GG', 'Mateo L.', 'Gabriel G.', 'Andrés V.', 'Fanny', 'Joshua', 'Mario', 'Andrea'
];

export default function JarvisSkillsHub({ onOpenChat, onAddActivity, onAddTask }) {
    const [subTab, setSubTab] = useState('openjarvis_app'); // 'openjarvis_app' | 'openjarvis_chat' | 'openjarvis_cli' | 'music' | 'food' | 'teach' | 'skills'
    const [voiceFeedback, setVoiceFeedback] = useState(true);

    // --- Music Player State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [activePreset, setActivePreset] = useState(MUSIC_PRESETS[0]);
    const [volume, setVolume] = useState(80);
    const [isMuted, setIsMuted] = useState(false);

    // AudioContext Ref & Nodes
    const audioCtxRef = useRef(null);
    const masterGainRef = useRef(null);
    const synthNodesRef = useRef([]);
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const analyserRef = useRef(null);

    // --- Food Concierge State ---
    const [selectedRestaurant, setSelectedRestaurant] = useState(RESTAURANTS[0]);
    const [cart, setCart] = useState([]);
    const [selectedDiners, setSelectedDiners] = useState(['GG', 'Mateo L.']);
    const [orderNotes, setOrderNotes] = useState('Entregar en oficina Casco Antiguo / Terraplén Rooftop. Salsa aparte.');
    const [foodFeedback, setFoodFeedback] = useState(null);
    const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

    // --- Teach Jarvis / Automation Builder State ---
    const [skillName, setSkillName] = useState('');
    const [skillCategory, setSkillCategory] = useState('operaciones');
    const [skillTrigger, setSkillTrigger] = useState('');
    const [skillDescription, setSkillDescription] = useState('');
    const [skillSteps, setSkillSteps] = useState([
        { id: '1', type: 'music', preset: 'casco_sunset', label: 'Sintonizar Casco Sunset & Afro House' },
        { id: '2', type: 'task', text: 'Revisión técnica de sonido en Terraplén Rooftop', venue: 'Terraplén Rooftop', priority: 'high', label: 'Crear tarea en calendario' },
        { id: '3', type: 'notification', text: '🌅 Modo Sunset Casco activado por Jarvis.', label: 'Notificación HUD' }
    ]);
    const [testRunStep, setTestRunStep] = useState(null);
    const [testRunSuccess, setTestRunSuccess] = useState(false);
    const [teachFeedback, setTeachFeedback] = useState(null);

    // --- Learned Skills List State ---
    const [learnedSkills, setLearnedSkills] = useState([]);
    const [executingSkillId, setExecutingSkillId] = useState(null);

    // --- OpenJarvis Local Engine State ---
    const [openJarvisStatus, setOpenJarvisStatus] = useState(null);
    const [openJarvisLoading, setOpenJarvisLoading] = useState(false);
    const [cliCommand, setCliCommand] = useState('doctor');
    const [cliOutput, setCliOutput] = useState('');
    const [cliExecuting, setCliExecuting] = useState(false);
    const [copiedOneLiner, setCopiedOneLiner] = useState(false);
    const [copiedCliOutput, setCopiedCliOutput] = useState(false);

    // --- Embedded OpenJarvis Program State ---
    const [iframeLoading, setIframeLoading] = useState(true);
    const [iframeKey, setIframeKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [syncingContext, setSyncingContext] = useState(false);
    const [contextSyncResult, setContextSyncResult] = useState(null);
    const [controllingDaemon, setControllingDaemon] = useState(false);

    // --- Integrated ARRIVE Chat State ---
    const [ojChatInput, setOjChatInput] = useState('');
    const [ojChatHistory, setOjChatHistory] = useState([
        {
            role: 'assistant',
            content: 'Hola. Soy OpenJarvis, la Inteligencia Artificial Personal Oficial de Stanford, ejecutándose directamente en tu macOS. Estoy conectado en tiempo real a tus eventos de ARRIVE en Panamá, tareas operativas, sintetizador acústico de techno/afro house, concierge de comida de Casco Antiguo y AirCloud. ¿En qué te asisto hoy?'
        }
    ]);
    const [ojChatLoading, setOjChatLoading] = useState(false);

    // ─── Initialize Data & Audio ──────────────────────────────────────
    useEffect(() => {
        loadSkills();
        loadOpenJarvisStatus();
    }, []);

    const loadSkills = async () => {
        const skills = await OpenClawBrainService.getJarvisSkills();
        setLearnedSkills(skills);
    };

    const loadOpenJarvisStatus = async () => {
        setOpenJarvisLoading(true);
        const status = await OpenClawBrainService.getOpenJarvisStatus();
        setOpenJarvisStatus(status);
        setOpenJarvisLoading(false);
    };

    const handleReloadIframe = () => {
        setIframeLoading(true);
        setIframeKey(k => k + 1);
    };

    const handleSyncDashboardContext = async () => {
        setSyncingContext(true);
        speakJarvis('Sincronizando eventos y tareas con OpenJarvis.');
        const res = await OpenClawBrainService.syncOpenJarvisDashboardContext();
        setContextSyncResult(res);
        setSyncingContext(false);
        if (res && res.success) {
            speakJarvis(`Contexto sincronizado: ${res.eventsCount} eventos y ${res.tasksCount} tareas cargadas.`);
        }
        setTimeout(() => setContextSyncResult(null), 4000);
    };

    const handleControlDaemon = async (action) => {
        setControllingDaemon(true);
        speakJarvis(`Operación en daemon OpenJarvis: ${action}`);
        await OpenClawBrainService.controlOpenJarvisDaemon(action);
        await new Promise(r => setTimeout(r, 1800));
        await loadOpenJarvisStatus();
        setControllingDaemon(false);
        handleReloadIframe();
    };

    const handleSendOjChat = async (textToSend = ojChatInput) => {
        const text = (typeof textToSend === 'string' ? textToSend : ojChatInput).trim();
        if (!text) return;
        const userMsg = { role: 'user', content: text };
        setOjChatHistory(prev => [...prev, userMsg]);
        setOjChatInput('');
        setOjChatLoading(true);

        // Check if user is asking to play music or order food
        const lower = text.toLowerCase();
        if (lower.includes('musica') || lower.includes('música') || lower.includes('techno') || lower.includes('focus')) {
            const preset = MUSIC_PRESETS.find(p => p.id === 'deep_focus') || MUSIC_PRESETS[0];
            handleTogglePlay(preset);
        } else if (lower.includes('afro') || lower.includes('casco sunset') || lower.includes('chill')) {
            const preset = MUSIC_PRESETS.find(p => p.id === 'casco_sunset') || MUSIC_PRESETS[1];
            handleTogglePlay(preset);
        } else if (lower.includes('furia') || lower.includes('club') || lower.includes('energia') || lower.includes('energía')) {
            const preset = MUSIC_PRESETS.find(p => p.id === 'furia') || MUSIC_PRESETS[2];
            handleTogglePlay(preset);
        }

        const res = await OpenClawBrainService.chatOpenJarvis(text, ojChatHistory);
        const reply = res.reply || 'Sin respuesta del motor.';
        setOjChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
        setOjChatLoading(false);
        speakJarvis(reply.slice(0, 150));
    };

    const handleRunOpenJarvisCommand = async (cmd = cliCommand) => {
        setCliExecuting(true);
        setCliCommand(cmd);
        speakJarvis(`Ejecutando OpenJarvis ${cmd}`);
        const res = await OpenClawBrainService.execOpenJarvis(cmd);
        setCliOutput(res.output || 'Sin respuesta del proceso OpenJarvis.');
        setCliExecuting(false);
    };

    const handleCopyOneLiner = () => {
        navigator.clipboard.writeText('curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash');
        setCopiedOneLiner(true);
        setTimeout(() => setCopiedOneLiner(false), 2000);
    };

    const handleCopyCliOutput = () => {
        navigator.clipboard.writeText(cliOutput);
        setCopiedCliOutput(true);
        setTimeout(() => setCopiedCliOutput(false), 2000);
    };

    // Voice Synthesis Helper
    const speakJarvis = (text) => {
        if (!voiceFeedback || typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.pitch = 0.95;
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    };

    // ─── Web Audio API Synthesizer ────────────────────────────────────
    const stopAudioSynth = () => {
        if (synthNodesRef.current.length > 0) {
            synthNodesRef.current.forEach(node => {
                try { node.stop(); node.disconnect(); } catch (e) {}
            });
            synthNodesRef.current = [];
        }
    };

    const startAudioSynth = (preset) => {
        try {
            stopAudioSynth();

            if (!audioCtxRef.current) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                audioCtxRef.current = new AudioCtxClass();
            }

            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // Create Master Gain & Analyser
            const masterGain = ctx.createGain();
            const volVal = isMuted ? 0 : (volume / 100) * 0.28;
            masterGain.gain.setValueAtTime(volVal, ctx.currentTime);
            masterGainRef.current = masterGain;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            masterGain.connect(analyser);
            analyser.connect(ctx.destination);

            const nodes = [];
            const baseF = preset.baseFreq || 120;

            // 1. Warm Root Tone (Sine / Triangle)
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(baseF, ctx.currentTime);

            const filter1 = ctx.createBiquadFilter();
            filter1.type = 'lowpass';
            filter1.frequency.setValueAtTime(800, ctx.currentTime);

            osc1.connect(filter1);
            filter1.connect(masterGain);
            osc1.start();
            nodes.push(osc1);

            // 2. Harmonic Drone (Fifth / Octave)
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(baseF * 1.5, ctx.currentTime);

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0.35, ctx.currentTime);

            osc2.connect(gain2);
            gain2.connect(masterGain);
            osc2.start();
            nodes.push(osc2);

            // 3. Sub-Bass Pulse LFO (simulating BPM heartbeat)
            const lfo = ctx.createOscillator();
            const lfoRate = preset.bpm / 60; // beats per second
            lfo.frequency.setValueAtTime(lfoRate, ctx.currentTime);

            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(baseF * 0.08, ctx.currentTime);

            lfo.connect(osc1.frequency);
            lfo.start();
            nodes.push(lfo);

            synthNodesRef.current = nodes;
        } catch (err) {
            console.warn('[JarvisAudio] Web Audio synth error:', err);
        }
    };

    // Toggle Play/Pause
    const handleTogglePlay = (targetPreset = activePreset) => {
        if (isPlaying && targetPreset.id === activePreset.id) {
            stopAudioSynth();
            setIsPlaying(false);
            OpenClawBrainService.controlJarvisMusic('pause', activePreset.id, volume);
            speakJarvis('Audio pausado, señor.');
        } else {
            setActivePreset(targetPreset);
            startAudioSynth(targetPreset);
            setIsPlaying(true);
            OpenClawBrainService.controlJarvisMusic('play', targetPreset.id, volume);
            speakJarvis(`Sintonizando ${targetPreset.name}.`);
        }
    };

    // Handle Volume Change
    const handleVolumeChange = (newVol) => {
        setVolume(newVol);
        setIsMuted(false);
        if (masterGainRef.current && audioCtxRef.current) {
            masterGainRef.current.gain.setValueAtTime((newVol / 100) * 0.28, audioCtxRef.current.currentTime);
        }
    };

    // Toggle Mute
    const handleToggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        if (masterGainRef.current && audioCtxRef.current) {
            masterGainRef.current.gain.setValueAtTime(nextMute ? 0 : (volume / 100) * 0.28, audioCtxRef.current.currentTime);
        }
    };

    // Visualizer Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            if (!isPlaying) {
                // Idle flat line with subtle pulse
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 2;
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.stroke();
                return;
            }

            const analyser = analyserRef.current;
            if (!analyser) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const barWidth = (width / bufferLength) * 2.2;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * (height * 0.85);

                const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
                grad.addColorStop(0, activePreset.color || '#06b6d4');
                grad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');

                ctx.fillStyle = grad;
                ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isPlaying, activePreset]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            stopAudioSynth();
            if (audioCtxRef.current) {
                try { audioCtxRef.current.close(); } catch (e) {}
            }
        };
    }, []);

    // ─── Food Concierge Helpers ───────────────────────────────────────
    const handleAddToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const handleUpdateCartQty = (id, delta) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === id) {
                    const nextQty = item.qty + delta;
                    return nextQty > 0 ? { ...item, qty: nextQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    };

    const handleClearCart = () => setCart([]);

    const toggleDiner = (member) => {
        setSelectedDiners(prev => {
            if (prev.includes(member)) {
                return prev.length > 1 ? prev.filter(m => m !== member) : prev;
            }
            return [...prev, member];
        });
    };

    // Calculate Food Totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itbms = subtotal * 0.07;
    const tip = subtotal * 0.10;
    const grandTotal = subtotal + itbms + tip;

    // Generate WhatsApp Text
    const generateWhatsAppOrderText = () => {
        return `🍔 *PEDIDO ARRIVE COMMAND CENTER*\n` +
            `📍 *Destino:* Casco Antiguo / Oficina & Venues\n` +
            `🏢 *Restaurante:* ${selectedRestaurant.name}\n` +
            `👥 *Comensales:* ${selectedDiners.join(', ')}\n` +
            `────────────────────\n` +
            cart.map(i => `• ${i.qty}x ${i.name} ($${(i.price * i.qty).toFixed(2)})`).join('\n') +
            `\n────────────────────\n` +
            `Subtotal: $${subtotal.toFixed(2)}\n` +
            `ITBMS (7%): $${itbms.toFixed(2)}\n` +
            `Propina sugerida (10%): $${tip.toFixed(2)}\n` +
            `*TOTAL ESTIMADO:* $${grandTotal.toFixed(2)}\n\n` +
            `📝 *Notas especiales:* ${orderNotes}\n` +
            `⚡ *Generado automáticamente por Jarvis Concierge*`;
    };

    const handleCopyWhatsApp = () => {
        const text = generateWhatsAppOrderText();
        navigator.clipboard.writeText(text);
        setCopiedWhatsApp(true);
        setTimeout(() => setCopiedWhatsApp(false), 2200);
    };

    const handleSendWhatsApp = () => {
        const text = encodeURIComponent(generateWhatsAppOrderText());
        const phone = selectedRestaurant.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        speakJarvis(`Abriendo WhatsApp para despachar el pedido a ${selectedRestaurant.name}.`);
    };

    const handleOpenPedidosYa = () => {
        const query = encodeURIComponent(selectedRestaurant.name);
        window.open(`https://www.pedidosya.com.pa/restaurantes/panama?q=${query}`, '_blank');
    };

    const handleRegisterFoodExpense = async () => {
        if (cart.length === 0) return;
        const itemsList = cart.map(i => `${i.qty}x ${i.name}`);
        const res = await OpenClawBrainService.orderJarvisFood(
            selectedRestaurant.name,
            itemsList,
            selectedDiners,
            orderNotes
        );
        if (onAddTask) {
            onAddTask({
                text: `Coordinar entrega de comida: ${selectedRestaurant.name} ($${grandTotal.toFixed(2)})`,
                priority: 'high',
                venue: 'Casco Antiguo',
                category: 'Catering & Logística',
                assignedTo: 'Mateo L. (Operations Lead)'
            });
        }
        if (onAddActivity) {
            onAddActivity(`🍔 Pedido de ${selectedRestaurant.name} registrado en Command Center por $${grandTotal.toFixed(2)}`, '#f59e0b');
        }
        setFoodFeedback(`¡Pedido registrado exitosamente! Se creó la tarea logística para el equipo.`);
        speakJarvis(`Pedido registrado en el sistema. Total de ${grandTotal.toFixed(2)} dólares.`);
        setTimeout(() => setFoodFeedback(null), 4000);
    };

    // ─── Teach Jarvis Automation Engine ──────────────────────────────
    const handleAddStep = () => {
        const newStep = {
            id: Date.now().toString(),
            type: 'task',
            text: 'Nueva tarea operativa para el equipo',
            venue: 'Casco Antiguo',
            priority: 'high',
            label: 'Crear tarea en calendario'
        };
        setSkillSteps(prev => [...prev, newStep]);
    };

    const handleRemoveStep = (id) => {
        setSkillSteps(prev => prev.filter(s => s.id !== id));
    };

    const handleUpdateStep = (id, field, value) => {
        setSkillSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    // Test Run Sequence
    const handleTestRunSequence = async () => {
        setTestRunSuccess(false);
        speakJarvis(`Iniciando prueba de secuencia de pasos para ${skillName || 'la habilidad'}.`);

        for (let i = 0; i < skillSteps.length; i++) {
            setTestRunStep(i);
            const step = skillSteps[i];

            if (step.type === 'music') {
                const targetPreset = MUSIC_PRESETS.find(p => p.id === step.preset) || MUSIC_PRESETS[0];
                handleTogglePlay(targetPreset);
            } else if (step.type === 'notification' && onAddActivity) {
                onAddActivity(`⚡ Jarvis Test Run: ${step.text || 'Notificación HUD activa'}`, '#06b6d4');
            }

            // Artificial delay for visual sequencing
            await new Promise(r => setTimeout(r, 700));
        }

        setTestRunStep(null);
        setTestRunSuccess(true);
        speakJarvis('Secuencia ejecutada exitosamente.');
        setTimeout(() => setTestRunSuccess(false), 3000);
    };

    // Save Skill
    const handleSaveSkill = async () => {
        if (!skillName.trim() || !skillTrigger.trim()) {
            setTeachFeedback({ type: 'error', text: 'Por favor asigna un nombre y una frase disparadora para la habilidad.' });
            return;
        }

        const newSkill = {
            id: `skill-${Date.now()}`,
            name: skillName.trim(),
            category: skillCategory,
            trigger: skillTrigger.trim().toLowerCase(),
            description: skillDescription.trim() || `Automatización enseñada a Jarvis: ${skillName}`,
            steps: skillSteps,
            enabled: true,
            createdAt: new Date().toISOString()
        };

        await OpenClawBrainService.saveJarvisSkill(newSkill);
        await loadSkills();

        setTeachFeedback({ type: 'success', text: `¡Habilidad "${skillName}" memorizada en el cerebro de Jarvis!` });
        speakJarvis(`He memorizado la habilidad ${skillName}. Lista para ejecutarse cuando digas ${skillTrigger}.`);

        // Reset form
        setSkillName('');
        setSkillTrigger('');
        setSkillDescription('');
        setTimeout(() => setTeachFeedback(null), 4000);
    };

    // Execute Learned Skill
    const handleExecuteSkill = async (skill) => {
        setExecutingSkillId(skill.id);
        speakJarvis(`Ejecutando ${skill.name}.`);

        const res = await OpenClawBrainService.executeJarvisSkill(skill.trigger || skill.name);

        if (res.success) {
            // Apply music step if present
            const musicStep = (skill.steps || []).find(s => s.type === 'music');
            if (musicStep) {
                const targetPreset = MUSIC_PRESETS.find(p => p.id === musicStep.preset) || MUSIC_PRESETS[0];
                handleTogglePlay(targetPreset);
            }
            if (onAddActivity) {
                onAddActivity(`⚡ Jarvis ejecutó habilidad aprendida: "${skill.name}"`, '#38bdf8');
            }
        }

        setExecutingSkillId(null);
    };

    // Delete Learned Skill
    const handleDeleteSkill = async (id) => {
        await OpenClawBrainService.deleteJarvisSkill(id);
        await loadSkills();
    };

    return (
        <div className="jarvis-hub-container" style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.1)'
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-120px',
                right: '-100px',
                width: '320px',
                height: '320px',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
                filter: 'blur(40px)'
            }} />

            {/* Jarvis HUD Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)'
                    }}>
                        <Sparkles size={24} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                JARVIS PROTOCOL & SKILLS HUB
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
                                v2.4 ONLINE
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                            Control inteligente de audio acústico, concierge de comidas y catering, y motor de automatizaciones aprendidas.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setVoiceFeedback(!voiceFeedback)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: voiceFeedback ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${voiceFeedback ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                            color: voiceFeedback ? '#38bdf8' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="Activar/Desactivar síntesis de voz Jarvis"
                    >
                        <Radio size={14} /> Voz Jarvis: {voiceFeedback ? 'ON' : 'OFF'}
                    </button>

                    {onOpenChat && (
                        <button
                            onClick={onOpenChat}
                            style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                                border: 'none',
                                color: 'white',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                            }}
                        >
                            <Bot size={15} /> Consola Chat
                        </button>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                OPENJARVIS DAEMON & ECOSYSTEM INTEGRATION BAR
            ══════════════════════════════════════════════════════════════ */}
            <div style={{
                marginBottom: '20px',
                padding: '16px 20px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 8px 24px rgba(6, 182, 212, 0.12)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '300px', flex: '1 1 auto' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(6, 182, 212, 0.5)',
                        flexShrink: 0
                    }}>
                        <Terminal size={22} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.3px' }}>
                                OpenJarvis Core Engine (Stanford Personal AI)
                            </span>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: '12px',
                                background: openJarvisStatus?.daemon?.running ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: openJarvisStatus?.daemon?.running ? '#10b981' : '#f59e0b',
                                border: `1px solid ${openJarvisStatus?.daemon?.running ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: openJarvisStatus?.daemon?.running ? '#10b981' : '#f59e0b',
                                    boxShadow: openJarvisStatus?.daemon?.running ? '0 0 6px #10b981' : 'none'
                                }} />
                                {openJarvisStatus?.daemon?.running
                                    ? `DAEMON ONLINE (PID ${openJarvisStatus.daemon.pid || '30406'} • Puerto 8000)`
                                    : 'DAEMON READY'}
                            </span>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)'
                            }}>
                                Motor: Gemini 3.5 Flash Lite
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                            Programa oficial ejecutándose localmente con inferencia en streaming, herramientas del sistema y sincronización directa con ARRIVE.
                        </p>
                    </div>
                </div>

                {/* Integration Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '11.5px',
                        color: '#67e8f9'
                    }}>
                        <code>curl -fsSL open-jarvis.github.io/OpenJarvis/install.sh | bash</code>
                    </div>

                    <button
                        onClick={handleCopyOneLiner}
                        style={{
                            padding: '6px 11px',
                            borderRadius: '8px',
                            background: copiedOneLiner ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.2)',
                            border: `1px solid ${copiedOneLiner ? '#10b981' : 'rgba(6, 182, 212, 0.4)'}`,
                            color: copiedOneLiner ? '#10b981' : '#38bdf8',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                        title="Copiar comando de instalación"
                    >
                        {copiedOneLiner ? <Check size={13} /> : <Copy size={13} />}
                        {copiedOneLiner ? 'Copiado' : 'Copiar'}
                    </button>

                    <button
                        onClick={handleSyncDashboardContext}
                        disabled={syncingContext}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: contextSyncResult?.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                            border: `1px solid ${contextSyncResult?.success ? '#10b981' : 'rgba(56, 189, 248, 0.4)'}`,
                            color: contextSyncResult?.success ? '#10b981' : '#38bdf8',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: syncingContext ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                        title="Inyectar eventos, tareas, catering y AirCloud en la memoria de OpenJarvis"
                    >
                        <Database size={13} className={syncingContext ? 'animate-spin' : ''} />
                        {syncingContext ? 'Sincronizando...' : contextSyncResult?.success ? '¡Sincronizado!' : 'Sincronizar Dashboard'}
                    </button>

                    <button
                        onClick={() => handleControlDaemon(openJarvisStatus?.daemon?.running ? 'restart' : 'start')}
                        disabled={controllingDaemon}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: controllingDaemon ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                        title="Reiniciar demonio de OpenJarvis"
                    >
                        <RefreshCw size={13} className={controllingDaemon ? 'animate-spin' : ''} />
                        {controllingDaemon ? 'Cargando...' : 'Reiniciar Daemon'}
                    </button>

                    <button
                        onClick={() => window.open('http://127.0.0.1:8000', '_blank')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                            border: 'none',
                            color: 'white',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 10px rgba(6, 182, 212, 0.35)'
                        }}
                        title="Abrir aplicación web oficial de OpenJarvis en pestaña independiente"
                    >
                        <ExternalLink size={13} /> Abrir Ventana
                    </button>
                </div>
            </div>

            {/* Sub Tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '22px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '12px',
                overflowX: 'auto'
            }}>
                {[
                    { id: 'openjarvis_app', label: '🖥️ App Oficial OpenJarvis', icon: Globe, badge: openJarvisStatus?.daemon?.running ? 'ONLINE' : 'DAEMON' },
                    { id: 'openjarvis_chat', label: '💬 Chat Integrado ARRIVE', icon: Bot, badge: 'CONECTADO' },
                    { id: 'openjarvis_cli', label: '⚡ Consola & Presets CLI', icon: Terminal, badge: 'STANFORD' },
                    { id: 'music', label: '🎵 Audio & Focus Synth', icon: Music, badge: isPlaying ? 'PLAYING' : null },
                    { id: 'food', label: '🍔 Concierge Casco & Catering', icon: Utensils, badge: cart.length > 0 ? `${cart.length}` : null },
                    { id: 'teach', label: '⚡ Automatizador de Tareas', icon: Zap, badge: 'MACROS' },
                    { id: 'skills', label: '🧠 Memoria de Skills', icon: Layers, badge: `${learnedSkills.length}` }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = subTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id)}
                            style={{
                                padding: '9px 16px',
                                borderRadius: '10px',
                                background: isActive ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${isActive ? 'transparent' : 'rgba(255, 255, 255, 0.08)'}`,
                                color: isActive ? '#ffffff' : '#cbd5e1',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {tab.badge && (
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    background: isActive ? '#0f172a' : 'rgba(56, 189, 248, 0.2)',
                                    color: isActive ? '#38bdf8' : '#38bdf8'
                                }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB 1: CONTROL DE MÚSICA & AUDIO HUD
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'music' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(280px, 1fr)', gap: '20px' }}>
                    {/* Active Deck & Visualizer */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: activePreset.color, fontWeight: 800, letterSpacing: '1px' }}>
                                        {activePreset.genre}
                                    </span>
                                    <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
                                        {activePreset.name}
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        Tempo: <strong>{activePreset.bpm} BPM</strong> | Motor: <strong>Web Audio Synthesizer</strong>
                                    </span>
                                </div>

                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    background: isPlaying ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    color: isPlaying ? '#4ade80' : '#94a3b8',
                                    border: `1px solid ${isPlaying ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: isPlaying ? '#22c55e' : '#94a3b8',
                                        boxShadow: isPlaying ? '0 0 8px #22c55e' : 'none'
                                    }} />
                                    {isPlaying ? 'ON AIR' : 'EN ESPERA'}
                                </div>
                            </div>

                            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '18px' }}>
                                {activePreset.desc}
                            </p>

                            {/* Canvas Visualizer */}
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.45)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '10px',
                                marginBottom: '18px',
                                height: '90px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <canvas
                                    ref={canvasRef}
                                    width={380}
                                    height={75}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Audio Controls */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <button
                                    onClick={() => handleTogglePlay(activePreset)}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: '10px',
                                        background: isPlaying ? '#ef4444' : 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 800,
                                        fontSize: '13.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: isPlaying ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(56, 189, 248, 0.4)'
                                    }}
                                >
                                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                                    {isPlaying ? 'Pausar Audio' : 'Iniciar Reproducción'}
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={handleToggleMute}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: 'none',
                                            color: isMuted ? '#ef4444' : 'white',
                                            cursor: 'pointer'
                                        }}
                                        title={isMuted ? 'Desmutear' : 'Mutear'}
                                    >
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                                        style={{ width: '100px', cursor: 'pointer', accentColor: '#38bdf8' }}
                                    />
                                    <span style={{ fontSize: '11.5px', color: '#94a3b8', width: '30px' }}>
                                        {isMuted ? '0%' : `${volume}%`}
                                    </span>
                                </div>
                            </div>

                            {/* External Links */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    O abrir stream:
                                </span>
                                <a
                                    href={`https://open.spotify.com/search/${encodeURIComponent(activePreset.spotifyQuery)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        color: '#4ade80',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    Spotify <ExternalLink size={10} />
                                </a>
                                <a
                                    href={`https://music.apple.com/search?term=${encodeURIComponent(activePreset.appleMusicQuery)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: '#f87171',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    Apple Music <ExternalLink size={10} />
                                </a>
                                <a
                                    href={`https://soundcloud.com/search?q=${encodeURIComponent(activePreset.soundcloudQuery)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        color: '#fbbf24',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    SoundCloud <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            Estaciones & Presets Curados
                        </h4>
                        {MUSIC_PRESETS.map(preset => {
                            const isCurrent = activePreset.id === preset.id;
                            const Icon = preset.icon;
                            return (
                                <div
                                    key={preset.id}
                                    onClick={() => handleTogglePlay(preset)}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${isCurrent ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.07)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '10px',
                                            background: `rgba(${preset.color === '#8b5cf6' ? '139, 92, 246' : preset.color === '#f59e0b' ? '245, 158, 11' : preset.color === '#ef4444' ? '239, 68, 68' : preset.color === '#10b981' ? '16, 185, 129' : '6, 182, 212'}, 0.2)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: preset.color
                                        }}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: isCurrent ? '#38bdf8' : 'white' }}>
                                                {preset.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {preset.genre} • <strong>{preset.bpm} BPM</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isCurrent && isPlaying ? (
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: '#22c55e',
                                                color: '#0f172a',
                                                fontWeight: 800
                                            }}>
                                                EN VIVO
                                            </span>
                                        ) : (
                                            <button style={{
                                                padding: '6px',
                                                borderRadius: '50%',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer'
                                            }}>
                                                <Play size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB 2: CONCIERGE DE COMIDA & CATERING
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'food' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
                    {/* Left: Restaurant Selector & Menu */}
                    <div>
                        {/* Restaurant Tabs */}
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '6px' }}>
                            {RESTAURANTS.map(rest => {
                                const isSel = selectedRestaurant.id === rest.id;
                                return (
                                    <button
                                        key={rest.id}
                                        onClick={() => setSelectedRestaurant(rest)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${isSel ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                                            color: isSel ? '#38bdf8' : '#cbd5e1',
                                            fontSize: '12.5px',
                                            fontWeight: isSel ? 700 : 500,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {rest.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected Restaurant Card */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                                        {selectedRestaurant.name}
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {selectedRestaurant.cuisine} • Estimado: <strong>{selectedRestaurant.eta}</strong> • {selectedRestaurant.rating}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={handleOpenPedidosYa}
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '6px',
                                            background: '#ea1d2c',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        PedidosYa <ExternalLink size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {selectedRestaurant.menu.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{item.name}</h5>
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                                                ${item.price.toFixed(2)}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 10px 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.4' }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAddToCart(item)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            color: '#38bdf8',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Plus size={13} /> Agregar al Pedido
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Order Summary & Dispatch */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '14px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Utensils size={16} color="#38bdf8" />
                                    Orden del Equipo
                                </h4>
                                {cart.length > 0 && (
                                    <button
                                        onClick={handleClearCart}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#ef4444',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Vaciar
                                    </button>
                                )}
                            </div>

                            {/* Team Diners Selector */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Comensales en la Oficina / Evento:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {TEAM_MEMBERS.map(member => {
                                        const isSelected = selectedDiners.includes(member);
                                        return (
                                            <span
                                                key={member}
                                                onClick={() => toggleDiner(member)}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                    border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                                                    color: isSelected ? '#38bdf8' : '#94a3b8',
                                                    fontSize: '11.5px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {member}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cart Items List */}
                            <div style={{
                                maxHeight: '180px',
                                overflowY: 'auto',
                                marginBottom: '14px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '8px 0'
                            }}>
                                {cart.length === 0 ? (
                                    <p style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                                        El carrito está vacío. Agrega ítems del menú.
                                    </p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{item.name}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>${item.price.toFixed(2)} c/u</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleUpdateCartQty(item.id, -1)}
                                                    style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', cursor: 'pointer' }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.qty}</span>
                                                <button
                                                    onClick={() => handleUpdateCartQty(item.id, 1)}
                                                    style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', cursor: 'pointer' }}
                                                >
                                                    +
                                                </button>
                                                <span style={{ fontSize: '12.5px', fontWeight: 700, width: '55px', textAlign: 'right' }}>
                                                    ${(item.price * item.qty).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Special Notes */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                    Instrucciones de entrega:
                                </label>
                                <input
                                    type="text"
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    placeholder="Ej: Salsa aparte, entregar en Terraplén Rooftop"
                                    style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        fontSize: '12px'
                                    }}
                                />
                            </div>

                            {/* Totals Breakdown */}
                            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#94a3b8' }}>
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#94a3b8' }}>
                                    <span>ITBMS (7%):</span>
                                    <span>${itbms.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#94a3b8' }}>
                                    <span>Propina sugerida (10%):</span>
                                    <span>${tip.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#38bdf8', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <span>Total Estimado:</span>
                                    <span>${grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div>
                            {foodFeedback && (
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    fontSize: '12px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <CheckCircle2 size={14} /> {foodFeedback}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={handleSendWhatsApp}
                                    disabled={cart.length === 0}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: cart.length === 0 ? 'rgba(255, 255, 255, 0.1)' : '#25d366',
                                        border: 'none',
                                        color: cart.length === 0 ? '#64748b' : '#0f172a',
                                        fontWeight: 800,
                                        fontSize: '13px',
                                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <MessageSquare size={16} /> Enviar Pedido por WhatsApp
                                </button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button
                                        onClick={handleCopyWhatsApp}
                                        disabled={cart.length === 0}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {copiedWhatsApp ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                        {copiedWhatsApp ? 'Copiado!' : 'Copiar Texto'}
                                    </button>

                                    <button
                                        onClick={handleRegisterFoodExpense}
                                        disabled={cart.length === 0}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            color: '#38bdf8',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <CheckCircle2 size={14} /> Registrar en Tareas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB 3: ENSEÑAR A JARVIS (AUTOMATION BUILDER)
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'teach' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Left: Skill Definition Form */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '14px',
                        padding: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <Zap size={20} color="#38bdf8" />
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                                Nueva Automatización / Habilidad
                            </h3>
                        </div>
                        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.4', marginBottom: '18px' }}>
                            Configura los parámetros clave y los pasos encadenados. Al guardarla, Jarvis podrá ejecutarla por voz, comando o chat.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                    Nombre de la Habilidad
                                </label>
                                <input
                                    type="text"
                                    value={skillName}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    placeholder="Ej: Iniciar Sunset Casco, Modo Sprint Código, Almuerzo Rápido..."
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: 'white',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                        Disparador / Frase Clave
                                    </label>
                                    <input
                                        type="text"
                                        value={skillTrigger}
                                        onChange={(e) => setSkillTrigger(e.target.value)}
                                        placeholder="Ej: sunset casco, modo fiesta"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            background: 'rgba(0, 0, 0, 0.35)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: '#38bdf8',
                                            fontWeight: 700,
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                        Categoría
                                    </label>
                                    <select
                                        value={skillCategory}
                                        onChange={(e) => setSkillCategory(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            background: '#0f172a',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: 'white',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="musica">Música & Audio</option>
                                        <option value="comida">Comida & Catering</option>
                                        <option value="operaciones">Operaciones & Tareas</option>
                                        <option value="eventos">Eventos & Nightlife</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                    Descripción / Instrucción
                                </label>
                                <textarea
                                    value={skillDescription}
                                    onChange={(e) => setSkillDescription(e.target.value)}
                                    placeholder="Describe qué hace esta habilidad para que Jarvis lo entienda en su memoria RAG..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: 'white',
                                        fontSize: '13px',
                                        resize: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Step Sequence Builder */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Layers size={17} color="#38bdf8" />
                                    Secuencia de Pasos ({skillSteps.length})
                                </h4>
                                <button
                                    onClick={handleAddStep}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        background: 'rgba(56, 189, 248, 0.15)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        color: '#38bdf8',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Plus size={13} /> Añadir Paso
                                </button>
                            </div>

                            {/* Steps List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                                {skillSteps.map((step, idx) => {
                                    const isTesting = testRunStep === idx;
                                    return (
                                        <div
                                            key={step.id}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: isTesting ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                                border: `1px solid ${isTesting ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        background: isTesting ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                                                        color: isTesting ? '#0f172a' : 'white',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {idx + 1}
                                                    </span>
                                                    <select
                                                        value={step.type}
                                                        onChange={(e) => handleUpdateStep(step.id, 'type', e.target.value)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: '#0f172a',
                                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                                            color: '#38bdf8',
                                                            fontSize: '12px',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        <option value="music">🎵 Sintonizar Música</option>
                                                        <option value="task">📋 Crear Tarea</option>
                                                        <option value="food">🍔 Armar Pedido de Comida</option>
                                                        <option value="notification">⚡ Alerta / Notificación HUD</option>
                                                    </select>
                                                </div>

                                                {skillSteps.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveStep(step.id)}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Step Specific Inputs */}
                                            {step.type === 'music' && (
                                                <select
                                                    value={step.preset || 'deep_focus'}
                                                    onChange={(e) => handleUpdateStep(step.id, 'preset', e.target.value)}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '12px' }}
                                                >
                                                    {MUSIC_PRESETS.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.bpm} BPM)</option>
                                                    ))}
                                                </select>
                                            )}

                                            {step.type === 'task' && (
                                                <input
                                                    type="text"
                                                    value={step.text || ''}
                                                    onChange={(e) => handleUpdateStep(step.id, 'text', e.target.value)}
                                                    placeholder="Descripción de la tarea operativa..."
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '12px' }}
                                                />
                                            )}

                                            {step.type === 'food' && (
                                                <select
                                                    value={step.restaurant || 'Sushi Market Casco'}
                                                    onChange={(e) => handleUpdateStep(step.id, 'restaurant', e.target.value)}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '12px' }}
                                                >
                                                    {RESTAURANTS.map(r => (
                                                        <option key={r.id} value={r.name}>{r.name} ({r.cuisine})</option>
                                                    ))}
                                                </select>
                                            )}

                                            {step.type === 'notification' && (
                                                <input
                                                    type="text"
                                                    value={step.text || ''}
                                                    onChange={(e) => handleUpdateStep(step.id, 'text', e.target.value)}
                                                    placeholder="Mensaje de alerta a desplegar..."
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '12px' }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Test & Save Actions */}
                        <div style={{ marginTop: '16px' }}>
                            {teachFeedback && (
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: teachFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: teachFeedback.type === 'success' ? '#4ade80' : '#f87171',
                                    fontSize: '12px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {teachFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                    {teachFeedback.text}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button
                                    onClick={handleTestRunSequence}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: testRunSuccess ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '12.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {testRunSuccess ? <Check size={15} /> : <Play size={15} />}
                                    {testRunSuccess ? '¡Secuencia OK!' : 'Probar Secuencia'}
                                </button>

                                <button
                                    onClick={handleSaveSkill}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 800,
                                        fontSize: '12.5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                                    }}
                                >
                                    <Sparkles size={15} /> Guardar en Jarvis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB 4: HABILIDADES APRENDIDAS
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'skills' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                                Memoria de Habilidades de Jarvis
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                                Habilidades activas en la base RAG de Jarvis. Puedes dispararlas hablándole al bot o haciendo clic en &quot;Ejecutar&quot;.
                            </p>
                        </div>
                        <button
                            onClick={() => setSubTab('teach')}
                            style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                border: 'none',
                                color: 'white',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Plus size={14} /> Enseñar Nueva
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {learnedSkills.map(skill => {
                            const isExecuting = executingSkillId === skill.id;
                            return (
                                <div
                                    key={skill.id}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.65)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{skill.name}</h4>
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#38bdf8',
                                                    fontWeight: 700,
                                                    display: 'inline-block',
                                                    marginTop: '2px'
                                                }}>
                                                    Disparador: &quot;{skill.trigger}&quot;
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSkill(skill.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                                                title="Eliminar habilidad"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '12px' }}>
                                            {skill.description}
                                        </p>

                                        {/* Steps Pill List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                                            {(skill.steps || []).map((step, sIdx) => (
                                                <div
                                                    key={sIdx}
                                                    style={{
                                                        fontSize: '11px',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                        color: '#94a3b8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{sIdx + 1}.</span>
                                                    {step.type === 'music' && `🎵 Preset de Música: ${step.preset}`}
                                                    {step.type === 'task' && `📋 Tarea: ${step.text?.slice(0, 32)}...`}
                                                    {step.type === 'food' && `🍔 Pedido en ${step.restaurant}`}
                                                    {step.type === 'notification' && `⚡ Notificación: ${step.text?.slice(0, 32)}...`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleExecuteSkill(skill)}
                                        disabled={isExecuting}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            background: isExecuting ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                            color: '#38bdf8',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: isExecuting ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Zap size={14} />
                                        {isExecuting ? 'Ejecutando...' : '⚡ Ejecutar Ahora'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB: PROGRAMA LITERAL OPENJARVIS WEB APPLICATION (STANFORD)
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'openjarvis_app' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* App Window Chrome Header */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        borderRadius: '12px 12px 0 0',
                        padding: '12px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }} />
                                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }} />
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '5px 12px',
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '12px',
                                color: '#67e8f9'
                            }}>
                                <span style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: openJarvisStatus?.daemon?.running ? '#10b981' : '#f59e0b',
                                    boxShadow: openJarvisStatus?.daemon?.running ? '0 0 8px #10b981' : 'none'
                                }} />
                                <span>http://127.0.0.1:8000/</span>
                                <span style={{ color: '#64748b', fontSize: '10px' }}>• [OpenJarvis Official Web OS]</span>
                            </div>
                        </div>

                        {/* Top Window Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={handleReloadIframe}
                                style={{
                                    padding: '5px 11px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#cbd5e1',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                                title="Recargar aplicación oficial de OpenJarvis"
                            >
                                <RefreshCw size={12} className={iframeLoading ? 'animate-spin' : ''} /> Recargar
                            </button>

                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                style={{
                                    padding: '5px 11px',
                                    borderRadius: '6px',
                                    background: isFullscreen ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${isFullscreen ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                                    color: isFullscreen ? '#67e8f9' : '#cbd5e1',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                                title="Alternar tamaño completo"
                            >
                                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                {isFullscreen ? 'Normal' : 'Pantalla Completa'}
                            </button>

                            <button
                                onClick={() => window.open('http://127.0.0.1:8000', '_blank')}
                                style={{
                                    padding: '5px 11px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                                title="Abrir en ventana independiente de navegador"
                            >
                                <ExternalLink size={12} /> Abrir Pestaña
                            </button>
                        </div>
                    </div>

                    {/* Iframe Viewport */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: isFullscreen ? '85vh' : '720px',
                        background: '#070b11',
                        borderRadius: '0 0 12px 12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        borderTop: 'none',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
                    }}>
                        {iframeLoading && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#070b11',
                                zIndex: 10,
                                gap: '14px'
                            }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    border: '3px solid rgba(6, 182, 212, 0.2)',
                                    borderTopColor: '#06b6d4',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                <div style={{ fontSize: '13px', color: '#67e8f9', fontWeight: 700 }}>
                                    Cargando el programa oficial OpenJarvis (localhost:8000)...
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Motor: Gemini 3.5 Flash Lite • Orquestador Local Activo
                                </div>
                            </div>
                        )}

                        <iframe
                            key={iframeKey}
                            src="http://127.0.0.1:8000"
                            title="OpenJarvis Official Web Application"
                            onLoad={() => setIframeLoading(false)}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                background: '#070b11'
                            }}
                            allow="microphone; clipboard-read; clipboard-write;"
                        />
                    </div>

                    {/* Integrated Dashboard & Things Dock */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 29, 0.9) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={16} color="#06b6d4" />
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                                    ARRIVE Command Center & Live Bridge
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '8px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#10b981'
                                }}>
                                    SINCRONIZACIÓN DISPONIBLE
                                </span>
                            </div>
                            <button
                                onClick={handleSyncDashboardContext}
                                disabled={syncingContext}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: syncingContext ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RefreshCw size={12} className={syncingContext ? 'animate-spin' : ''} />
                                Sincronizar Todo con OpenJarvis
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            <div
                                onClick={() => setSubTab('music')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Music size={14} /> Sintetizador Acústico
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                                    {isPlaying ? `Reproduciendo: ${activePreset.name}` : 'Pausado • Click para controlar'}
                                </div>
                            </div>

                            <div
                                onClick={() => setSubTab('food')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Utensils size={14} /> Concierge Casco
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                                    {cart.length > 0 ? `${cart.length} items en carrito` : '5 Restaurantes de Casco vinculados'}
                                </div>
                            </div>

                            <div
                                onClick={() => setSubTab('openjarvis_cli')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Terminal size={14} /> Shell & Doctor CLI
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                                    Diagnóstico, Presets y Comandos
                                </div>
                            </div>

                            <div
                                onClick={() => setSubTab('openjarvis_chat')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Bot size={14} /> Chat Integrado ARRIVE
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                                    Conversación con contexto total
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB: CHAT INTEGRADO ARRIVE + OPENJARVIS (GEMINI 3.5 FLASH LITE)
            ══════════════════════════════════════════════════════════════ */}
            {subTab === 'openjarvis_chat' && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '680px',
                    overflow: 'hidden',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Chat Header */}
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(10, 15, 29, 0.95)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Bot size={20} color="#ffffff" />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                                    OpenJarvis Interactive Chat OS
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    Motor: Gemini 3.5 Flash Lite • Conectado a Eventos, Tareas, Música y Comida
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={handleSyncDashboardContext}
                                disabled={syncingContext}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    background: 'rgba(6, 182, 212, 0.15)',
                                    border: '1px solid rgba(6, 182, 212, 0.35)',
                                    color: '#67e8f9',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <Database size={12} /> Sincronizar Contexto
                            </button>

                            <button
                                onClick={() => setOjChatHistory([
                                    {
                                        role: 'assistant',
                                        content: 'Historial reiniciado. ¿En qué te asisto ahora?'
                                    }
                                ])}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#94a3b8',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                }}
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div style={{
                        flex: 1,
                        padding: '20px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        {ojChatHistory.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                                        gap: '10px'
                                    }}
                                >
                                    {!isUser && (
                                        <div style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '8px',
                                            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px'
                                        }}>
                                            <Sparkles size={16} color="#ffffff" />
                                        </div>
                                    )}
                                    <div style={{
                                        maxWidth: '78%',
                                        padding: '12px 16px',
                                        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                        background: isUser ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'rgba(15, 23, 42, 0.9)',
                                        border: `1px solid ${isUser ? 'transparent' : 'rgba(255, 255, 255, 0.1)'}`,
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        lineHeight: '1.55',
                                        whiteSpace: 'pre-wrap',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}

                        {ojChatLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '12.5px' }}>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>OpenJarvis pensando respuesta con Gemini 3.5...</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Suggestion Chips */}
                    <div style={{
                        padding: '8px 16px',
                        background: 'rgba(10, 15, 29, 0.7)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto'
                    }}>
                        {[
                            { text: '🎵 Pon música de techno para programar', label: 'Techno Focus' },
                            { text: '🍔 Qué menús hay en Casco Antiguo para pedir ahora?', label: 'Comida Casco' },
                            { text: '📅 Qué eventos tenemos programados en ARRIVE?', label: 'Eventos ARRIVE' },
                            { text: '☁️ Verifica la sincronización de archivos en AirCloud', label: 'AirCloud' }
                        ].map((chip, cIdx) => (
                            <button
                                key={cIdx}
                                onClick={() => handleSendOjChat(chip.text)}
                                style={{
                                    padding: '5px 11px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#cbd5e1',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Chat Input Bar */}
                    <div style={{
                        padding: '14px 20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(10, 15, 29, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <input
                            type="text"
                            value={ojChatInput}
                            onChange={(e) => setOjChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    handleSendOjChat();
                                }
                            }}
                            placeholder="Habla con OpenJarvis (ej: 'pon música techno', 'pide comida en Casco', 'qué eventos hay')..."
                            style={{
                                flex: 1,
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid rgba(6, 182, 212, 0.3)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                color: '#ffffff',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={() => handleSendOjChat()}
                            disabled={ojChatLoading || !ojChatInput.trim()}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                border: 'none',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: (ojChatLoading || !ojChatInput.trim()) ? 'not-allowed' : 'pointer',
                                opacity: (ojChatLoading || !ojChatInput.trim()) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Send size={14} /> Enviar
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUBTAB: OPENJARVIS CLI & PRESETS SHELL (STANFORD)
            ══════════════════════════════════════════════════════════════ */}
            {(subTab === 'openjarvis_cli' || subTab === 'openjarvis') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Header & Status Cards Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '14px'
                    }}>
                        {/* Status Card 1: Engine State */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Estado del Motor
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: openJarvisStatus?.installed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: openJarvisStatus?.installed ? '#10b981' : '#ef4444',
                                    border: `1px solid ${openJarvisStatus?.installed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                                }}>
                                    {openJarvisStatus?.installed ? 'ONLINE (Conectado)' : 'NO DETECTADO'}
                                </span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Terminal size={18} color="#06b6d4" />
                                {openJarvisStatus?.installed ? `v${openJarvisStatus.version || '1.0.5'}` : 'Sin instalar'}
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                {openJarvisStatus?.binaryPath || '~/.local/bin/jarvis'}
                            </span>
                        </div>

                        {/* Status Card 2: Python Environment */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Entorno Local
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    color: '#38bdf8'
                                }}>
                                    Python 3.13 venv
                                </span>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={18} color="#38bdf8" />
                                LiteLLM & Local Tools
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                ~/.openjarvis/.venv
                            </span>
                        </div>

                        {/* Status Card 3: Active Config */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Configuración Activa
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#f59e0b'
                                }}>
                                    TOML Preset
                                </span>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={18} color="#f59e0b" />
                                chat-simple
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                ~/.openjarvis/config.toml
                            </span>
                        </div>

                        {/* Status Card 4: Stanford Framework Link */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.12) 0%, rgba(15, 23, 42, 0.7) 100%)',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '6px'
                        }}>
                            <div>
                                <span style={{ fontSize: '11.5px', color: '#67e8f9', fontWeight: 700, textTransform: 'uppercase' }}>
                                    Stanford Personal AI
                                </span>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                                    OpenJarvis Documentation
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                <a
                                    href="https://open-jarvis.github.io/OpenJarvis/"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#38bdf8',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    Docs Oficiales <ExternalLink size={11} />
                                </a>
                                <button
                                    onClick={loadOpenJarvisStatus}
                                    disabled={openJarvisLoading}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginLeft: 'auto'
                                    }}
                                >
                                    <RefreshCw size={11} className={openJarvisLoading ? 'animate-spin' : ''} />
                                    Actualizar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Official One-Liner Quick-Install Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 29, 0.95) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        borderRadius: '14px',
                        padding: '20px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                                        Comando Oficial de Instalación & Configuración
                                    </h3>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '8px',
                                        background: 'rgba(6, 182, 212, 0.2)',
                                        color: '#67e8f9'
                                    }}>
                                        macOS / Apple Silicon / Linux
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                                    Este script despliega el entorno OpenJarvis en <code style={{ color: '#38bdf8' }}>~/.openjarvis</code>, configura dependencias de agentes, enlaces de sistema y la suite completa de comandos CLI.
                                </p>
                            </div>
                            <button
                                onClick={handleCopyOneLiner}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: copiedOneLiner ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.25)',
                                    border: `1px solid ${copiedOneLiner ? '#10b981' : 'rgba(6, 182, 212, 0.5)'}`,
                                    color: copiedOneLiner ? '#10b981' : '#67e8f9',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {copiedOneLiner ? <Check size={15} /> : <Copy size={15} />}
                                {copiedOneLiner ? '¡Comando Copiado!' : 'Copiar Instalador'}
                            </button>
                        </div>

                        {/* Monospace Code Display */}
                        <div style={{
                            background: '#030712',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            borderRadius: '10px',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            color: '#38bdf8',
                            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.8)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto' }}>
                                <span style={{ color: '#06b6d4', fontWeight: 800, userSelect: 'none' }}>$</span>
                                <span style={{ whiteSpace: 'nowrap' }}>
                                    curl -fsSL open-jarvis.github.io/OpenJarvis/install.sh | bash
                                </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                                bash / zsh
                            </span>
                        </div>
                    </div>

                    {/* Presets Manager Grid */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800 }}>
                                    Presets Oficiales de OpenJarvis (Stanford Hub)
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                    Selecciona y activa perfiles preconfigurados de agentes locales para el sistema.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            {[
                                { id: 'chat-simple', name: 'Chat Simple', tag: 'Recomendado', desc: 'CLI chat interactivo ligero y rápido para consola con modelo local o nube.' },
                                { id: 'morning-digest-mac', name: 'Morning Digest Mac', tag: 'macOS Native', desc: 'Resumen matutino de calendario, eventos de Panamá, correos y notas operativas.' },
                                { id: 'deep-research', name: 'Deep Research', tag: 'Multi-Source', desc: 'Búsqueda profunda web con síntesis analítica y citas cruzadas de información.' },
                                { id: 'code-assistant', name: 'Code Assistant', tag: 'Developer', desc: 'Asistente de desarrollo, inspección de terminal y resolución de bugs en código.' },
                                { id: 'scheduled-monitor', name: 'Scheduled Monitor', tag: 'Proactivo', desc: 'Monitoreo periódico, alertas automáticas y cron jobs para la operación.' }
                            ].map(preset => (
                                <div
                                    key={preset.id}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        padding: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '10px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                                                {preset.name}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                background: 'rgba(56, 189, 248, 0.15)',
                                                color: '#38bdf8'
                                            }}>
                                                {preset.tag}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.4' }}>
                                            {preset.desc}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleRunOpenJarvisCommand(`init --preset ${preset.id} --force`)}
                                        disabled={cliExecuting}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: 'rgba(56, 189, 248, 0.12)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            color: '#38bdf8',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: cliExecuting ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <PlayCircle size={13} /> Activar Preset
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interactive CLI Console & Diagnostics */}
                    <div style={{
                        background: 'rgba(10, 15, 29, 0.95)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)'
                    }}>
                        {/* Terminal Window Header Bar */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.95)',
                            padding: '12px 18px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#94a3b8',
                                    marginLeft: '8px',
                                    fontWeight: 600
                                }}>
                                    jarvis@arrive-macbook:~/.openjarvis [python 3.13]
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {cliOutput && (
                                    <button
                                        onClick={handleCopyCliOutput}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: copiedCliOutput ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                            border: `1px solid ${copiedCliOutput ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
                                            color: copiedCliOutput ? '#10b981' : '#94a3b8',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        {copiedCliOutput ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedCliOutput ? 'Copiado' : 'Copiar Salida'}
                                    </button>
                                )}
                                <span style={{
                                    fontSize: '11px',
                                    color: cliExecuting ? '#f59e0b' : '#10b981',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: cliExecuting ? '#f59e0b' : '#10b981',
                                        boxShadow: cliExecuting ? '0 0 6px #f59e0b' : '0 0 6px #10b981'
                                    }} />
                                    {cliExecuting ? 'EJECUTANDO SUBPROCESO...' : 'SHELL READY'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Command Pills */}
                        <div style={{
                            padding: '10px 18px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            overflowX: 'auto'
                        }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                ACCIONES RÁPIDAS:
                            </span>
                            {[
                                { cmd: 'doctor', label: 'jarvis doctor' },
                                { cmd: '--version', label: 'jarvis --version' },
                                { cmd: 'skill list', label: 'jarvis skill list' },
                                { cmd: 'skill sources', label: 'jarvis skill sources' },
                                { cmd: 'config', label: 'jarvis config' },
                                { cmd: 'status', label: 'jarvis status' },
                                { cmd: 'tool list', label: 'jarvis tool list' },
                                { cmd: '--help', label: 'jarvis --help' }
                            ].map(item => (
                                <button
                                    key={item.cmd}
                                    onClick={() => handleRunOpenJarvisCommand(item.cmd)}
                                    disabled={cliExecuting}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: cliCommand === item.cmd ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${cliCommand === item.cmd ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                                        color: cliCommand === item.cmd ? '#67e8f9' : '#cbd5e1',
                                        fontSize: '11px',
                                        fontFamily: 'ui-monospace, monospace',
                                        fontWeight: 600,
                                        cursor: cliExecuting ? 'wait' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Command Input Box */}
                        <div style={{
                            padding: '12px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: 'rgba(5, 8, 20, 0.8)'
                        }}>
                            <span style={{
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '13px',
                                color: '#06b6d4',
                                fontWeight: 800
                            }}>
                                jarvis
                            </span>
                            <input
                                type="text"
                                value={cliCommand}
                                onChange={(e) => setCliCommand(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !cliExecuting) {
                                        handleRunOpenJarvisCommand(cliCommand);
                                    }
                                }}
                                placeholder="Escribe un subcomando (ej: doctor, skill list, --version, config)..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={() => handleRunOpenJarvisCommand(cliCommand)}
                                disabled={cliExecuting || !cliCommand.trim()}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: (cliExecuting || !cliCommand.trim()) ? 'not-allowed' : 'pointer',
                                    opacity: (cliExecuting || !cliCommand.trim()) ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Play size={12} fill="#ffffff" />
                                {cliExecuting ? 'Ejecutando...' : 'Ejecutar'}
                            </button>
                        </div>

                        {/* Terminal Output Area */}
                        <div style={{
                            padding: '16px 20px',
                            minHeight: '220px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '12px',
                            lineHeight: '1.6',
                            color: '#e2e8f0',
                            whiteSpace: 'pre-wrap',
                            background: '#040714',
                            boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.8)'
                        }}>
                            {cliExecuting ? (
                                <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Ejecutando proceso: `jarvis {cliCommand}`...</span>
                                </div>
                            ) : cliOutput ? (
                                <div>
                                    <div style={{ color: '#06b6d4', marginBottom: '8px', fontWeight: 700 }}>
                                        $ jarvis {cliCommand}
                                    </div>
                                    <div style={{ color: '#a5f3fc' }}>
                                        {cliOutput}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: '#475569' }}>
                                    <div>[OpenJarvis Terminal Interface v1.0.5]</div>
                                    <div>Selecciona una acción rápida arriba o escribe un subcomando como `doctor` para inspeccionar el sistema.</div>
                                    <div style={{ marginTop: '8px', color: '#64748b' }}>
                                        Prueba hacer clic en &quot;jarvis doctor&quot; para comprobar la salud de todos los componentes locales.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
