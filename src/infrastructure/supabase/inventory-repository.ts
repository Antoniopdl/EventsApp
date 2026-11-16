import type {
  InventoryItem,
  InventoryVariant,
  PackageComponent,
} from "@/core/domain/inventory";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { isSupabaseConfigured, supabase } from "./client";

const CUSTOM_PACKAGES_STORAGE_KEY = "fer_eventos_custom_packages_v1";
const CUSTOM_LOOSE_ITEMS_STORAGE_KEY = "fer_eventos_custom_loose_items_v1";
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

function getLocalLooseItems(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CUSTOM_LOOSE_ITEMS_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as InventoryItem[];
  } catch {
    return [];
  }
}

function saveLocalLooseItem(item: InventoryItem): void {
  if (typeof window === "undefined") return;
  const current = getLocalLooseItems();
  const filtered = current.filter((i) => i.id !== item.id);
  localStorage.setItem(
    CUSTOM_LOOSE_ITEMS_STORAGE_KEY,
    JSON.stringify([item, ...filtered]),
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function mapToDbCategory(cat: string): string {
  const allowed = [
    "sillas",
    "mesas",
    "manteleria",
    "vajilla",
    "toldos_carpas",
    "decoracion",
    "otros",
  ];
  if (allowed.includes(cat)) return cat;
  if (cat === "manteles_base" || cat === "sobremanteles") return "manteleria";
  return "otros";
}

function findFallbackItemById(id: string): InventoryItem | undefined {
  return (
    INITIAL_INVENTORY_SEED.find((i) => i.id === id) ||
    getLocalLooseItems().find((i) => i.id === id) ||
    getLocalPackages().find((i) => i.id === id)
  );
}

async function seedInitialInventoryToSupabase(): Promise<
  InventoryItem[] | null
> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const looseSeeds = INITIAL_INVENTORY_SEED.filter(
      (i) => i.item_type !== "paquete",
    );
    const pkgSeeds = INITIAL_INVENTORY_SEED.filter(
      (i) => i.item_type === "paquete",
    );

    const skuToUuid = new Map<string, string>();
    const seedIdToUuid = new Map<string, string>();

    const { data: insertedLoose, error: looseErr } = await supabase
      .from("inventory_items")
      .upsert(
        looseSeeds.map((item) => ({
          sku: item.sku,
          name: item.name,
          category: mapToDbCategory(item.category),
          item_type: "individual",
          fabric: item.fabric || null,
          capacity_people: item.capacity_people || 0,
          description: item.description || null,
          total_stock: item.total_stock,
          rental_price: item.rental_price,
          replacement_price: item.replacement_price,
          image_url: item.image_url || null,
          buffer_cleanup_hours: item.buffer_cleanup_hours || 2,
          is_active: true,
        })),
        { onConflict: "sku" },
      )
      .select();

    if (looseErr || !insertedLoose) {
      console.warn("Error auto-sembrando artículos en Supabase:", looseErr);
      return null;
    }

    for (const row of insertedLoose) {
      skuToUuid.set(row.sku, row.id);
    }
    for (const seed of looseSeeds) {
      const realId = skuToUuid.get(seed.sku);
      if (realId) {
        seedIdToUuid.set(seed.id, realId);
        if (seed.variants && seed.variants.length > 0) {
          await supabase.from("inventory_item_variants").upsert(
            seed.variants.map((v) => ({
              item_id: realId,
              color_name: v.color_name,
              color_hex: v.color_hex || "#2563eb",
              total_stock: v.total_stock,
            })),
            { onConflict: "item_id,color_name" },
          );
        }
      }
    }

    if (pkgSeeds.length > 0) {
      const { data: insertedPkgs } = await supabase
        .from("inventory_items")
        .upsert(
          pkgSeeds.map((pkg) => ({
            sku: pkg.sku,
            name: pkg.name,
            category: mapToDbCategory(pkg.category),
            item_type: "paquete",
            capacity_people: pkg.capacity_people || 10,
            description: pkg.description || null,
            total_stock: pkg.total_stock,
            rental_price: pkg.rental_price,
            replacement_price: pkg.replacement_price,
            image_url: pkg.image_url || null,
            buffer_cleanup_hours: pkg.buffer_cleanup_hours || 2,
            is_active: true,
          })),
          { onConflict: "sku" },
        )
        .select();

      if (insertedPkgs) {
        for (const row of insertedPkgs) {
          skuToUuid.set(row.sku, row.id);
        }
        for (const pkg of pkgSeeds) {
          const realPkgId = skuToUuid.get(pkg.sku);
          if (realPkgId && pkg.package_components) {
            const compRows = pkg.package_components
              .map((c) => {
                const realCompId = seedIdToUuid.get(c.component_item_id);
                if (!realCompId) return null;
                return {
                  package_id: realPkgId,
                  component_item_id: realCompId,
                  quantity: c.quantity,
                  is_customizable: c.is_customizable,
                  customization_type: c.customization_type || null,
                };
              })
              .filter((r): r is NonNullable<typeof r> => r !== null);
            if (compRows.length > 0) {
              await supabase.from("package_items").insert(compRows);
            }
          }
        }
      }
    }

    const { data: fresh } = await supabase
      .from("inventory_items")
      .select(
        "*, variants:inventory_item_variants(*), package_components:package_items(*, component_item:inventory_items(*))",
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    return (fresh as InventoryItem[]) || null;
  } catch (e) {
    console.warn("Error en seedInitialInventoryToSupabase:", e);
    return null;
  }
}

let lastSupabaseError: string | null = null;

export function getLastSupabaseError(): string | null {
  return lastSupabaseError;
}

/**
 * Obtiene el inventario activo de Supabase con sus variantes de color y componentes de paquetes.
 * Si Supabase está conectado, Supabase es la fuente de verdad compartida entre dispositivos.
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "*, variants:inventory_item_variants(*), package_components:package_items(*, component_item:inventory_items(*))",
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data) {
        lastSupabaseError = null;
        if (data.length > 0) {
          return data as InventoryItem[];
        }
        const seeded = await seedInitialInventoryToSupabase();
        if (seeded && seeded.length > 0) {
          return seeded;
        }
      } else if (error) {
        lastSupabaseError = error.message;
        // Respaldo: intentar consulta simple sin joins por si falta la migración 00003
        const { data: simpleData, error: simpleErr } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (!simpleErr && simpleData && simpleData.length > 0) {
          lastSupabaseError = null;
          return simpleData as InventoryItem[];
        }
      }
    } catch (e) {
      lastSupabaseError =
        e instanceof Error ? e.message : "Error de red con Supabase";
      console.warn("Error consultando inventario en Supabase:", e);
    }
  }

  // Respaldo offline cuando Supabase no está disponible
  const overrides = getLocalItemOverrides();
  const localLoose = getLocalLooseItems();
  const localPackages = getLocalPackages();

  const mergedBase = INITIAL_INVENTORY_SEED.map((item) => {
    const ov = overrides[item.id];
    return ov ? { ...item, ...ov } : item;
  });

  const combined = [...mergedBase];

  for (const loose of localLoose) {
    const ov = overrides[loose.id];
    const finalLoose = ov ? { ...loose, ...ov } : loose;
    if (!combined.some((i) => i.id === finalLoose.id)) {
      combined.unshift(finalLoose);
    }
  }

  for (const pkg of localPackages) {
    const ov = overrides[pkg.id];
    const finalPkg = ov ? { ...pkg, ...ov } : pkg;
    if (!combined.some((i) => i.id === finalPkg.id)) {
      combined.unshift(finalPkg);
    }
  }

  return combined;
}

/**
 * Actualiza el stock de un artículo en Supabase y almacenamiento local.
 */
export async function updateItemStockInDb(
  id: string,
  newStock: number,
): Promise<boolean> {
  return updateItemDetailsInDb(id, { total_stock: newStock });
}

/**
 * Actualiza el stock de una variante de color específica.
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
 * Actualiza cualquier campo del producto o paquete desde la ficha completa o edición rápida.
 */
export async function updateItemDetailsInDb(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<boolean> {
  saveLocalItemOverride(id, updates);

  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.rental_price !== undefined)
      payload.rental_price = updates.rental_price;
    if (updates.replacement_price !== undefined)
      payload.replacement_price = updates.replacement_price;
    if (updates.total_stock !== undefined)
      payload.total_stock = updates.total_stock;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.fabric !== undefined) payload.fabric = updates.fabric;
    if (updates.capacity_people !== undefined)
      payload.capacity_people = updates.capacity_people;
    if (updates.description !== undefined)
      payload.description = updates.description;

    if (isUuid(id)) {
      const { error } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", id);

      if (error) {
        lastSupabaseError = error.message;
        console.error("Error actualizando en Supabase:", error);
        return false;
      }
      lastSupabaseError = null;
      return true;
    }

    // Si el ID es local/semilla (ej. "seed-1"), hacemos upsert por SKU para sincronizarlo a Supabase
    const fallback = findFallbackItemById(id);
    if (!fallback) {
      lastSupabaseError = `Artículo ${id} no encontrado para sincronizar`;
      return false;
    }

    const merged = { ...fallback, ...updates };
    const { error: upsertErr } = await supabase.from("inventory_items").upsert(
      [
        {
          sku: merged.sku,
          name: merged.name,
          category: mapToDbCategory(merged.category),
          item_type: merged.item_type || "individual",
          fabric: merged.fabric || null,
          capacity_people: merged.capacity_people || 0,
          description: merged.description || null,
          total_stock: merged.total_stock,
          rental_price: merged.rental_price,
          replacement_price: merged.replacement_price,
          image_url: merged.image_url || null,
          buffer_cleanup_hours: merged.buffer_cleanup_hours || 2,
          is_active: true,
        },
      ],
      { onConflict: "sku" },
    );

    if (upsertErr) {
      lastSupabaseError = upsertErr.message;
      console.error("Error en upsert por SKU en Supabase:", upsertErr);
      return false;
    }
    lastSupabaseError = null;
    return true;
  } catch (e) {
    lastSupabaseError =
      e instanceof Error ? e.message : "Error inesperado con Supabase";
    console.warn("Error guardando detalles en Supabase:", e);
    return false;
  }
}

