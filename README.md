# Valle Volcanes Propiedades

Sitio web de la corredora **Valle Volcanes Propiedades** (Puerto Varas, Región de Los Lagos) con
panel de administración para publicar propiedades y fotografías.

- **Sitio público**: portada, catálogo con filtros, ficha de cada propiedad con galería y visor a
  pantalla completa, contacto por WhatsApp y formulario de consultas.
- **Panel** (`/admin`): crear y editar propiedades, subir y ordenar fotos, leer consultas y
  editar los datos de contacto del sitio.
- **Fotos optimizadas automáticamente**: al subir, cada foto se corrige de orientación, se le
  quitan los metadatos (incluida la ubicación GPS) y se guarda en tres tamaños comprimidos
  (640, 1280 y 2048 px, WebP). El sitio entrega a cada pantalla el tamaño justo, con una vista
  previa borrosa mientras carga.

## Tecnología

| Pieza | Uso |
|---|---|
| Next.js 16 (App Router, Cache Components) | Sitio y panel |
| Supabase | Base de datos, inicio de sesión y almacenamiento de fotos |
| Vercel | Publicación |

Detalle técnico y reglas para quien desarrolle: [`CLAUDE.md`](CLAUDE.md).

## Puesta en marcha (desarrollo)

```bash
npm install
cp .env.example .env.local   # completar URL y clave publicable de Supabase
npm run dev                  # http://localhost:3000
DEMO_DATA=1 npm run dev      # con datos de ejemplo, sin Supabase
```

## Base de datos

Las migraciones están en `supabase/migrations/` y ya están aplicadas en el proyecto Supabase
`vallevolcanes-propiedades`. Tablas: `properties`, `property_images`, `site_settings`,
`inquiries`, `admins`. Todas con seguridad a nivel de fila (RLS): el público solo lee lo
publicado; solo los correos registrados en `admins` pueden modificar.

## Dar acceso a la dueña al panel

1. En Supabase → **Authentication → Users → Add user → Create new user**: correo y contraseña,
   marcando *Auto Confirm User*.
2. En Supabase → **SQL Editor**, autorizar ese correo:
   ```sql
   insert into public.admins (email) values ('correo@ejemplo.cl');
   ```
3. Entrar en `https://www.vallevolcanespropiedades.cl/admin`.

## Variables de entorno (Vercel)

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.vallevolcanespropiedades.cl` |
