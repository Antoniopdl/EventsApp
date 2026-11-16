import {
  type Category,
  DEFAULT_CATEGORIES,
  DEFAULT_FABRICS,
} from "@/core/domain/inventory";

const CATEGORIES_STORAGE_KEY = "fer_eventos_categories_v1";
const FABRICS_STORAGE_KEY = "fer_eventos_fabrics_v1";

/**
 * Obtiene la lista de categorías activas ordenadas.
 */
export function getCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify(DEFAULT_CATEGORIES),
    );
    return DEFAULT_CATEGORIES;
  }
  try {
    const parsed = JSON.parse(raw) as Category[];
    return parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * Guarda la lista completa de categorías en almacenamiento local.
 */
export function saveCategories(categories: Category[]): Category[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }
  return categories;
}

/**
 * Agrega o actualiza una categoría.
 */
export function upsertCategory(category: {
  id?: string;
  label: string;
  icon: string;
}): Category[] {
  const current = getCategories();
  const cleanLabel = category.label.trim();
  const cleanIcon = category.icon.trim() || "📦";

  if (category.id) {
    const updated = current.map((c) =>
      c.id === category.id ? { ...c, label: cleanLabel, icon: cleanIcon } : c,
    );
    return saveCategories(updated);
  }

  const slug = cleanLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    slug: slug || `cat_${Date.now()}`,
    label: cleanLabel,
    icon: cleanIcon,
    is_active: true,
    sort_order: current.length + 1,
  };

  return saveCategories([...current, newCat]);
}

/**
 * Elimina una categoría por su ID.
 */
export function deleteCategoryById(id: string): Category[] {
  const current = getCategories();
  const filtered = current.filter((c) => c.id !== id);
  return saveCategories(filtered);
}

/**
 * Obtiene las telas disponibles para manteles y sobremanteles.
 */
export function getFabrics(): string[] {
  if (typeof window === "undefined") return DEFAULT_FABRICS;
  const raw = localStorage.getItem(FABRICS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(DEFAULT_FABRICS));
    return DEFAULT_FABRICS;
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.length > 0 ? parsed : DEFAULT_FABRICS;
  } catch {
    return DEFAULT_FABRICS;
  }
}

/**
 * Agrega una nueva tela personalizada si no existe.
 */
export function addCustomFabric(fabricName: string): string[] {
  const clean = fabricName.trim();
  if (!clean) return getFabrics();
  const current = getFabrics();
  if (current.some((f) => f.toLowerCase() === clean.toLowerCase())) {
    return current;
  }
  const updated = [...current, clean];
  if (typeof window !== "undefined") {
    localStorage.setItem(FABRICS_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}
