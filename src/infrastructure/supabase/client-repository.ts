import type { Booking } from "@/core/domain/booking";
import type {
  Client,
  ClientAddress,
  ClientDetails,
  ClientWithStats,
} from "@/core/domain/client";
import { getBookings } from "./booking-repository";
import { isSupabaseConfigured, supabase } from "./client";

const CLIENTS_STORAGE_KEY = "fer_eventos_clients_v2";

export const MOCK_CLIENT_BOOKINGS: Record<string, Booking[]> = {
  "cli-1": [
    {
      id: "book-carmen-1",
      folio: "FE-2610-01",
      client_id: "cli-1",
      client_name: "Carmen López",
      client_phone: "6971034488",
      event_address: "Calle Morelos #142, La Palma, Angostura",
      start_datetime: "2026-10-25T15:00:00",
      end_datetime: "2026-10-26T11:00:00",
      delivery_datetime: "2026-10-25T15:00:00",
      pickup_datetime: "2026-10-26T11:00:00",
      pickup_type: "dia_siguiente",
      freight_distance_km: 8,
      freight_cost: 295,
      subtotal_furniture: 2905,
      discount_amount: 0,
      total_amount: 3200,
      advance_payment: 3200,
      balance_due: 0,
      security_deposit: 0,
      status: "finalizada",
      payment_status: "liquidado",
      delivery_sequence: 1,
      items: [
        {
          id: "bi-1",
          booking_id: "book-carmen-1",
          item_id: "item-3",
          item_name: "Mesa Redonda (10 personas)",
          quantity: 10,
          unit_price_applied: 120,
        },
        {
          id: "bi-2",
          booking_id: "book-carmen-1",
          item_id: "item-1",
          item_name: "Silla Tiffany Blanca",
          quantity: 100,
          unit_price_applied: 25,
        },
      ],
    },
    {
      id: "book-carmen-2",
      folio: "FE-2608-14",
      client_id: "cli-1",
      client_name: "Carmen López",
      client_phone: "6971034488",
      event_address: "Av. 16 de Septiembre #45, Angostura Centro",
      start_datetime: "2026-08-14T18:00:00",
      end_datetime: "2026-08-15T12:00:00",
      delivery_datetime: "2026-08-14T18:00:00",
      pickup_datetime: "2026-08-15T12:00:00",
      pickup_type: "dia_siguiente",
      freight_distance_km: 3,
      freight_cost: 250,
      subtotal_furniture: 2600,
      discount_amount: 0,
      total_amount: 2850,
      advance_payment: 2850,
      balance_due: 0,
      security_deposit: 0,
      status: "finalizada",
      payment_status: "liquidado",
      delivery_sequence: 1,
      items: [
        {
          id: "bi-3",
          booking_id: "book-carmen-2",
          item_id: "item-4",
          item_name: "Mesa Tablón Rectangular",
          quantity: 8,
          unit_price_applied: 100,
        },
      ],
    },
    {
      id: "book-carmen-3",
      folio: "FE-2605-10",
      client_id: "cli-1",
      client_name: "Carmen López",
      client_phone: "6971034488",
      event_address: "Calle Morelos #142, La Palma, Angostura",
      start_datetime: "2026-05-10T12:00:00",
      end_datetime: "2026-05-11T10:00:00",
      delivery_datetime: "2026-05-10T12:00:00",
      pickup_datetime: "2026-05-11T10:00:00",
      pickup_type: "dia_siguiente",
      freight_distance_km: 8,
      freight_cost: 295,
      subtotal_furniture: 2105,
      discount_amount: 0,
      total_amount: 2400,
      advance_payment: 2400,
      balance_due: 0,
      security_deposit: 0,
      status: "finalizada",
      payment_status: "liquidado",
      delivery_sequence: 1,
      items: [],
    },
  ],
  "cli-2": [
    {
      id: "book-lupita-1",
      folio: "FE-2611-02",
      client_id: "cli-2",
      client_name: "Maestra Lupita Angulo",
      client_phone: "6971029911",
      event_address: "Camino a Campo Plata km 3.5, Angostura",
      start_datetime: "2026-11-02T16:00:00",
      end_datetime: "2026-11-03T11:00:00",
      delivery_datetime: "2026-11-02T16:00:00",
      pickup_datetime: "2026-11-03T11:00:00",
      pickup_type: "dia_siguiente",
      freight_distance_km: 4,
      freight_cost: 250,
      subtotal_furniture: 1850,
      discount_amount: 0,
      total_amount: 2100,
      advance_payment: 2100,
      balance_due: 0,
      security_deposit: 0,
      status: "finalizada",
      payment_status: "liquidado",
      delivery_sequence: 1,
      items: [
        {
          id: "bi-4",
          booking_id: "book-lupita-1",
          item_id: "item-3",
          item_name: "Mesa Redonda (10 personas)",
          quantity: 5,
          unit_price_applied: 120,
        },
        {
          id: "bi-5",
          booking_id: "book-lupita-1",
          item_id: "item-1",
          item_name: "Silla Tiffany Blanca",
          quantity: 50,
          unit_price_applied: 25,
        },
      ],
    },
    {
      id: "book-lupita-2",
      folio: "FE-2609-18",
      client_id: "cli-2",
      client_name: "Maestra Lupita Angulo",
      client_phone: "6971029911",
      event_address: "Camino a Campo Plata km 3.5, Angostura",
      start_datetime: "2026-09-18T19:00:00",
      end_datetime: "2026-09-19T12:00:00",
      delivery_datetime: "2026-09-18T19:00:00",
      pickup_datetime: "2026-09-19T12:00:00",
      pickup_type: "dia_siguiente",
      freight_distance_km: 4,
      freight_cost: 250,
      subtotal_furniture: 1850,
      discount_amount: 0,
      total_amount: 2100,
      advance_payment: 2100,
      balance_due: 0,
      security_deposit: 0,
      status: "finalizada",
      payment_status: "liquidado",
      delivery_sequence: 1,
      items: [],
    },
  ],
};

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

