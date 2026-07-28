// Production state initializes empty. Real data comes from OpenClaw backend and user input.

export const seedProjects = [];
export const seedAITools = [];
export const seedInfrastructure = [];
export const seedSubscriptions = [
  {"id":"sub-google-1","name":"Google Workspace PRO PAGO","type":"Productivity","provider":"Google","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://workspace.google.com","account":"sgtccapital@gmail.com"},
  {"id":"sub-google-2","name":"Google AI ULTRA","type":"AI Tool","provider":"Google","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://gemini.google.com/advanced","account":"filespanamerican@gmail.com"},
  {"id":"sub-google-3","name":"Google AI PRO FAMILY","type":"AI Tool","provider":"Google","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://gemini.google.com/advanced","account":"goldenstartrading11@gmail.com"},
  {"id":"sub-google-4","name":"Google AI ULTRA","type":"AI Tool","provider":"Google","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://gemini.google.com/advanced","account":"catfull2023@gmail.com"},
  {"id":"sub-google-5","name":"Google AI ULTRA","type":"AI Tool","provider":"Google","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://gemini.google.com/advanced","account":"adminmupa@gmail.com"},
  {"id":"sub-chatgpt-1","name":"ChatGPT Business","type":"AI Tool","provider":"OpenAI","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://chat.openai.com","account":"inversioneslblpa@gmail.com"},
  {"id":"sub-autocad-1","name":"Autocad Panel 3000 Accounts","type":"Dev Tool","provider":"Autodesk","cost":0,"cycle":"Monthly","nextPayment":"2026-05-01","status":"Active","url":"https://manage.autodesk.com","account":"Sgtccapital@gmail.com"}
];
export const seedIdeas = [];
export const seedTasks = [];
export const seedLinks = [];
export const seedSocialMedia = [
    { id: 'social-elemento-techno', platform: 'Instagram', handler: '@Elemento.techno', type: 'Electronica Internacional', url: 'https://instagram.com/Elemento.techno', followers: '12.8K', description: 'Electrónica Internacional', metrics: { growth: '+450', engagement: '5.2%', clicks: '850', views: '28K' } },
    { id: 'social-arrive-models', platform: 'Instagram', handler: '@Arrive.models', type: 'Models & Viral', url: 'https://instagram.com/Arrive.models', followers: '5.9K', description: 'Models & Viral', metrics: { growth: '+120', engagement: '6.8%', clicks: '540', views: '14K' } },
    { id: 'social-5amclub-new', platform: 'Instagram', handler: '@_5amclub', type: 'Finanzas', url: 'https://instagram.com/_5amclub', followers: '3.9K', description: 'Finanzas y Productividad', metrics: { growth: '+80', engagement: '4.1%', clicks: '310', views: '9K' } },
    { id: 'social-moojoo-events', platform: 'Instagram', handler: '@Moojoo.events', type: 'Party promoter', url: 'https://instagram.com/Moojoo.events', followers: '2.6K', description: 'Party promoter', metrics: { growth: '+210', engagement: '7.3%', clicks: '490', views: '11K' } },
    { id: 'social-ciutatelectronicapty', platform: 'Instagram', handler: '@Ciutatelectronicapty', type: 'Electronica Panama', url: 'https://instagram.com/Ciutatelectronicapty', followers: '409', description: 'Electrónica Panamá', metrics: { growth: '+15', engagement: '3.2%', clicks: '80', views: '1.2K' } },
    { id: 'social-urbannights-pa', platform: 'Instagram', handler: '@Urbannights.pa', type: 'Party', url: 'https://instagram.com/Urbannights.pa', followers: '200', description: 'Party & Events', metrics: { growth: '+8', engagement: '2.9%', clicks: '45', views: '600' } },
    { id: 'social-udp-pa', platform: 'Instagram', handler: '@UDP.PA', type: 'Gestionar de casco peatonal', url: 'https://instagram.com/UDP.PA', followers: '223', description: 'Gestión de casco peatonal', metrics: { growth: '+12', engagement: '4.5%', clicks: '60', views: '850' } },
    { id: 'social-theroom-social', platform: 'Instagram', handler: '@theroom.social', type: 'Party', url: 'https://instagram.com/theroom.social', followers: '444', description: 'Party & Social Club', metrics: { growth: '+30', engagement: '5.6%', clicks: '110', views: '1.8K' } },
    { id: 'social-igniteclub', platform: 'Instagram', handler: '@IGNITECLUB', type: 'Party', url: 'https://instagram.com/IGNITECLUB', followers: '686', description: 'Party & Nightlife', metrics: { growth: '+45', engagement: '6.1%', clicks: '190', views: '2.5K' } },
    { id: 'social-music-pty', platform: 'Instagram', handler: '@Music.pty', type: 'Music Viral & booking artistas', url: 'https://instagram.com/Music.pty', followers: '99K', description: 'Music Viral & booking de artistas', metrics: { growth: '+1.2K', engagement: '8.4%', clicks: '3.5K', views: '150K' } }
];
export const seedContentTasks = {
    ideas: [],
    production: [],
    ready: [],
    published: []
};
export const seedNotes = [];
export const seedCompanies = [];
export const seedPromoters = [
    { id: 'prom-1', name: 'Juan Top', contacts: 850, style: 'VIP / Mesas', rating: 4.8 },
    { id: 'prom-2', name: 'Maria VIP', contacts: 1200, style: 'Chicas / Volumen', rating: 4.9 },
    { id: 'prom-3', name: 'Pedro Party', contacts: 400, style: 'Universitarios', rating: 3.5 }
];

