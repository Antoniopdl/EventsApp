-- ==============================================================================
-- MIGRACIÓN 00010: TABLA DE CATÁLOGO MAESTRO DE TELAS Y COLORES
-- Permite editar y sincronizar telas, nombres de color y fotos de textura/caída
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fabric_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    colors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.fabric_catalog IS 'Muestrario maestro de telas y colores para manteles';
COMMENT ON COLUMN public.fabric_catalog.colors IS 'Array JSON con { color_name, color_hex, texture_url, drape_url, tags }';

-- Índices
CREATE INDEX IF NOT EXISTS idx_fabric_catalog_slug ON public.fabric_catalog (slug);

-- RLS
ALTER TABLE public.fabric_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de fabric_catalog" ON public.fabric_catalog;
CREATE POLICY "Lectura publica de fabric_catalog" ON public.fabric_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escritura completa de fabric_catalog" ON public.fabric_catalog;
CREATE POLICY "Escritura completa de fabric_catalog" ON public.fabric_catalog FOR ALL USING (true);
