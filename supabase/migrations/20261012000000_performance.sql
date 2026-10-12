-- =============================================================================
-- Rendimiento: índices, RLS con initplan y agregados en Postgres
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Índices (Postgres no indexa FKs automáticamente)
--    pagos(prestamo_id, numero_cuota) ya existe vía unique().
-- ---------------------------------------------------------------------------

create index if not exists idx_prestamos_prestamista_estado
  on prestamos (prestamista_id, estado, fecha_inicio);
create index if not exists idx_prestamos_cliente      on prestamos (cliente_id);
create index if not exists idx_prestamos_entidad      on prestamos (entidad_id);
create index if not exists idx_prestamos_created_at   on prestamos (created_at desc);
create index if not exists idx_pagos_fecha_pago       on pagos (fecha_pago);
create index if not exists idx_clientes_prestamista_nombre
  on clientes (prestamista_id, nombre);
create index if not exists idx_clientes_entidad       on clientes (entidad_id);
create index if not exists idx_adjuntos_prestamo      on prestamo_adjuntos (prestamo_id);

-- ---------------------------------------------------------------------------
-- 2. RLS: (select auth.uid()) / (select is_admin()) se evalúan una sola vez
--    por consulta (initplan) en lugar de una vez por fila. Misma semántica.
-- ---------------------------------------------------------------------------

drop policy if exists "prestamista ve sus clientes"        on clientes;
drop policy if exists "prestamista actualiza sus clientes" on clientes;

create policy "prestamista ve sus clientes"
  on clientes for select to authenticated
  using (prestamista_id = (select auth.uid()) or (select is_admin()));

create policy "prestamista actualiza sus clientes"
  on clientes for update to authenticated
  using (prestamista_id = (select auth.uid()) or (select is_admin()));

drop policy if exists "prestamista ve sus prestamos"        on prestamos;
drop policy if exists "prestamista actualiza sus prestamos" on prestamos;

create policy "prestamista ve sus prestamos"
  on prestamos for select to authenticated
  using (prestamista_id = (select auth.uid()) or (select is_admin()));

create policy "prestamista actualiza sus prestamos"
  on prestamos for update to authenticated
  using (prestamista_id = (select auth.uid()) or (select is_admin()));

drop policy if exists "prestamista ve sus pagos"        on pagos;
drop policy if exists "prestamista actualiza sus pagos" on pagos;

create policy "prestamista ve sus pagos"
  on pagos for select to authenticated
  using (
    exists (
      select 1 from prestamos
      where prestamos.id = pagos.prestamo_id
        and (prestamos.prestamista_id = (select auth.uid()) or (select is_admin()))
    )
  );

create policy "prestamista actualiza sus pagos"
  on pagos for update to authenticated
  using (
    exists (
      select 1 from prestamos
      where prestamos.id = pagos.prestamo_id
        and (prestamos.prestamista_id = (select auth.uid()) or (select is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Agregados para las stat cards (antes se descargaban todas las filas y se
--    sumaban en JS; además PostgREST corta en 1000 filas). SECURITY INVOKER
--    (por defecto): respetan RLS igual que las consultas directas.
-- ---------------------------------------------------------------------------

create or replace function prestamos_stats()
returns table (total bigint, activos bigint, capital_colocado numeric, por_cobrar numeric)
language sql
stable
as $$
  select
    count(*),
    count(*) filter (where estado = 'ACTIVA'),
    coalesce(sum(capital)     filter (where estado = 'ACTIVA'), 0),
    coalesce(sum(valor_cuota) filter (where estado = 'ACTIVA'), 0)
  from prestamos;
$$;

create or replace function pagos_stats()
returns table (activos bigint, vencidas bigint, recaudo_mes numeric)
language sql
stable
as $$
  select
    (select count(*) from prestamos where estado = 'ACTIVA'),
    (select count(*) from prestamos
      where estado = 'ACTIVA'
        and (fecha_inicio + make_interval(months => cuotas_pagadas))::date
              < (now() at time zone 'utc')::date),
    (select coalesce(sum(valor_pagado), 0) from pagos
      where fecha_pago >= date_trunc('month', now() at time zone 'utc')::date
        and fecha_pago <  (date_trunc('month', now() at time zone 'utc') + interval '1 month')::date);
$$;

grant execute on function prestamos_stats() to authenticated;
grant execute on function pagos_stats()     to authenticated;
