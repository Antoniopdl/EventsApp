import type { Booking, BookingStatus } from "@/core/domain/booking";
import type { CreateBookingInput } from "@/core/validations/booking";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Consulta la disponibilidad real de un artículo en Supabase llamando a la función RPC anti-sobreventa.
 */
export async function checkItemAvailabilityInDb(
  itemId: string,
  startDatetime: string,
  endDatetime: string,
): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    return 100; // Disponibilidad por defecto en modo local
  }

  const { data, error } = await supabase.rpc("check_item_availability", {
    p_item_id: itemId,
    p_start_datetime: startDatetime,
    p_end_datetime: endDatetime,
  });

  if (error) {
    console.error("Error al consultar disponibilidad RPC:", error.message);
    return 0;
  }

  return data as number;
}

/**
 * Obtiene todas las reservaciones activas ordenadas por fecha de entrega.
 */
export async function getBookingsFromDb(): Promise<Booking[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*, booking_items(*)")
    .order("delivery_datetime", { ascending: true });

  if (error) {
    console.error("Error al obtener reservaciones:", error.message);
    return [];
  }

  return (data || []) as Booking[];
}

/**
 * Actualiza el estatus de un evento en el flujo (ej. de 'confirmada' a 'entregada').
 */
export async function updateBookingStatusInDb(
  bookingId: string,
  status: BookingStatus,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    console.error("Error al actualizar estatus de reserva:", error.message);
    return false;
  }

  return true;
}

/**
 * Inserta una nueva reservación completa en Supabase.
 */
export async function createBookingInDb(
  input: CreateBookingInput,
  folio: string,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  // 1. Insertar la reservación
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      folio,
      client_id: input.client_id,
      start_datetime: input.start_datetime,
      end_datetime: input.end_datetime,
      delivery_datetime: input.delivery_datetime,
      pickup_datetime: input.pickup_datetime,
      pickup_type: input.pickup_type,
      event_address: input.event_address,
      latitude: input.latitude,
      longitude: input.longitude,
      freight_distance_km: input.freight_distance_km,
      freight_cost: input.freight_cost,
      discount_amount: input.discount_amount,
      security_deposit: input.security_deposit,
      notes: input.notes,
      status: "confirmada",
    })
    .select("id")
    .single();

  if (bookingError || !bookingData) {
    console.error("Error al insertar reserva:", bookingError?.message);
    return null;
  }

  // 2. Insertar los artículos asociados
  const itemsToInsert = input.items.map((item) => ({
    booking_id: bookingData.id,
    item_id: item.item_id,
    quantity: item.quantity,
    unit_price_applied: item.unit_price_applied,
  }));

  const { error: itemsError } = await supabase
    .from("booking_items")
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("Error al insertar items de reserva:", itemsError.message);
  }

  return bookingData.id;
}
