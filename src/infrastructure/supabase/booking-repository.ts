import type { Booking, PaymentStatus } from "@/core/domain/booking";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Guarda una reserva formal en Supabase con estatus 'confirmada' y sus artículos rentados.
 */
export async function createBookingInDb(
  bookingData: {
    client_id?: string | null;
    client_name: string;
    client_phone: string;
    address_alias: string;
    event_address: string;
    delivery_notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    freight_distance_km: number;
    freight_cost: number;
    start_datetime: string;
    end_datetime: string;
    delivery_datetime: string;
    pickup_datetime: string;
    subtotal_furniture: number;
    security_deposit: number;
    advance_payment: number;
    total_amount: number;
    requires_setup?: boolean;
    setup_fee?: number;
    assigned_vehicle_id?: string | null;
  },
  items: { item_id: string; quantity: number; unit_price_applied: number }[],
): Promise<Booking | null> {
  const folio = `FE-${Date.now().toString().slice(-6)}`;
  const balanceDue = Math.max(
    0,
    bookingData.total_amount - bookingData.advance_payment,
  );

  let paymentStatus: PaymentStatus = "pendiente";
  if (bookingData.advance_payment >= bookingData.total_amount) {
    paymentStatus = "liquidado";
  } else if (bookingData.advance_payment > 0) {
    paymentStatus = "anticipo_pagado";
  }

  if (!isSupabaseConfigured || !supabase) {
    // Retorno en memoria para modo local
    return {
      id: `local-book-${Date.now()}`,
      folio,
      client_id: bookingData.client_id || "local-client",
      client_name: bookingData.client_name,
      client_phone: bookingData.client_phone,
      address_alias: bookingData.address_alias,
      event_address: bookingData.event_address,
      start_datetime: bookingData.start_datetime,
      end_datetime: bookingData.end_datetime,
      delivery_datetime: bookingData.delivery_datetime,
      pickup_datetime: bookingData.pickup_datetime,
      pickup_type: "mismo_dia_noche",
      freight_distance_km: bookingData.freight_distance_km,
      freight_cost: bookingData.freight_cost,
      status: "confirmada",
      subtotal_furniture: bookingData.subtotal_furniture,
      discount_amount: 0,
      security_deposit: bookingData.security_deposit,
      advance_payment: bookingData.advance_payment,
      balance_due: balanceDue,
      total_amount: bookingData.total_amount,
      payment_status: paymentStatus,
      requires_setup: bookingData.requires_setup || false,
      setup_fee: bookingData.setup_fee || 0,
      assigned_vehicle_id: bookingData.assigned_vehicle_id || null,
    };
  }

  // 1. Obtener o crear client_id si no existe
  let finalClientId = bookingData.client_id;
  if (!finalClientId) {
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone_whatsapp", bookingData.client_phone.trim())
      .maybeSingle();

    if (existingClient) {
      finalClientId = existingClient.id;
    } else {
      const { data: newClient } = await supabase
        .from("clients")
        .insert([
          {
            full_name: bookingData.client_name.trim() || "Cliente Fer Eventos",
            phone_whatsapp: bookingData.client_phone.trim(),
            address_primary: bookingData.event_address,
          },
        ])
        .select()
        .single();
      finalClientId = newClient?.id;
    }
  }

  // 2. Insertar reserva
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert([
      {
        folio,
        client_id: finalClientId,
        event_address: bookingData.event_address,
        address_alias: bookingData.address_alias,
        latitude: bookingData.latitude,
        longitude: bookingData.longitude,
        freight_distance_km: bookingData.freight_distance_km,
        freight_cost: bookingData.freight_cost,
        start_datetime: bookingData.start_datetime,
        end_datetime: bookingData.end_datetime,
        delivery_datetime: bookingData.delivery_datetime,
        pickup_datetime: bookingData.pickup_datetime,
        pickup_type: "mismo_dia_noche",
        status: "confirmada",
        subtotal_furniture: bookingData.subtotal_furniture,
        discount_amount: 0,
        security_deposit: bookingData.security_deposit,
        advance_payment: bookingData.advance_payment,
        balance_due: balanceDue,
        total_amount: bookingData.total_amount,
        payment_status: paymentStatus,
        requires_setup: bookingData.requires_setup || false,
        setup_fee: bookingData.setup_fee || 0,
        assigned_vehicle_id: bookingData.assigned_vehicle_id || null,
        notes: bookingData.delivery_notes,
      },
    ])
    .select()
    .single();

  if (bookingErr || !booking) {
    console.error("Error al crear reserva:", bookingErr);
    return null;
  }

  // 3. Insertar artículos de la reserva (booking_items)
  if (items.length > 0) {
    const itemsToInsert = items.map((it) => ({
      booking_id: booking.id,
      item_id: it.item_id,
      quantity: it.quantity,
      unit_price_applied: it.unit_price_applied,
    }));

    await supabase.from("booking_items").insert(itemsToInsert);
  }

  return {
    ...booking,
    client_name: bookingData.client_name,
    client_phone: bookingData.client_phone,
  };
}

