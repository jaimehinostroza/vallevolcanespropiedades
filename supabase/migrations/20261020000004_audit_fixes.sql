-- Arreglos de la auditoría del 20-10-2026

-- 1. storage.remove() necesita SELECT además de DELETE: sin esto las fotos borradas quedaban en el bucket.
create policy "property_images_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'property-images' and (select private.is_admin()));

-- 2. La dirección exacta es privada: el público lee todas las columnas menos "address".
revoke select on public.properties from anon;
grant select (
  id, slug, title, status, operation, property_type, price, currency, commune, sector,
  latitude, longitude, bedrooms, bathrooms, built_m2, land_m2, parking, year_built,
  summary, description, features, featured, sort_order, published_at, created_at, updated_at
) on public.properties to anon;

-- 3. El límite global queda como último freno (el sitio además limita por IP).
create or replace function private.inquiries_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.inquiries where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Demasiadas consultas en poco tiempo. Intenta de nuevo en unos minutos.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
