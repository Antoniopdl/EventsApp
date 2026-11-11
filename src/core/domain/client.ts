import type { Booking } from "./booking";

export interface ClientAddress {
  id: string;
  client_id: string;
  alias: string;
  address_text: string;
  latitude?: number | null;
  longitude?: number | null;
  delivery_notes?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone_whatsapp: string;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientWithStats extends Client {
  addresses: ClientAddress[];
  bookings_count: number;
  total_spent: number;
  last_booking_date?: string | null;
}

export interface ClientDetails extends ClientWithStats {
  bookings: Booking[];
}

export type LoyaltyTier = "bronce" | "plata" | "oro";

export interface LoyaltyInfo {
  tier: LoyaltyTier;
  tierName: string;
  badge: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  benefits: string[];
  currentBookings: number;
  nextTierBookings: number;
  progressPercent: number;
  nextTierName: string | null;
}

/**
 * Calcula el nivel de lealtad y beneficios de una clienta según sus rentas realizadas.
 */
export function getClientLoyaltyTier(bookingsCount: number): LoyaltyInfo {
  const count = Math.max(0, bookingsCount || 0);

  if (count >= 6) {
    return {
      tier: "oro",
      tierName: "Oro VIP (Clienta Consentida)",
      badge: "🥇 Oro VIP",
      colorClass: "text-amber-800",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-300",
      benefits: [
        "10% de descuento en fletes",
        "Sin depósito de garantía ($0)",
        "Apartado prioritario en fechas festivas",
        "Atención preferencial directa de la familia",
      ],
      currentBookings: count,
      nextTierBookings: 6,
      progressPercent: 100,
      nextTierName: null,
    };
  }

  if (count >= 3) {
    return {
      tier: "plata",
      tierName: "Plata (Clienta Frecuente)",
      badge: "🥈 Plata Frecuente",
      colorClass: "text-slate-800",
      bgClass: "bg-slate-100",
      borderClass: "border-slate-300",
      benefits: [
        "5% de descuento en mantelería",
        "Depósito de garantía flexible ($0)",
        "Reserva anticipada sin penalizaciones",
      ],
      currentBookings: count,
      nextTierBookings: 6,
      progressPercent: Math.min(100, Math.round(((count - 2) / 4) * 100)),
      nextTierName: "Oro VIP (a las 6 rentas)",
    };
  }

  return {
    tier: "bronce",
    tierName: "Bronce (Clienta Nueva)",
    badge: "🥉 Bronce Nuevo",
    colorClass: "text-amber-900",
    bgClass: "bg-amber-50/60",
    borderClass: "border-amber-200",
    benefits: [
      "Flete base preferencial en Angostura",
      "Cotizaciones inmediatas por WhatsApp",
    ],
    currentBookings: count,
    nextTierBookings: 3,
    progressPercent: Math.min(100, Math.round((count / 3) * 100)),
    nextTierName: "Plata Frecuente (a las 3 rentas)",
  };
}
