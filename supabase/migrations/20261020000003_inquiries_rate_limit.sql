-- Freno anti-spam para el formulario de consultas: máximo 15 consultas cada 10 minutos en total.
-- Una corredora real no recibe más que eso; un bot sí. El sitio muestra un error amable si se excede.
create or replace function private.inquiries_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.inquiries where created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'Demasiadas consultas en poco tiempo. Intenta de nuevo en unos minutos.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.inquiries_rate_limit() from public, anon, authenticated;

create trigger inquiries_rate_limit before insert on public.inquiries
  for each row execute function private.inquiries_rate_limit();
