import type { InventoryItem } from "@/core/domain/inventory";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { isSupabaseConfigured, supabase } from "./client";

const CUSTOM_PACKAGES_STORAGE_KEY = "fer_eventos_custom_packages_v1";
const ITEM_OVERRIDES_STORAGE_KEY = "fer_eventos_inventory_overrides_v1";

function getLocalPackages(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CUSTOM_PACKAGES_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as InventoryItem[];
  } catch {
    return [];
  }
}

function saveLocalPackage(pkg: InventoryItem): void {
  if (typeof window === "undefined") return;
  const current = getLocalPackages();
  const filtered = current.filter((p) => p.id !== pkg.id);
  localStorage.setItem(
    CUSTOM_PACKAGES_STORAGE_KEY,
    JSON.stringify([pkg, ...filtered]),
  );
}

function getLocalItemOverrides(): Record<string, Partial<InventoryItem>> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(ITEM_OVERRIDES_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Partial<InventoryItem>>;
  } catch {
    return {};
  }
}

function saveLocalItemOverride(
  id: string,
  updates: Partial<InventoryItem>,
): void {
  if (typeof window === "undefined") return;
  const current = getLocalItemOverrides();
  current[id] = { ...current[id], ...updates };
  localStorage.setItem(ITEM_OVERRIDES_STORAGE_KEY, JSON.stringify(current));
}

/**
 * Obtiene el inventario activo de Supabase con sus variantes de color y componentes de paquetes,
 * combinándolo con paquetes personalizados y ediciones locales.
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  let baseItems: InventoryItem[] = INITIAL_INVENTORY_SEED;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "*, variants:inventory_item_variants(*), package_components:package_items(*, component_item:inventory_items(*))",
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        baseItems = data as InventoryItem[];
      }
    } catch (e) {
      console.warn("Error consultando inventario en Supabase:", e);
    }
  }

  // 1. Aplicar modificaciones guardadas localmente (nombres, fotos, precios, stocks)
  const overrides = getLocalItemOverrides();
  const mergedItems = baseItems.map((item) => {
    const itemOverride = overrides[item.id];
    return itemOverride ? { ...item, ...itemOverride } : item;
  });

  // 2. Unir con los paquetes personalizados creados
  const localPackages = getLocalPackages();
  for (const pkg of localPackages) {
    if (!mergedItems.some((i) => i.id === pkg.id)) {
      mergedItems.unshift(pkg);
    }
  }

  return mergedItems;
}

/**
 * Actualiza el stock de un artículo en Supabase y almacenamiento local.
 */
export async function updateItemStockInDb(
  id: string,
  newStock: number,
): Promise<boolean> {
  saveLocalItemOverride(id, { total_stock: newStock });

  if (!isSupabaseConfigured || !supabase) return true;

  try {
    await supabase
      .from("inventory_items")
      .update({ total_stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", id);
  } catch (e) {
    console.warn("Error actualizando stock en Supabase:", e);
  }

  return true;
}

/**
 * Actualiza el stock de una variante de color específica (ej. Sobremantel Azul Rey).
 */
export async function updateVariantStockInDb(
  variantId: string,
  newStock: number,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error } = await supabase
      .from("inventory_item_variants")
      .update({ total_stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", variantId);

    return !error;
  } catch {
    return true;
  }
}

/**
 * Actualiza datos del producto (nombre, foto, precio o stock) desde el Modo Edición.
 */
export async function updateItemDetailsInDb(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<boolean> {
  // 1. Guardar de inmediato en almacenamiento local para actualización instantánea
  saveLocalItemOverride(id, updates);

  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.rental_price !== undefined)
      payload.rental_price = updates.rental_price;
    if (updates.total_stock !== undefined)
      payload.total_stock = updates.total_stock;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;

    const { error } = await supabase
      .from("inventory_items")
      .update(payload)
      .eq("id", id);

    return !error;
  } catch (e) {
    console.warn("Error guardando detalles en Supabase:", e);
    return true;
  }
}

/**
 * Crea un nuevo paquete en Supabase con su receta de piezas y persistencia local.
 */
export async function createPackageInDb(
  packageData: {
    name: string;
    rental_price: number;
    capacity_people: number;
    total_stock: number;
    sku?: string;
    image_url?: string;
  },
  components: { component_item_id: string; quantity: number }[],
): Promise<InventoryItem | null> {
  const sku = packageData.sku || `PAQ-${Date.now().toString().slice(-6)}`;

  const newPackageItem: InventoryItem = {
    id: `pkg-${Date.now()}`,
    sku,
    name: packageData.name.trim(),
    category: "paquetes",
    item_type: "paquete",
    rental_price: packageData.rental_price,
    replacement_price: packageData.rental_price * 5,
    total_stock: packageData.total_stock,
    capacity_people: packageData.capacity_people,
    buffer_cleanup_hours: 4,
    is_active: true,
    image_url:
      packageData.image_url ||
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
    package_components: components.map((c, i) => ({
      id: `pc-${Date.now()}-${i}`,
      package_id: `pkg-${Date.now()}`,
      component_item_id: c.component_item_id,
      quantity: c.quantity,
      is_customizable: false,
    })),
  };

  // 1. Persistir localmente de inmediato
  saveLocalPackage(newPackageItem);

  // 2. Replicar a Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      // Usamos category "otros" para respetar check constraint inicial de Supabase
      const { data: pkg, error: pkgErr } = await supabase
        .from("inventory_items")
        .insert([
          {
            sku,
            name: newPackageItem.name,
            category: "otros",
            item_type: "paquete",
            rental_price: newPackageItem.rental_price,
            total_stock: newPackageItem.total_stock,
            capacity_people: newPackageItem.capacity_people,
            image_url: newPackageItem.image_url,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (!pkgErr && pkg) {
        newPackageItem.id = pkg.id;
        // Insertar componentes de paquete
        if (components.length > 0) {
          const compRows = components.map((c) => ({
            package_id: pkg.id,
            component_item_id: c.component_item_id,
            quantity: c.quantity,
          }));
          await supabase.from("package_items").insert(compRows);
        }
        saveLocalPackage(newPackageItem);
      } else {
        console.warn(
          "Supabase insert package warning, using local package:",
          pkgErr,
        );
      }
    } catch (e) {
      console.warn("Error creando paquete en Supabase:", e);
    }
  }

  return newPackageItem;
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
