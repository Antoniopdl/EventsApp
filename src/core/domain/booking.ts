export type BookingStatus =
  | "cotizacion"
  | "confirmada"
  | "cargando_camioneta"
  | "en_ruta_entrega"
  | "entregada"
  | "por_recoger"
  | "en_ruta_recoleccion"
  | "recolectada"
  | "finalizada"
  | "cancelada";

export type PickupType =
  | "mismo_dia_noche"
  | "dia_siguiente"
  | "evento_multidia";

export type PaymentStatus = "pendiente" | "anticipo_pagado" | "liquidado";

export interface BookingItem {
  id?: string;
  booking_id?: string;
  item_id: string;
  quantity: number;
  unit_price_applied: number;
  item_name?: string;
}

export interface Booking {
  id: string;
  folio: string;
  client_id: string;
  start_datetime: string;
  end_datetime: string;
  delivery_datetime: string;
  pickup_datetime: string;
  pickup_type: PickupType;
  event_address: string;
  latitude?: number | null;
  longitude?: number | null;
  freight_distance_km: number;
  freight_cost: number;
  status: BookingStatus;
  subtotal_furniture: number;
  discount_amount: number;
  security_deposit: number;
  advance_payment: number;
  balance_due: number;
  total_amount: number;
  payment_status: PaymentStatus;
  client_name?: string;
  client_phone?: string;
  address_alias?: string;
  address_id?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: BookingItem[];
}
