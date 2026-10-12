-- =============================================================================
-- Custom Access Token Hook: role / status / full_name dentro del JWT
-- Evita consultar `profiles` en cada navegación (src/lib/auth.ts los lee con
-- getClaims). NO se pisa el claim estándar `role` (rol de Postgres).
--
-- Tras aplicar: activar en Dashboard → Authentication → Hooks →
-- "Customize Access Token (JWT) Claims" → Postgres function →
-- public.custom_access_token_hook
-- =============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb := event->'claims';
  p      record;
begin
  select role, status, full_name
    into p
    from public.profiles
   where id = (event->>'user_id')::uuid;

  if found then
    claims := jsonb_set(claims, '{user_role}',      coalesce(to_jsonb(p.role),      'null'::jsonb));
    claims := jsonb_set(claims, '{user_status}',    coalesce(to_jsonb(p.status),    'null'::jsonb));
    claims := jsonb_set(claims, '{user_full_name}', coalesce(to_jsonb(p.full_name), 'null'::jsonb));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Solo el servicio de Auth puede ejecutarla y leer profiles para ello
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on table public.profiles to supabase_auth_admin;

drop policy if exists "auth admin lee perfiles para el hook" on public.profiles;
create policy "auth admin lee perfiles para el hook"
  on public.profiles for select to supabase_auth_admin
  using (true);
