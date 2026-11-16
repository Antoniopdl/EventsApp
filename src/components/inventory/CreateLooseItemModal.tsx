"use client";

import { Camera, Check, Palette, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  type Category,
  type InventoryItem,
  isTableclothCategory,
} from "@/core/domain/inventory";
import {
  addCustomFabric,
  getFabrics,
} from "@/infrastructure/supabase/category-repository";
import { createLooseItemInDb } from "@/infrastructure/supabase/inventory-repository";
import { EditPhotoModal } from "./EditPhotoModal";

interface CreateLooseItemModalProps {
  categories: Category[];
  onItemCreated: (item: InventoryItem) => void;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

interface DraftVariant {
  color_name: string;
  color_hex: string;
  total_stock: number;
}

const COLOR_SWATCHES = [
  { name: "Blanco", hex: "#f8fafc" },
  { name: "Negro", hex: "#0f172a" },
  { name: "Beige", hex: "#e7d8c5" },
  { name: "Azul Rey", hex: "#1d4ed8" },
  { name: "Rosa Pastel", hex: "#f472b6" },
  { name: "Dorado", hex: "#d97706" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Verde Esmeralda", hex: "#059669" },
  { name: "Morado", hex: "#7c3aed" },
];

export function CreateLooseItemModal({
  categories,
  onItemCreated,
  onClose,
  onNotification,
}: CreateLooseItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.slug || "sillas");
  const [rentalPrice, setRentalPrice] = useState<number>(25);
  const [replacementPrice, setReplacementPrice] = useState<number>(200);
  const [totalStock, setTotalStock] = useState<number>(50);
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
  );
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  // Telas (solo cuando es Mantel Base o Sobremantel)
  const [fabrics, setFabrics] = useState<string[]>(() => getFabrics());
  const [selectedFabric, setSelectedFabric] = useState<string>("Tergal");
  const [newFabricInput, setNewFabricInput] = useState("");
  const [showAddFabric, setShowAddFabric] = useState(false);

  // Variantes de Color
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [newColorName, setNewColorName] = useState("Blanco");
  const [newColorHex, setNewColorHex] = useState("#f8fafc");
  const [newColorStock, setNewColorStock] = useState(15);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const showFabricAndColors = isTableclothCategory(category);

  const handleAddFabric = () => {
    if (!newFabricInput.trim()) return;
    const updated = addCustomFabric(newFabricInput);
    setFabrics(updated);
    setSelectedFabric(newFabricInput.trim());
    setNewFabricInput("");
    setShowAddFabric(false);
    onNotification(`Tela "${newFabricInput.trim()}" agregada a la lista.`);
  };

  const handleAddVariant = () => {
    if (!newColorName.trim()) return;
    if (
      variants.some(
        (v) => v.color_name.toLowerCase() === newColorName.trim().toLowerCase(),
      )
    ) {
      onNotification("Ese color ya está agregado en la lista.");
      return;
    }
    setVariants((prev) => [
      ...prev,
      {
        color_name: newColorName.trim(),
        color_hex: newColorHex,
        total_stock: Math.max(0, newColorStock),
      },
    ]);
  };

