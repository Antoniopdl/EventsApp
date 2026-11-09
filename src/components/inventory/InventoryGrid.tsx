"use client";

import { Boxes, Edit3, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { CategoryFilter } from "./CategoryFilter";
import { InventoryCard } from "./InventoryCard";

interface InventoryGridProps {
  items: InventoryItem[];
  role: UserRole;
  onAdjustStock: (id: string, delta: number) => void;
  onUpdateDetails: (
    id: string,
    updates: Partial<InventoryItem>,
  ) => Promise<void>;
  onUpdateVariantStock: (variantId: string, newStock: number) => Promise<void>;
}

export function InventoryGrid({
  items,
  role,
  onAdjustStock,
  onUpdateDetails,
  onUpdateVariantStock,
}: InventoryGridProps) {
  const [viewType, setViewType] = useState<"paquetes" | "individuales">(
    "paquetes",
  );
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [isEditMode, setIsEditMode] = useState(false);

  const isAdmin = role === "admin";

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filtro por Tipo (Paquete vs Individual)
      const isPkg = item.item_type === "paquete";
      if (viewType === "paquetes" && !isPkg) return false;
      if (viewType === "individuales" && isPkg) return false;

      // 2. Filtro por Categoría (solo aplica en individuales)
      const matchCategory =
        viewType === "paquetes" ||
        selectedCategory === "todas" ||
        item.category === selectedCategory;

      // 3. Filtro por Buscador
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [items, viewType, selectedCategory, search]);

  return (
    <div className="space-y-3 pb-6">
      {/* Selector de Vista: Paquetes (Default) vs Artículos Sueltos */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewType("paquetes")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
              viewType === "paquetes"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>🏷️ Paquetes / Combos</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType("individuales")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
              viewType === "individuales"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>📦 Artículos Sueltos</span>
          </button>
        </div>

        {/* Botón Maestro de Lápiz ✏️ para Modo Edición */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            title={
              isEditMode ? "Guardar y Salir" : "Editar precios y existencias"
            }
            className={`flex h-11 items-center gap-1 rounded-2xl px-3 font-bold text-xs transition-all active:scale-95 ${
              isEditMode
                ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-300"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isEditMode ? "Listo" : "Editar"}
            </span>
          </button>
        )}
      </div>

      {/* Banner discreto cuando el modo edición está activo */}
      {isEditMode && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-medium flex items-center justify-between animate-in fade-in">
          <span>
            ✏️ <strong>Modo Edición:</strong> Modifica cualquier precio o stock;
            se guarda al instante.
          </span>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="font-bold underline text-amber-900 ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            viewType === "paquetes"
              ? "Buscar paquete (ej. Redondo, Tiffany, Tablón)..."
              : "Buscar mesa, silla, mantel por tela o color..."
          }
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Categorías (Solo cuando vemos artículos sueltos) */}
      {viewType === "individuales" && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      {/* Rejilla de Artículos */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            role={role}
            isEditMode={isEditMode}
            onAdjustStock={onAdjustStock}
            onUpdateDetails={onUpdateDetails}
            onUpdateVariantStock={onUpdateVariantStock}
          />
        ))}
      </div>
    </div>
  );
}
