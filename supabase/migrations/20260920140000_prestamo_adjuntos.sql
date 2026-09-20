-- Tabla de adjuntos múltiples para préstamos
CREATE TABLE IF NOT EXISTS prestamo_adjuntos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  url         text NOT NULL,
  nombre      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prestamo_adjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prestamista ve sus adjuntos"
  ON prestamo_adjuntos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prestamos p
      WHERE p.id = prestamo_id
        AND (p.prestamista_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "prestamista inserta adjuntos"
  ON prestamo_adjuntos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prestamos p
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = prestamo_id
        AND p.prestamista_id = auth.uid()
        AND pr.status = 'ACTIVE'
        AND pr.role IN ('PRESTAMISTA', 'ADMIN')
    )
  );

CREATE POLICY "prestamista elimina adjuntos"
  ON prestamo_adjuntos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prestamos p
      WHERE p.id = prestamo_id
        AND (p.prestamista_id = auth.uid() OR is_admin())
    )
  );

-- Migrar foto_url existente a la nueva tabla
INSERT INTO prestamo_adjuntos (prestamo_id, url, nombre)
SELECT id, foto_url, 'Soporte'
FROM prestamos
WHERE foto_url IS NOT NULL AND foto_url <> '';
