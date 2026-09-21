-- Política DELETE faltante en pagos (sin ella, anularPago silenciosamente no borraba nada)
CREATE POLICY "prestamista elimina sus pagos"
  ON pagos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prestamos
      WHERE prestamos.id = pagos.prestamo_id
        AND (prestamos.prestamista_id = auth.uid() OR is_admin())
    )
  );
