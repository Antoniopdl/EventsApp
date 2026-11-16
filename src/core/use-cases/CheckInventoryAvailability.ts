import type { Booking } from "@/core/domain/booking";
import {
  type InventoryItem,
  isTableclothCategory,
} from "@/core/domain/inventory";

export interface AlternativeSuggestion {
  item: InventoryItem;
  availableStock: number;
}

export interface MissingItemAlert {
  item: InventoryItem;
  requested: number;
  available: number;
  missing: number;
  inLaundryCount: number;
  alternatives: AlternativeSuggestion[];
}

export interface AvailabilityReport {
  isAvailable: boolean;
  missingItems: MissingItemAlert[];
  availableByItemId: Record<string, number>;
}

const LAUNDRY_BUFFER_MS = 48 * 60 * 60 * 1000; // 2 días (48 horas) de lavado para manteles/sobremanteles

/**
 * Expande un carrito (paquetes + sueltos) en demanda neta de artículos sueltos.
 */
function expandSelectionToLooseDemand(
  selection: Record<string, number>,
  inventoryMap: Map<string, InventoryItem>,
): Record<string, number> {
  const demand: Record<string, number> = {};

  for (const [id, qty] of Object.entries(selection)) {
    if (qty <= 0) continue;
    const item = inventoryMap.get(id);
    if (!item) continue;

    if (
      item.item_type === "paquete" &&
      item.package_components &&
      item.package_components.length > 0
    ) {
      for (const comp of item.package_components) {
        const compQty = comp.quantity * qty;
        demand[comp.component_item_id] =
          (demand[comp.component_item_id] || 0) + compQty;
      }
    } else {
      demand[id] = (demand[id] || 0) + qty;
    }
  }

  return demand;
}

/**
 * Determina si dos intervalos de tiempo [startA, endA] y [startB, endB] se traslapan.
 */
function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Calcula qué cantidad de cada artículo está comprometida en reservas existentes
 * para la ventana [targetStart, targetEnd], considerando +2 días de lavado en mantelería.
 */
function computeCommittedByDate(
  targetStartMs: number,
  targetEndMs: number,
  existingBookings: Booking[],
  inventoryMap: Map<string, InventoryItem>,
): {
  committed: Record<string, number>;
  laundryCommitted: Record<string, number>;
} {
  const committed: Record<string, number> = {};
  const laundryCommitted: Record<string, number> = {};

  for (const b of existingBookings) {
    if (b.status === "cancelada") continue;

    const bStartStr = b.delivery_datetime || b.start_datetime;
    const bEndStr = b.pickup_datetime || b.end_datetime || bStartStr;
    if (!bStartStr) continue;

    const bStartMs = new Date(bStartStr).getTime();
    let bEndMs = new Date(bEndStr).getTime();
    if (Number.isNaN(bStartMs) || Number.isNaN(bEndMs)) continue;
    if (bEndMs <= bStartMs) {
      bEndMs = bStartMs + 12 * 60 * 60 * 1000; // Mínimo 12h si no hay hora de fin
    }

    const bookingSelection: Record<string, number> = {};
    for (const bi of b.items || []) {
      bookingSelection[bi.item_id] =
        (bookingSelection[bi.item_id] || 0) + bi.quantity;
    }

    const expandedDemand = expandSelectionToLooseDemand(
      bookingSelection,
      inventoryMap,
    );

    for (const [itemId, qty] of Object.entries(expandedDemand)) {
      const item = inventoryMap.get(itemId);
      const isLaundryItem = item ? isTableclothCategory(item.category) : false;

      const directOverlap = intervalsOverlap(
        targetStartMs,
        targetEndMs,
        bStartMs,
        bEndMs,
      );

      if (directOverlap) {
        committed[itemId] = (committed[itemId] || 0) + qty;
      } else if (isLaundryItem) {
        // Revisar si choca con los 2 días de lavado posteriores a la recolección
        const bEndWithLaundryMs = bEndMs + LAUNDRY_BUFFER_MS;
        const targetEndWithLaundryMs = targetEndMs + LAUNDRY_BUFFER_MS;
        if (
          intervalsOverlap(
            targetStartMs,
            targetEndWithLaundryMs,
            bStartMs,
            bEndWithLaundryMs,
          )
        ) {
          committed[itemId] = (committed[itemId] || 0) + qty;
          laundryCommitted[itemId] = (laundryCommitted[itemId] || 0) + qty;
        }
      }
    }
  }

  return { committed, laundryCommitted };
}

/**
 * Busca alternativas de la misma categoría con stock disponible para ese día.
 */
function findCategoryAlternatives(
  targetItem: InventoryItem,
  requestedQty: number,
  inventory: InventoryItem[],
  availableByItemId: Record<string, number>,
): AlternativeSuggestion[] {
  const candidates = inventory.filter(
    (other) =>
      other.id !== targetItem.id &&
      other.item_type !== "paquete" &&
      other.category === targetItem.category &&
      (availableByItemId[other.id] ?? other.total_stock) > 0,
  );

  // Priorizar los que cubren toda la cantidad pedida
  candidates.sort((a, b) => {
    const availA = availableByItemId[a.id] ?? a.total_stock;
    const availB = availableByItemId[b.id] ?? b.total_stock;
    const coversA = availA >= requestedQty ? 1 : 0;
    const coversB = availB >= requestedQty ? 1 : 0;
    if (coversA !== coversB) return coversB - coversA;
    return availB - availA;
  });

  return candidates.slice(0, 3).map((c) => ({
    item: c,
    availableStock: availableByItemId[c.id] ?? c.total_stock,
  }));
}

/**
 * Evalúa disponibilidad real de inventario considerando paquetes (BOM), fechas y buffer de lavado.
 */
export function checkInventoryAvailability(params: {
  deliveryIso: string;
  pickupIso: string;
  selectedItems: Record<string, number>;
  inventory: InventoryItem[];
  existingBookings: Booking[];
}): AvailabilityReport {
  const { deliveryIso, pickupIso, selectedItems, inventory, existingBookings } =
    params;

  const inventoryMap = new Map<string, InventoryItem>();
  for (const item of inventory) {
    inventoryMap.set(item.id, item);
  }

  const startMs = new Date(deliveryIso).getTime();
  let endMs = new Date(pickupIso).getTime();
  if (Number.isNaN(endMs) || endMs <= startMs) {
    endMs = startMs + 24 * 60 * 60 * 1000;
  }

  const { committed, laundryCommitted } = computeCommittedByDate(
    startMs,
    endMs,
    existingBookings,
    inventoryMap,
  );

  const availableByItemId: Record<string, number> = {};
  for (const item of inventory) {
    if (item.item_type !== "paquete") {
      availableByItemId[item.id] = Math.max(
        0,
        item.total_stock - (committed[item.id] || 0),
      );
    }
  }

  const netDemand = expandSelectionToLooseDemand(selectedItems, inventoryMap);
  const missingItems: MissingItemAlert[] = [];

  for (const [itemId, requestedQty] of Object.entries(netDemand)) {
    const item = inventoryMap.get(itemId);
    if (!item) continue;

    const available = availableByItemId[itemId] ?? item.total_stock;
    if (requestedQty > available) {
      missingItems.push({
        item,
        requested: requestedQty,
        available,
        missing: requestedQty - available,
        inLaundryCount: laundryCommitted[itemId] || 0,
        alternatives: findCategoryAlternatives(
          item,
          requestedQty,
          inventory,
          availableByItemId,
        ),
      });
    }
  }

  return {
    isAvailable: missingItems.length === 0,
    missingItems,
    availableByItemId,
  };
}
