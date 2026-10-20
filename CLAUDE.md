@AGENTS.md

# Valle Volcanes Propiedades — guía del proyecto

Sitio de una corredora de propiedades en Puerto Varas (Región de Los Lagos, Chile) con panel
para que la dueña publique propiedades y fotos. Todo el texto visible va en español de Chile.

## Stack
- **Next.js 16** (App Router, `cacheComponents: true`, `proxy.ts` en vez de middleware, params/cookies asíncronos).
  Antes de usar una API de Next, revisa `node_modules/next/dist/docs/`.
- **Supabase** (proyecto `wjmztihbmjtvbpqjvrqn`, región sa-east-1): Postgres + Auth + Storage.
  Esquema en `supabase/migrations/`. RLS activa en todo; la autorización vive en las políticas.
- **Vercel** para publicar. Sin Tailwind: CSS propio con tokens en `src/app/globals.css` + CSS Modules.

## Mapa del código
| Ruta | Qué es |
|---|---|
| `src/lib/types.ts` | Tipos del dominio (reflejan el SQL) |
| `src/lib/data.ts` | Lecturas públicas con `"use cache"` + `cacheTag`. Únicas funciones que usa el sitio público |
| `src/lib/supabase/{public,server,browser}.ts` | Clientes: anónimo cacheable / con sesión (server) / navegador |
| `src/lib/images.ts` | Variantes de imagen (sm 640, md 1280, lg 2048 px), URLs y `srcset` |
| `src/lib/image-pipeline.ts` | Compresión en el navegador + subida a Storage + borrado |
| `src/lib/format.ts` | Precios (UF/CLP/USD), superficies, etiquetas, slug, enlace WhatsApp |
| `src/components/PropertyPhoto.tsx` | Única forma de mostrar una foto de propiedad |
| `src/app/(site)/` | Sitio público |
| `src/app/admin/` | Panel de administración (protegido por `src/proxy.ts` + `getAdminUser()`) |

## Reglas
- **Datos públicos**: solo vía `src/lib/data.ts`. Tras cualquier cambio en el panel, llamar
  `updateTag(TAGS.properties)` (y `TAGS.property(slug)`) o `updateTag(TAGS.settings)` en la Server Action.
- **Componentes que leen cookies/searchParams** van dentro de `<Suspense>` (Cache Components).
- **Fotos**: nunca `next/image` para fotos de propiedades (ya vienen optimizadas); usar `PropertyPhoto`.
- **Administración**: solo correos presentes en la tabla `admins`. Toda Server Action del panel
  empieza verificando `getAdminUser()`.
- **DEMO_DATA=1** sirve datos de ejemplo (`src/lib/demo-data.ts`) sin Supabase. Nunca en producción.

## Diseño (skill emil-design-eng)
Dirección "Sur de Chile sobrio": piedra (`--paper`), bosque (`--forest`), lago (`--lake`), brasa
(`--ember`, acento escaso). Titulares en Cormorant Garamond, texto en Manrope (autoalojadas en `src/fonts`).
- Animar solo `transform` y `opacity`; nunca `transition: all`.
- Entradas/salidas con `var(--ease-out)`; movimiento en pantalla con `var(--ease-in-out)`; UI < 300 ms.
- Botones y elementos presionables: `scale(0.97)` en `:active` (clase `.btn` ya lo trae).
- Hover solo bajo `@media (hover: hover) and (pointer: fine)`.
- Nada aparece desde `scale(0)`: partir de `scale(0.95–0.97)` + `opacity: 0`.
- Modales centrados; popovers con `transform-origin` en su disparador.
- Respetar `prefers-reduced-motion` (quitar desplazamientos, dejar fundidos).
- Escalonar entradas de listas 40–60 ms; nunca bloquear la interacción.

## Comandos
```bash
npm run dev                  # desarrollo (requiere .env.local)
DEMO_DATA=1 npm run dev      # sin conexión, con datos de ejemplo
npm run build && npm run lint
```
