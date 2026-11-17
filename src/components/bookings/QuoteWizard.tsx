"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Booking, PickupType } from "@/core/domain/booking";
import type { ClientAddress, ClientWithStats } from "@/core/domain/client";
import { findColorByFabricAndName } from "@/core/domain/fabric-catalog";
import type { InventoryItem } from "@/core/domain/inventory";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { checkInventoryAvailability } from "@/core/use-cases/CheckInventoryAvailability";
import {
  createBookingInDb,
  getBookings,
} from "@/infrastructure/supabase/booking-repository";
import { searchClients } from "@/infrastructure/supabase/client-repository";
import { formatCurrency } from "@/lib/utils";
import { TableclothCatalogModal } from "../inventory/TableclothCatalogModal";
import { AddressPickerMap } from "../shared/AddressPickerMap";

interface QuoteWizardProps {
  inventory: InventoryItem[];
  initialClient?: ClientWithStats | null;
  initialAddress?: ClientAddress | null;
  onBookingCreated?: () => void;
  onNotification?: (msg: string) => void;
}

export function QuoteWizard({
  inventory,
  initialClient,
  initialAddress,
  onBookingCreated,
  onNotification,
}: QuoteWizardProps) {
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState(initialClient?.full_name || "");
  const [clientPhone, setClientPhone] = useState(
    initialClient?.phone_whatsapp || "",
  );
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(
    initialClient || null,
  );
  const [matchingClients, setMatchingClients] = useState<ClientWithStats[]>([]);

  // Dirección y Logística
  const [addressAlias, setAddressAlias] = useState(
    initialAddress?.alias || "Casa propia",
  );
  const [address, setAddress] = useState(
    initialAddress?.address_text || "Angostura Centro",
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    initialAddress?.delivery_notes || "",
  );
  const [lat, setLat] = useState<number | null>(
    initialAddress?.latitude || null,
  );
  const [lng, setLng] = useState<number | null>(
    initialAddress?.longitude || null,
  );
  const [distanceKm, setDistanceKm] = useState(8.4);
  const [freightCost, setFreightCost] = useState(250);
  const [showMapModal, setShowMapModal] = useState(false);

  // Fecha, recolección y artículos
  const [deliveryDate, setDeliveryDate] = useState("2026-11-14");
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [pickupMode, setPickupMode] = useState<
    "mismo_dia_noche" | "dia_siguiente" | "dos_dias" | "personalizado"
  >("dia_siguiente");
  const [customPickupDate, setCustomPickupDate] = useState("2026-11-16");
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );

  // Selección de telas y colores para manteles incluidos en paquetes
  const [selectedBaseFabric, setSelectedBaseFabric] =
    useState<string>("Tergal");
  const [selectedBaseColors, setSelectedBaseColors] = useState<
    Record<string, number>
  >({});
  const [selectedSobreFabric, setSelectedSobreFabric] =
    useState<string>("Satín");
  const [selectedSobreColors, setSelectedSobreColors] = useState<
    Record<string, number>
  >({});
  const [selectedItemVariants, setSelectedItemVariants] = useState<
    Record<string, Record<string, number>>
  >({});
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filtros de Mobiliario (Paso 2)
  const [furnitureView, setFurnitureView] = useState<
    "paquetes" | "individuales"
  >("paquetes");
  const [furnitureSearch, setFurnitureSearch] = useState("");

  // Finanzas ajustables
  const [deposit, setDeposit] = useState<number>(0); // Default $0
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [setupFee, setSetupFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingFolio, setConfirmedBookingFolio] = useState<
    string | null
  >(null);

  useEffect(() => {
    getBookings().then(setExistingBookings);
  }, []);

  useEffect(() => {
    if (initialClient) {
      setClientName(initialClient.full_name);
      setClientPhone(initialClient.phone_whatsapp);
      setSelectedClient(initialClient);
    }
    if (initialAddress) {
      setAddressAlias(initialAddress.alias);
      setAddress(initialAddress.address_text);
      setDeliveryNotes(initialAddress.delivery_notes || "");
    }
  }, [initialClient, initialAddress]);

  const handleNameInput = async (val: string) => {
    setClientName(val);
    if (val.length >= 2) {
      const results = await searchClients(val);
      setMatchingClients(results);
    } else {
      setMatchingClients([]);
    }
  };

  const handleSelectClient = (c: ClientWithStats) => {
    setSelectedClient(c);
    setClientName(c.full_name);
    setClientPhone(c.phone_whatsapp);
    setMatchingClients([]);
    const defaultAddr = c.addresses.find((a) => a.is_default) || c.addresses[0];
    if (defaultAddr) {
      applyAddress(defaultAddr);
    }
  };

  const applyAddress = (addr: ClientAddress) => {
    setAddressAlias(addr.alias);
    setAddress(addr.address_text);
    setDeliveryNotes(addr.delivery_notes || "");
    setLat(addr.latitude || null);
    setLng(addr.longitude || null);
  };

  const setItemExactQty = (id: string, qty: number) => {
    setSelectedItems((prev) => {
      const next = Math.max(0, qty);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const adjustQty = (id: string, delta: number) => {
    const current = selectedItems[id] || 0;
    setItemExactQty(id, current + delta);
  };

  const setItemVariantExactQty = (
    itemId: string,
    variantId: string,
    qty: number,
  ) => {
    const nextVQty = Math.max(0, qty);
    setSelectedItemVariants((prev) => {
      const currentMap = { ...(prev[itemId] || {}) };
      if (nextVQty === 0) {
        delete currentMap[variantId];
      } else {
        currentMap[variantId] = nextVQty;
      }
      const newTotal = Object.values(currentMap).reduce((s, v) => s + v, 0);
      setItemExactQty(itemId, newTotal);
      return { ...prev, [itemId]: currentMap };
    });
  };

  const adjustItemVariantQty = (
    itemId: string,
    variantId: string,
    delta: number,
  ) => {
    const current = selectedItemVariants[itemId]?.[variantId] || 0;
    setItemVariantExactQty(itemId, variantId, current + delta);
  };

  const calculateSubtotal = () => {
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const item = inventory.find((i) => i.id === id);
      if (!item) return sum;
      const varMap = selectedItemVariants[id];
      if (varMap && item.variants && item.variants.length > 0) {
        let itemVarSum = 0;
        let countedQty = 0;
        for (const [varId, vQty] of Object.entries(varMap)) {
          if (vQty <= 0) continue;
          const v = item.variants.find((variant) => variant.id === varId);
          const price =
            v?.rental_price_override !== null &&
            v?.rental_price_override !== undefined
              ? v.rental_price_override
              : item.rental_price;
          itemVarSum += price * vQty;
          countedQty += vQty;
        }
        const remaining = Math.max(0, qty - countedQty);
        return sum + itemVarSum + remaining * item.rental_price;
      }
      return sum + item.rental_price * qty;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const total = subtotal + freightCost + setupFee + deposit;
  const balanceDue = Math.max(0, total - advancePayment);

  // Filtrado de mobiliario en Paso 2
  const filteredMobiliario = useMemo(() => {
    return inventory.filter((item) => {
      const isPkg = item.item_type === "paquete";
      if (furnitureView === "paquetes" && !isPkg) return false;
      if (furnitureView === "individuales" && isPkg) return false;

      if (!furnitureSearch.trim()) return true;
      const q = furnitureSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [inventory, furnitureView, furnitureSearch]);

  // Contadores de selección
  const selectedCounts = useMemo(() => {
    let pkgs = 0;
    let pieces = 0;
    for (const [id, qty] of Object.entries(selectedItems)) {
      const it = inventory.find((i) => i.id === id);
      if (it?.item_type === "paquete") pkgs += qty;
      else pieces += qty;
    }
    return { pkgs, pieces };
  }, [selectedItems, inventory]);

  // Calcular fecha/hora de recolección y duración
  const { pickupIso, pickupType, rentalDaysCount } = useMemo(() => {
    const base = new Date(`${deliveryDate}T${deliveryTime || "11:00"}:00`);
    if (Number.isNaN(base.getTime())) {
      return {
        pickupIso: `${deliveryDate}T23:59:00Z`,
        pickupType: "dia_siguiente" as PickupType,
        rentalDaysCount: 1,
      };
    }

    if (pickupMode === "mismo_dia_noche") {
      return {
        pickupIso: `${deliveryDate}T23:30:00Z`,
        pickupType: "mismo_dia_noche" as PickupType,
        rentalDaysCount: 1,
      };
    }
    if (pickupMode === "dia_siguiente") {
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      const isoDate = next.toISOString().split("T")[0];
      return {
        pickupIso: `${isoDate}T11:00:00Z`,
        pickupType: "dia_siguiente" as PickupType,
        rentalDaysCount: 1,
      };
    }
    if (pickupMode === "dos_dias") {
      const next = new Date(base);
      next.setDate(next.getDate() + 2);
      const isoDate = next.toISOString().split("T")[0];
      return {
        pickupIso: `${isoDate}T11:00:00Z`,
        pickupType: "evento_multidia" as PickupType,
        rentalDaysCount: 2,
      };
    }

    // Personalizado
    const custom = new Date(`${customPickupDate}T11:00:00Z`);
    const diffDays = Math.max(
      1,
      Math.ceil((custom.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return {
      pickupIso: `${customPickupDate}T11:00:00Z`,
      pickupType: (diffDays > 1
        ? "evento_multidia"
        : "dia_siguiente") as PickupType,
      rentalDaysCount: diffDays,
    };
  }, [deliveryDate, deliveryTime, pickupMode, customPickupDate]);

  // Motor de disponibilidad en vivo (BOM de paquetes + buffer de 2 días de lavado en manteles)
  const availabilityReport = useMemo(() => {
    return checkInventoryAvailability({
      deliveryIso: `${deliveryDate}T${deliveryTime || "11:00"}:00Z`,
      pickupIso,
      selectedItems,
      inventory,
      existingBookings,
    });
  }, [
    deliveryDate,
    deliveryTime,
    pickupIso,
    selectedItems,
    inventory,
    existingBookings,
  ]);

  // 1. Detección de manteles base y sobremanteles requeridos por los paquetes seleccionados
  const { totalMantelesBaseNeeded, totalSobremantelesNeeded } = useMemo(() => {
    let baseCount = 0;
    let sobreCount = 0;

    for (const [id, qty] of Object.entries(selectedItems)) {
      if (qty <= 0) continue;
      const it = inventory.find((i) => i.id === id);
      if (it?.item_type !== "paquete") continue;

      let foundInRecipe = false;
      if (it.package_components && it.package_components.length > 0) {
        for (const comp of it.package_components) {
          const isBase =
            comp.customization_type === "mantel_base" ||
            comp.component_item?.category === "manteles_base" ||
            comp.component_item?.name.toLowerCase().includes("mantel base");
          const isSobre =
            comp.customization_type === "sobremantel" ||
            comp.component_item?.category === "sobremanteles" ||
            comp.component_item?.name.toLowerCase().includes("sobremantel");

          if (isBase) {
            baseCount += comp.quantity * qty;
            foundInRecipe = true;
          }
          if (isSobre) {
            sobreCount += comp.quantity * qty;
            foundInRecipe = true;
          }
        }
      }

      if (!foundInRecipe && it.description) {
        const descLower = it.description.toLowerCase();
        if (descLower.includes("sobremantel")) {
          sobreCount += 1 * qty;
        }
        if (descLower.includes("mantel")) {
          baseCount += 1 * qty;
        }
      }
    }

    return {
      totalMantelesBaseNeeded: baseCount,
      totalSobremantelesNeeded: sobreCount,
    };
  }, [selectedItems, inventory]);

  // Detección de mesas presentes en la cotización actual
  const detectedTableInfo = useMemo(() => {
    const shapes = new Set<string>();
    const names: string[] = [];

    for (const [id, qty] of Object.entries(selectedItems)) {
      if (qty <= 0) continue;
      const it = inventory.find((x) => x.id === id);
      if (!it) continue;

      const checkName = (name: string, q: number) => {
        const lower = name.toLowerCase();
        if (lower.includes("mesa redonda") || lower.includes("redonda")) {
          shapes.add("redonda");
          names.push(`${q}x Mesas Redondas`);
        } else if (
          lower.includes("cuadrada chica") ||
          lower.includes("cuad. chica")
        ) {
          shapes.add("cuadrada_chica");
          names.push(`${q}x Mesas Cuadradas Chicas`);
        } else if (
          lower.includes("cuadrada grande") ||
          lower.includes("imperial")
        ) {
          shapes.add("cuadrada_grande");
          names.push(`${q}x Mesas Cuadradas Grandes`);
        } else if (lower.includes("cuadrada") || lower.includes("cuad")) {
          shapes.add("cuadrada");
          names.push(`${q}x Mesas Cuadradas`);
        } else if (
          lower.includes("tablón") ||
          lower.includes("tablon") ||
          lower.includes("rectangular")
        ) {
          shapes.add("tablon");
          names.push(`${q}x Mesas Tablón`);
        }
      };

      if (it.category === "mesas") {
        checkName(it.name, qty);
      } else if (it.item_type === "paquete" && it.package_components) {
        for (const comp of it.package_components) {
          if (
            comp.component_item?.category === "mesas" ||
            comp.component_item?.name.toLowerCase().includes("mesa")
          ) {
            checkName(comp.component_item.name, qty * (comp.quantity || 1));
          }
        }
      } else if (it.description?.toLowerCase().includes("mesa")) {
        checkName(it.description, qty);
      }
    }

    return {
      shapes: Array.from(shapes),
      summary: Array.from(new Set(names)).join(", "),
    };
  }, [selectedItems, inventory]);

  // 2. Telas disponibles para manteles base
  const baseTableclothItems = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.category === "manteles_base" ||
        (i.category === "manteleria" &&
          !i.name.toLowerCase().includes("sobremantel")) ||
        i.name.toLowerCase().includes("mantel base"),
    );
  }, [inventory]);

  const availableBaseFabrics = useMemo(() => {
    const set = new Set<string>();
    for (const it of baseTableclothItems) {
      if (it.fabric) set.add(it.fabric);
    }
    if (set.size === 0) {
      set.add("Tergal");
      set.add("Satín");
    }
    return Array.from(set);
  }, [baseTableclothItems]);

  // 3. Telas disponibles para sobremanteles
  const sobremantelItems = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.category === "sobremanteles" ||
        i.name.toLowerCase().includes("sobremantel"),
    );
  }, [inventory]);

  const availableSobreFabrics = useMemo(() => {
    const set = new Set<string>();
    for (const it of sobremantelItems) {
      if (it.fabric) set.add(it.fabric);
    }
    if (set.size === 0) {
      set.add("Satín");
      set.add("Organza");
      set.add("Bordado");
    }
    return Array.from(set);
  }, [sobremantelItems]);

  // 4. Colores para tela seleccionada en manteles base
  const baseColorsForFabric = useMemo(() => {
    const list: {
      id: string;
      name: string;
      hex: string;
      available_stock: number;
      texture_url?: string | null;
      drape_url?: string | null;
    }[] = [];

    const matching = baseTableclothItems.filter(
      (it) =>
        (it.fabric || "Tergal").toLowerCase() ===
        selectedBaseFabric.toLowerCase(),
    );

    for (const it of matching) {
      if (it.variants && it.variants.length > 0) {
        for (const v of it.variants) {
          const masterCol = findColorByFabricAndName(
            selectedBaseFabric,
            v.color_name,
          );
          list.push({
            id: v.id,
            name: v.color_name,
            hex: v.color_hex || masterCol?.color_hex || "#f8fafc",
            available_stock: v.total_stock,
            texture_url:
              v.images?.[0] || v.image_url || masterCol?.texture_url || null,
            drape_url: v.images?.[1] || masterCol?.drape_url || null,
          });
        }
      } else {
        const masterCol = findColorByFabricAndName(selectedBaseFabric, it.name);
        list.push({
          id: it.id,
          name: it.name,
          hex: masterCol?.color_hex || "#f8fafc",
          available_stock: it.total_stock,
          texture_url: it.image_url || masterCol?.texture_url || null,
          drape_url: masterCol?.drape_url || null,
        });
      }
    }

    if (list.length === 0) {
      const b1 = findColorByFabricAndName(selectedBaseFabric, "Blanco");
      const b2 = findColorByFabricAndName(selectedBaseFabric, "Negro");
      const b3 =
        findColorByFabricAndName(selectedBaseFabric, "Arena") ||
        findColorByFabricAndName(selectedBaseFabric, "Beige");
      list.push(
        {
          id: "def-b1",
          name: "Blanco",
          hex: b1?.color_hex || "#f8fafc",
          available_stock: 30,
          texture_url: b1?.texture_url,
          drape_url: b1?.drape_url,
        },
        {
          id: "def-b2",
          name: "Negro",
          hex: b2?.color_hex || "#0f172a",
          available_stock: 15,
          texture_url: b2?.texture_url,
          drape_url: b2?.drape_url,
        },
        {
          id: "def-b3",
          name: b3?.color_name || "Beige",
          hex: b3?.color_hex || "#e7d8c5",
          available_stock: 10,
          texture_url: b3?.texture_url,
          drape_url: b3?.drape_url,
        },
      );
    }
    return list;
  }, [baseTableclothItems, selectedBaseFabric]);

  // 5. Colores para tela seleccionada en sobremanteles
  const sobreColorsForFabric = useMemo(() => {
    const list: {
      id: string;
      name: string;
      hex: string;
      available_stock: number;
      texture_url?: string | null;
      drape_url?: string | null;
    }[] = [];

    const matching = sobremantelItems.filter(
      (it) =>
        (it.fabric || "Satín").toLowerCase() ===
        selectedSobreFabric.toLowerCase(),
    );

    for (const it of matching) {
      if (it.variants && it.variants.length > 0) {
        for (const v of it.variants) {
          const masterCol = findColorByFabricAndName(
            selectedSobreFabric,
            v.color_name,
          );
          list.push({
            id: v.id,
            name: v.color_name,
            hex: v.color_hex || masterCol?.color_hex || "#2563eb",
            available_stock: v.total_stock,
            texture_url:
              v.images?.[0] || v.image_url || masterCol?.texture_url || null,
            drape_url: v.images?.[1] || masterCol?.drape_url || null,
          });
        }
      } else {
        const masterCol = findColorByFabricAndName(
          selectedSobreFabric,
          it.name,
        );
        list.push({
          id: it.id,
          name: it.name,
          hex: masterCol?.color_hex || "#2563eb",
          available_stock: it.total_stock,
          texture_url: it.image_url || masterCol?.texture_url || null,
          drape_url: masterCol?.drape_url || null,
        });
      }
    }

    if (list.length === 0) {
      const s1 = findColorByFabricAndName(selectedSobreFabric, "Azul Rey");
      const s2 =
        findColorByFabricAndName(selectedSobreFabric, "Oro") ||
        findColorByFabricAndName(selectedSobreFabric, "Dorado");
      const s3 = findColorByFabricAndName(selectedSobreFabric, "Rosa Palo");
      const s4 = findColorByFabricAndName(selectedSobreFabric, "Vino");
      list.push(
        {
          id: "def-s1",
          name: "Azul Rey",
          hex: s1?.color_hex || "#1d4ed8",
          available_stock: 25,
          texture_url: s1?.texture_url,
          drape_url: s1?.drape_url,
        },
        {
          id: "def-s2",
          name: s2?.color_name || "Dorado",
          hex: s2?.color_hex || "#eab308",
          available_stock: 15,
          texture_url: s2?.texture_url,
          drape_url: s2?.drape_url,
        },
        {
          id: "def-s3",
          name: s3?.color_name || "Rosa Pastel",
          hex: s3?.color_hex || "#f472b6",
          available_stock: 20,
          texture_url: s3?.texture_url,
          drape_url: s3?.drape_url,
        },
        {
          id: "def-s4",
          name: "Vino",
          hex: s4?.color_hex || "#881337",
          available_stock: 12,
          texture_url: s4?.texture_url,
          drape_url: s4?.drape_url,
        },
      );
    }
    return list;
  }, [sobremantelItems, selectedSobreFabric]);

  const assignedBaseTotal = useMemo(() => {
    return Object.values(selectedBaseColors).reduce((a, b) => a + b, 0);
  }, [selectedBaseColors]);

  const assignedSobreTotal = useMemo(() => {
    return Object.values(selectedSobreColors).reduce((a, b) => a + b, 0);
  }, [selectedSobreColors]);

  const handleAdjustBaseColor = (colorName: string, delta: number) => {
    setSelectedBaseColors((prev) => {
      const cur = prev[colorName] || 0;
      const next = Math.max(0, cur + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[colorName];
      else copy[colorName] = next;
      return copy;
    });
  };

  const handleAdjustSobreColor = (colorName: string, delta: number) => {
    setSelectedSobreColors((prev) => {
      const cur = prev[colorName] || 0;
      const next = Math.max(0, cur + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[colorName];
      else copy[colorName] = next;
      return copy;
    });
  };

  // Alertas de stock insuficiente en mantelería seleccionada
  const baseShortages = useMemo(() => {
    const alerts: {
      color: string;
      requested: number;
      available: number;
      missing: number;
    }[] = [];
    for (const [colName, q] of Object.entries(selectedBaseColors)) {
      if (q <= 0) continue;
      const colObj = baseColorsForFabric.find(
        (c) => c.name.toLowerCase() === colName.toLowerCase(),
      );
      const avail = colObj ? colObj.available_stock : 0;
      if (q > avail) {
        alerts.push({
          color: colName,
          requested: q,
          available: avail,
          missing: q - avail,
        });
      }
    }
    return alerts;
  }, [selectedBaseColors, baseColorsForFabric]);

  const sobreShortages = useMemo(() => {
    const alerts: {
      color: string;
      requested: number;
      available: number;
      missing: number;
    }[] = [];
    for (const [colName, q] of Object.entries(selectedSobreColors)) {
      if (q <= 0) continue;
      const colObj = sobreColorsForFabric.find(
        (c) => c.name.toLowerCase() === colName.toLowerCase(),
      );
      const avail = colObj ? colObj.available_stock : 0;
      if (q > avail) {
        alerts.push({
          color: colName,
          requested: q,
          available: avail,
          missing: q - avail,
        });
      }
    }
    return alerts;
  }, [selectedSobreColors, sobreColorsForFabric]);

  // Resumen textual de manteles seleccionados
  const tableclothNotes = useMemo(() => {
    const notes: string[] = [];
    if (totalMantelesBaseNeeded > 0) {
      const bStr = Object.entries(selectedBaseColors)
        .filter(([_, q]) => q > 0)
        .map(([col, q]) => `${q}x ${col}`)
        .join(", ");
      notes.push(
        `Manteles Base (${selectedBaseFabric}): ${bStr || "Sin color asignado"}`,
      );
    }
    if (totalSobremantelesNeeded > 0) {
      const sStr = Object.entries(selectedSobreColors)
        .filter(([_, q]) => q > 0)
        .map(([col, q]) => `${q}x ${col}`)
        .join(", ");
      notes.push(
        `Sobremanteles (${selectedSobreFabric}): ${sStr || "Sin color asignado"}`,
      );
    }
    return notes;
  }, [
    totalMantelesBaseNeeded,
    totalSobremantelesNeeded,
    selectedBaseFabric,
    selectedBaseColors,
    selectedSobreFabric,
    selectedSobreColors,
  ]);

  // Confirmar reserva en Supabase
  const handleConfirmRental = async () => {
    setIsSubmitting(true);
    const startDatetime = `${deliveryDate}T${deliveryTime}:00Z`;
    const endDatetime = pickupIso;

    const bookingItems = Object.entries(selectedItems)
      .map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        if (!item) return null;
        const varMap = selectedItemVariants[id];
        let appliedPrice = item.rental_price;
        if (varMap && item.variants && item.variants.length > 0) {
          let itemVarSum = 0;
          let count = 0;
          for (const [varId, vQty] of Object.entries(varMap)) {
            if (vQty <= 0) continue;
            const v = item.variants.find((variant) => variant.id === varId);
            const price =
              v?.rental_price_override !== null &&
              v?.rental_price_override !== undefined
                ? v.rental_price_override
                : item.rental_price;
            itemVarSum += price * vQty;
            count += vQty;
          }
          if (count > 0) {
            appliedPrice = itemVarSum / count;
          }
        }
        return {
          item_id: item.id,
          quantity: qty,
          unit_price_applied: appliedPrice,
        };
      })
      .filter(Boolean) as {
      item_id: string;
      quantity: number;
      unit_price_applied: number;
    }[];

    const variantNotes: string[] = [];
    for (const [id, varMap] of Object.entries(selectedItemVariants)) {
      const it = inventory.find((i) => i.id === id);
      if (!it || !it.variants) continue;
      const parts: string[] = [];
      for (const [vId, vQty] of Object.entries(varMap)) {
        if (vQty <= 0) continue;
        const v = it.variants.find((variant) => variant.id === vId);
        if (v) parts.push(`${vQty}x ${v.color_name}`);
      }
      if (parts.length > 0) {
        variantNotes.push(`• ${it.name}: ${parts.join(", ")}`);
      }
    }

    const combinedDeliveryNotes = [
      deliveryNotes,
      tableclothNotes.length > 0
        ? `[Mantelería de Paquetes]\n${tableclothNotes.join("\n")}`
        : null,
      variantNotes.length > 0
        ? `[Colores y Variaciones Elegidas]\n${variantNotes.join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const created = await createBookingInDb(
      {
        client_id: selectedClient?.id,
        client_name: clientName || "Cliente Particular",
        client_phone: clientPhone || FER_EVENTOS_CONFIG.phone,
        address_alias: addressAlias,
        event_address: address,
        delivery_notes: combinedDeliveryNotes,
        latitude: lat,
        longitude: lng,
        freight_distance_km: distanceKm,
        freight_cost: freightCost,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        delivery_datetime: startDatetime,
        pickup_datetime: endDatetime,
        pickup_type: pickupType,
        subtotal_furniture: subtotal,
        security_deposit: deposit,
        advance_payment: advancePayment,
        total_amount: total,
        requires_setup: requiresSetup,
        setup_fee: setupFee,
      },
      bookingItems,
    );

    setIsSubmitting(false);

    if (created) {
      setConfirmedBookingFolio(created.folio);
      if (onNotification) {
        onNotification(`¡Renta ${created.folio} confirmada con éxito!`);
      }
      if (onBookingCreated) {
        onBookingCreated();
      }
    } else if (onNotification) {
      onNotification("Error al guardar la renta en el servidor.");
    }
  };

  const handleShareWhatsApp = () => {
    const phone = clientPhone || FER_EVENTOS_CONFIG.phone;
    const itemsText = Object.entries(selectedItems)
      .map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        return item ? `• ${qty}x ${item.name}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const tableclothShareText =
      tableclothNotes.length > 0
        ? `\n🎨 *Mantelería Elegida:*\n${tableclothNotes.map((n) => `• ${n}`).join("\n")}\n`
        : "";

    const message =
      `¡Hola ${clientName || "Cliente"}! 👋 Te saluda Fer Eventos.\n\n` +
      `Te comparto la cotización formal para tu evento del ${deliveryDate}:\n\n` +
      `📦 *Mobiliario Cotizado:*\n${itemsText}\n${tableclothShareText}\n` +
      `🚚 *Lugar de Entrega:* ${addressAlias} (${address})\n` +
      (deliveryNotes ? `📌 *Referencias:* ${deliveryNotes}\n` : "") +
      `💰 *Subtotal Mobiliario:* ${formatCurrency(subtotal)}\n` +
      `🚚 *Flete:* ${formatCurrency(freightCost)}\n` +
      (requiresSetup
        ? `🛠️ *Servicio de Montaje Completo:* ${formatCurrency(setupFee)}\n`
        : "") +
      (deposit > 0
        ? `🛡️ *Depósito en Garantía (Reembolsable):* ${formatCurrency(deposit)}\n`
        : "") +
      `👉 *TOTAL:* ${formatCurrency(total)}\n` +
      (advancePayment > 0
        ? `✨ *Anticipo Registrado:* ${formatCurrency(advancePayment)}\n`
        : "") +
      (balanceDue > 0
        ? `💵 *Saldo Pendiente:* ${formatCurrency(balanceDue)}\n\n`
        : "\n") +
      (tableclothNotes.length > 0 || totalMantelesBaseNeeded > 0
        ? `📸 *Catálogo Digital de Manteles:* Puedes ver fotos reales de nuestras telas y caídas en:\n${typeof window !== "undefined" ? window.location.origin : ""}/catalogo\n\n`
        : "") +
      (confirmedBookingFolio
        ? `🔖 *Folio de Reserva:* ${confirmedBookingFolio}\n\n`
        : "") +
      `¿Deseas confirmar algún detalle adicional? Estamos para servirte.`;

    const url = `https://wa.me/52${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Barra de Progreso Continua sin Números */}
      <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900">
            {step === 1 && "Paso 1: Clienta & Dirección"}
            {step === 2 && "Paso 2: Selección de Mobiliario"}
            {step === 3 && "Paso 3: Flete & Mapa"}
            {step === 4 && "Paso 4: Confirmación & Presupuesto"}
          </span>
          <span className="font-bold text-blue-600 text-[11px]">
            {Math.round((step / 4) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Paso 1: Clienta, Fechas y Dirección */}
      {step === 1 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Nombre con autocompletado */}
          <div className="relative">
            <label
              htmlFor="wizard-client-name"
              className="mb-1 block font-bold text-slate-950 text-xs"
            >
              Nombre de la Clienta (o escribe para buscar)
            </label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="wizard-client-name"
                type="text"
                value={clientName}
                onChange={(e) => handleNameInput(e.target.value)}
                placeholder="Ej. Carmen López, Lupita..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {matchingClients.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {matchingClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="flex w-full items-center justify-between p-2.5 text-left text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{c.full_name}</p>
                      <p className="text-[10px] text-slate-600">
                        {c.phone_whatsapp}
                      </p>
                    </div>
                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      Seleccionar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label
              htmlFor="wizard-client-phone"
              className="mb-1 block font-bold text-slate-950 text-xs"
            >
              Teléfono de WhatsApp
            </label>
            <input
              id="wizard-client-phone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ej. 6971022914"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de Direcciones Frecuentes si existe */}
          {selectedClient && selectedClient.addresses.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
              <span className="font-bold text-blue-950 text-[11px] block">
                Direcciones guardadas de{" "}
                {selectedClient.full_name.split(" ")[0]}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedClient.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => applyAddress(addr)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      addressAlias === addr.alias
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Home className="h-3 w-3" />
                    <span>{addr.alias}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dirección Seleccionada y Botón de Mapa */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-red-600" />
                <span>{addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-xs hover:underline"
              >
                Buscar / Ajustar Pin 📍
              </button>
            </div>
            <p className="text-slate-800 text-xs font-medium line-clamp-2">
              {address}
            </p>
            {deliveryNotes && (
              <p className="text-[11px] text-slate-600 italic">
                "{deliveryNotes}"
              </p>
            )}
          </div>

          {/* Fechas del evento: Corrección de layout y no desbordamiento */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label
                htmlFor="wizard-event-date"
                className="mb-1 block font-bold text-slate-950 text-xs"
              >
                Fecha del Evento
              </label>
              <input
                id="wizard-event-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="wizard-event-time"
                className="mb-1 block font-bold text-slate-950 text-xs"
              >
                Hora de Entrega
              </label>
              <input
                id="wizard-event-time"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selector de cuándo se recoge el mobiliario */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-950 text-xs">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <span>¿Cuándo se recoge el mobiliario?</span>
              </span>
              <span className="rounded-lg bg-blue-100 px-2 py-0.5 font-extrabold text-[11px] text-blue-800">
                {rentalDaysCount} {rentalDaysCount === 1 ? "día" : "días"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "mismo_dia_noche", label: "Mismo día noche" },
                { id: "dia_siguiente", label: "Al día siguiente" },
                { id: "dos_dias", label: "En 2 días" },
                { id: "personalizado", label: "Otra fecha" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setPickupMode(
                      opt.id as
                        | "mismo_dia_noche"
                        | "dia_siguiente"
                        | "dos_dias"
                        | "personalizado",
                    )
                  }
                  className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                    pickupMode === opt.id
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pickupMode === "personalizado" && (
              <div className="pt-1">
                <label
                  htmlFor="wizard-custom-pickup"
                  className="mb-1 block font-bold text-slate-900 text-[11px]"
                >
                  Fecha de Recolección:
                </label>
                <input
                  id="wizard-custom-pickup"
                  type="date"
                  min={deliveryDate}
                  value={customPickupDate}
                  onChange={(e) => setCustomPickupDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <p className="text-[11px] font-medium text-slate-600">
              Recolección programada:{" "}
              <span className="font-bold text-slate-900">
                {pickupIso.split("T")[0]}
              </span>{" "}
              (manteles suman +2 días de lavado).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98"
          >
            <span>Continuar a Mobiliario</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Paso 2: Mobiliario con Toggle, Búsqueda y Persistencia */}
      {step === 2 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Toggle Paquetes / Artículos Sueltos (Sin emojis) */}
          <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFurnitureView("paquetes")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
                furnitureView === "paquetes"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Paquetes</span>
            </button>
            <button
              type="button"
              onClick={() => setFurnitureView("individuales")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
                furnitureView === "individuales"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>Artículos Sueltos</span>
            </button>
          </div>

          {/* Buscador de Mobiliario */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={furnitureSearch}
              onChange={(e) => setFurnitureSearch(e.target.value)}
              placeholder="Buscar silla, mesa, mantel..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Resumen de Selecciones Activas */}
          {(selectedCounts.pkgs > 0 || selectedCounts.pieces > 0) && (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px]">
              <span className="font-bold text-blue-900">
                Seleccionado:{" "}
                {selectedCounts.pkgs > 0 ? `${selectedCounts.pkgs} paq. ` : ""}
                {selectedCounts.pieces > 0
                  ? `${selectedCounts.pieces} pzas.`
                  : ""}
              </span>
              <span className="font-extrabold text-blue-700">
                {formatCurrency(subtotal)}
              </span>
            </div>
          )}

          {/* Banner de Alerta TDA de Alto Contraste por Faltantes / Lavandería */}
          {!availabilityReport.isAvailable && (
            <div className="rounded-2xl border-4 border-amber-300 bg-rose-600 p-3.5 text-white shadow-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300 mt-0.5" />
                <div>
                  <h4 className="font-black text-sm tracking-tight uppercase text-amber-200">
                    ¡Atención! Falta inventario para esta fecha
                  </h4>
                  <p className="text-[11px] font-semibold text-rose-100">
                    Revisa los faltantes abajo. Puedes cambiar por una
                    alternativa disponible o continuar si consigues stock extra.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {availabilityReport.missingItems.map((m) => (
                  <div
                    key={m.item.id}
                    className="rounded-xl bg-rose-800/80 border border-rose-400/50 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-white">
                        {m.item.name}
                      </span>
                      <span className="rounded-lg bg-amber-300 px-2 py-0.5 font-black text-rose-950 text-[11px]">
                        Faltan {m.missing}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-rose-100">
                      Pides <b>{m.requested}</b>, pero solo hay{" "}
                      <b>{m.available}</b> libres para estas fechas.
                    </p>
                    {m.inLaundryCount > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 border border-amber-300/60 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                        <span>
                          🧺 {m.inLaundryCount} en lavandería (+2 días de
                          lavado)
                        </span>
                      </div>
                    )}

                    {m.alternatives.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                          <Sparkles className="h-3 w-3" />
                          <span>
                            Opciones disponibles de la misma categoría:
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {m.alternatives.map((alt) => (
                            <button
                              key={alt.item.id}
                              type="button"
                              onClick={() => {
                                const addQty = Math.min(
                                  m.missing,
                                  alt.availableStock,
                                );
                                setItemExactQty(
                                  alt.item.id,
                                  (selectedItems[alt.item.id] || 0) + addQty,
                                );
                                onNotification?.(
                                  `Agregadas ${addQty} pzas. de ${alt.item.name}`,
                                );
                              }}
                              className="min-h-[36px] rounded-xl bg-white px-2.5 py-1 text-[11px] font-extrabold text-rose-900 shadow-xs hover:bg-amber-100 active:scale-95"
                            >
                              + Usar {alt.item.name} ({alt.availableStock}{" "}
                              libres)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Mobiliario con Selector Unitario */}
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
            {filteredMobiliario.map((item) => {
              const qty = selectedItems[item.id] || 0;
              const isPkg = item.item_type === "paquete";
              const freeStock = !isPkg
                ? (availabilityReport.availableByItemId[item.id] ??
                  item.total_stock)
                : null;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2 transition-all hover:border-blue-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 text-xs line-clamp-1">
                          {item.name}
                        </p>
                        {freeStock !== null && (
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                              freeStock <= 0
                                ? "bg-rose-100 text-rose-700"
                                : freeStock < 10
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {freeStock} libres
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {formatCurrency(item.rental_price)} c/u
                        {isPkg && item.capacity_people
                          ? ` • ${item.capacity_people} pers.`
                          : ""}
                        {item.variants && item.variants.length > 0
                          ? ` • ${item.variants.length} colores/diseños`
                          : ""}
                      </p>
                    </div>

                    {/* Controles de Cantidad (+ / - unitarios y campo numérico) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white font-black text-slate-800 text-sm active:scale-95 shadow-2xs cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={qty === 0 ? "" : qty}
                        onChange={(e) =>
                          setItemExactQty(
                            item.id,
                            Number.parseInt(e.target.value, 10) || 0,
                          )
                        }
                        placeholder="0"
                        className="w-10 rounded-lg border border-slate-300 bg-white py-1 text-center font-extrabold text-slate-900 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white text-sm active:scale-95 shadow-2xs hover:bg-blue-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Desglose por Variación (Colores de cristalería o diseños de platos) */}
                  {item.variants && item.variants.length > 0 && (
                    <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-blue-950 uppercase flex items-center gap-1">
                          <span>💎</span>
                          <span>Colores / Diseños disponibles:</span>
                        </span>
                        <span className="text-[10px] text-blue-700 font-medium">
                          Asigna piezas por variación
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.variants.map((v) => {
                          const vQty =
                            selectedItemVariants[item.id]?.[v.id] || 0;
                          const vPrice =
                            v.rental_price_override !== null &&
                            v.rental_price_override !== undefined
                              ? v.rental_price_override
                              : item.rental_price;

                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-1.5 truncate pr-1">
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0"
                                  style={{
                                    backgroundColor: v.color_hex || "#d97706",
                                  }}
                                />
                                <span className="font-bold text-slate-800 text-[11px] truncate">
                                  {v.color_name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  (${vPrice} • {v.total_stock} stock)
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    adjustItemVariantQty(item.id, v.id, -1)
                                  }
                                  className="h-6 w-6 rounded border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-700 active:scale-95 flex items-center justify-center cursor-pointer hover:bg-slate-100"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={vQty === 0 ? "" : vQty}
                                  onChange={(e) =>
                                    setItemVariantExactQty(
                                      item.id,
                                      v.id,
                                      Number.parseInt(e.target.value, 10) || 0,
                                    )
                                  }
                                  placeholder="0"
                                  className="w-8 rounded border border-slate-300 py-0.5 text-center font-bold text-[11px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    adjustItemVariantQty(item.id, v.id, 1)
                                  }
                                  className="h-6 w-6 rounded bg-blue-600 text-[11px] font-black text-white active:scale-95 flex items-center justify-center cursor-pointer hover:bg-blue-700"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SECCIÓN INTERACTIVA DE TELAS Y COLORES PARA PAQUETES */}
          {(totalMantelesBaseNeeded > 0 || totalSobremantelesNeeded > 0) && (
            <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/50 p-3.5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-200 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                    <span>🎨 Mantelería de Paquetes</span>
                  </h4>
                  <p className="text-[11px] text-blue-800">
                    Elige la tela y colores para los paquetes seleccionados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all self-start sm:self-auto"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Ver Muestrario de Fotos ↗</span>
                </button>
              </div>

              {/* Guía de compatibilidad según mesas detectadas */}
              {detectedTableInfo.shapes.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-white p-2.5 text-xs text-blue-950 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-blue-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>
                      Mesas detectadas en la orden: {detectedTableInfo.summary}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 pl-5 space-y-0.5">
                    {detectedTableInfo.shapes.includes("redonda") && (
                      <p>
                        • <strong>Mesa Redonda:</strong> Usa mantel base
                        redondo. Sobremantel Chico es compatible.
                      </p>
                    )}
                    {detectedTableInfo.shapes.includes("cuadrada_chica") && (
                      <p>
                        • <strong>Mesa Cuadrada Chica:</strong> Usa mantel base
                        cuadrado y Sobremantel Chico.
                      </p>
                    )}
                    {detectedTableInfo.shapes.includes("cuadrada_grande") && (
                      <p>
                        • <strong>Mesa Imperial (Grande):</strong> Requiere
                        Sobremantel Grande exclusivo.
                      </p>
                    )}
                    {detectedTableInfo.shapes.includes("tablon") && (
                      <p>
                        • <strong>Mesa Tablón:</strong> Usa manteles
                        alargados/tablón.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 1. MANTELES BASE */}
              {totalMantelesBaseNeeded > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Mantel Base
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Total requerido: {totalMantelesBaseNeeded} mantel(es)
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-extrabold text-[10px] ${
                        assignedBaseTotal === totalMantelesBaseNeeded
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : assignedBaseTotal < totalMantelesBaseNeeded
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {assignedBaseTotal} de {totalMantelesBaseNeeded} asignados
                    </span>
                  </div>

                  {/* Selector de Tela para Mantel Base */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      1. Selecciona el Tipo de Tela:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBaseFabrics.map((fab) => (
                        <button
                          key={fab}
                          type="button"
                          onClick={() => setSelectedBaseFabric(fab)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            selectedBaseFabric === fab
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {fab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alerta de Stock Faltante si aplica */}
                  {baseShortages.length > 0 && (
                    <div className="space-y-1">
                      {baseShortages.map((s) => (
                        <div
                          key={s.color}
                          className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-800 flex items-start gap-1.5"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              ⚠️ ¡Atención mamá! Stock insuficiente en {s.color}
                            </span>
                            <span className="text-[11px]">
                              Solo quedan <strong>{s.available}</strong>{" "}
                              disponibles y seleccionaste{" "}
                              <strong>{s.requested}</strong> (faltan {s.missing}
                              ). Comunícale al cliente para elegir otro color o
                              tela.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selector de Colores Disponibles */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      2. Elige Colores (Tela {selectedBaseFabric}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {baseColorsForFabric.map((c) => {
                        const curQty = selectedBaseColors[c.name] || 0;
                        const isOverStock = curQty > c.available_stock;
                        return (
                          <div
                            key={c.id || c.name}
                            className={`flex items-center justify-between rounded-lg border p-1.5 ${
                              isOverStock
                                ? "border-red-400 bg-red-50/60"
                                : curQty > 0
                                  ? "border-blue-400 bg-blue-50/40"
                                  : "border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {c.texture_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage(
                                      c.drape_url || c.texture_url || null,
                                    )
                                  }
                                  className="relative h-8 w-8 rounded-lg overflow-hidden border border-slate-300 shrink-0 cursor-pointer shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all text-left"
                                  title="Ver foto ampliada de muestra y caída"
                                >
                                  <img
                                    src={c.texture_url}
                                    alt={c.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {c.drape_url && (
                                    <span className="absolute bottom-0 right-0 bg-blue-700 text-[8px] font-black text-white px-0.5 rounded-tl">
                                      2📷
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className="h-5 w-5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: c.hex }}
                                />
                              )}
                              <div className="truncate">
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Disp: {c.available_stock} pzas
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustBaseColor(c.name, -1)
                                }
                                disabled={curQty <= 0}
                                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white font-bold text-slate-700 text-xs disabled:opacity-30 active:scale-95"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black text-slate-900 text-xs">
                                {curQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdjustBaseColor(c.name, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-bold text-white text-xs hover:bg-blue-700 active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SOBREMANTEL */}
              {totalSobremantelesNeeded > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Sobremantel
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Total requerido: {totalSobremantelesNeeded}{" "}
                        sobremantel(es)
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-extrabold text-[10px] ${
                        assignedSobreTotal === totalSobremantelesNeeded
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : assignedSobreTotal < totalSobremantelesNeeded
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {assignedSobreTotal} de {totalSobremantelesNeeded}{" "}
                      asignados
                    </span>
                  </div>

                  {/* Selector de Tela para Sobremantel */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      1. Selecciona el Tipo de Tela:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSobreFabrics.map((fab) => (
                        <button
                          key={fab}
                          type="button"
                          onClick={() => setSelectedSobreFabric(fab)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            selectedSobreFabric === fab
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {fab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alerta de Stock Faltante en Sobremanteles */}
                  {sobreShortages.length > 0 && (
                    <div className="space-y-1">
                      {sobreShortages.map((s) => (
                        <div
                          key={s.color}
                          className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-800 flex items-start gap-1.5"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              ⚠️ ¡Atención mamá! Stock insuficiente en {s.color}
                            </span>
                            <span className="text-[11px]">
                              Solo quedan <strong>{s.available}</strong>{" "}
                              disponibles y seleccionaste{" "}
                              <strong>{s.requested}</strong> (faltan {s.missing}
                              ). Comunícale al cliente para elegir otro color o
                              tela.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selector de Colores Disponibles en Sobremanteles */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      2. Elige Colores (Tela {selectedSobreFabric}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {sobreColorsForFabric.map((c) => {
                        const curQty = selectedSobreColors[c.name] || 0;
                        const isOverStock = curQty > c.available_stock;
                        return (
                          <div
                            key={c.id || c.name}
                            className={`flex items-center justify-between rounded-lg border p-1.5 ${
                              isOverStock
                                ? "border-red-400 bg-red-50/60"
                                : curQty > 0
                                  ? "border-blue-400 bg-blue-50/40"
                                  : "border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {c.texture_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage(
                                      c.drape_url || c.texture_url || null,
                                    )
                                  }
                                  className="relative h-8 w-8 rounded-lg overflow-hidden border border-slate-300 shrink-0 cursor-pointer shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all text-left"
                                  title="Ver foto ampliada de muestra y caída"
                                >
                                  <img
                                    src={c.texture_url}
                                    alt={c.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {c.drape_url && (
                                    <span className="absolute bottom-0 right-0 bg-blue-700 text-[8px] font-black text-white px-0.5 rounded-tl">
                                      2📷
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className="h-5 w-5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: c.hex }}
                                />
                              )}
                              <div className="truncate">
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Disp: {c.available_stock} pzas
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustSobreColor(c.name, -1)
                                }
                                disabled={curQty <= 0}
                                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white font-bold text-slate-700 text-xs disabled:opacity-30 active:scale-95"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black text-slate-900 text-xs">
                                {curQty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustSobreColor(c.name, 1)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-bold text-white text-xs hover:bg-blue-700 active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex w-2/3 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white text-xs shadow-md"
            >
              <span>Revisar Flete</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Flete & Ubicación */}
      {step === 3 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Destino: {addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-xs hover:underline"
              >
                Abrir Mapa & Pin 📍
              </button>
            </div>
            <p className="text-xs text-slate-800 font-semibold">{address}</p>
            <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 text-xs">
              <span className="text-slate-700 font-medium">
                Distancia: {distanceKm} km desde Bodega
              </span>
              <span className="font-extrabold text-blue-800">
                Flete sugerido: {formatCurrency(freightCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label
              htmlFor="wizardFreightCostInput"
              className="font-bold text-slate-950 text-xs"
            >
              Costo de Flete Acordado:
            </label>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-500 text-xs">$</span>
              <input
                id="wizardFreightCostInput"
                type="number"
                value={freightCost}
                onChange={(e) => setFreightCost(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-blue-700 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Opción de Montaje Completo */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <span className="font-bold text-slate-950 text-xs block">
                ¿Deseas montaje completo?
              </span>
              <span className="text-[10px] text-slate-500">
                (Personal abre mesas y acomoda sillas y manteles)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !requiresSetup;
                setRequiresSetup(nextVal);
                setSetupFee(nextVal ? 300 : 0);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold text-xs transition-all active:scale-95 ${
                requiresSetup
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {requiresSetup ? "✓ Sí (+$300)" : "No (a pie de camión)"}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex w-2/3 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white text-xs shadow-md"
            >
              <span>Ver Presupuesto</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Presupuesto, Anticipo y Confirmación */}
      {step === 4 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Clienta:</span>
              <span className="font-bold text-slate-900">
                {clientName || "Sin registrar"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Lugar:</span>
              <span className="font-semibold text-slate-900 text-right">
                {addressAlias}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Fecha:</span>
              <span className="font-semibold text-slate-900">
                {deliveryDate} ({deliveryTime})
              </span>
            </div>
          </div>

          {/* Resumen de Mantelería Elegida */}
          {tableclothNotes.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-xs space-y-1">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <span>🎨 Mantelería de Paquetes Asignada:</span>
              </span>
              {tableclothNotes.map((note) => (
                <p
                  key={note}
                  className="text-slate-800 text-[11px] font-medium"
                >
                  • {note}
                </p>
              ))}
            </div>
          )}

          {/* Desglose de Totales */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">
                Subtotal Mobiliario:
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">
                Flete de Entrega:
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(freightCost)}
              </span>
            </div>
            {requiresSetup && (
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">
                  Servicio de Montaje:
                </span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(setupFee)}
                </span>
              </div>
            )}

            {/* Depósito en Garantía (Default $0) */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2">
              <label
                htmlFor="wizardDepositInput"
                className="text-slate-700 font-semibold"
              >
                Depósito en Garantía:
              </label>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-500 text-xs">$</span>
                <input
                  id="wizardDepositInput"
                  type="number"
                  min={0}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-slate-900 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Total General */}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
              <span className="font-black text-slate-950">TOTAL:</span>
              <span className="font-black text-blue-700 text-base">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Anticipo Recibido */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-200 p-2.5">
              <div>
                <label
                  htmlFor="wizardAdvanceInput"
                  className="font-bold text-emerald-950 block"
                >
                  Anticipo Recibido:
                </label>
                <span className="text-[10px] text-emerald-700">
                  Pago por adelantado
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-emerald-700 text-xs">$</span>
                <input
                  id="wizardAdvanceInput"
                  type="number"
                  min={0}
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-right font-extrabold text-emerald-800 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Saldo Pendiente */}
            <div className="flex justify-between rounded-xl bg-slate-100 p-2 text-xs font-bold text-slate-800">
              <span>Saldo Pendiente al Entregar:</span>
              <span
                className={
                  balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                }
              >
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-2 pt-2">
            {confirmedBookingFolio ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-center space-y-1">
                <span className="flex items-center justify-center gap-1 font-extrabold text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Renta Confirmada: {confirmedBookingFolio}</span>
                </span>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Guardada en la agenda y lista para entrega.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmRental}
                disabled={isSubmitting || subtotal === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-sm text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{isSubmitting ? "Guardando..." : "Confirmar renta"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white font-bold text-xs text-emerald-700 shadow-2xs hover:bg-emerald-50 active:scale-98"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>Enviar a WhatsApp de Clienta</span>
            </button>
          </div>
        </div>
      )}

      {showMapModal && (
        <AddressPickerMap
          initialAlias={addressAlias}
          initialAddress={address}
          initialNotes={deliveryNotes}
          initialLat={lat}
          initialLng={lng}
          onConfirm={(data) => {
            setAddressAlias(data.alias);
            setAddress(data.address_text);
            setDeliveryNotes(data.delivery_notes);
            setLat(data.latitude);
            setLng(data.longitude);
            setDistanceKm(data.distance_km);
            setFreightCost(data.freight_cost);
            setShowMapModal(false);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Mini-Lightbox para ver la foto de la tela/caída ampliada */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewImage(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreviewImage(null);
          }}
        >
          <div className="relative max-w-sm rounded-2xl bg-white p-3 shadow-2xl overflow-hidden">
            <img
              src={previewImage}
              alt="Muestra de tela ampliada"
              className="h-80 w-full object-cover rounded-xl"
            />
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Cerrar vista previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completo de Catálogo y Muestrario de Manteles */}
      {isCatalogModalOpen && (
        <TableclothCatalogModal
          items={inventory}
          onClose={() => setIsCatalogModalOpen(false)}
          onNotification={onNotification}
        />
      )}
    </div>
  );
}
