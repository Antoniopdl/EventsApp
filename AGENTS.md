# GUÍA DE INGENIERÍA: CLEAN CODE, SEGURIDAD Y UI/UX (Mobiliario App)

Este repositorio sigue el skill `pipeline-clean-code-ui`. Todos los cambios de código, migraciones de base de datos e interfaces deben ajustarse estrictamente a estos principios.

---

## 1. Arquitectura y Estructura de Carpetas

```
mobiliario-app/
├── src/
│   ├── app/                    # Next.js App Router (Rutas y vistas)
│   ├── components/             # Componentes UI (shadcn/ui + componentes de negocio)
│   │   ├── ui/                 # Primitivos shadcn (Button, Dialog, Card, Input...)
│   │   ├── inventory/          # Componentes del módulo de inventario
│   │   ├── bookings/           # Componentes del módulo de reservaciones y calendario
│   │   ├── logistics/          # Componentes de rutas, mapas y fletes
│   │   └── shared/             # Header, navegación inferior móvil, Toasts
│   ├── core/                   # Núcleo de lógica pura de negocio
│   │   ├── domain/             # Modelos y entidades TypeScript (Booking, Item, Client)
│   │   ├── use-cases/          # Casos de uso (CheckAvailability, GenerateQuote, CalculateFreight)
│   │   └── validations/        # Esquemas Zod para formularios y APIs
│   ├── infrastructure/         # Conectores externos
│   │   ├── supabase/           # Cliente Supabase, migraciones y queries
│   │   └── google-maps/        # Cliente de Google Maps (Distance Matrix, Geocoding)
│   └── lib/                    # Utilidades (formato moneda MXN, fechas con date-fns)
```

---

## 2. Reglas de "Clean Code"

- **Funciones pequeñas**: Máximo 35 líneas por función.
- **Sin código espagueti**: Componentes UI solo renderizan estado y despachan eventos; la lógica de negocio vive en `core/use-cases`.
- **TypeScript estricto**: Prohibido usar `any`.
- **Validación Zod**: Todo input de usuario se valida con Zod antes de tocar la base de datos.

---

## 3. Seguridad Estricta

- **Supabase Row Level Security (RLS)** activado en todas las tablas sin excepción.
- Cero llaves privadas en frontend (`process.env.SUPABASE_SERVICE_ROLE_KEY` solo en backend / server actions).
- Prevención de fugas con `gitleaks` y `semgrep`.

---

## 4. Diseño UI/UX (Mobile-First para iPhone)

- Diseñado pensando en la mamá y hermana: Interfaz táctil (`min-h-[44px]`), textos en español claros y sin jerga técnica.
- Componentes visuales limpios basados en `shadcn/ui` y `Tailwind CSS`.
- Notificaciones y feedback inmediato (toasts en cada acción).
