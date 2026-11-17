export type FurnitureCategory = string;

export type InventoryItemType = "individual" | "paquete";

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-sillas",
    slug: "sillas",
    label: "Sillas",
    icon: "🪑",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "cat-mesas",
    slug: "mesas",
    label: "Mesas",
    icon: "🍽️",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "cat-manteles-base",
    slug: "manteles_base",
    label: "Manteles Base",
    icon: "🧵",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "cat-sobremanteles",
    slug: "sobremanteles",
    label: "Sobremanteles",
    icon: "✨",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "cat-vajilla",
    slug: "vajilla",
    label: "Vajilla",
    icon: "🍷",
    is_active: true,
    sort_order: 5,
  },
  {
    id: "cat-decoracion",
    slug: "decoracion",
    label: "Decoración",
    icon: "🏺",
    is_active: true,
    sort_order: 6,
  },
  {
    id: "cat-toldos",
    slug: "toldos_carpas",
    label: "Toldos y Carpas",
    icon: "⛺",
    is_active: true,
    sort_order: 7,
  },
  {
    id: "cat-otros",
    slug: "otros",
    label: "Otros",
    icon: "📦",
    is_active: true,
    sort_order: 8,
  },
];

export const DEFAULT_FABRICS: string[] = [
  "Tergal",
  "Satín",
  "Encaje",
  "Bordado",
  "Jacquard",
  "Lino",
  "Organza",
];

export function isTableclothCategory(categorySlug: string): boolean {
  const clean = categorySlug.toLowerCase();
  return (
    clean === "manteles_base" ||
    clean === "sobremanteles" ||
    clean === "manteleria" ||
    clean.includes("mantel")
  );
}

export interface InventoryVariant {
  id: string;
  item_id: string;
  color_name: string;
  color_hex?: string | null;
  fabric?: string | null;
  total_stock: number;
  rental_price_override?: number | null;
  images?: string[];
  image_url?: string | null;
}

export interface PackageComponent {
  id: string;
  package_id: string;
  component_item_id: string;
  quantity: number;
  is_customizable: boolean;
  customization_type?: string | null;
  component_item?: InventoryItem;
}

export type TableShapeCompatibility =
  | "redonda"
  | "cuadrada"
  | "tablon"
  | "todas";

export type TableclothSize = "estandar" | "chico" | "grande";

export function getTableCompatibilityLabel(item: {
  category?: string;
  table_shape?: string | null;
  tablecloth_size?: string | null;
}): string {
  const cat = (item.category || "").toLowerCase();
  if (cat === "sobremanteles" || cat.includes("sobremantel")) {
    if (item.tablecloth_size === "chico") {
      return "Sobremantel Chico (Mesas redondas y cuadradas chicas)";
    }
    if (item.tablecloth_size === "grande") {
      return "Sobremantel Grande (Solo mesas cuadradas grandes)";
    }
    return "Sobremantel Estándar";
  }

  if (item.table_shape === "redonda") return "Para Mesas Redondas";
  if (item.table_shape === "cuadrada") return "Para Mesas Cuadradas";
  if (item.table_shape === "tablon") return "Para Mesas Tablón / Rectangular";
  if (item.table_shape === "todas") return "Universal / Todas las mesas";
  return "";
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: FurnitureCategory;
  item_type?: InventoryItemType;
  fabric?: string | null;
  table_shape?: TableShapeCompatibility | null;
  tablecloth_size?: TableclothSize | null;
  compatible_tables?: string[] | null;
  capacity_people?: number | null;
  description?: string | null;
  total_stock: number;
  rental_price: number;
  replacement_price: number;
  image_url?: string | null;
  buffer_cleanup_hours: number;
  is_active: boolean;
  variants?: InventoryVariant[];
  package_components?: PackageComponent[];
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItemAvailability extends InventoryItem {
  available_stock: number;
  is_available: boolean;
}
