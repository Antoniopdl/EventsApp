-- ==============================================================================
-- MIGRACIÓN 00011: CATEGORÍAS CRISTALERÍA Y PLATOS BASE + SOPORTE DE VARIACIONES
-- ==============================================================================

-- 1. Actualizar restricción CHECK en inventory_items para incluir cristaleria y platos_base
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
        'cristaleria',
        'platos_base',
        'toldos_carpas', 
        'decoracion', 
        'otros'
    ));

-- 2. Migrar registros existentes que sean copas o cristalería a 'cristaleria'
UPDATE public.inventory_items
SET category = 'cristaleria'
WHERE (category = 'vajilla' OR category = 'otros') 
  AND (lower(name) LIKE '%copa%' OR lower(name) LIKE '%cristal%' OR lower(sku) LIKE '%cris%');

-- 3. Migrar registros de platos base a 'platos_base'
UPDATE public.inventory_items
SET category = 'platos_base'
WHERE (category = 'vajilla' OR category = 'otros') 
  AND (lower(name) LIKE '%plato base%' OR lower(sku) LIKE '%plat-base%');
