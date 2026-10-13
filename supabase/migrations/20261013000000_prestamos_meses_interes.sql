-- Cálculo de cuota con meses de interés independientes de las cuotas.
-- Columnas nullable: los préstamos existentes (de prueba) no se rellenan.
alter table prestamos
  add column if not exists meses_interes          numeric(5,2),
  add column if not exists total_deuda            numeric(14,2),
  add column if not exists total_intereses        numeric(14,2),
  add column if not exists tasa_interes_efectiva  numeric(7,4);
