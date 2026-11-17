"use client";

import { Boxes, Edit2, Package, Plus, Search, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, InventoryItem } from "@/core/domain/inventory";
import { formatCurrency } from "@/lib/utils";

interface DesktopInventoryManagerProps {
  items: InventoryItem[];
  categories: Category[];
  onOpenCreateLoose: () => void;
  onOpenCreatePackage: () => void;
  onOpenCategoryManager: () => void;
  onOpenFullEdit: (item: InventoryItem) => void;
  onUpdateDetails: (
    id: string,
    updates: Partial<InventoryItem>,
  ) => Promise<void>;
  onDeleteItem: (id: string, name: string) => Promise<void>;
  onNotification: (msg: string) => void;
}

export function DesktopInventoryManager({
  items,
  categories,
  onOpenCreateLoose,
  onOpenCreatePackage,
  onOpenCategoryManager,
  onOpenFullEdit,
  onUpdateDetails,
  onDeleteItem,
  onNotification,
}: DesktopInventoryManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "individual" | "paquete"
  >("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edición rápida en celda
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "rental_price" | "total_stock" | "replacement_price" | "name";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "all") {
        const isPkg = item.item_type === "paquete";
        if (typeFilter === "paquete" && !isPkg) return false;
        if (typeFilter === "individual" && isPkg) return false;
      }

      if (selectedCategory !== "all") {
        if (item.category !== selectedCategory) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchFabric = item.fabric?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchFabric) return false;
      }

      return true;
    });
  }, [items, typeFilter, selectedCategory, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const packages = items.filter((i) => i.item_type === "paquete").length;
    const loose = total - packages;
    const totalPieces = items.reduce((sum, i) => sum + i.total_stock, 0);
    return { total, packages, loose, totalPieces };
  }, [items]);

  const handleStartCellEdit = (
    item: InventoryItem,
    field: "rental_price" | "total_stock" | "replacement_price" | "name",
  ) => {
    setEditingCell({ id: item.id, field });
    setEditValue(String(item[field] ?? ""));
  };

  const handleSaveCellEdit = async (item: InventoryItem) => {
    if (!editingCell) return;
    const field = editingCell.field;
    let val: string | number = editValue.trim();

    if (field === "rental_price" || field === "replacement_price") {
      const num = Number.parseFloat(val);
      if (Number.isNaN(num) || num < 0) return;
      val = num;
    } else if (field === "total_stock") {
      const num = Number.parseInt(val, 10);
      if (Number.isNaN(num) || num < 0) return;
      val = num;
    }

    if (val !== item[field]) {
      await onUpdateDetails(item.id, { [field]: val });
      onNotification(`"${item.name}" actualizado.`);
    }
    setEditingCell(null);
  };

  return (
    <div className="space-y-5">
      {/* Barra Superior con Métricas y Botones de Acción */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black text-sm">
              {stats.total}
            </span>
            <div>
              <p className="font-bold text-slate-900">Total Catálogo</p>
              <p className="text-[11px] text-slate-500">
                {stats.totalPieces} pzas. en stock
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-slate-500 text-[11px]">Artículos Sueltos</p>
            <p className="font-extrabold text-slate-900 text-sm">
              {stats.loose}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-slate-500 text-[11px]">Paquetes / Combos</p>
            <p className="font-extrabold text-blue-700 text-sm">
              {stats.packages}
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCategoryManager}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <Tag className="h-4 w-4 text-slate-500" />
            <span>Gestionar Categorías</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreatePackage}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
          >
            <Package className="h-4 w-4" />
            <span>+ Crear Paquete</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateLoose}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nuevo Artículo</span>
          </button>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-1 items-center gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU, tela o color..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Selector de Tipo y Categoría */}
        <div className="flex items-center gap-2">
          {/* Tipo */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                typeFilter === "all"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("individual")}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                typeFilter === "individual"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Sueltos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("paquete")}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                typeFilter === "paquete"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Paquetes
            </button>
          </div>

          {/* Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Inventario de Alta Densidad */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 pl-4 pr-2">Producto</th>
                <th className="px-3 py-3">Tipo / Cat.</th>
                <th className="px-3 py-3">Detalles / Tela</th>
                <th className="px-3 py-3 text-right">Renta (c/u)</th>
                <th className="px-3 py-3 text-right">Reposición</th>
                <th className="px-3 py-3 text-center">Stock</th>
                <th className="py-3 pr-4 pl-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron productos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isPkg = item.item_type === "paquete";
                  const isEditingPrice =
                    editingCell?.id === item.id &&
                    editingCell.field === "rental_price";
                  const isEditingStock =
                    editingCell?.id === item.id &&
                    editingCell.field === "total_stock";
                  const isEditingRep =
                    editingCell?.id === item.id &&
                    editingCell.field === "replacement_price";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Foto, SKU y Nombre */}
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {item.image_url ? (
                              /* biome-ignore lint/performance/noImgElement: imagen responsiva */
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400 text-lg">
                                📦
                              </div>
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              className="font-extrabold text-slate-900 text-xs hover:text-blue-600 cursor-pointer text-left block"
                              onClick={() => onOpenFullEdit(item)}
                            >
                              {item.name}
                            </button>
                            <span className="font-mono text-[10px] text-slate-400">
                              SKU: {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo / Categoría */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 w-max rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              isPkg
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isPkg ? (
                              <Package className="h-3 w-3" />
                            ) : (
                              <Boxes className="h-3 w-3" />
                            )}
                            <span>{isPkg ? "Paquete" : "Suelto"}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 capitalize">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>
                      </td>

                      {/* Detalles / Variaciones */}
                      <td className="px-3 py-2.5">
                        {isPkg ? (
                          <div className="space-y-1 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {item.package_components &&
                              item.package_components.length > 0 ? (
                                item.package_components.map((comp) => {
                                  const compItem =
                                    items.find(
                                      (i) => i.id === comp.component_item_id,
                                    ) || comp.component_item;
                                  const isCustomMantel =
                                    comp.is_customizable ||
                                    comp.customization_type === "mantel_base" ||
                                    comp.customization_type === "sobremantel";
                                  const label =
                                    comp.customization_type === "mantel_base"
                                      ? "Mantel Base"
                                      : comp.customization_type ===
                                          "sobremantel"
                                        ? "Sobremantel"
                                        : compItem?.name || "Pieza";

                                  return (
                                    <span
                                      key={comp.id || comp.component_item_id}
                                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                        isCustomMantel
                                          ? "bg-purple-100 text-purple-900 border border-purple-200"
                                          : "bg-blue-50 text-blue-900 border border-blue-200"
                                      }`}
                                    >
                                      {comp.quantity}x {label}
                                    </span>
                                  );
                                })
                              ) : item.description ? (
                                <span className="text-[11px] text-slate-700 font-semibold">
                                  {item.description}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Sin componentes definidos
                                </span>
                              )}
                            </div>
                            {item.capacity_people ? (
                              <span className="inline-block text-[10px] font-extrabold text-blue-700">
                                👥 {item.capacity_people} personas
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {item.fabric && (
                              <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                Tela: {item.fabric}
                              </span>
                            )}
                            {item.variants && item.variants.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">
                                  {item.variants.length} colores:
                                </span>
                                <div className="flex gap-0.5">
                                  {item.variants.slice(0, 4).map((v) => (
                                    <span
                                      key={v.id}
                                      title={`${v.color_name} (${v.total_stock})`}
                                      className="h-3 w-3 rounded-full border border-slate-300 shadow-2xs"
                                      style={{
                                        backgroundColor:
                                          v.color_hex || "#94a3b8",
                                      }}
                                    />
                                  ))}
                                  {item.variants.length > 4 && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                      +{item.variants.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Precio de Renta (Editable en celda) */}
                      <td className="px-3 py-2.5 text-right">
                        {isEditingPrice ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveCellEdit(item)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCellEdit(item);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-16 rounded-lg border border-blue-500 bg-white px-1.5 py-0.5 text-right font-extrabold text-blue-700 text-xs outline-none shadow-2xs"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCellEdit(item, "rental_price")
                            }
                            title="Haz clic para editar precio"
                            className="font-extrabold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer"
                          >
                            {formatCurrency(item.rental_price)}
                          </button>
                        )}
                      </td>

                      {/* Reposición (Editable en celda) */}
                      <td className="px-3 py-2.5 text-right">
                        {isEditingRep ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveCellEdit(item)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCellEdit(item);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-16 rounded-lg border border-blue-500 bg-white px-1.5 py-0.5 text-right font-bold text-slate-700 text-xs outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCellEdit(item, "replacement_price")
                            }
                            title="Haz clic para editar reposición"
                            className="text-slate-500 text-[11px] hover:text-slate-800 hover:underline cursor-pointer"
                          >
                            {formatCurrency(item.replacement_price)}
                          </button>
                        )}
                      </td>

                      {/* Stock (Editable en celda) */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditingStock ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveCellEdit(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCellEdit(item);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-14 rounded-lg border border-blue-500 bg-white px-1 py-0.5 text-center font-black text-slate-900 text-xs outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCellEdit(item, "total_stock")
                            }
                            title="Haz clic para editar stock"
                            className={`rounded-lg px-2 py-0.5 font-black text-xs transition-all ${
                              item.total_stock <= 0
                                ? "bg-rose-100 text-rose-800"
                                : item.total_stock < 10
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                            }`}
                          >
                            {item.total_stock}
                          </button>
                        )}
                      </td>

                      {/* Acciones Rápidas */}
                      <td className="py-2.5 pr-4 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenFullEdit(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            title="Editar ficha completa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  ¿Eliminar del inventario?
                </h4>
                <p className="text-xs text-slate-500">
                  Esta acción quitará el producto del catálogo y de la base de
                  datos.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = items.find((i) => i.id === deletingId);
                  if (target) {
                    await onDeleteItem(target.id, target.name);
                  }
                  setDeletingId(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
