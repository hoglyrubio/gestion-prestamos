-- =============================================================================
-- Migration: tabla pagos (cuotas de préstamos)
-- =============================================================================

create table if not exists pagos (
  id              uuid primary key default gen_random_uuid(),
  prestamo_id     uuid not null references prestamos(id) on delete cascade,
  numero_cuota    integer not null,
  fecha_esperada  date not null,
  valor_esperado  numeric(14,2) not null,
  fecha_pago      date,
  valor_pagado    numeric(14,2),
  estado          text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE', 'PAGADO')),
  notas           text,
  created_at      timestamptz not null default now(),
  unique(prestamo_id, numero_cuota)
);

alter table pagos enable row level security;

drop policy if exists "prestamista ve sus pagos"      on pagos;
drop policy if exists "prestamista inserta pagos"     on pagos;
drop policy if exists "prestamista actualiza sus pagos" on pagos;

create policy "prestamista ve sus pagos"
  on pagos for select to authenticated
  using (
    exists (
      select 1 from prestamos
      where prestamos.id = pagos.prestamo_id
        and (prestamos.prestamista_id = auth.uid() or is_admin())
    )
  );

create policy "prestamista inserta pagos"
  on pagos for insert to authenticated
  with check (
    exists (
      select 1 from prestamos
      where prestamos.id = pagos.prestamo_id
        and prestamos.prestamista_id = auth.uid()
    )
    and exists (
      select 1 from profiles
      where id = auth.uid() and status = 'ACTIVE' and role in ('PRESTAMISTA', 'ADMIN')
    )
  );

create policy "prestamista actualiza sus pagos"
  on pagos for update to authenticated
  using (
    exists (
      select 1 from prestamos
      where prestamos.id = pagos.prestamo_id
        and (prestamos.prestamista_id = auth.uid() or is_admin())
    )
  );
