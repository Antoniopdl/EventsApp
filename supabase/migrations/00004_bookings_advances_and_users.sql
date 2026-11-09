-- ==============================================================================
-- MIGRACIÓN 00004: ANTICIPOS, SALDOS, USUARIOS CON PIN DE 6 DÍGITOS Y RESERVAS
-- ==============================================================================

-- 1. Ampliar tabla de reservas (bookings) con anticipos y saldo pendiente
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- 2. TABLA: USUARIOS DEL SISTEMA Y PINS DE 6 DÍGITOS
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    pin_code VARCHAR(6) NOT NULL CHECK (length(pin_code) = 6),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- 3. SEGURIDAD: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a usuarios autenticados y anonimos de la app" 
    ON public.app_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. REALTIME: Publicar cambios de usuarios y reservas
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;

-- 5. SEMILLA DE USUARIOS INICIALES
INSERT INTO public.app_users (username, pin_code, role, full_name)
VALUES 
    ('admin', '123456', 'admin', 'Administración General'),
    ('mama', '112233', 'admin', 'Tere / Mamá (Administración)'),
    ('antonio', '778899', 'admin', 'Antonio (Administración)'),
    ('chofer', '654321', 'driver', 'Repartidor / Entregas')
ON CONFLICT (username) DO UPDATE 
SET pin_code = EXCLUDED.pin_code,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