function getLocalClients(): ClientWithStats[] {
  if (typeof window === "undefined") return MOCK_CLIENTS_SEED;
  const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(
      CLIENTS_STORAGE_KEY,
      JSON.stringify(MOCK_CLIENTS_SEED),
    );
    return MOCK_CLIENTS_SEED;
  }
  try {
    const parsed = JSON.parse(raw) as ClientWithStats[];
    return parsed.length > 0 ? parsed : MOCK_CLIENTS_SEED;
  } catch {
    return MOCK_CLIENTS_SEED;
  }
}

function saveLocalClients(clients: ClientWithStats[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  }
}

/**
 * Obtiene la lista de clientes con sus estadísticas y direcciones.
 */
export async function getClientsWithStats(): Promise<ClientWithStats[]> {
  const localList = getLocalClients();

  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }

  try {
    const { data: clientsData, error: clientErr } = await supabase
      .from("clients")
      .select("*, client_addresses(*)")
      .order("full_name", { ascending: true });

    if (clientErr || !clientsData || clientsData.length === 0) {
      return localList;
    }

    const remoteClients: ClientWithStats[] = clientsData.map((c) => ({
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

    // Combinar sin duplicados
    const combined = [...remoteClients];
    for (const loc of localList) {
      if (
        !combined.some(
          (r) => r.id === loc.id || r.phone_whatsapp === loc.phone_whatsapp,
        )
      ) {
        combined.push(loc);
      }
    }

    saveLocalClients(combined);
    return combined;
  } catch {
    return localList;
  }
}

/**
 * Obtiene el detalle completo de un cliente, sus direcciones e historial de rentas.
 */
export async function getClientDetails(
  clientId: string,
): Promise<ClientDetails | null> {
  const localClients = getLocalClients();
  const localMatch = localClients.find((c) => c.id === clientId);

  let clientInfo: ClientWithStats | null = localMatch || null;
  let clientBookings: Booking[] = MOCK_CLIENT_BOOKINGS[clientId] || [];

  // 1. Intentar consultar en Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: client, error } = await supabase
        .from("clients")
        .select("*, client_addresses(*)")
        .eq("id", clientId)
        .maybeSingle();

      if (!error && client) {
        clientInfo = {
          id: client.id,
          full_name: client.full_name,
          phone_whatsapp: client.phone_whatsapp,
          email: client.email,
          notes: client.notes,
          addresses: (client.client_addresses || []) as ClientAddress[],
          bookings_count: localMatch?.bookings_count || 1,
          total_spent: localMatch?.total_spent || 1500,
          last_booking_date: client.created_at,
        };

        const { data: bookings } = await supabase
          .from("bookings")
          .select("*, booking_items(*)")
          .eq("client_id", clientId)
          .order("delivery_datetime", { ascending: false });

        if (bookings && bookings.length > 0) {
          clientBookings = bookings as Booking[];
        }
      }
    } catch (e) {
      console.warn("Error consultando cliente en Supabase:", e);
    }
  }

  // Si no se encontró en Supabase pero está en local
  if (!clientInfo) {
    return null;
  }

  // Buscar también en todas las reservas del sistema que coincidan por teléfono
  try {
    const allBookings = await getBookings();
    const matchingBookings = allBookings.filter(
      (b) =>
        b.client_id === clientInfo?.id ||
        (b.client_phone &&
          b.client_phone.replace(/\D/g, "") ===
            clientInfo?.phone_whatsapp.replace(/\D/g, "")),
    );
    if (matchingBookings.length > 0) {
      // Combinar sin duplicados por id
      const existingIds = new Set(clientBookings.map((b) => b.id));
      for (const mb of matchingBookings) {
        if (!existingIds.has(mb.id)) {
          clientBookings.push(mb);
        }
      }
    }
  } catch (e) {
    console.warn("Error complementando reservas de cliente:", e);
  }

  const totalSpent =
    clientBookings.length > 0
      ? clientBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
      : clientInfo.total_spent;

  return {
    ...clientInfo,
    bookings_count: Math.max(clientInfo.bookings_count, clientBookings.length),
    total_spent: totalSpent,
    last_booking_date:
      clientBookings[0]?.delivery_datetime || clientInfo.last_booking_date,
    bookings: clientBookings,
  };
}

