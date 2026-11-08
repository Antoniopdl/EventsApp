-- ==============================================================================
-- MIGRACIÓN INICIAL: PLATAFORMA DE RENTA DE MOBILIARIO, INVENTARIO Y LOGÍSTICA
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: INVENTARIO (Mobiliario, vajilla, mantelería, carpas, decoración)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('sillas', 'mesas', 'manteleria', 'vajilla', 'toldos_carpas', 'decoracion', 'otros')),
    description TEXT,
    total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
    rental_price DECIMAL(10, 2) NOT NULL CHECK (rental_price >= 0),
    replacement_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (replacement_price >= 0),
    image_url TEXT,
    buffer_cleanup_hours INTEGER NOT NULL DEFAULT 2 CHECK (buffer_cleanup_hours >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para búsqueda rápida en catálogo
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON public.inventory_items(is_active);

-- 3. TABLA: CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone_whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    default_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone_whatsapp);

-- 4. TABLA: RESERVACIONES / EVENTOS
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio VARCHAR(30) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    
    -- Tiempos flexibles (horas específicas, mismo día o multidiario)
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    delivery_datetime TIMESTAMPTZ NOT NULL,
    pickup_datetime TIMESTAMPTZ NOT NULL,
    pickup_type VARCHAR(30) NOT NULL DEFAULT 'mismo_dia_noche' 
        CHECK (pickup_type IN ('mismo_dia_noche', 'dia_siguiente', 'evento_multidia')),

    -- Ubicación y Google Maps
    event_address TEXT NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    google_place_id TEXT,
    freight_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    freight_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Estado del flujo
    status VARCHAR(30) NOT NULL DEFAULT 'cotizacion' 
        CHECK (status IN (
            'cotizacion', 
            'confirmada', 
            'cargando_camioneta', 
            'en_ruta_entrega', 
            'entregada', 
            'por_recoger', 
            'en_ruta_recoleccion', 
            'recolectada', 
            'finalizada', 
            'cancelada'
        )),

    -- Finanzas y desglose
    subtotal_furniture DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pendiente' 
        CHECK (payment_status IN ('pendiente', 'anticipo_pagado', 'liquidado')),

    notes TEXT,
    created_by UUID, -- Referencia opcional al usuario auth
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Validación lógica temporal
    CONSTRAINT check_dates_validity CHECK (end_datetime >= start_datetime AND pickup_datetime >= delivery_datetime)
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(delivery_datetime, pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);

-- 5. TABLA: DETALLE DE ARTÍCULOS POR RESERVA
CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_applied DECIMAL(10, 2) NOT NULL CHECK (unit_price_applied >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_item ON public.booking_items(item_id);

-- 6. TABLA: PAGOS Y GARANTÍAS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('anticipo', 'liquidacion', 'deposito_garantia', 'cobro_danos', 'devolucion_garantia')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta')),
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- ==============================================================================
-- 7. FUNCIÓN POSTGRESQL PARA PREVENIR SOBREVENTA (Double-Booking Prevention)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_item_availability(
    p_item_id UUID,
    p_start_datetime TIMESTAMPTZ,
    p_end_datetime TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_stock INTEGER;
    v_reserved_stock INTEGER;
    v_available INTEGER;
BEGIN
    -- 1. Obtener stock total
    SELECT total_stock INTO v_total_stock
    FROM public.inventory_items
    WHERE id = p_item_id AND is_active = true;

    IF v_total_stock IS NULL THEN
        RETURN 0;
    END IF;

    -- 2. Calcular stock comprometido en reservas que se solapen en el rango
    SELECT COALESCE(SUM(bi.quantity), 0) INTO v_reserved_stock
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.item_id = p_item_id
      AND b.status NOT IN ('cancelada', 'finalizada', 'cotizacion')
      -- Condición de solapamiento de rangos de fechas:
      AND (b.delivery_datetime < p_end_datetime AND b.pickup_datetime > p_start_datetime);

    -- 3. Calcular disponibilidad real
    v_available := v_total_stock - v_reserved_stock;
    IF v_available < 0 THEN
        v_available := 0;
    END IF;

    RETURN v_available;
END;
$$;

-- ==============================================================================
-- 8. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados y anónimos (soporta PWA y anon key de Supabase)
CREATE POLICY "Permitir acceso a inventario" 
    ON public.inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a clientes" 
    ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a reservas" 
    ON public.bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a items de reserva" 
    ON public.booking_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a pagos" 
    ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Permisos de ejecución para la función de disponibilidad anti-sobreventa
GRANT EXECUTE ON FUNCTION public.check_item_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- Habilitar tiempo real (Realtime) para las tablas clave
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_items;

