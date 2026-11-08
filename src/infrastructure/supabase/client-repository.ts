import type { Booking } from "@/core/domain/booking";
import type {
  Client,
  ClientAddress,
  ClientDetails,
  ClientWithStats,
} from "@/core/domain/client";
import { isSupabaseConfigured, supabase } from "./client";

export const MOCK_CLIENTS_SEED: ClientWithStats[] = [
  {
    id: "cli-1",
    full_name: "Carmen López",
    phone_whatsapp: "6971034488",
    notes: "Clienta frecuente, siempre pide manteles blancos impecables.",
    bookings_count: 3,
    total_spent: 8450,
    last_booking_date: "2026-10-25",
    addresses: [
      {
        id: "addr-1",
        client_id: "cli-1",
        alias: "Casa de su mamá",
        address_text: "Calle Morelos #142, La Palma, Angostura",
        latitude: 25.1205,
        longitude: -107.9621,
        delivery_notes:
          "Portón blanco frente a la tienda de abarrotes Don Juan.",
        is_default: true,
      },
      {
        id: "addr-2",
        client_id: "cli-1",
        alias: "Casa particular",
        address_text: "Av. 16 de Septiembre #45, Angostura Centro",
        latitude: 25.1065,
        longitude: -107.9485,
        delivery_notes: "Casa de dos pisos color beige.",
        is_default: false,
      },
    ],
  },
  {
    id: "cli-2",
    full_name: "Maestra Lupita Angulo",
    phone_whatsapp: "6971029911",
    notes: "Paga puntual por transferencia bancaria.",
    bookings_count: 2,
    total_spent: 4200,
    last_booking_date: "2026-11-02",
    addresses: [
      {
        id: "addr-3",
        client_id: "cli-2",
        alias: "Rancho El Mezquite",
        address_text: "Camino a Campo Plata km 3.5, Angostura",
        latitude: 25.085,
        longitude: -107.925,
        delivery_notes: "Entrar por la reja ganadera azul.",
        is_default: true,
      },
    ],
  },
];

/**
 * Obtiene la lista de clientes con sus estadísticas y direcciones.
 */
export async function getClientsWithStats(): Promise<ClientWithStats[]> {
  if (!isSupabaseConfigured || !supabase) return MOCK_CLIENTS_SEED;

  const { data: clientsData, error: clientErr } = await supabase
    .from("clients")
    .select("*, client_addresses(*)")
    .order("full_name", { ascending: true });

  if (clientErr || !clientsData) {
    console.error("Error al obtener clientes:", clientErr?.message);
    return MOCK_CLIENTS_SEED;
  }

  // Si está vacía la tabla en Supabase, la poblamos con la semilla
  if (clientsData.length === 0) {
    await seedClientsIfEmpty();
    return MOCK_CLIENTS_SEED;
  }

  return clientsData.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    phone_whatsapp: c.phone_whatsapp,
    email: c.email,
    notes: c.notes,
    addresses: (c.client_addresses || []) as ClientAddress[],
    bookings_count: 1,
    total_spent: 1500,
    last_booking_date: c.created_at,
  }));
}

/**
 * Obtiene el detalle completo de un cliente, sus direcciones e historial de rentas.
 */
