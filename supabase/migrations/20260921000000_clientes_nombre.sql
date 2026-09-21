-- Unifica nombres + apellidos en un único campo nombre
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre text;
UPDATE clientes SET nombre = nombres || ' ' || apellidos WHERE nombre IS NULL;
ALTER TABLE clientes ALTER COLUMN nombre SET NOT NULL;
ALTER TABLE clientes DROP COLUMN IF EXISTS nombres;
ALTER TABLE clientes DROP COLUMN IF EXISTS apellidos;
