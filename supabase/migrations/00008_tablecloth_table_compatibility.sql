-- ==============================================================================
-- MIGRACIÓN 00008: COMPATIBILIDAD DE MANTELES Y SOBREMANTES CON MESAS
-- ==============================================================================

-- 1. Campos de compatibilidad en inventory_items
ALTER TABLE public.inventory_items 
    ADD COLUMN IF NOT EXISTS table_shape VARCHAR(30) DEFAULT 'redonda', -- 'redonda', 'cuadrada', 'tablon', 'todas'
    ADD COLUMN IF NOT EXISTS tablecloth_size VARCHAR(30) DEFAULT 'estandar', -- 'estandar', 'chico', 'grande'
    ADD COLUMN IF NOT EXISTS compatible_tables TEXT[] DEFAULT '{}'; -- 'redonda', 'cuadrada_chica', 'cuadrada_grande', 'tablon'

COMMENT ON COLUMN public.inventory_items.table_shape IS 'Forma de mesa a la que le queda el mantel base (redonda, cuadrada, tablon, todas)';
COMMENT ON COLUMN public.inventory_items.tablecloth_size IS 'Tamaño del sobremantel: chico (redondas y cuadradas chicas) o grande (cuadradas grandes)';
COMMENT ON COLUMN public.inventory_items.compatible_tables IS 'Array de slugs de tipos de mesa compatibles';