export async function getClientDetails(
  clientId: string,
): Promise<ClientDetails | null> {
  if (!isSupabaseConfigured || !supabase) {
    const mock = MOCK_CLIENTS_SEED.find((c) => c.id === clientId);
    return mock ? { ...mock, bookings: [] } : null;
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("*, client_addresses(*)")
    .eq("id", clientId)
    .single();

  if (error || !client) return null;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, booking_items(*)")
    .eq("client_id", clientId)
    .order("delivery_datetime", { ascending: false });

  const typedBookings = (bookings || []) as Booking[];
  const totalSpent = typedBookings.reduce(
    (sum, b) => sum + (b.total_amount || 0),
    0,
  );

  return {
    id: client.id,
    full_name: client.full_name,
    phone_whatsapp: client.phone_whatsapp,
    email: client.email,
    notes: client.notes,
    addresses: (client.client_addresses || []) as ClientAddress[],
    bookings_count: typedBookings.length,
    total_spent: totalSpent,
    last_booking_date: typedBookings[0]?.delivery_datetime || null,
    bookings: typedBookings,
  };
}

/**
 * Busca clientes por nombre o teléfono de WhatsApp en tiempo real.
 */
export async function searchClients(query: string): Promise<ClientWithStats[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return getClientsWithStats();

  if (!isSupabaseConfigured || !supabase) {
    return MOCK_CLIENTS_SEED.filter(
      (c) =>
        c.full_name.toLowerCase().includes(cleanQuery) ||
        c.phone_whatsapp.includes(cleanQuery) ||
        c.addresses.some((a) => a.alias.toLowerCase().includes(cleanQuery)),
    );
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*, client_addresses(*)")
    .or(`full_name.ilike.%${cleanQuery}%,phone_whatsapp.ilike.%${cleanQuery}%`)
    .limit(10);

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    phone_whatsapp: c.phone_whatsapp,
    email: c.email,
    notes: c.notes,
    addresses: (c.client_addresses || []) as ClientAddress[],
    bookings_count: 0,
    total_spent: 0,
  }));
}

/**
 * Actualiza los datos generales de un cliente (nombre, teléfono, notas).
 */
export async function updateClientInDb(
  clientId: string,
  data: Partial<Client>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: data.full_name,
      phone_whatsapp: data.phone_whatsapp,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    console.error("Error al actualizar cliente:", error.message);
    return false;
  }
  return true;
}

/**
 * Guarda o asocia una nueva dirección a un cliente.
 */
export async function saveClientAddressInDb(
  addressData: Omit<ClientAddress, "id" | "created_at" | "updated_at">,
): Promise<ClientAddress | null> {
  if (!isSupabaseConfigured || !supabase) {
    return { ...addressData, id: `addr-${Date.now()}` };
  }

  const { data, error } = await supabase
    .from("client_addresses")
    .insert({
      client_id: addressData.client_id,
      alias: addressData.alias,
      address_text: addressData.address_text,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      delivery_notes: addressData.delivery_notes,
      is_default: addressData.is_default,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error al guardar dirección de cliente:", error?.message);
    return null;
  }
  return data as ClientAddress;
}

/**
 * Modifica una dirección existente de un cliente (alias, referencias, etc.).
 */
export async function updateClientAddressInDb(
  addressId: string,
  data: Partial<ClientAddress>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from("client_addresses")
    .update({
      alias: data.alias,
      address_text: data.address_text,
      latitude: data.latitude,
      longitude: data.longitude,
      delivery_notes: data.delivery_notes,
      is_default: data.is_default,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addressId);

  if (error) {
    console.error("Error al actualizar dirección:", error.message);
    return false;
  }
  return true;
}

/**
 * Elimina una dirección de cliente.
 */
export async function deleteClientAddressInDb(
  addressId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from("client_addresses")
    .delete()
    .eq("id", addressId);

  return !error;
}

/**
 * Poblado inicial de clientes de ejemplo si la base de datos está vacía.
 */
export async function seedClientsIfEmpty(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  for (const client of MOCK_CLIENTS_SEED) {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        full_name: client.full_name,
        phone_whatsapp: client.phone_whatsapp,
        notes: client.notes,
      })
      .select("id")
      .single();

    if (newClient) {
      for (const addr of client.addresses) {
        await supabase.from("client_addresses").insert({
          client_id: newClient.id,
          alias: addr.alias,
          address_text: addr.address_text,
          latitude: addr.latitude,
          longitude: addr.longitude,
          delivery_notes: addr.delivery_notes,
          is_default: addr.is_default,
        });
      }
    }
  }
}