export const seedImageGirls = [
    { id: 'girl-1', name: 'Sofía', ig: '@sofia.pty', type: 'VIP / Mesas', rating: 5.0, available: true },
    { id: 'girl-2', name: 'Camila', ig: '@camila.oficial', type: 'Contenido', rating: 4.5, available: true },
    { id: 'girl-3', name: 'Valentina', ig: '@valen_vibes', type: 'Shots / Energía', rating: 4.8, available: false }
];

export const seedEvents = [
  {
    id: 'ev-casco-peatonal',
    name: 'Casco Peatonal',
    templateKey: 'casco_peatonal',
    date: '2026-08-30',
    time: '14:00',
    location: 'Casco Antiguo — Plaza Catedral',
    capacity: 'Masivo (Plaza Catedral)',
    budget: '12000',
    estimatedBudget: '12000',
    type: 'casco_peatonal',
    status: 'planificacion',
    description: 'Evento público mensual (último domingo de cada mes de agosto a enero). Nuestra responsabilidad principal es la contratación de artistas y el montaje de la tarima en Plaza Catedral. Otras plazas (Plaza Bolívar, Plaza Herrera y La Playita) quedan reservadas a futuro.',
    color: '#f59e0b',
    icon: '🚶‍♂️',
    zones: [
      'Plaza Catedral (Principal — Tarima & Artistas)',
      'Plaza Bolívar (Futuras actividades / Reserva)',
      'Plaza Herrera (Futuras actividades / Reserva)',
      'La Playita (Futuras actividades / Reserva)'
    ],
    instances: [
      {
        id: 'inst-casco-2026-08',
        date: '2026-08-30',
        name: 'Edición Agosto 2026',
        status: 'upcoming',
        location: 'Plaza Catedral',
        artists: [
          { id: 'art-1', name: 'Orquesta Latin Swing', genre: 'Salsa / En vivo', time: '16:00 - 17:15', soundcheck: '13:30', status: 'confirmado', rider: '12 micrófonos, 4 monitores' },
          { id: 'art-2', name: 'Panaashe', genre: 'Urbano / Fusion', time: '17:30 - 18:30', soundcheck: '14:15', status: 'confirmado', rider: '2 In-Ears, Dj Set' },
          { id: 'art-3', name: 'Orquesta Servicio de Migración', genre: 'Tropical / Cierre', time: '18:45 - 20:00', soundcheck: '15:00', status: 'confirmado', rider: 'Rider completo orquesta' }
        ],
        stageSetup: {
          provider: 'AudioTech Panama',
          stageSize: '10m x 8m con techado truss',
          soundSystem: 'Line Array JBL VTX 12kW',
          lighting: '16 Moving Heads + Pantalla LED 6x3m',
          setupTime: '08:00 AM',
          soundcheckTime: '13:30 PM',
          teardownTime: '21:00 PM'
        }
      },
      {
        id: 'inst-casco-2026-09',
        date: '2026-09-27',
        name: 'Edición Septiembre 2026',
        status: 'planificacion',
        location: 'Plaza Catedral',
        artists: [],
        stageSetup: {
          provider: 'AudioTech Panama',
          stageSize: '10m x 8m',
          setupTime: '08:00 AM'
        }
      },
      {
        id: 'inst-casco-2026-10',
        date: '2026-10-25',
        name: 'Edición Octubre 2026',
        status: 'planificacion',
        location: 'Plaza Catedral',
        artists: [],
        stageSetup: {}
      },
      {
        id: 'inst-casco-2026-11',
        date: '2026-11-29',
        name: 'Edición Noviembre 2026',
        status: 'planificacion',
        location: 'Plaza Catedral',
        artists: [],
        stageSetup: {}
      },
      {
        id: 'inst-casco-2026-12',
        date: '2026-12-27',
        name: 'Edición Diciembre 2026 (Fin de Año)',
        status: 'planificacion',
        location: 'Plaza Catedral',
        artists: [],
        stageSetup: {}
      },
      {
        id: 'inst-casco-2027-01',
        date: '2027-01-31',
        name: 'Edición Enero 2027 (Cierre de Temporada)',
        status: 'planificacion',
        location: 'Plaza Catedral',
        artists: [],
        stageSetup: {}
      }
    ],
    futurePlazas: [
      { id: 'plz-bolivar', name: 'Plaza Bolívar', status: 'En lista / Reserva futura', notes: 'Reservado para futura expansión de bazar cultural o pasarela' },
      { id: 'plz-herrera', name: 'Plaza Herrera', status: 'En lista / Reserva futura', notes: 'Reservado para futuros torneos deportivos o ajedrez' },
      { id: 'plz-playita', name: 'La Playita', status: 'En lista / Reserva futura', notes: 'Reservado para futuras activaciones de playa o Sunset DJ' }
    ],
    agenda: [
      { id: 'ag-c1', time: '08:00', title: 'Llegada de camiones y montaje de estructura de tarima', speaker: 'Plaza Catedral (AudioTech)', description: 'Armado de tarima 10x8m, trusses y soporte de iluminación' },
      { id: 'ag-c2', time: '11:00', title: 'Montaje de sistema de sonido e iluminación', speaker: 'Plaza Catedral (AudioTech)', description: 'Pruebas de parches, amplificadores y consolas' },
      { id: 'ag-c3', time: '13:30', title: 'Soundcheck de artistas', speaker: 'Plaza Catedral (Artistas)', description: 'Pruebas de sonido en orden de presentación' },
      { id: 'ag-c4', time: '16:00', title: 'Inicio de Shows en Tarima Principal', speaker: 'Plaza Catedral', description: 'Presentaciones de agrupaciones y DJs' },
      { id: 'ag-c5', time: '20:30', title: 'Cierre de tarima y desmontaje', speaker: 'Plaza Catedral', description: 'Desmontaje completo y entrega de plaza limpia' }
    ],
    requirements: [
      { id: 'req-c1', name: 'Contratos y riders técnicos de artistas confirmados', done: false },
      { id: 'req-c2', name: 'Reserva y contratación de tarima (AudioTech)', done: true },
      { id: 'req-c3', name: 'Permiso de alcaldía y sonido en Plaza Catedral', done: true },
      { id: 'req-c4', name: 'Generador eléctrico de respaldo (60 kVA)', done: false },
      { id: 'req-c5', name: 'Seguridad y backstage para artistas en Catedral', done: false }
    ],
    todos: [],
    organizer: 'Oficina del Casco Antiguo',
    contactPerson: 'Comité Casco Peatonal',
    phone: '+507 6000-0000',
    email: 'casco@peatonal.com',
    notes: 'Foco exclusivo en Plaza Catedral. Plazas Bolívar, Herrera y La Playita en lista de reserva a futuro.',
    driveFolderId: ''
  },
  {
    id: 'ev-candela-trump',
    name: 'Candela Trump',
    type: 'nightclub',
    status: 'activo',
    color: '#ef4444',
    icon: '🔥',
    description: 'Serie de eventos nocturnos enfocados en reggaeton y mesas VIP.',
    instances: [
      {
        id: 'inst-candela-1',
        date: '2026-06-14',
        day: 'Viernes',
        status: 'Fuerte',
        targetCapacity: 400,
        targetDemo: '+21, Reggaeton, VIP Heavy',
        leads: [
            { id: 'l-1', name: 'Carlos Perez', phone: '@carlosp', promoter: 'prom-1', interest: 'Mesa', status: 'Confirmado' },
            { id: 'l-2', name: 'Ana Gomez', phone: '6543-2109', promoter: 'prom-2', interest: 'Lista', status: 'Contactado' },
            { id: 'l-3', name: 'Luis M', phone: '@luis_mpty', promoter: 'prom-1', interest: 'General', status: 'Confirmado' },
            { id: 'l-4', name: 'Valeria R', phone: '6111-2222', promoter: 'prom-3', interest: 'Lista', status: 'Llegó' }
        ],
        vipFlow: [
            { id: 'vip-1', name: 'Influencer PTY', type: 'Influencer', benefit: 'Mesa Free', confirmed: true },
            { id: 'vip-2', name: 'DJ Invitado', type: 'VIP', benefit: 'Botella', confirmed: false }
        ],
        assignedPromoters: ['prom-1', 'prom-2', 'prom-3'],
        assignedGirls: [
            { id: 'g-1', role: 'Mesa', time: '22:00' },
            { id: 'g-2', role: 'Contenido', time: '23:00' }
        ],
        checklist: {
            promo: [
                { id: 'chk-p1', task: 'Arte listo', done: true }, 
                { id: 'chk-p2', task: 'Stories activas', done: true },
                { id: 'chk-p3', task: 'Broadcast enviado', done: false }
            ],
            logistica: [
                { id: 'chk-l1', task: 'Lista abierta', done: true },
                { id: 'chk-l2', task: 'Puerta definida', done: false },
                { id: 'chk-l3', task: 'DJ confirmado', done: true }
            ],
            imagen: [
                { id: 'chk-i1', task: 'Chicas confirmadas', done: true },
                { id: 'chk-i2', task: 'Distribución mesas', done: false }
            ]
        }
      },
      {
        id: 'inst-candela-2',
        date: '2026-06-15',
        day: 'Sábado',
        status: 'Promoción',
        targetCapacity: 500,
        targetDemo: 'Crossover, VIP',
        leads: [],
        vipFlow: [],
        assignedPromoters: ['prom-2'],
        assignedGirls: [],
        checklist: {
            promo: [{ id: 'chk-p4', task: 'Arte listo', done: true }], 
            logistica: [{ id: 'chk-l4', task: 'Staff asignado', done: false }], 
            imagen: []
        }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-grafiti-tour',
    name: 'I⭐️GRAFITI TOUR',
    date: '2026-07-10',
    time: '14:00',
    location: 'Rutas urbanas',
    capacity: 'General',
    budget: '0',
    type: 'social',
    status: 'borrador',
    description: 'Recorrido artístico y cultural por puntos clave de arte urbano.',
    color: '#8b5cf6',
    icon: '🎨',
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-music-pty',
    name: 'Music PTY',
    date: '2026-08-05',
    time: '18:00',
    location: 'Estudio Principal, Panama City',
    capacity: 'Producción TV',
    budget: '0',
    type: 'tvshow',
    status: 'planificacion',
    description: 'Programa de televisión musical con segmentos en vivo, entrevistas a artistas, sesiones acústicas y cobertura de la escena musical panameña. Transmisión semanal con gestión integral de redes sociales y contenido multiplataforma.',
    color: '#ec4899',
    icon: '🎬',
    showFrequency: 'Semanal',
    showDay: 'Viernes',
    showDuration: '60 min',
    showChannel: 'Canal / Streaming',
    segments: [
      { id: 'seg-1', name: 'Intro / Apertura', duration: '5 min', type: 'Apertura', description: 'Bienvenida del host, resumen de lo que viene en el episodio y branding.', order: 1 },
      { id: 'seg-2', name: 'Entrevista Artista Invitado', duration: '15 min', type: 'Entrevista', description: 'Conversación en profundidad con artista invitado sobre su carrera, proyectos y música nueva.', order: 2 },
      { id: 'seg-3', name: 'Live Session / Acústico', duration: '10 min', type: 'Performance', description: 'Presentación en vivo o acústica del artista invitado en el estudio.', order: 3 },
      { id: 'seg-4', name: 'Top 5 PTY', duration: '8 min', type: 'Ranking', description: 'Ranking semanal de las 5 canciones más escuchadas en Panamá con datos de streaming.', order: 4 },
      { id: 'seg-5', name: 'Behind The Beat', duration: '10 min', type: 'Documental', description: 'Mini-documental sobre un productor, estudio o historia detrás de un hit panameño.', order: 5 },
      { id: 'seg-6', name: 'Redes en Vivo / Q&A', duration: '7 min', type: 'Interactivo', description: 'Interacción en vivo con la audiencia: preguntas de Instagram/TikTok al artista.', order: 6 },
      { id: 'seg-7', name: 'Cierre / Avance Próximo Episodio', duration: '5 min', type: 'Cierre', description: 'Resumen del episodio, despedida y preview del próximo programa.', order: 7 }
    ],
    episodes: [
      { id: 'ep-1', number: 1, title: 'Episodio Piloto', date: '2026-08-05', guest: 'Por confirmar', status: 'Pre-producción', notes: 'Primer episodio - definir formato final.' },
      { id: 'ep-2', number: 2, title: 'Episodio 2', date: '2026-08-12', guest: '', status: 'Planeación', notes: '' },
      { id: 'ep-3', number: 3, title: 'Episodio 3', date: '2026-08-19', guest: '', status: 'Planeación', notes: '' }
    ],
    crew: [
      { id: 'crew-1', name: '', role: 'Host / Presentador', department: 'Talento', status: 'Por asignar' },
      { id: 'crew-2', name: '', role: 'Director', department: 'Dirección', status: 'Por asignar' },
      { id: 'crew-3', name: '', role: 'Productor General', department: 'Producción', status: 'Por asignar' },
      { id: 'crew-4', name: '', role: 'Camarógrafo 1', department: 'Cámaras', status: 'Por asignar' },
      { id: 'crew-5', name: '', role: 'Camarógrafo 2', department: 'Cámaras', status: 'Por asignar' },
      { id: 'crew-6', name: '', role: 'Ingeniero de Sonido', department: 'Audio', status: 'Por asignar' },
      { id: 'crew-7', name: '', role: 'Editor de Video', department: 'Post-producción', status: 'Por asignar' },
      { id: 'crew-8', name: '', role: 'Community Manager', department: 'Redes Sociales', status: 'Por asignar' },
      { id: 'crew-9', name: '', role: 'Diseñador Gráfico', department: 'Arte', status: 'Por asignar' },
      { id: 'crew-10', name: '', role: 'Iluminación', department: 'Técnico', status: 'Por asignar' }
    ],
    agenda: [],
    requirements: [
      { id: 'req-tv-1', name: 'Kit de cámaras (2+ cámaras)', category: 'Equipo', quantity: 1, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-2', name: 'Iluminación de estudio (LED panels)', category: 'Equipo', quantity: 1, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-3', name: 'Consola de audio / mixer', category: 'Audio', quantity: 1, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-4', name: 'Micrófonos (lavalier + boom)', category: 'Audio', quantity: 3, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-5', name: 'Pantalla verde / Set decoration', category: 'Escenografía', quantity: 1, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-6', name: 'Software de edición (Premiere / DaVinci)', category: 'Post-producción', quantity: 1, cost: 0, status: 'Pendiente' },
      { id: 'req-tv-7', name: 'Streaming setup (OBS / encoder)', category: 'Transmisión', quantity: 1, cost: 0, status: 'Pendiente' }
    ],
    todos: []
  },
  {
    id: 'ev-urban-nights',
    name: 'Urban Nights',
    type: 'nightclub',
    status: 'borrador',
    color: '#3b82f6',
    icon: '🌃',
    description: 'Fiesta temática de música urbana y activaciones de marca.',
    instances: [
      {
        id: 'inst-urban-1',
        date: '2026-09-20',
        day: 'Viernes',
        status: 'Promoción',
        targetCapacity: 300,
        targetDemo: 'Urbano, Jóvenes',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-party-pa-vacilar',
    name: 'Party en Pa’ Vacilar',
    type: 'nightclub',
    status: 'borrador',
    color: '#f59e0b',
    icon: '🎉',
    description: 'El party definitivo en Pa’ Vacilar.',
    instances: [
      {
        id: 'inst-party-1',
        date: '2026-10-31',
        day: 'Sábado',
        status: 'Promoción',
        targetCapacity: 500,
        targetDemo: 'General, Crossover',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-the-room',
    name: 'The Room',
    type: 'nightclub',
    status: 'borrador',
    color: '#8b5cf6',
    icon: '🍸',
    description: 'Evento The Room.',
    instances: [
      {
        id: 'inst-theroom-1',
        date: '2026-11-01',
        day: 'Viernes',
        status: 'Promoción',
        targetCapacity: 200,
        targetDemo: 'VIP, Exclusivo',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-arrive-models',
    name: 'Arrive Models',
    type: 'nightclub',
    status: 'borrador',
    color: '#8b5cf6',
    icon: '💃',
    description: 'Evento exclusivo con agencias y modelos de Arrive Models.',
    instances: [
      {
        id: 'inst-arrive-1',
        date: '2026-11-15',
        day: 'Viernes',
        status: 'Promoción',
        targetCapacity: 200,
        targetDemo: 'Modelos, VIP, Invitados Especiales',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-activacion-mundial',
    name: 'Activación Mundial',
    type: 'nightclub',
    status: 'borrador',
    color: '#10b981',
    icon: '🌍',
    description: 'Activación global de marca con experiencias interactivas.',
    instances: [
      {
        id: 'inst-activacion-1',
        date: '2026-12-05',
        day: 'Sábado',
        status: 'Promoción',
        targetCapacity: 800,
        targetDemo: 'General, Extranjeros, Turistas',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-vale-bash',
    name: 'Vale Bash @Terraplen',
    type: 'nightclub',
    status: 'borrador',
    color: '#f43f5e',
    icon: '🥂',
    description: 'Fiesta especial Vale Bash en locación Terraplen.',
    instances: [
      {
        id: 'inst-vale-bash-1',
        date: '2026-12-20',
        day: 'Viernes',
        status: 'Promoción',
        targetCapacity: 500,
        targetDemo: 'VIP, Universitarios, Crossover',
        leads: [],
        vipFlow: [],
        assignedPromoters: [],
        assignedGirls: [],
        checklist: { promo: [], logistica: [], imagen: [] }
      }
    ],
    agenda: [],
    requirements: [],
    todos: []
  },
  {
    id: 'ev-guaya-fest',
    name: 'Guaya Fest 2026',
    type: 'festival',
    status: 'planificacion',
    date: '2026-10-16',
    time: '15:00',
    location: 'Explanada Amador, Panamá',
    capacity: '12000',
    budget: '150000',
    estimatedBudget: '150000',
    description: 'El festival de música urbana y cultura del año. Múltiples escenarios, áreas de comida, activaciones de marca y zonas VIP con boxes exclusivos.',
    color: '#fbbf24',
    icon: '🎪',
    agenda: [
      { id: 'ag-gf1', time: '15:00', title: 'Apertura de Puertas', speaker: 'Escenario Principal', description: 'Acceso del público general y DJ de bienvenida' },
      { id: 'ag-gf2', time: '17:00', title: 'Show de Talentos Locales', speaker: 'Escenario Local', description: 'Presentación de artistas emergentes nacionales' },
      { id: 'ag-gf3', time: '19:00', title: 'Competencia Freestyle Final', speaker: 'Escenario Urbano', description: 'Batalla de los mejores 8 MCs de la región' },
      { id: 'ag-gf4', time: '21:00', title: 'Set de DJ Invitado Internacional', speaker: 'Escenario Principal', description: 'Presentación de DJ residente de Miami' },
      { id: 'ag-gf5', time: '22:30', title: 'Artista Estelar Principal', speaker: 'Escenario Principal', description: 'Show en vivo de la estrella internacional de reggaetón' }
    ],
    requirements: [
      { id: 'req-gf-1', name: 'Montaje de Tarima Principal', category: 'Producción', quantity: 1, cost: 25000, status: 'Confirmado' },
      { id: 'req-gf-2', name: 'Sistema de Sonido Line Array', category: 'Audio', quantity: 2, cost: 18000, status: 'Confirmado' },
      { id: 'req-gf-3', name: 'Pantallas LED Gigantes', category: 'Video', quantity: 4, cost: 15000, status: 'Pendiente' },
      { id: 'req-gf-4', name: 'Seguridad Privada (150 unidades)', category: 'Logística', quantity: 1, cost: 9500, status: 'Confirmado' },
      { id: 'req-gf-5', name: 'Permisos Municipales y de Salud', category: 'Legal', quantity: 1, cost: 3000, status: 'En Proceso' }
    ],
    todos: []
  },
  {
    id: 'ev-casco-lounge',
    name: '212 club',
    type: 'local',
    status: 'activo',
    date: '2026-06-11',
    time: '18:00',
    location: 'Calle 8va, Casco Antiguo, Panamá',
    capacity: '250',
    budget: '12000',
    estimatedBudget: '12000',
    description: 'Lounge bar premium en el Casco Antiguo. Gestión diaria de reservas de boxes VIP, inventario de barra y asistencia de personal.',
    color: '#10b981',
    icon: '🏪',
    agenda: [
      { id: 'ag-cl1', date: '2026-06-11', time: '18:00', title: 'Apertura y Happy Hour', speaker: 'Barra Principal', description: '2x1 en cócteles seleccionados' },
      { id: 'ag-cl2', date: '2026-06-11', time: '21:00', title: 'DJ Live Set - Chill & Deep House', speaker: 'Cabina DJ', description: 'Set en vivo para ambientar el Lounge' },
      { id: 'ag-cl3', date: '2026-06-12', time: '23:30', title: 'Urban & Crossover Night', speaker: 'Todo el local', description: 'Música bailable hasta el cierre' },
      { id: 'ag-cl4', date: '2026-06-13', time: '22:00', title: 'Sábado Gigante - Open Bar Premium', speaker: 'Main Stage', description: 'Barra libre para VIPs y DJs nacionales' }
    ],
    requirements: [],
    instances: [
      {
        id: 'inst-212-1',
        date: '2026-06-11',
        day: 'Viernes',
        status: 'Activo',
        leads: [],
        assignedPromoters: []
      }
    ],
    todos: [],
    tables: [
      { id: 't-b1', name: 'Box VIP 1', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
      { id: 't-b2', name: 'Box VIP 2', capacity: 10, minConsumption: 500, status: 'Reservado', client: 'Esteban Ruiz', promoter: 'prom-1', phone: '@estebanr', deposit: 100 },
      { id: 't-b3', name: 'Box VIP 3', capacity: 12, minConsumption: 600, status: 'Ocupado', client: 'Grupo Arrive', promoter: 'prom-2', phone: '@arrive.models', deposit: 200 },
      { id: 't-b4', name: 'Box VIP 4', capacity: 8, minConsumption: 400, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
      { id: 't-m1', name: 'Mesa Gold 1', capacity: 6, minConsumption: 250, status: 'Reservado', client: 'Valeria M', promoter: 'prom-3', phone: '6123-4567', deposit: 50 },
      { id: 't-m2', name: 'Mesa Gold 2', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
      { id: 't-m3', name: 'Mesa Silver 1', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
      { id: 't-m4', name: 'Mesa Silver 2', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 }
    ],
    inventory: [
      { id: 'inv-1', name: 'Ron Abuelo 12 Años', category: 'Licores', quantity: 24, cost: 25.0, price: 90.0, minStock: 5, status: 'Normal' },
      { id: 'inv-2', name: 'Whisky Old Parr 12 Años', category: 'Licores', quantity: 18, cost: 30.0, price: 110.0, minStock: 6, status: 'Normal' },
      { id: 'inv-3', name: 'Vodka Grey Goose', category: 'Licores', quantity: 4, cost: 35.0, price: 120.0, minStock: 5, status: 'Bajo Stock' },
      { id: 'inv-4', name: 'Ginebra Tanqueray', category: 'Licores', quantity: 15, cost: 20.0, price: 85.0, minStock: 4, status: 'Normal' },
      { id: 'inv-5', name: 'Tequila Don Julio Reposado', category: 'Licores', quantity: 0, cost: 45.0, price: 150.0, minStock: 3, status: 'Sin Stock' },
      { id: 'inv-6', name: 'Cerveza Corona (Caja x24)', category: 'Cervezas', quantity: 12, cost: 18.0, price: 48.0, minStock: 10, status: 'Normal' },
      { id: 'inv-7', name: 'Red Bull (Caja x24)', category: 'Bebidas/Mixers', quantity: 8, cost: 22.0, price: 72.0, minStock: 15, status: 'Bajo Stock' },
      { id: 'inv-8', name: 'Agua Tónica Fever-Tree (Caja)', category: 'Bebidas/Mixers', quantity: 20, cost: 15.0, price: 50.0, minStock: 5, status: 'Normal' }
    ],
    staff: [
      { id: 'st-1', name: 'Alejandro G.', role: 'Gerente de Turno', phone: '6789-0123', shift: '19:00 - 04:00', pay: 80, status: 'Presente' },
      { id: 'st-2', name: 'David M.', role: 'Bartender Principal', phone: '6543-0987', shift: '20:00 - 04:00', pay: 50, status: 'Presente' },
      { id: 'st-3', name: 'Laura S.', role: 'Bartender', phone: '6211-5432', shift: '20:00 - 04:00', pay: 45, status: 'Retrasado' },
      { id: 'st-4', name: 'Moisés R.', role: 'Seguridad Jefe', phone: '6333-8888', shift: '19:00 - 04:00', pay: 60, status: 'Presente' },
      { id: 'st-5', name: 'Grupo Seguridad (x4)', role: 'Seguridad Externo', phone: '-', shift: '21:00 - 04:00', pay: 160, status: 'Presente' },
      { id: 'st-6', name: 'Estefanía L.', role: 'Cajera', phone: '6999-7777', shift: '20:00 - 04:00', pay: 40, status: 'Presente' },
      { id: 'st-7', name: 'DJ Gianluca', role: 'DJ Residente', phone: '6111-9999', shift: '22:00 - 03:30', pay: 150, status: 'Ausente' }
    ]
  }
];
