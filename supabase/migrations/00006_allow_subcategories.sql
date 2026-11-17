-- ==============================================================================
-- MIGRACIÓN 00006: PERMITIR SUBCATEGORÍAS EXACTAS DE MANTELES (BASE Y SOBREMANTELES)
-- ==============================================================================

-- 1. Actualizar restricción CHECK en inventory_items para incluir manteles_base y sobremanteles
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_category_check;

ALTER TABLE public.inventory_items 
    ADD CONSTRAINT inventory_items_category_check 
    CHECK (category IN (
        'sillas', 
        'mesas', 
        'manteleria', 
        'manteles_base', 
        'sobremanteles', 
        'vajilla', 
        'toldos_carpas', 
        'decoracion', 
        'otros'
    ));

-- 2. Migrar registros existentes que hayan quedado en 'otros' o 'manteleria' si su nombre o SKU indican manteles
UPDATE public.inventory_items
SET category = 'sobremanteles'
WHERE (category = 'otros' OR category = 'manteleria') 
  AND (lower(name) LIKE '%sobremantel%' OR lower(sku) LIKE '%sobr%');

UPDATE public.inventory_items
SET category = 'manteles_base'
WHERE (category = 'otros' OR category = 'manteleria') 
  AND (lower(name) LIKE '%mantel%' OR lower(sku) LIKE '%mant%');
