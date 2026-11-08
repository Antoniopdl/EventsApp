export type FurnitureCategory =
  | "sillas"
  | "mesas"
  | "manteleria"
  | "vajilla"
  | "toldos_carpas"
  | "decoracion"
  | "otros";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: FurnitureCategory;
  description?: string | null;
  total_stock: number;
  rental_price: number;
  replacement_price: number;
  image_url?: string | null;
  buffer_cleanup_hours: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItemAvailability extends InventoryItem {
  available_stock: number;
  is_available: boolean;
}
