-- Quién ingresó el pago (desnormalizado para display directo)
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS ingresado_nombre text;

-- Acumulador de pagos en prestamos para cálculo rápido de saldo
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS total_pagado numeric(14,2) NOT NULL DEFAULT 0;

-- Inicializar total_pagado desde pagos existentes
UPDATE prestamos p
SET total_pagado = COALESCE((
  SELECT SUM(valor_pagado)
  FROM pagos
  WHERE prestamo_id = p.id
    AND valor_pagado IS NOT NULL
), 0);
