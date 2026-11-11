-- ==============================================================================
-- MIGRACIÓN 00005: GESTIÓN DE FLOTA, COMBUSTIBLE, INCIDENCIAS Y RUTAS MULTI-PARADA
-- ==============================================================================

-- 1. CATÁLOGO DE VEHÍCULOS DE LA FLOTA
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    fuel_type VARCHAR(30) NOT NULL CHECK (fuel_type IN ('gasolina_magna', 'gasolina_premium', 'diesel')),
    km_per_liter NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    fuel_cost_per_km NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
    max_package_capacity INTEGER NOT NULL DEFAULT 10,
    plate_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. REGISTRO DE GASTOS DE COMBUSTIBLE EN RUTA (LIQUIDACIÓN DE CAJA)
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_mxn NUMERIC(10, 2) NOT NULL CHECK (amount_mxn > 0),
    liters NUMERIC(6, 2),
    fuel_type VARCHAR(30) NOT NULL DEFAULT 'gasolina_magna',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON public.fuel_logs(trip_date);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON public.fuel_logs(vehicle_id);

-- 3. REPORTE DE DAÑOS O FALTANTES EN RECOLECCIÓN (CON LLAMADA A MAMÁ)
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    incident_type VARCHAR(30) NOT NULL CHECK (incident_type IN ('faltante', 'roto', 'manchado_grave')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_replacement_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_penalty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    admin_status VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (admin_status IN ('pendiente', 'cobrado_cliente', 'perdonado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_booking ON public.incident_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON public.incident_reports(admin_status);

-- 4. AMPLIACIÓN DE BOOKINGS PARA LOGÍSTICA Y MONTAJE
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requires_setup BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS setup_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS delivery_sequence INTEGER NOT NULL DEFAULT 0;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a vehiculos a roles autorizados"
    ON public.vehicles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a fuel_logs a roles autorizados"
    ON public.fuel_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a incident_reports a roles autorizados"
    ON public.incident_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;

-- 7. SEMILLA DE VEHÍCULOS REALES DE FER EVENTOS
INSERT INTO public.vehicles (name, fuel_type, km_per_liter, fuel_cost_per_km, max_package_capacity)
VALUES
    ('Nissan NP300 (Gasolina)', 'gasolina_magna', 8.80, 2.72, 8),
    ('Toyota Tacoma + Traila/Remolque', 'gasolina_magna', 6.00, 4.00, 16),
    ('La Dutty Diésel (Ford Super Duty)', 'diesel', 5.80, 4.57, 30)
ON CONFLICT DO NOTHING;
