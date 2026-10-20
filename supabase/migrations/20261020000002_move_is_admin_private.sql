-- is_admin() fuera del esquema expuesto por la API (las políticas RLS la siguen por OID)
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
grant execute on function private.is_admin() to anon, authenticated;
