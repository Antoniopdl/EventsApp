"use client";

import { Check, PackagePlus, Search, Sparkles, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import { createPackageInDb } from "@/infrastructure/supabase/inventory-repository";
import { formatCurrency } from "@/lib/utils";

interface CreatePackageModalProps {
  availableItems: InventoryItem[];
  onPackageCreated: (newPkg: InventoryItem) => void;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

const CATEGORY_TABS = [
  { id: "todas", label: "Todas" },
  { id: "mesas", label: "Mesas" },
  { id: "sillas", label: "Sillas" },
  { id: "manteleria", label: "Manteles" },
  { id: "vajilla", label: "Vajilla" },
  { id: "otros", label: "Otros" },
];

export function CreatePackageModal({
  availableItems,
  onPackageCreated,
  onClose,
  onNotification,
}: CreatePackageModalProps) {
  const [name, setName] = useState("");
  const [rentalPrice, setRentalPrice] = useState<number>(250);
  const [capacityPeople, setCapacityPeople] = useState<number>(10);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [imageUrl] = useState<string>(
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
  );

  // Componentes individuales seleccionados (Mesa, Sillas, Vajilla, etc.)
  const [selectedComponents, setSelectedComponents] = useState<
    Record<string, number>
  >({});

  // Mantelería genérica para el paquete (tela y color se eligen al reservar)
  const [mantelBaseQty, setMantelBaseQty] = useState<number>(1);
  const [sobremantelQty, setSobremantelQty] = useState<number>(1);

  // Filtros
  const [activeCategory, setActiveCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detectar items base de mantelería de referencia
  const baseMantelItem = useMemo(() => {
    return (
      availableItems.find(
        (i) =>
          i.category === "manteles_base" ||
          i.name.toLowerCase().includes("mantel base"),
      ) ||
      availableItems.find((i) => i.category === "manteleria") || {
        id: "item-5",
        name: "Mantel Base",
        category: "manteles_base",
        total_stock: 45,
      }
    );
  }, [availableItems]);

  const baseSobremantelItem = useMemo(() => {
    return (
      availableItems.find(
        (i) =>
          i.category === "sobremanteles" ||
          i.name.toLowerCase().includes("sobremantel"),
      ) || {
        id: "item-8",
        name: "Sobremantel",
        category: "sobremanteles",
        total_stock: 50,
      }
    );
  }, [availableItems]);

  // Artículos sueltos disponibles excluyendo mantelería individual (la mantelería se maneja genérica)
  const looseItems = useMemo(() => {
    return availableItems.filter((i) => {
      if (i.item_type === "paquete") return false;
      const isTablecloth =
        i.category === "manteles_base" ||
        i.category === "sobremanteles" ||
        i.category === "manteleria";
      // Ocultar mantelería de la lista común porque se maneja en los slots genéricos
      return !isTablecloth;
    });
  }, [availableItems]);

  // Filtrado por categoría y búsqueda
  const filteredLooseItems = useMemo(() => {
    return looseItems.filter((item) => {
      if (activeCategory !== "todas" && activeCategory !== "manteleria") {
        if (activeCategory === "otros") {
          const mainCats = ["mesas", "sillas", "vajilla"];
          if (mainCats.includes(item.category)) return false;
        } else if (item.category !== activeCategory) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [looseItems, activeCategory, searchQuery]);

  // Calcular stock total de todos los manteles base en inventario
  const totalMantelesBaseStock = useMemo(() => {
    return availableItems
      .filter(
        (i) =>
          i.category === "manteles_base" ||
          (i.category === "manteleria" &&
            !i.name.toLowerCase().includes("sobremantel")) ||
          i.name.toLowerCase().includes("mantel base"),
      )
      .reduce((sum, item) => sum + item.total_stock, 0);
  }, [availableItems]);

  // Calcular stock total de todos los sobremanteles en inventario
  const totalSobremantelesStock = useMemo(() => {
    return availableItems
      .filter(
        (i) =>
          i.category === "sobremanteles" ||
          i.name.toLowerCase().includes("sobremantel"),
      )
      .reduce((sum, item) => sum + item.total_stock, 0);
  }, [availableItems]);

  // 1. Pers. / Cap. automático: 1 silla = 1 persona
  const autoCapacity = useMemo(() => {
    let chairs = 0;
    for (const [id, qty] of Object.entries(selectedComponents)) {
      const item = availableItems.find((i) => i.id === id);
      if (!item) continue;
      const isChair =
        item.category === "sillas" ||
        item.name.toLowerCase().includes("silla") ||
        item.sku.toLowerCase().includes("sill");
      if (isChair) {
        chairs += qty;
      }
    }
    return chairs;
  }, [selectedComponents, availableItems]);

  useEffect(() => {
    if (autoCapacity > 0) {
      setCapacityPeople(autoCapacity);
    }
  }, [autoCapacity]);

  // 2. Stock Total automático: Math.min(stock / qty) de todas las piezas
  const { calculatedStock, limitingFactor } = useMemo(() => {
    const regularEntries = Object.entries(selectedComponents).filter(
      ([_, qty]) => qty > 0,
    );

    if (
      regularEntries.length === 0 &&
      mantelBaseQty === 0 &&
      sobremantelQty === 0
    ) {
      return { calculatedStock: 0, limitingFactor: null };
    }

    let minPackages = Number.POSITIVE_INFINITY;
    let bottleneck = "";

    // Revisar artículos sueltos regulares
    for (const [id, qty] of regularEntries) {
      const item = availableItems.find((i) => i.id === id);
      if (!item || qty <= 0) continue;
      const maxForThis = Math.floor(item.total_stock / qty);
      if (maxForThis < minPackages) {
        minPackages = maxForThis;
        bottleneck = `${item.name} (${item.total_stock} disponibles)`;
      }
    }

    // Revisar mantel base genérico
    if (mantelBaseQty > 0) {
      const maxForBase = Math.floor(totalMantelesBaseStock / mantelBaseQty);
      if (maxForBase < minPackages) {
        minPackages = maxForBase;
        bottleneck = `Manteles Base (${totalMantelesBaseStock} disponibles)`;
      }
    }

    // Revisar sobremantel genérico
    if (sobremantelQty > 0) {
      const maxForSobre = Math.floor(totalSobremantelesStock / sobremantelQty);
      if (maxForSobre < minPackages) {
        minPackages = maxForSobre;
        bottleneck = `Sobremanteles (${totalSobremantelesStock} disponibles)`;
      }
    }

    const finalStock =
      minPackages === Number.POSITIVE_INFINITY ? 0 : Math.max(0, minPackages);

    return {
      calculatedStock: finalStock,
      limitingFactor: bottleneck,
    };
  }, [
    selectedComponents,
    mantelBaseQty,
    sobremantelQty,
    availableItems,
    totalMantelesBaseStock,
    totalSobremantelesStock,
  ]);

  useEffect(() => {
    setTotalStock(calculatedStock);
  }, [calculatedStock]);

  const handleSetQty = (itemId: string, delta: number) => {
    setSelectedComponents((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = next;
      }
      return updated;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotification("Escribe el nombre del paquete.");
      return;
    }
    if (rentalPrice <= 0) {
      onNotification("Ingresa un precio de renta válido.");
      return;
    }

    const componentList: {
      component_item_id: string;
      quantity: number;
      is_customizable?: boolean;
      customization_type?: string | null;
    }[] = Object.entries(selectedComponents).map(([itemId, qty]) => ({
      component_item_id: itemId,
      quantity: qty,
      is_customizable: false,
    }));

    if (mantelBaseQty > 0) {
      componentList.push({
        component_item_id: baseMantelItem.id,
        quantity: mantelBaseQty,
        is_customizable: true,
        customization_type: "mantel_base",
      });
    }

    if (sobremantelQty > 0) {
      componentList.push({
        component_item_id: baseSobremantelItem.id,
        quantity: sobremantelQty,
        is_customizable: true,
        customization_type: "sobremantel",
      });
    }

    if (componentList.length === 0) {
      onNotification("Agrega al menos un artículo que componga el paquete.");
      return;
    }

    setIsSubmitting(true);
    const created = await createPackageInDb(
      {
        name: name.trim(),
        rental_price: rentalPrice,
        capacity_people: capacityPeople,
        total_stock: totalStock,
        image_url: imageUrl,
      },
      componentList,
    );
    setIsSubmitting(false);

    if (created) {
      onNotification(`Paquete "${created.name}" creado con éxito.`);
      onPackageCreated(created);
      onClose();
    } else {
      onNotification("Error al guardar el paquete en el servidor.");
    }
  };

  // Resumen de piezas seleccionadas para mostrar en el header / pills
  const selectedSummary = useMemo(() => {
    const list: string[] = [];
    for (const [id, qty] of Object.entries(selectedComponents)) {
      const it = availableItems.find((i) => i.id === id);
      if (it && qty > 0) list.push(`${qty}x ${it.name}`);
    }
    if (mantelBaseQty > 0) list.push(`${mantelBaseQty}x Mantel Base`);
    if (sobremantelQty > 0) list.push(`${sobremantelQty}x Sobremantel`);
    return list;
  }, [selectedComponents, mantelBaseQty, sobremantelQty, availableItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Crear Nuevo Paquete / Combo
              </h3>
              <p className="text-[11px] text-slate-500">
                Arma un combo con mesas, sillas y mantelería genérica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleCreate}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar"
        >
          {/* Nombre del paquete */}
          <div>
            <label
              htmlFor="pkg-name"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Nombre del Paquete
            </label>
            <input
              id="pkg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Paquete Redondo Fiesta 10p"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Precios, Capacidad y Stock */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="pkg-price"
                className="block text-[11px] font-bold text-slate-800 mb-1"
              >
                Precio Renta ($)
              </label>
              <input
                id="pkg-price"
                type="number"
                min={1}
                value={rentalPrice}
                onChange={(e) => setRentalPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="pkg-capacity"
                  className="block text-[11px] font-bold text-slate-800"
                >
                  Pers. / Cap.
                </label>
                <span className="text-[9px] text-blue-600 font-bold">Auto</span>
              </div>
              <div className="relative">
                <input
                  id="pkg-capacity"
                  type="number"
                  min={0}
                  value={capacityPeople}
                  onChange={(e) => setCapacityPeople(Number(e.target.value))}
                  className="w-full rounded-xl border border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Users className="absolute right-2 top-2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="pkg-stock"
                  className="block text-[11px] font-bold text-slate-800"
                >
                  Stock Total
                </label>
                <span className="text-[9px] text-purple-600 font-bold">
                  Auto
                </span>
              </div>
              <input
                id="pkg-stock"
                type="number"
                min={0}
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
                className="w-full rounded-xl border border-purple-300 bg-purple-50/50 px-2 py-1.5 text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Explicación de Stock y Capacidad calculados */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-[11px] space-y-0.5">
            <p className="text-slate-700 font-medium flex items-center gap-1">
              <span className="text-blue-600 font-bold">👥 Capacidad:</span>{" "}
              {autoCapacity > 0
                ? `${autoCapacity} personas (1 silla = 1 comensal)`
                : "Sin sillas agregadas todavía"}
            </p>
            <p className="text-slate-700 font-medium">
              <span className="text-purple-600 font-bold">
                📦 Stock Disponible:
              </span>{" "}
              {calculatedStock > 0 ? (
                <span>
                  <b>{calculatedStock} paquetes</b>{" "}
                  {limitingFactor ? (
                    <span className="text-slate-500">
                      (limitado por {limitingFactor})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-amber-700 font-semibold">
                  Selecciona piezas abajo para calcular el stock
                </span>
              )}
            </p>
          </div>

          {/* Resumen de Piezas Incluidas */}
          {selectedSummary.length > 0 && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-2.5 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 block">
                Piezas que incluye este paquete ({selectedSummary.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedSummary.map((piezas) => (
                  <span
                    key={piezas}
                    className="inline-flex items-center rounded-lg bg-white border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-900 shadow-2xs"
                  >
                    {piezas}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sección de Selección de Componentes */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-900">
              Agregar piezas al paquete:
            </span>

            {/* Filtros de Categoría */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-purple-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Buscador de artículos */}
            {activeCategory !== "manteleria" && (
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar mesa, silla, vajilla..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}

            {/* 1. SECCIÓN ESPECIAL: MANTELES GENÉRICOS (Sin tela ni color fijo) */}
            {(activeCategory === "todas" ||
              activeCategory === "manteleria") && (
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-700" />
                    <span className="font-bold text-purple-950 text-xs">
                      Mantelería del Paquete
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700">
                    Se elige tela y color al reservar
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Mantel Base */}
                  <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-white p-2">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-900 text-xs">
                        Mantel Base
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {totalMantelesBaseStock} piezas disponibles en total
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setMantelBaseQty((prev) => Math.max(0, prev - 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-purple-900 text-xs">
                        {mantelBaseQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMantelBaseQty((prev) => prev + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-700 font-bold text-white text-xs active:scale-95 hover:bg-purple-800"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Sobremantel */}
                  <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-white p-2">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-900 text-xs">
                        Sobremantel
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {totalSobremantelesStock} piezas disponibles en total
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSobremantelQty((prev) => Math.max(0, prev - 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-purple-900 text-xs">
                        {sobremantelQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSobremantelQty((prev) => prev + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-700 font-bold text-white text-xs active:scale-95 hover:bg-purple-800"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LISTA DE ARTÍCULOS SUELTOS (Mesas, Sillas, Vajilla, etc.) */}
            {activeCategory !== "manteleria" && (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 no-scrollbar">
                {filteredLooseItems.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-500">
                    No se encontraron artículos en esta categoría.
                  </p>
                ) : (
                  filteredLooseItems.map((item) => {
                    const qty = selectedComponents[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2"
                      >
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-900 text-xs line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatCurrency(item.rental_price)} • Stock:{" "}
                            {item.total_stock}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetQty(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs active:scale-95"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-slate-900 text-xs">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetQty(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-700 font-bold text-white text-xs active:scale-95 hover:bg-purple-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 font-bold text-xs text-white shadow-md hover:bg-purple-800 active:scale-98 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>
              {isSubmitting ? "Guardando paquete..." : "Guardar Paquete"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
