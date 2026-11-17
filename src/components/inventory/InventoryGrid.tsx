"use client";

import {
  Boxes,
  Edit3,
  FileSpreadsheet,
  Package,
  PackagePlus,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Category, InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { getCategories } from "@/infrastructure/supabase/category-repository";
import { CategoryFilter } from "./CategoryFilter";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { CreateLooseItemModal } from "./CreateLooseItemModal";
import { CreatePackageModal } from "./CreatePackageModal";
import { EditProductModal } from "./EditProductModal";
import { InventoryCard } from "./InventoryCard";
import { TableclothCatalogModal } from "./TableclothCatalogModal";

interface InventoryGridProps {
  items: InventoryItem[];
  role: UserRole;
  onAdjustStock: (id: string, delta: number) => void;
  onUpdateDetails: (
    id: string,
    updates: Partial<InventoryItem>,
  ) => Promise<void>;
  onUpdateVariantStock: (variantId: string, newStock: number) => Promise<void>;
  onItemCreated?: (item: InventoryItem) => void;
  onNotification?: (msg: string) => void;
}

export function InventoryGrid({
  items,
  role,
  onAdjustStock,
  onUpdateDetails,
  onUpdateVariantStock,
  onItemCreated,
  onNotification,
}: InventoryGridProps) {
  const [viewType, setViewType] = useState<"paquetes" | "individuales">(
    "paquetes",
  );
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [isEditMode, setIsEditMode] = useState(false);

  // Modales
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showCreateLooseModal, setShowCreateLooseModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(
    null,
  );
  const [showTableclothCatalog, setShowTableclothCatalog] = useState(false);

  useEffect(() => {
    setCategories(getCategories());
  }, []);

  const isAdmin = role === "admin";

  const notify = (msg: string) => {
    if (onNotification) onNotification(msg);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isPkg = item.item_type === "paquete";
      if (viewType === "paquetes" && !isPkg) return false;
      if (viewType === "individuales" && isPkg) return false;

      const matchCategory =
        viewType === "paquetes" ||
        selectedCategory === "todas" ||
        item.category === selectedCategory;

      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [items, viewType, selectedCategory, search]);

  return (
    <div className="space-y-3 pb-6">
      {/* Selector de Vista: Paquetes vs Artículos Sueltos */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewType("paquetes")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
              viewType === "paquetes"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Paquetes</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType("individuales")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
              viewType === "individuales"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Artículos Sueltos</span>
          </button>
        </div>

        {/* Acciones de Administrador */}
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            {viewType === "paquetes" ? (
              <button
                type="button"
                onClick={() => setShowCreatePackageModal(true)}
                title="Crear Nuevo Paquete"
                className="flex h-11 items-center gap-1 rounded-2xl bg-blue-600 px-3 font-bold text-xs text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95"
              >
                <PackagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateLooseModal(true)}
                title="Crear Nuevo Artículo Suelto"
                className="flex h-11 items-center gap-1 rounded-2xl bg-blue-600 px-3 font-bold text-xs text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Artículo</span>
              </button>
            )}

            <a
              href="/Inventario_Fer_Eventos.xlsx"
              download="Inventario_Fer_Eventos.xlsx"
              title="Descargar Excel para Mamá"
              className="flex h-11 items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 font-bold text-xs text-emerald-700 shadow-xs transition-all hover:bg-emerald-100 active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </a>

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
          </div>
        )}
      </div>

      {/* Botón Acceso Rápido al Muestrario de Manteles para Clientes */}
      <button
        type="button"
        onClick={() => setShowTableclothCatalog(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-purple-200 bg-purple-50/80 p-2.5 text-xs font-bold text-purple-900 shadow-2xs hover:bg-purple-100 transition-all active:scale-98 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
            <Palette className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-black text-purple-950 leading-tight">
              🎨 Muestrario de Manteles (Para Clientes)
            </span>
            <span className="block text-[10px] font-medium text-purple-700/90">
              Fotos por color y tela listas para enviar por WhatsApp
            </span>
          </div>
        </div>
        <span className="rounded-lg bg-purple-200/80 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
          Abrir ↗
        </span>
      </button>

      {/* Banner discreto cuando el modo edición está activo */}
      {isEditMode && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-medium flex items-center justify-between animate-in fade-in">
          <span>
            ✏️ <strong>Modo Edición:</strong> Edita rápido o toca &quot;Editar
            Ficha Completa&quot; para cambiar todo.
          </span>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="font-bold text-amber-900 underline ml-2 shrink-0"
          >
            Listo
          </button>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            viewType === "paquetes"
              ? "Buscar paquetes (ej. Mesa Redonda, Tiffany)..."
              : "Buscar sillas, mesas, manteles, sobremanteles..."
          }
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Filtro de Categorías Dinámico */}
      {viewType === "individuales" && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          isAdmin={isAdmin}
          onOpenManager={() => setShowCategoryManager(true)}
        />
      )}

      {/* Grid de Tarjetas */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <p className="font-medium text-slate-500 text-xs">
            No se encontraron artículos en esta sección
          </p>
        </div>
      ) : (
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
              onOpenFullEdit={(it) => setEditingProduct(it)}
            />
          ))}
        </div>
      )}

      {/* Modal Creador de Paquetes */}
      {showCreatePackageModal && (
        <CreatePackageModal
          availableItems={items}
          onPackageCreated={(newPkg) => {
            if (onItemCreated) onItemCreated(newPkg);
          }}
          onClose={() => setShowCreatePackageModal(false)}
          onNotification={notify}
        />
      )}

      {/* Modal Creador de Artículos Sueltos */}
      {showCreateLooseModal && (
        <CreateLooseItemModal
          categories={categories}
          onItemCreated={(newItem) => {
            if (onItemCreated) onItemCreated(newItem);
          }}
          onClose={() => setShowCreateLooseModal(false)}
          onNotification={notify}
        />
      )}

      {/* Modal Gestor de Categorías */}
      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onCategoriesUpdated={(updated) => {
            setCategories(updated);
          }}
          onClose={() => setShowCategoryManager(false)}
          onNotification={notify}
        />
      )}

      {/* Modal Edición Completa de Producto / Paquete */}
      {editingProduct && (
        <EditProductModal
          item={editingProduct}
          allItems={items}
          categories={categories}
          onSave={onUpdateDetails}
          onClose={() => setEditingProduct(null)}
          onNotification={notify}
        />
      )}
      {/* Modal Muestrario de Manteles para Clientes */}
      {showTableclothCatalog && (
        <TableclothCatalogModal
          items={items}
          onClose={() => setShowTableclothCatalog(false)}
          onNotification={notify}
        />
      )}
    </div>
  );
}
