import type { InventoryItem } from "@/core/domain/inventory";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Obtiene el inventario activo de Supabase con sus variantes de color y componentes de paquetes.
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_INVENTORY_SEED;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "*, variants:inventory_item_variants(*), package_components:package_items(*, component_item:inventory_items(*))",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error al consultar inventario en Supabase:", error?.message);
    return INITIAL_INVENTORY_SEED;
  }

  return data as InventoryItem[];
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

  return !error;
}

/**
 * Actualiza el stock de una variante de color específica (ej. Sobremantel Azul Rey).
 */
export async function updateVariantStockInDb(
  variantId: string,
  newStock: number,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("inventory_item_variants")
    .update({ total_stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", variantId);

  return !error;
}

/**
 * Actualiza datos del producto (precio de renta o stock) desde el Modo Edición.
 */
export async function updateItemDetailsInDb(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from("inventory_items")
    .update({
      name: updates.name,
      rental_price: updates.rental_price,
      total_stock: updates.total_stock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return !error;
}

/**
 * Crea un nuevo paquete en Supabase con su receta de piezas.
 */
export async function createPackageInDb(
  packageData: {
    name: string;
    rental_price: number;
    capacity_people: number;
    total_stock: number;
    sku?: string;
  },
  components: { component_item_id: string; quantity: number }[],
): Promise<InventoryItem | null> {
  const sku = packageData.sku || `PAQ-${Date.now().toString().slice(-6)}`;

  if (!isSupabaseConfigured || !supabase) {
    const newItem: InventoryItem = {
      id: `local-pkg-${Date.now()}`,
      sku,
      name: packageData.name,
      category: "paquetes",
      item_type: "paquete",
      rental_price: packageData.rental_price,
      replacement_price: packageData.rental_price * 5,
      total_stock: packageData.total_stock,
      capacity_people: packageData.capacity_people,
      buffer_cleanup_hours: 4,
      is_active: true,
    };
    return newItem;
  }

  // 1. Insertar paquete en inventory_items
  const { data: pkg, error: pkgErr } = await supabase
    .from("inventory_items")
    .insert([
      {
        sku,
        name: packageData.name,
        category: "paquetes",
        item_type: "paquete",
        rental_price: packageData.rental_price,
        total_stock: packageData.total_stock,
        capacity_people: packageData.capacity_people,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (pkgErr || !pkg) {
    console.error("Error al crear paquete:", pkgErr);
    return null;
  }

  // 2. Insertar componentes en package_items
  if (components.length > 0) {
    const compRows = components.map((c) => ({
      package_id: pkg.id,
      component_item_id: c.component_item_id,
      quantity: c.quantity,
    }));
    await supabase.from("package_items").insert(compRows);
  }

  return pkg as InventoryItem;
}

/**
 * Suscripción en tiempo real (WebSockets) a cambios en inventario.
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
