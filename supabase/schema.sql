-- =============================================================================
-- Gestion de Préstamos — Schema completo
-- Ejecutar en orden en el SQL Editor de Supabase
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Función auxiliar de admin
-- ---------------------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id   = auth.uid()
      and role = 'ADMIN'
      and status = 'ACTIVE'
  )
$$;


-- =============================================================================
-- TABLAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles  (extiende auth.users)
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text check (role in ('ADMIN', 'PRESTAMISTA')),
  status      text not null default 'PENDING'
                check (status in ('PENDING', 'ACTIVE', 'REJECTED')),
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- Políticas RLS — profiles
create policy "usuario ve su propio perfil"
  on profiles for select
  to authenticated
  using (id = auth.uid() or is_admin());

create policy "usuario actualiza su propio perfil"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin());

create policy "admin ve todos los perfiles"
  on profiles for select
  to authenticated
  using (is_admin());

create policy "insertar perfil propio"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());


-- ---------------------------------------------------------------------------
-- 2. entidades
-- ---------------------------------------------------------------------------

create table if not exists entidades (
  id               text primary key,           -- NIT u otro código, máx 20 chars
  nombre           text not null,
  direccion        text,
  contacto         text,
  numero_contacto  text,
  created_at       timestamptz not null default now(),
  constraint entidades_id_length check (char_length(id) <= 20)
);

alter table entidades enable row level security;

-- Políticas RLS — entidades
create policy "usuarios activos ven entidades"
  on entidades for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and status = 'ACTIVE'
    )
  );

create policy "admin inserta entidades"
  on entidades for insert
  to authenticated
  with check (is_admin());

create policy "admin actualiza entidades"
  on entidades for update
  to authenticated
  using (is_admin());

create policy "admin elimina entidades"
  on entidades for delete
  to authenticated
  using (is_admin());


-- ---------------------------------------------------------------------------
-- 3. clientes
-- ---------------------------------------------------------------------------

create table if not exists clientes (
  id              uuid primary key default gen_random_uuid(),
  prestamista_id  uuid not null references auth.users(id),
  documento       text not null unique,
  nombres         text not null,
  apellidos       text not null,
  direccion       text not null,
  telefono        text not null,
  entidad_id      text references entidades(id),
  created_at      timestamptz not null default now()
);

alter table clientes enable row level security;

-- Políticas RLS — clientes
create policy "prestamista ve sus clientes"
  on clientes for select
  to authenticated
  using (
    prestamista_id = auth.uid()
    or is_admin()
  );

create policy "prestamista inserta clientes"
  on clientes for insert
  to authenticated
  with check (
    prestamista_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and status = 'ACTIVE'
        and role in ('PRESTAMISTA', 'ADMIN')
    )
  );

create policy "prestamista actualiza sus clientes"
  on clientes for update
  to authenticated
  using (
    prestamista_id = auth.uid()
    or is_admin()
  );


-- ---------------------------------------------------------------------------
-- 4. prestamos
-- ---------------------------------------------------------------------------

create table if not exists prestamos (
  id              uuid primary key default gen_random_uuid(),
  prestamista_id  uuid not null references auth.users(id),
  cliente_id      uuid not null references clientes(id),
  tipo            text not null check (tipo in ('PERSONAL', 'LIBRANZA')),
  numero          text not null unique,
  fecha           date not null,
  capital         numeric(14,2) not null,
  tasa_interes    numeric(6,4) not null,
  cuotas          integer not null,
  valor_cuota     numeric(14,2) not null,
  fecha_inicio    date not null,
  estado          text not null default 'ACTIVA'
                    check (estado in ('ACTIVA', 'ANULADA', 'PAGADA')),
  foto_url        text,
  created_at      timestamptz not null default now()
);

alter table prestamos enable row level security;

-- Políticas RLS — prestamos
create policy "prestamista ve sus prestamos"
  on prestamos for select
  to authenticated
  using (
    prestamista_id = auth.uid()
    or is_admin()
  );

create policy "prestamista inserta prestamos"
  on prestamos for insert
  to authenticated
  with check (
    prestamista_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and status = 'ACTIVE'
        and role in ('PRESTAMISTA', 'ADMIN')
    )
  );

create policy "prestamista actualiza sus prestamos"
  on prestamos for update
  to authenticated
  using (
    prestamista_id = auth.uid()
    or is_admin()
  );


-- =============================================================================
-- STORAGE — bucket "soportes"
-- =============================================================================
-- Crear el bucket desde el dashboard de Supabase (Storage → New bucket)
-- Nombre: soportes | Public: true (o false si se quiere acceso privado)
--
-- Políticas del bucket (ejecutar aquí):

insert into storage.buckets (id, name, public)
values ('soportes', 'soportes', true)
on conflict (id) do nothing;

create policy "usuarios activos suben soportes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'soportes'
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and status = 'ACTIVE'
        and role in ('PRESTAMISTA', 'ADMIN')
    )
  );

create policy "soportes son publicos para leer"
  on storage.objects for select
  to public
  using (bucket_id = 'soportes');
