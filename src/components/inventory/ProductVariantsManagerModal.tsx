"use client";

import {
  Boxes,
  Camera,
  Check,
  ChevronDown,
  FolderOpen,
  Palette,
  Plus,
  Save,
  Search,
  Sparkles,
  Wine,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { InventoryItem, InventoryVariant } from "@/core/domain/inventory";
import { formatCurrency } from "@/lib/utils";
import { GenericVariantDraft, ItemVariantsEditor } from "./ItemVariantsEditor";
import { VariantPhotosModal } from "./VariantPhotosModal";

interface ProductVariantsManagerModalProps {
  initialItem?: InventoryItem | null;
  allItems: InventoryItem[];
  onSaveItemVariants: (
    itemId: string,
    variants: InventoryVariant[],
    computedTotalStock: number,
  ) => Promise<void>;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

export function ProductVariantsManagerModal({
  initialItem,
  allItems,
  onSaveItemVariants,
  onClose,
  onNotification,
}: ProductVariantsManagerModalProps) {
  // Filtrar solo artículos individuales (no paquetes)
  const availableItems = useMemo(() => {
    return allItems.filter((i) => i.item_type !== "paquete");
  }, [allItems]);

  // Selección de artículo
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    if (initialItem) return initialItem.id;
    // Preferir cristalería o platos base primero si existen
    const found = availableItems.find(
      (i) =>
        i.category === "cristaleria" ||
        i.category === "platos_base" ||
        (i.variants && i.variants.length > 0),
    );
    return found ? found.id : availableItems[0]?.id || "";
  });

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = useMemo(() => {
    return availableItems.find((i) => i.id === selectedItemId);
  }, [availableItems, selectedItemId]);

  // Estado local de variantes del artículo seleccionado
  const [draftVariants, setDraftVariants] = useState<GenericVariantDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPhotosVariant, setEditingPhotosVariant] =
    useState<GenericVariantDraft | null>(null);

  // Sincronizar variantes cuando cambia el item seleccionado
  useEffect(() => {
    if (selectedItem) {
      setDraftVariants(selectedItem.variants ? [...selectedItem.variants] : []);
    }
  }, [selectedItem]);

  // Filtrado de lista para el dropdown/selector
  const filteredItems = useMemo(() => {
    return availableItems.filter((it) => {
      if (activeCategoryFilter !== "todos") {
        if (activeCategoryFilter === "cristaleria") {
          const isCris =
            it.category === "cristaleria" ||
            it.name.toLowerCase().includes("copa") ||
            it.name.toLowerCase().includes("cristal");
          if (!isCris) return false;
        } else if (activeCategoryFilter === "platos_base") {
          const isPlato =
            it.category === "platos_base" ||
            it.name.toLowerCase().includes("plato");
          if (!isPlato) return false;
        } else if (activeCategoryFilter === "con_variantes") {
          if (!it.variants || it.variants.length === 0) return false;
        } else if (it.category !== activeCategoryFilter) {
          return false;
        }
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      );
    });
  }, [availableItems, activeCategoryFilter, searchQuery]);

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      setIsSaving(true);

      const finalVariants: InventoryVariant[] = draftVariants.map(
        (dv, idx) => ({
          id: dv.id || `var-${Date.now()}-${idx}`,
          item_id: selectedItem.id,
          color_name: dv.color_name.trim(),
          color_hex: dv.color_hex || "#d97706",
          fabric: dv.fabric || selectedItem.fabric || null,
          total_stock: Math.max(0, dv.total_stock),
          rental_price_override:
            dv.rental_price_override !== null &&
            dv.rental_price_override !== undefined
              ? dv.rental_price_override
              : null,
          image_url: dv.image_url || dv.images?.[0] || null,
          images: dv.images && dv.images.length > 0 ? dv.images : [],
        }),
      );

      const computedStock =
        finalVariants.length > 0
          ? finalVariants.reduce((sum, v) => sum + v.total_stock, 0)
          : selectedItem.total_stock;

      await onSaveItemVariants(selectedItem.id, finalVariants, computedStock);
      onNotification(
        `✓ Variaciones guardadas para "${selectedItem.name}" (${finalVariants.length} variantes).`,
      );
    } catch (err) {
      console.error("Error guardando variantes:", err);
      onNotification("Hubo un error al guardar las variaciones.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotosSaved = (newImages: string[], primaryUrl: string) => {
    if (!editingPhotosVariant) return;
    setDraftVariants((prev) =>
      prev.map((v) => {
        if (v.color_name === editingPhotosVariant.color_name) {
          return {
            ...v,
            images: newImages,
            image_url: primaryUrl,
          };
        }
        return v;
      }),
    );
    setEditingPhotosVariant(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs">
        <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm text-base">
                🥂
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Gestor de Variaciones (Cristalería, Platos y Mobiliario)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Agrega colores, precios individuales por diseño y fotos para no duplicar productos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Selector de Producto y Filtros */}
          <div className="border-b border-slate-100 bg-slate-50/60 p-3 sm:px-6 space-y-2.5">
            {/* Filtros rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                Filtrar:
              </span>
              {[
                { id: "todos", label: "Todos los artículos" },
                { id: "cristaleria", label: "🥂 Cristalería / Copas" },
                { id: "platos_base", label: "🍽️ Platos Base / Loza" },
                { id: "con_variantes", label: "✨ Ya con variantes" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer ${
                    activeCategoryFilter === tab.id
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Select del Producto */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-8">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Selecciona el Producto a Gestionar:
                </label>
                <div className="relative">
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    {filteredItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.variants?.length || 0} variantes) •{" "}
                        {it.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buscador de Producto */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Buscar Producto:
                </label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nombre..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cuerpo Principal del Editor */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
            {selectedItem ? (
              <>
                {/* Ficha Resumen del Producto Seleccionado */}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-2xs">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    {selectedItem.image_url ? (
                      /* biome-ignore lint/performance/noImgElement: preview */
                      <img
                        src={selectedItem.image_url}
                        alt={selectedItem.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5">
                        {selectedItem.sku}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold capitalize">
                        {selectedItem.category.replace("_", " ")}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm truncate">
                      {selectedItem.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Precio Base:{" "}
                      <span className="font-bold text-slate-800">
                        {formatCurrency(selectedItem.rental_price)}
                      </span>{" "}
                      • Stock Actual:{" "}
                      <span className="font-bold text-slate-800">
                        {selectedItem.total_stock} pzas.
                      </span>
                    </p>
                  </div>
                </div>

                {/* Componente Modular de Variaciones */}
                <ItemVariantsEditor
                  variants={draftVariants}
                  onChangeVariants={setDraftVariants}
                  baseRentalPrice={selectedItem.rental_price}
                  itemName={selectedItem.name}
                  categorySlug={selectedItem.category}
                  onOpenPhotosModal={(v) => setEditingPhotosVariant(v)}
                />
              </>
            ) : (
              <div className="py-12 text-center text-slate-400">
                No se encontró ningún artículo para gestionar.
              </div>
            )}
          </div>

          {/* Footer con Botón Guardar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedItem}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>
                {isSaving ? "Guardando..." : "Guardar Cambios en Inventario"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Fotos de la Variación */}
      {editingPhotosVariant && selectedItem && (
        <VariantPhotosModal
          colorName={editingPhotosVariant.color_name}
          colorHex={editingPhotosVariant.color_hex}
          fabricName={editingPhotosVariant.fabric || null}
          itemName={selectedItem.name}
          initialImages={editingPhotosVariant.images || []}
          initialPrimaryUrl={editingPhotosVariant.image_url || null}
          onSave={handlePhotosSaved}
          onClose={() => setEditingPhotosVariant(null)}
        />
      )}
    </>
  );
}