/**
 * Busca clientes por nombre o teléfono de WhatsApp en tiempo real.
 */
export async function searchClients(query: string): Promise<ClientWithStats[]> {
  const cleanQuery = query.trim().toLowerCase();
  const allClients = await getClientsWithStats();
  if (!cleanQuery) return allClients;

  return allClients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(cleanQuery) ||
      c.phone_whatsapp.includes(cleanQuery) ||
      c.addresses.some((a) => a.alias.toLowerCase().includes(cleanQuery)),
  );
}

/**
 * Registra un nuevo cliente con persistencia local y en Supabase.
 */
export async function createClientInDb(
  data: Omit<Client, "id" | "created_at" | "updated_at">,
): Promise<ClientWithStats> {
  const newClient: ClientWithStats = {
    id: `cli-${Date.now()}`,
    full_name: data.full_name.trim(),
    phone_whatsapp: data.phone_whatsapp.trim(),
    email: data.email?.trim() || null,
    notes: data.notes?.trim() || null,
    addresses: [],
    bookings_count: 0,
    total_spent: 0,
    created_at: new Date().toISOString(),
  };

  const current = getLocalClients();
  saveLocalClients([newClient, ...current]);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: created, error } = await supabase
        .from("clients")
        .insert({
          full_name: newClient.full_name,
          phone_whatsapp: newClient.phone_whatsapp,
          email: newClient.email,
          notes: newClient.notes,
        })
        .select()
        .single();

      if (!error && created) {
        newClient.id = created.id;
        saveLocalClients([
          newClient,
          ...current.filter((c) => c.id !== newClient.id),
        ]);
      }
    } catch (e) {
      console.warn("Error creando cliente en Supabase:", e);
    }
  }

  return newClient;
}

/**
 * Actualiza los datos generales de un cliente (nombre, teléfono, notas).
 */
export async function updateClientInDb(
  clientId: string,
  data: Partial<Client>,
): Promise<boolean> {
  // 1. Actualizar localmente
  const current = getLocalClients();
  const updated = current.map((c) =>
    c.id === clientId
      ? { ...c, ...data, updated_at: new Date().toISOString() }
      : c,
  );
  saveLocalClients(updated);

  // 2. Replicar en Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("clients")
        .update({
          full_name: data.full_name,
          phone_whatsapp: data.phone_whatsapp,
          email: data.email,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
    } catch (e) {
      console.warn("Error actualizando cliente en Supabase:", e);
    }
  }

  return true;
}

/**
 * Guarda o asocia una nueva dirección a un cliente.
 */
export async function saveClientAddressInDb(
  addressData: Omit<ClientAddress, "id" | "created_at" | "updated_at">,
): Promise<ClientAddress | null> {
  const newAddress: ClientAddress = {
    id: `addr-${Date.now()}`,
    ...addressData,
    created_at: new Date().toISOString(),
  };

  // Actualizar en el cliente local
  const current = getLocalClients();
  const updated = current.map((c) => {
    if (c.id === addressData.client_id) {
      return {
        ...c,
        addresses: [...c.addresses, newAddress],
      };
    }
    return c;
  });
  saveLocalClients(updated);

  if (isSupabaseConfigured && supabase) {
    try {
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

      if (!error && data) {
        return data as ClientAddress;
      }
    } catch (e) {
      console.warn("Error guardando dirección en Supabase:", e);
    }
  }

  return newAddress;
}

/**
 * Modifica una dirección existente de un cliente.
 */
export async function updateClientAddressInDb(
  addressId: string,
  data: Partial<ClientAddress>,
): Promise<boolean> {
  const current = getLocalClients();
  const updated = current.map((c) => ({
    ...c,
    addresses: c.addresses.map((a) =>
      a.id === addressId ? { ...a, ...data } : a,
    ),
  }));
  saveLocalClients(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
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
    } catch (e) {
      console.warn("Error actualizando dirección en Supabase:", e);
    }
  }

  return true;
}

/**
 * Elimina una dirección guardada de un cliente.
 */
export async function deleteClientAddressInDb(
  addressId: string,
): Promise<boolean> {
  const current = getLocalClients();
  const updated = current.map((c) => ({
    ...c,
    addresses: c.addresses.filter((a) => a.id !== addressId),
  }));
  saveLocalClients(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("client_addresses").delete().eq("id", addressId);
    } catch (e) {
      console.warn("Error eliminando dirección en Supabase:", e);
    }
  }

  return true;
}
