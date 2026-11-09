export type FurnitureCategory =
  | "paquetes"
  | "sillas"
  | "mesas"
  | "manteleria"
  | "vajilla"
  | "toldos_carpas"
  | "decoracion"
  | "otros";

export type InventoryItemType = "individual" | "paquete";

export interface InventoryVariant {
  id: string;
  item_id: string;
  color_name: string;
  color_hex?: string | null;
  total_stock: number;
  rental_price_override?: number | null;
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

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: FurnitureCategory;
  item_type?: InventoryItemType;
  fabric?: string | null;
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
