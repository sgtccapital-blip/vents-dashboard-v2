# Cerebro de Bart — cómo está organizado

Este es el conocimiento curado del Command Center. Bart lo busca (RAG) para responder y actuar.
Los datos que cambian todo el tiempo (tareas, eventos, proyectos, contactos, notas) NO van aquí:
Bart ya los lee en vivo del dashboard. Aquí va lo que **no está en el dashboard**: cómo funciona el
negocio, acuerdos, precios, procesos, personas, aprendizajes.

## Carpetas
| Carpeta | Qué va |
| --- | --- |
| `NEGOCIO/` | Visión, metas y prioridades, equipo, precios y servicios, legal y permisos |
| `OPERATIONS/` | Venues, procesos (SOPs), proveedores, eventos pasados y sus resultados |
| `CLIENTES/` | Una ficha por cliente de ARRIVE |
| `ARSENAL/` | Reglas y memoria de Bart, sistemas y herramientas |
| `INCUBATOR/` | Proyectos del portafolio e ideas |
| `PERSONAL/` | Lo personal de GG y sus redes propias |
| `_plantillas/` | Plantillas para crear fichas nuevas (no se indexan) |
| `_archivo/` | Material original sin curar (no se indexa) |

Todo lo que empieza con `_` queda fuera del índice.

## Reglas de calidad
1. **Un documento por entidad**: un venue, un cliente, un proveedor, un proceso.
2. Cada línea de "Datos clave" se entiende sola y repite el nombre de la entidad.
3. Nunca inventar: lo que falta va como `[PENDIENTE]`.
4. Actualizar el campo `actualizado` cada vez que se cambia algo.
5. Sin contraseñas, tarjetas ni cuentas bancarias.
6. Las "Preguntas frecuentes" sirven para el RAG y, más adelante, para entrenar el modelo propio.