  const handleRemoveVariant = (colorName: string) => {
    setVariants((prev) => prev.filter((v) => v.color_name !== colorName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotification("Escribe el nombre del artículo.");
      return;
    }

    setIsSubmitting(true);
    const created = await createLooseItemInDb({
      name: name.trim(),
      category,
      rental_price: rentalPrice,
      replacement_price: replacementPrice,
      total_stock: totalStock,
      fabric: showFabricAndColors ? selectedFabric : null,
      image_url: imageUrl,
      variants:
        showFabricAndColors && variants.length > 0 ? variants : undefined,
    });
    setIsSubmitting(false);

    onItemCreated(created);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
        <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Nuevo Artículo Suelto
              </h3>
              <p className="text-[11px] text-slate-500">
                Registra sillas, mesas, manteles o decoración
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar"
          >
            {/* Foto + Nombre */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPhotoPicker(true)}
                className="relative h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group"
              >
                {/* biome-ignore lint/performance/noImgElement: preview */}
                <img
                  src={imageUrl}
                  alt="Foto"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-90 group-hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </div>
              </button>

              <div className="flex-1">
                <label
                  htmlFor="loose-name"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Nombre del Artículo
                </label>
                <input
                  id="loose-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mantel Base Satín Redondo"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label
                htmlFor="loose-cat"
                className="block text-[11px] font-bold text-slate-800 mb-1"
              >
                Categoría
              </label>
              <select
                id="loose-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Tela (SOLO cuando es Mantel Base o Sobremantel) */}
            {showFabricAndColors && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="loose-fabric"
                    className="text-xs font-bold text-purple-950"
                  >
                    Tipo de Tela (Mantelería)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddFabric((prev) => !prev)}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{showAddFabric ? "Cerrar" : "Agregar Tela"}</span>
                  </button>
                </div>

                {showAddFabric ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFabricInput}
                      onChange={(e) => setNewFabricInput(e.target.value)}
                      placeholder="Ej. Tafetán, Raso, Poliéster..."
                      className="flex-1 rounded-xl border border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddFabric}
                      className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <select
                    id="loose-fabric"
                    value={selectedFabric}
                    onChange={(e) => setSelectedFabric(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {fabrics.map((f) => (
                      <option key={f} value={f}>
                        Tela {f}
                      </option>
                    ))}
                  </select>
                )}

                {/* Variaciones de Color */}
                <div className="pt-2 border-t border-purple-200/70 space-y-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-purple-950">
                    <Palette className="h-3.5 w-3.5" />
                    Variaciones de Color (Opcional)
                  </span>

                  <div className="flex flex-wrap gap-1">
                    {COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        onClick={() => {
                          setNewColorName(sw.name);
                          setNewColorHex(sw.hex);
                        }}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                          newColorName === sw.name
                            ? "border-purple-600 bg-white ring-1 ring-purple-500"
                            : "border-slate-200 bg-white/80"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: sw.hex }}
                        />
                        {sw.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="Nombre color"
                      className="flex-1 rounded-xl border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={newColorStock}
                      onChange={(e) => setNewColorStock(Number(e.target.value))}
                      className="w-16 rounded-xl border border-purple-300 bg-white px-2 py-1.5 text-xs font-bold text-center outline-none"
                      title="Cantidad de este color"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      + Color
                    </button>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {variants.map((v) => (
                        <div
                          key={v.color_name}
                          className="flex items-center justify-between rounded-xl bg-white border border-purple-200 px-2.5 py-1 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full border border-slate-300"
                              style={{ backgroundColor: v.color_hex }}
                            />
                            <span className="font-bold text-slate-800">
                              {v.color_name}
                            </span>
                            <span className="text-slate-500">
                              ({v.total_stock} pzas)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.color_name)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Precios y Stock */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="loose-price"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Precio Renta ($)
                </label>
                <input
                  id="loose-price"
                  type="number"
                  min={0}
                  value={rentalPrice}
                  onChange={(e) => setRentalPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="loose-repl"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Reposición ($)
                </label>
                <input
                  id="loose-repl"
                  type="number"
                  min={0}
                  value={replacementPrice}
                  onChange={(e) => setReplacementPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="loose-stock"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Stock Total
                </label>
                <input
                  id="loose-stock"
                  type="number"
                  min={0}
                  disabled={showFabricAndColors && variants.length > 0}
                  value={
                    showFabricAndColors && variants.length > 0
                      ? variants.reduce((s, v) => s + v.total_stock, 0)
                      : totalStock
                  }
                  onChange={(e) => setTotalStock(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>
                {isSubmitting ? "Guardando artículo..." : "Guardar Artículo"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {showPhotoPicker && (
        <EditPhotoModal
          itemName={name || "Nuevo Artículo"}
          currentImageUrl={imageUrl}
          onSavePhoto={(newUrl) => setImageUrl(newUrl)}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </>
  );
}
