import {
  type FabricDefinition,
  FABRIC_CATALOG,
  getMasterFabricCatalog,
  saveMasterFabricCatalog,
} from "@/core/domain/fabric-catalog";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Obtiene el catálogo maestro de telas desde Supabase o localStorage.
 */
export async function fetchFabricCatalogFromDb(): Promise<FabricDefinition[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("fabric_catalog")
        .select("*")
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        const loaded: FabricDefinition[] = data.map((row) => ({
          name: row.name,
          slug: row.slug,
          description: row.description || "",
          colors: Array.isArray(row.colors) ? row.colors : [],
        }));
        saveMasterFabricCatalog(loaded);
        return loaded;
      }
    } catch (e) {
      console.warn("No se pudo leer fabric_catalog desde Supabase:", e);
    }
  }
  return getMasterFabricCatalog();
}

/**
 * Guarda el catálogo maestro de telas en Supabase y localStorage.
 */
export async function saveFabricCatalogToDb(
  catalog: FabricDefinition[],
): Promise<boolean> {
  // 1. Guardar localmente siempre
  saveMasterFabricCatalog(catalog);

  // 2. Si Supabase está disponible, sincronizar
  if (isSupabaseConfigured && supabase) {
    try {
      const rows = catalog.map((f) => ({
        slug: f.slug,
        name: f.name,
        description: f.description,
        colors: f.colors,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("fabric_catalog")
        .upsert(rows, { onConflict: "slug" });

      if (error) {
        console.warn(
          "Error guardando en Supabase fabric_catalog:",
          error.message,
        );
        return false;
      }
      return true;
    } catch (e) {
      console.warn("Excepción guardando en Supabase fabric_catalog:", e);
      return false;
    }
  }
  return true;
}

/**
 * Elimina una tela del catálogo maestro en Supabase y localmente.
 */
export async function deleteFabricFromDb(slug: string): Promise<boolean> {
  const current = getMasterFabricCatalog();
  const updated = current.filter((f) => f.slug !== slug);
  saveMasterFabricCatalog(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("fabric_catalog").delete().eq("slug", slug);
    } catch (e) {
      console.warn("Error eliminando tela en Supabase:", e);
    }
  }
  return true;
}
