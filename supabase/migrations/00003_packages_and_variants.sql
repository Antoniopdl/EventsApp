-- ==============================================================================
-- MIGRACIÓN 00003: PAQUETES/COMBOS Y VARIACIONES DE COLOR/TELA EN MOBILIARIO
-- ==============================================================================

-- 1. Ampliar tabla de inventario con tipo de artículo, tela y capacidad de comensales
ALTER TABLE public.inventory_items 
    ADD COLUMN IF NOT EXISTS item_type VARCHAR(30) NOT NULL DEFAULT 'individual' CHECK (item_type IN ('individual', 'paquete')),
    ADD COLUMN IF NOT EXISTS fabric VARCHAR(50), -- 'satin', 'tergal', 'bordado', 'encaje', etc.
    ADD COLUMN IF NOT EXISTS capacity_people INTEGER DEFAULT 0; -- 8, 10, 12 personas para mesas y paquetes

-- 2. TABLA: VARIACIONES DE PRODUCTO (Colores de mantelería con stock independiente)
CREATE TABLE IF NOT EXISTS public.inventory_item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    color_name VARCHAR(100) NOT NULL, -- 'Blanco', 'Negro', 'Azul rey', 'Rosa pastel', etc.
    color_hex VARCHAR(30) DEFAULT '#2563eb',
    total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
    rental_price_override DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (item_id, color_name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_item_variants_item ON public.inventory_item_variants(item_id);

-- 3. TABLA: COMPOSICIÓN DE PAQUETES / RECETA DE PIEZAS (BOM)
CREATE TABLE IF NOT EXISTS public.package_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    component_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    is_customizable BOOLEAN NOT NULL DEFAULT false, -- Requiere elegir color/tela
    customization_type VARCHAR(50), -- 'mantel_base', 'sobremantel', 'silla'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_package_items_package ON public.package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_component ON public.package_items(component_item_id);

-- 4. SEGURIDAD: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.inventory_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a variantes de inventario" 
    ON public.inventory_item_variants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a componentes de paquetes" 
    ON public.package_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. REPLICACIÓN EN TIEMPO REAL (Realtime WebSockets)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_item_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.package_items;
