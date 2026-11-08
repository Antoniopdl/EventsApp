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
