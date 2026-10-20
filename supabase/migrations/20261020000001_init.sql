-- Valle Volcanes Propiedades — esquema inicial
-- Propiedades, fotografías, ajustes del sitio, consultas y administradores.

create extension if not exists "pgcrypto";

-- ───────────────────────── Tipos ─────────────────────────
create type public.property_status as enum ('borrador', 'publicada', 'reservada', 'vendida');
create type public.property_operation as enum ('venta', 'arriendo');
create type public.property_type as enum ('casa', 'departamento', 'parcela', 'terreno', 'cabana', 'local_comercial', 'oficina', 'campo');
create type public.price_currency as enum ('UF', 'CLP', 'USD');

-- ───────────────────── Administradores ─────────────────────
-- Acceso al panel por correo autorizado. La cuenta se crea en Supabase Auth;
-- solo los correos listados aquí pueden editar contenido.
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────────────────────── Propiedades ─────────────────────────
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  status public.property_status not null default 'borrador',
  operation public.property_operation not null default 'venta',
  property_type public.property_type not null default 'casa',
  price numeric(14, 2) check (price is null or price >= 0),
  currency public.price_currency not null default 'UF',
  commune text not null default 'Puerto Varas',
  sector text,
  address text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms smallint check (bathrooms is null or bathrooms >= 0),
  built_m2 numeric(10, 2) check (built_m2 is null or built_m2 >= 0),
  land_m2 numeric(12, 2) check (land_m2 is null or land_m2 >= 0),
  parking smallint check (parking is null or parking >= 0),
  year_built smallint check (year_built is null or year_built between 1850 and 2100),
  summary text check (summary is null or char_length(summary) <= 280),
  description text,
  features text[] not null default '{}',
  featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_public_idx on public.properties (status, featured desc, published_at desc);
create index properties_commune_idx on public.properties (commune);

-- ───────────────────────── Fotografías ─────────────────────────
-- Cada foto se guarda en Storage como tres variantes ya comprimidas:
--   {storage_prefix}/sm.{ext} (640px) · md.{ext} (1280px) · lg.{ext} (2048px)
create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_prefix text not null,
  ext text not null default 'webp' check (ext in ('webp', 'jpg', 'avif')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  placeholder text,          -- data URL diminuta (LQIP) para carga progresiva
  alt text,
  position integer not null default 0,
  bytes_total integer,       -- peso sumado de las variantes, para control
  created_at timestamptz not null default now()
);

create index property_images_property_idx on public.property_images (property_id, position);

-- ───────────────────────── Ajustes del sitio ─────────────────────────
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  agency_name text not null default 'Valle Volcanes Propiedades',
  owner_name text,
  tagline text,
  about text,
  phone text,
  whatsapp text,             -- solo dígitos con código país, ej. 56912345678
  email text,
  instagram text,
  address text,
  service_area text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, owner_name, tagline, about, phone, whatsapp, email, instagram, address, service_area)
values (
  1,
  'Nombre de la corredora',
  'Propiedades entre lagos y volcanes',
  'Acompañamos la compra y venta de casas, parcelas y terrenos en Puerto Varas y sus alrededores, con conocimiento local y trato directo.',
  '+56 9 1234 5678',
  '56912345678',
  'contacto@vallevolcanespropiedades.cl',
  'vallevolcanespropiedades',
  'Puerto Varas, Región de Los Lagos',
  'Puerto Varas, Llanquihue, Frutillar, Ensenada y Puerto Montt'
);

-- ───────────────────────── Consultas ─────────────────────────
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 5 and 3000),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index inquiries_created_idx on public.inquiries (created_at desc);

-- ───────────────────────── updated_at ─────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- published_at se fija la primera vez que la propiedad sale publicada
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'borrador' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger properties_published before insert or update on public.properties
  for each row execute function public.set_published_at();

-- ───────────────────────── RLS ─────────────────────────
alter table public.admins enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.inquiries enable row level security;

-- admins: solo administradores ven la lista
create policy "admins_select" on public.admins for select to authenticated using ((select public.is_admin()));

-- properties: el público ve todo menos borradores; admin hace todo
create policy "properties_public_read" on public.properties for select to anon, authenticated
  using (status <> 'borrador' or (select public.is_admin()));
create policy "properties_admin_insert" on public.properties for insert to authenticated
  with check ((select public.is_admin()));
create policy "properties_admin_update" on public.properties for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "properties_admin_delete" on public.properties for delete to authenticated
  using ((select public.is_admin()));

-- property_images: visibles si su propiedad es visible
create policy "images_public_read" on public.property_images for select to anon, authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and (p.status <> 'borrador' or (select public.is_admin()))
  ));
create policy "images_admin_insert" on public.property_images for insert to authenticated
  with check ((select public.is_admin()));
create policy "images_admin_update" on public.property_images for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "images_admin_delete" on public.property_images for delete to authenticated
  using ((select public.is_admin()));

-- site_settings: lectura pública, edición admin
create policy "settings_public_read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings_admin_update" on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- inquiries: cualquiera puede enviar; solo admin lee, marca y borra
create policy "inquiries_public_insert" on public.inquiries for insert to anon, authenticated
  with check (read = false);
create policy "inquiries_admin_select" on public.inquiries for select to authenticated
  using ((select public.is_admin()));
create policy "inquiries_admin_update" on public.inquiries for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "inquiries_admin_delete" on public.inquiries for delete to authenticated
  using ((select public.is_admin()));

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 3145728, array['image/webp', 'image/jpeg', 'image/avif'])
on conflict (id) do nothing;

create policy "property_images_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and (select public.is_admin()));
create policy "property_images_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and (select public.is_admin()));
create policy "property_images_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and (select public.is_admin()));
