-- Agrega entidad_id a prestamos (FK a entidades, nullable en DB — obligatorio para LIBRANZA vía app)
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS entidad_id text REFERENCES entidades(id);