/**
 * Crea un nuevo artículo suelto con soporte opcional de tela y variantes de color.
 */
export async function createLooseItemInDb(input: {
  name: string;
  category: string;
  rental_price: number;
  replacement_price: number;
  total_stock: number;
  fabric?: string | null;
  image_url?: string | null;
  variants?: Omit<InventoryVariant, "id" | "item_id">[];
}): Promise<InventoryItem> {
  const sku = `ART-${Date.now().toString().slice(-6)}`;
  const itemId = `art-${Date.now()}`;

  const mappedVariants: InventoryVariant[] | undefined =
    input.variants && input.variants.length > 0
      ? input.variants.map((v, idx) => ({
          id: `var-${Date.now()}-${idx}`,
          item_id: itemId,
          color_name: v.color_name,
          color_hex: v.color_hex || "#2563eb",
          total_stock: v.total_stock,
        }))
      : undefined;

  const totalStock =
    mappedVariants && mappedVariants.length > 0
      ? mappedVariants.reduce((sum, v) => sum + v.total_stock, 0)
      : input.total_stock;

  const newItem: InventoryItem = {
    id: itemId,
    sku,
    name: input.name.trim(),
    category: input.category,
    item_type: "individual",
    fabric: input.fabric || null,
    rental_price: input.rental_price,
    replacement_price: input.replacement_price,
    total_stock: totalStock,
    image_url:
      input.image_url ||
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
    buffer_cleanup_hours: input.fabric ? 48 : 2,
    is_active: true,
    variants: mappedVariants,
  };

  saveLocalLooseItem(newItem);

  if (isSupabaseConfigured && supabase) {
    try {
      const dbCategory = [
        "sillas",
        "mesas",
        "manteleria",
        "vajilla",
        "toldos_carpas",
        "decoracion",
        "otros",
      ].includes(input.category)
        ? input.category
        : "otros";

      const { data: created, error } = await supabase
        .from("inventory_items")
        .insert([
          {
            sku,
            name: newItem.name,
            category: dbCategory,
            item_type: "individual",
            fabric: newItem.fabric,
            rental_price: newItem.rental_price,
            replacement_price: newItem.replacement_price,
            total_stock: newItem.total_stock,
            image_url: newItem.image_url,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (!error && created) {
        newItem.id = created.id;
        if (mappedVariants && mappedVariants.length > 0) {
          await supabase.from("inventory_item_variants").insert(
            mappedVariants.map((v) => ({
              item_id: created.id,
              color_name: v.color_name,
              color_hex: v.color_hex,
              total_stock: v.total_stock,
            })),
          );
        }
        saveLocalLooseItem(newItem);
      }
    } catch (e) {
      console.warn("Error creando artículo suelto en Supabase:", e);
    }
  }

  return newItem;
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
  const pkgId = `pkg-${Date.now()}`;

  const mappedComponents: PackageComponent[] = components.map((c, i) => ({
    id: `pc-${Date.now()}-${i}`,
    package_id: pkgId,
    component_item_id: c.component_item_id,
    quantity: c.quantity,
    is_customizable: false,
  }));

  const newPackageItem: InventoryItem = {
    id: pkgId,
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
    package_components: mappedComponents,
  };

  saveLocalPackage(newPackageItem);

  if (isSupabaseConfigured && supabase) {
    try {
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
        if (components.length > 0) {
          const compRows = components.map((c) => ({
            package_id: pkg.id,
            component_item_id: c.component_item_id,
            quantity: c.quantity,
          }));
          await supabase.from("package_items").insert(compRows);
        }
        saveLocalPackage(newPackageItem);
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
