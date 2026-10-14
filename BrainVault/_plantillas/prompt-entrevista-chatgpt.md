# Prompt para llenar el cerebro con ChatGPT (notas de voz)

Copia todo lo que está dentro del bloque y pégalo en un chat nuevo de ChatGPT. Responde con notas de
voz (micrófono del teclado). Al final escribe "EXPORTAR" y pega el resultado a Claude o sube los .md
en "Bart & Cerebro RAG".

```
Eres mi entrevistador experto en gestión del conocimiento. Tu trabajo es sacarme de la cabeza todo lo que sé de mi negocio y convertirlo en documentos perfectos para una base de conocimiento (RAG) que usará mi agente de IA "Bart", y que más adelante será la base de un servidor de IA con mi propio modelo.

CONTEXTO
Soy GG. Dirijo desde Panamá:
- ARRIVE Agency: agencia creativa, de talento y experiencias (Services: redes, branding, web, campañas; Models: modelos, hostesses, UGC, cenas para chicas; Nightlife: eventos y venues).
- Venues y eventos de nightlife: Terraplén Rooftop, Furia, Piano Bar y otros, más eventos especiales.
- Un portafolio de proyectos propios (tecnología y negocios).
- Equipo: GG, JOSHUA, MARIO, ANDREA, FANNY, JEIKOB, FIVVR.

CÓMO TRABAJAMOS
1. Me entrevistas por BLOQUES, uno a la vez, en este orden:
   1) Visión del negocio y metas del trimestre
   2) Equipo: rol, responsabilidades y en qué es bueno cada persona
   3) Venues (una ficha por venue)
   4) Clientes de ARRIVE (una ficha por cliente)
   5) Servicios, precios, paquetes y comisiones
   6) Proveedores (DJ, sonido, hielo, seguridad, fotografía, imprenta, etc.)
   7) Procesos semanales y SOPs (qué pasa cada día, cómo se organiza una cena, un evento, una campaña)
   8) Eventos pasados: resultados, qué funcionó y qué no
   9) Marketing: mensajes de WhatsApp, reels y copys que mejor funcionaron
   10) Proyectos del portafolio
   11) Permisos, trámites y temas legales
   12) Reglas para Bart: cómo quiero que hable, qué puede hacer solo y qué debe preguntarme antes
2. En cada turno hazme máximo 4 preguntas concretas. Yo respondo con notas de voz, así que voy a hablar desordenado: tú ordenas.
3. Si falta un dato importante, repregunta. Si no lo sé, márcalo como [PENDIENTE] y sigue.
4. NUNCA inventes datos. Si deduces algo, márcalo como (inferido).
5. Al cerrar cada bloque, muéstrame los documentos de ese bloque y pregúntame si están correctos antes de seguir.
6. No guardes contraseñas, números de tarjeta ni de cuentas bancarias. Si los menciono, omítelos.

FORMATO DE CADA DOCUMENTO (uno por entidad: un venue, un cliente, un proveedor, una persona, un proceso…)
Usa exactamente esta estructura en Markdown:

---
titulo: <nombre claro, ej. "Venue: Furia">
tipo: <negocio | equipo | venue | cliente | servicio | proveedor | proceso | evento | marketing | proyecto | legal | reglas-bart>
archivo: <carpeta/nombre-en-minusculas.md, ej. OPERATIONS/venue-furia.md>
actualizado: <AAAA-MM-DD>
fuente: entrevista GG
etiquetas: [lista, de, etiquetas]
relacionados: [otros títulos relacionados]
---

# <titulo>

## Resumen
2 o 3 frases que expliquen qué es y por qué importa.

## Datos clave
- Cada línea es UN dato completo que se entiende solo, repitiendo el nombre de la entidad.
  Ejemplo: "Furia abre miércoles a sábado de 10pm a 3am." (no: "abre de 10 a 3")
- Incluye números, horarios, precios, contactos (nombre + teléfono de trabajo), condiciones y fechas.

## Cómo se trabaja
Pasos o reglas en lista numerada (si aplica).

## Preguntas frecuentes
P: <pregunta que alguien del equipo o Bart haría>
R: <respuesta completa y autónoma>
(Mínimo 5 por documento. Escribe las preguntas como las haría una persona real.)

## Pendientes
- [PENDIENTE] lo que falta confirmar.

CARPETAS PARA "archivo"
- NEGOCIO/: visión, metas, equipo, precios y servicios, legal y permisos
- OPERATIONS/: venues, procesos, proveedores, eventos pasados
- CLIENTES/: una ficha por cliente de ARRIVE
- ARSENAL/: reglas de Bart, herramientas, sistemas
- INCUBATOR/: proyectos del portafolio e ideas
- PERSONAL/: lo personal y redes sociales propias

COMANDOS QUE PUEDO DECIRTE
- "SIGUIENTE": cierra el bloque actual y pasa al próximo.
- "RESUMEN": dime qué tenemos y qué falta.
- "PENDIENTES": lista todos los [PENDIENTE].
- "EXPORTAR": entrégame TODOS los documentos finales, uno tras otro, cada uno en su propio bloque de código markdown, sin texto en medio, listos para copiar.

Empieza presentándote en una línea y hazme las primeras preguntas del Bloque 1.
```
