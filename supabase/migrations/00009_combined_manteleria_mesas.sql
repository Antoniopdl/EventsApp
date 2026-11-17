-- ==============================================================================
-- FER EVENTOS: MIGRACIÓN COMBINADA 00007 Y 00008 (MANTELERÍA, TELAS Y MESAS)
-- Pega este script en tu Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Ampliar tabla de variantes con fotos múltiples (textura/caída) y tela
ALTER TABLE public.inventory_item_variants 
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS fabric VARCHAR(50);

COMMENT ON COLUMN public.inventory_item_variants.images IS 'URLs de fotos para esta variación de color (Textura y Caída)';
COMMENT ON COLUMN public.inventory_item_variants.image_url IS 'Foto principal o portada de la variación';
COMMENT ON COLUMN public.inventory_item_variants.fabric IS 'Tela específica de la variación (ej. Tergal, Razo Kim, Satín)';

-- 2. Campos de compatibilidad de manteles y sobremanteles con mesas en inventory_items
ALTER TABLE public.inventory_items 
    ADD COLUMN IF NOT EXISTS fabric VARCHAR(50),
    ADD COLUMN IF NOT EXISTS table_shape VARCHAR(30) DEFAULT 'redonda',
    ADD COLUMN IF NOT EXISTS tablecloth_size VARCHAR(30) DEFAULT 'estandar',
    ADD COLUMN IF NOT EXISTS compatible_tables TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.inventory_items.fabric IS 'Tela principal del mantel base o sobremantel';
COMMENT ON COLUMN public.inventory_items.table_shape IS 'Forma de mesa compatible (redonda, cuadrada, tablon, universal)';
COMMENT ON COLUMN public.inventory_items.tablecloth_size IS 'Tamaño del sobremantel: chico (redondas y cuadradas chicas) o grande (cuadradas grandes)';
COMMENT ON COLUMN public.inventory_items.compatible_tables IS 'Array de slugs de mesas compatibles';
