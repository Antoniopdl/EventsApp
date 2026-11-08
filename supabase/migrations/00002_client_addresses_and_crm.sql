-- ==============================================================================
-- MIGRACIÓN 00002: CRM DE CLIENTES Y MÚLTIPLES DIRECCIONES CON ALIAS
-- ==============================================================================

-- 1. Asegurar índice en teléfono de clientes para búsquedas ágiles
CREATE INDEX IF NOT EXISTS idx_clients_phone_search ON public.clients(phone_whatsapp);
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON public.clients USING gin(to_tsvector('spanish', full_name));

-- 2. TABLA: DIRECCIONES FRECUENTES DE CLIENTES (Múltiples domicilios particulares)
CREATE TABLE IF NOT EXISTS public.client_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL, -- Ej: 'Casa particular', 'Casa de su mamá', 'Casa de su suegra', 'Rancho'
    address_text TEXT NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    delivery_notes TEXT, -- Referencias de entrega: 'Portón blanco frente a la tienda'
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON public.client_addresses(client_id);

-- 3. Vincular reservaciones a la dirección seleccionada (manteniendo texto histórico congelado)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.client_addresses(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS address_alias VARCHAR(100);

-- 4. SEGURIDAD: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a direcciones de clientes" 
    ON public.client_addresses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. REPLICACIÓN EN TIEMPO REAL (Realtime WebSockets)
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_addresses;
