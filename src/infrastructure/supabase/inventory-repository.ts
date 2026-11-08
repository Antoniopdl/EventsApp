import type { InventoryItem } from "@/core/domain/inventory";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Obtiene el inventario activo de Supabase o retorna la semilla si no está configurado.
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_INVENTORY_SEED;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error al consultar inventario en Supabase:", error.message);
    return INITIAL_INVENTORY_SEED;
  }

  // Si la tabla en Supabase está vacía, la poblamos automáticamente con el catálogo inicial
  if (!data || data.length === 0) {
    await seedInventoryIfEmpty();
    return INITIAL_INVENTORY_SEED;
  }

  return data as InventoryItem[];
}

/**
 * Puebla el catálogo inicial en la base de datos de Supabase.
 */
export async function seedInventoryIfEmpty(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const itemsToInsert = INITIAL_INVENTORY_SEED.map((item) => ({
    sku: item.sku,
    name: item.name,
    category: item.category,
    description: item.description,
    total_stock: item.total_stock,
    rental_price: item.rental_price,
    replacement_price: item.replacement_price,
    image_url: item.image_url,
    buffer_cleanup_hours: item.buffer_cleanup_hours,
    is_active: item.is_active,
  }));

  const { error } = await supabase
    .from("inventory_items")
    .insert(itemsToInsert);

  if (error) {
    console.error("Error al poblar catálogo inicial:", error.message);
  }
}

/**
 * Actualiza el stock de un artículo en Supabase en tiempo real.
 */
export async function updateItemStockInDb(
  id: string,
  newStock: number,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("inventory_items")
    .update({ total_stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error al actualizar stock en Supabase:", error.message);
    return false;
  }

  return true;
}

/**
 * Suscripción en tiempo real (WebSockets) a cambios en la tabla de inventario.
 */
export function subscribeToInventoryRealtime(
  onUpdate: (updatedItem: InventoryItem) => void,
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel("inventory_realtime_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "inventory_items",
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as InventoryItem);
        }
      },
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
