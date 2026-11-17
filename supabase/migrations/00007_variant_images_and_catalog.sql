-- ==============================================================================
-- MIGRACIÓN 00007: FOTOS POR VARIACIÓN DE COLOR/TELA Y CATÁLOGO DE MANTELERÍA
-- ==============================================================================

-- 1. Ampliar tabla de variantes con galería de imágenes y tela específica
ALTER TABLE public.inventory_item_variants 
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS fabric VARCHAR(50);

COMMENT ON COLUMN public.inventory_item_variants.images IS 'URLs o base64 de fotos para esta variación de color/tela';
COMMENT ON COLUMN public.inventory_item_variants.image_url IS 'Foto principal o portada de la variación';
COMMENT ON COLUMN public.inventory_item_variants.fabric IS 'Tela específica de la variación (ej. Tergal, Satín) si difiere del artículo base';
