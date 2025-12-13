-- ========================================
-- FASE 4: Migracion para sistema de visibilidad de repisas
-- ========================================

-- Crear el tipo ENUM para visibilidad si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_shelves_visibility') THEN
        CREATE TYPE enum_shelves_visibility AS ENUM ('public', 'friends', 'private');
    END IF;
END$$;

-- Agregar columna visibility a la tabla shelves
ALTER TABLE shelves
ADD COLUMN IF NOT EXISTS visibility enum_shelves_visibility DEFAULT 'public' NOT NULL;

-- Migrar datos existentes: convertir isPublic a visibility
UPDATE shelves
SET visibility = CASE
    WHEN is_public = true THEN 'public'::enum_shelves_visibility
    ELSE 'private'::enum_shelves_visibility
END
WHERE visibility IS NULL OR visibility = 'public';

-- Actualizar repisas que eran privadas (is_public = false)
UPDATE shelves
SET visibility = 'private'
WHERE is_public = false AND visibility = 'public';

-- Crear indice para consultas de visibilidad
CREATE INDEX IF NOT EXISTS idx_shelves_visibility ON shelves(user_id, visibility);

-- Indice para consultas de amistad frecuentes
CREATE INDEX IF NOT EXISTS idx_friendships_status_users ON friendships(status, requester_id, addressee_id);

-- ========================================
-- Verificacion de la migracion
-- ========================================
-- SELECT
--     visibility,
--     is_public,
--     COUNT(*) as count
-- FROM shelves
-- GROUP BY visibility, is_public;
