-- Agrega cuotas_pagadas a prestamos para rastrear el avance sin pre-generar cuotas
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS cuotas_pagadas integer NOT NULL DEFAULT 0;

-- Inicializa desde pagos PAGADO existentes
UPDATE prestamos p
SET cuotas_pagadas = COALESCE((
  SELECT COUNT(*) FROM pagos
  WHERE prestamo_id = p.id AND estado = 'PAGADO'
), 0);

-- Marca como PAGADA los préstamos que ya tienen todas las cuotas pagadas
UPDATE prestamos
SET estado = 'PAGADA'
WHERE cuotas_pagadas >= cuotas AND estado = 'ACTIVA';

-- Elimina cuotas PENDIENTE auto-generadas (ya no se usan)
DELETE FROM pagos WHERE estado = 'PENDIENTE';
