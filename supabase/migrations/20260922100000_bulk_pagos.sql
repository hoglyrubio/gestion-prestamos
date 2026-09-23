-- Templates para pagos en bulk
CREATE TABLE bulk_pagos_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text        NOT NULL,
  template   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: IDS Pagos (.csv)
INSERT INTO bulk_pagos_templates (nombre, template) VALUES (
  'IDS Pagos (.csv)',
  'archivo_origen,fecha_pago,comprobante,numero_pago,total_pagos,contrato,fecha_inicio,fecha_fin,nit,nombre,valor'
);

-- Cabecera de cada ejecución bulk
CREATE TABLE bulk_pagos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  template_id    uuid        NOT NULL REFERENCES bulk_pagos_templates(id),
  archivo_nombre text        NOT NULL,
  usuario_id     uuid        NOT NULL REFERENCES auth.users(id),
  usuario_nombre text        NOT NULL,
  total_filas    int         NOT NULL DEFAULT 0,
  total_pagado   numeric(14,2) NOT NULL DEFAULT 0
);

-- Detalle por línea del CSV
CREATE TABLE bulk_pago_lineas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_pago_id uuid        NOT NULL REFERENCES bulk_pagos(id) ON DELETE CASCADE,
  fila         int         NOT NULL,
  nit          text,
  cliente_id   uuid        REFERENCES clientes(id),
  cliente_nombre text,
  status       text        NOT NULL DEFAULT 'APLICADO',  -- APLICADO | ERROR
  aplicaciones jsonb,
  datos_fila   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- FK en pagos para trazar origen bulk
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS bulk_pago_id uuid REFERENCES bulk_pagos(id);

-- RLS
ALTER TABLE bulk_pagos_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pagos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pago_lineas     ENABLE ROW LEVEL SECURITY;

-- Templates: lectura para usuarios autenticados
CREATE POLICY "bulk_templates_select" ON bulk_pagos_templates
  FOR SELECT TO authenticated USING (true);

-- bulk_pagos: el prestamista ve solo los suyos
CREATE POLICY "bulk_pagos_select" ON bulk_pagos
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

CREATE POLICY "bulk_pagos_insert" ON bulk_pagos
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

-- bulk_pago_lineas: heredan del bulk_pagos padre
CREATE POLICY "bulk_lineas_select" ON bulk_pago_lineas
  FOR SELECT TO authenticated
  USING (bulk_pago_id IN (SELECT id FROM bulk_pagos WHERE usuario_id = auth.uid()));

CREATE POLICY "bulk_lineas_insert" ON bulk_pago_lineas
  FOR INSERT TO authenticated
  WITH CHECK (bulk_pago_id IN (SELECT id FROM bulk_pagos WHERE usuario_id = auth.uid()));