/**
 * Obtiene todas las reservas activas para la agenda y logística.
 */
export async function getBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        id: "mock-1",
        folio: "FE-102938",
        client_id: "c-1",
        client_name: "Boda Gómez - Salón Bugambilias",
        client_phone: "6971022914",
        address_alias: "Salón Bugambilias",
        event_address: "Calle Gabriel Leyva #120, Angostura",
        start_datetime: "2026-11-14T14:00:00Z",
        end_datetime: "2026-11-15T02:00:00Z",
        delivery_datetime: "2026-11-14T10:30:00Z",
        pickup_datetime: "2026-11-15T12:00:00Z",
        pickup_type: "dia_siguiente",
        freight_distance_km: 8.5,
        freight_cost: 250,
        status: "confirmada",
        subtotal_furniture: 3500,
        discount_amount: 0,
        security_deposit: 0,
        advance_payment: 1500,
        balance_due: 2250,
        total_amount: 3750,
        payment_status: "anticipo_pagado",
      },
      {
        id: "mock-2",
        folio: "FE-102939",
        client_id: "c-2",
        client_name: "Piñata Familia Angulo",
        client_phone: "6971058842",
        address_alias: "Casa de su mamá",
        event_address: "Calle 16 de Septiembre #45, Angostura",
        start_datetime: "2026-11-20T16:00:00Z",
        end_datetime: "2026-11-20T22:00:00Z",
        delivery_datetime: "2026-11-20T11:00:00Z",
        pickup_datetime: "2026-11-20T23:30:00Z",
        pickup_type: "mismo_dia_noche",
        freight_distance_km: 4.2,
        freight_cost: 250,
        status: "confirmada",
        subtotal_furniture: 1200,
        discount_amount: 0,
        security_deposit: 0,
        advance_payment: 1450,
        balance_due: 0,
        total_amount: 1450,
        payment_status: "liquidado",
      },
    ];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      clients (
        full_name,
        phone_whatsapp
      ),
      booking_items (
        id,
        item_id,
        quantity,
        unit_price_applied,
        inventory_items (
          name
        )
      )
    `)
    .order("delivery_datetime", { ascending: true });

  if (error || !data) return [];

  interface RawJoinedItem {
    id: string;
    item_id: string;
    quantity: number;
    unit_price_applied: number;
    inventory_items?: {
      name: string;
    } | null;
  }

  return data.map((b) => ({
    ...b,
    client_name: b.clients?.full_name || b.address_alias || "Cliente",
    client_phone: b.clients?.phone_whatsapp || "",
    items: b.booking_items?.map((bi: RawJoinedItem) => ({
      id: bi.id,
      item_id: bi.item_id,
      quantity: bi.quantity,
      unit_price_applied: bi.unit_price_applied,
      item_name: bi.inventory_items?.name,
    })),
  }));
}

/**
 * Registra un abono / anticipo adicional a una reserva existente.
 */
export async function updateBookingAdvance(
  bookingId: string,
  additionalAmount: number,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { data: booking } = await supabase
    .from("bookings")
    .select("total_amount, advance_payment")
    .eq("id", bookingId)
    .single();

  if (!booking) return false;

  const newAdvance = (booking.advance_payment || 0) + additionalAmount;
  const newBalance = Math.max(0, booking.total_amount - newAdvance);

  let newPaymentStatus: PaymentStatus = "anticipo_pagado";
  if (newAdvance >= booking.total_amount) {
    newPaymentStatus = "liquidado";
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      advance_payment: newAdvance,
      balance_due: newBalance,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  return !error;
}
