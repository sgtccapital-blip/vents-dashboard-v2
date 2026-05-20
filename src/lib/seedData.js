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
    { id: 'social-panamericanbc', platform: 'Instagram', handler: '@Panamericanbc', type: 'Company Page', url: 'https://instagram.com/panamericanbc', followers: '2.1K', description: 'Panamerican Business & Construction', companyId: '' },
    { id: 'social-novatech', platform: 'Instagram', handler: '@Novatech_pa', type: 'Company Page', url: 'https://instagram.com/novatech_pa', followers: '1.5K', description: 'NovaTech AI Solutions Panama', companyId: '' },
    { id: 'social-5amclub', platform: 'Instagram', handler: '@_5amclub', type: 'Personal Profile', url: 'https://instagram.com/_5amclub', followers: '3.8K', description: '5AM Club — Productivity & Mindset', companyId: '' },
    { id: 'social-saem', platform: 'Instagram', handler: '@SAEM', type: 'Company Page', url: 'https://instagram.com/saem', followers: '1.2K', description: 'SAEM', companyId: '' },
    { id: 'social-elemento', platform: 'Instagram', handler: '@Elemento.techno', type: 'Company Page', url: 'https://instagram.com/elemento.techno', followers: '950', description: 'Elemento Techno', companyId: '' },
    { id: 'social-arrive', platform: 'Instagram', handler: '@Arrive.models', type: 'Company Page', url: 'https://instagram.com/arrive.models', followers: '4.2K', description: 'Arrive Models Agency', companyId: '' },
    { id: 'social-metrosupply', platform: 'Instagram', handler: '@MetroSupply', type: 'Company Page', url: 'https://instagram.com/metrosupply', followers: '800', description: 'Metro Supply', companyId: '' },
    { id: 'social-inversioneslbl', platform: 'Instagram', handler: '@InversionesLBL', type: 'Company Page', url: 'https://instagram.com/inversioneslbl', followers: '500', description: 'Inversiones LBL', companyId: '' },
    { id: 'social-saborespanama', platform: 'Instagram', handler: '@SaboresPanama', type: 'Company Page', url: 'https://instagram.com/saborespanama', followers: '1.8K', description: 'Sabores de Panamá', companyId: '' },
    { id: 'social-gabmar', platform: 'Instagram', handler: '@GABMAR', type: 'Company Page', url: 'https://instagram.com/gabmar', followers: '600', description: 'GABMAR', companyId: '' },
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
    date: '2026-05-31',
    time: '08:00',
    location: 'Casco Antiguo, Múltiples Zonas',
    capacity: 'Masivo',
    budget: '0',
    type: 'social',
    status: 'planificacion',
    description: 'Se realiza el último domingo de cada mes desde mayo a enero.\nEs la organización de varios puntos de activación cultural, deportiva, gastronómica y musical a lo largo del Casco Antiguo.',
    color: '#10b981',
    icon: '🚶‍♂️',
    agenda: [
      { id: 'ag-1', time: '15:00', title: 'Carnaval en la arena', speaker: 'Playita Las Garzas', description: '3:00 PM - 6:00 PM | DJ en vivo y presentación de Panaashe' },
      { id: 'ag-2', time: '12:00', title: 'Cuadrangular de softball', speaker: 'Playa Santo Domingo', description: 'A partir de las 12:00 PM' },
      { id: 'ag-3', time: '13:00', title: 'Moda que brilla / Bazar Déjala Ir', speaker: 'Plaza Bolívar', description: '1:00 PM - 5:00 PM | Pasarela de diseñadores' },
      { id: 'ag-4', time: '10:00', title: 'Juego maestro en el casco', speaker: 'Plaza Herrera', description: '10:00 AM - 3:00 PM | Chess exhibitions / dominó por AVACA' },
      { id: 'ag-5', time: '14:00', title: 'Tamborito de Callejón', speaker: 'Calle de la Mola', description: 'A partir de las 2:00 PM | Recorrido cultural con salida y cierre' },
      { id: 'ag-6', time: '10:00', title: 'Lanzamiento Gran Premio Panamá', speaker: 'Compañía de Jesús', description: '10:00 AM - 6:00 PM | Autódromo de Panamá / Autoridad de Turismo' },
      { id: 'ag-7', time: '18:00', title: 'Nuestras historias en tu comunidad', speaker: 'Arco Chato', description: 'A partir de las 6:00 PM | Película Donaire y Esplendor / Comparsa y reina' },
      { id: 'ag-8', time: '08:00', title: 'Programación general', speaker: 'Plaza Catedral', description: '8:00 AM - 6:00 PM' },
      { id: 'ag-9', time: '08:00', title: 'Feria de salud', speaker: 'Plaza Catedral', description: '8:00 AM - 12:00 PM' },
      { id: 'ag-10', time: '08:30', title: 'Andrea Yoga Fit', speaker: 'Plaza Catedral', description: '8:30 AM - 9:30 AM' },
      { id: 'ag-11', time: '13:00', title: 'Grupo Siggwi Cúngalu', speaker: 'Plaza Catedral', description: 'A partir de las 1:00 PM' },
      { id: 'ag-12', time: '13:20', title: 'Congo Policía Municipal', speaker: 'Plaza Catedral', description: '1:20 PM - 1:45 PM' },
      { id: 'ag-13', time: '13:45', title: 'Bailemos con PassosPTY', speaker: 'Plaza Catedral', description: '1:45 PM - 2:45 PM | Por Alexis Solís' },
      { id: 'ag-14', time: '14:45', title: 'Orquesta Latin Swing', speaker: 'Plaza Catedral', description: '2:45 PM - 3:45 PM' },
      { id: 'ag-15', time: '15:45', title: 'Salsa rueda casino', speaker: 'Plaza Catedral', description: '3:45 PM - 4:45 PM | Elier Lima' },
      { id: 'ag-16', time: '16:45', title: 'Orquesta del Servicio Nacional de Migración', speaker: 'Plaza Catedral', description: '4:45 PM - 6:00 PM' },
      { id: 'ag-17', time: '11:00', title: "Colón Pa' Ti y Pa' Mi", speaker: 'Mercado San Felipe Neri', description: '11:00 AM - 4:00 PM | Vereda gastronómica - cultural' },
      { id: 'ag-18', time: '11:00', title: 'Fucsia Bazar', speaker: 'Mercado San Felipe Neri', description: '11:00 AM - 4:00 PM | Moda circular' }
    ],
    requirements: [],
    todos: []
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
    name: 'MusicPTY',
    date: '2026-08-05',
    time: '18:00',
    location: 'Estudios',
    capacity: 'Exclusivo',
    budget: '0',
    type: 'virtual',
    status: 'borrador',
    description: 'Producción y grabación de sets para MusicPTY.',
    color: '#ec4899',
    icon: '🎧',
    agenda: [],
    requirements: [],
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
  }
];
