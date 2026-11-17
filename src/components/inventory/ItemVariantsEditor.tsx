"use client";

import {
  Camera,
  Check,
  DollarSign,
  HelpCircle,
  Image as ImageIcon,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { InventoryVariant } from "@/core/domain/inventory";
import { formatCurrency } from "@/lib/utils";

export interface GenericVariantDraft {
  id?: string;
  item_id?: string;
  color_name: string;
  color_hex?: string | null;
  fabric?: string | null;
  total_stock: number;
  rental_price_override?: number | null;
  images?: string[];
  image_url?: string | null;
}

interface ItemVariantsEditorProps {
  variants: GenericVariantDraft[];
  onChangeVariants: (variants: GenericVariantDraft[]) => void;
  baseRentalPrice?: number;
  itemName?: string;
  categorySlug?: string;
  onOpenPhotosModal?: (variant: GenericVariantDraft) => void;
}

const PRESET_TONES = [
  { name: "Transparente / Cristal", hex: "#e2e8f0", icon: "✨" },
  { name: "Dorado / Oro", hex: "#d97706", icon: "👑" },
  { name: "Plata / Espejo", hex: "#94a3b8", icon: "🪞" },
  { name: "Negro Mate / Ónix", hex: "#0f172a", icon: "🖤" },
  { name: "Rojo Rubí", hex: "#dc2626", icon: "🍷" },
  { name: "Azul Zafiro", hex: "#1d4ed8", icon: "💎" },
  { name: "Rattan / Natural", hex: "#a16207", icon: "🌾" },
  { name: "Ámbar / Miel", hex: "#b45309", icon: "🍯" },
  { name: "Rosa Blush", hex: "#f472b6", icon: "🌸" },
  { name: "Verde Esmeralda", hex: "#059669", icon: "🍃" },
  { name: "Blanco Perla", hex: "#f8fafc", icon: "⚪" },
  { name: "Borde Oro", hex: "#eab308", icon: "✨" },
];

export function ItemVariantsEditor({
  variants,
  onChangeVariants,
  baseRentalPrice = 0,
  itemName = "este artículo",
  categorySlug = "cristaleria",
  onOpenPhotosModal,
}: ItemVariantsEditorProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de nueva variación
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#d97706");
  const [newStock, setNewStock] = useState<number>(50);
  const [newPriceOverride, setNewPriceOverride] = useState<string>("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [activeUploadingVariantIndex, setActiveUploadingVariantIndex] = useState<
    number | null
  >(null);

  // Cálculo de estadísticas
  const totalStockCount = useMemo(() => {
    return variants.reduce((sum, v) => sum + (v.total_stock || 0), 0);
  }, [variants]);

  const priceRange = useMemo(() => {
    if (variants.length === 0) {
      return baseRentalPrice > 0 ? formatCurrency(baseRentalPrice) : "$0";
    }
    const prices = variants.map(
      (v) =>
        v.rental_price_override !== null && v.rental_price_override !== undefined
          ? v.rental_price_override
          : baseRentalPrice,
    );
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatCurrency(min);
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }, [variants, baseRentalPrice]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          return reject(new Error("Error leyendo archivo"));
        }
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const maxSide = 900;
          let { width, height } = img;
          if (width > maxSide || height > maxSide) {
            if (width > height) {
              height = Math.round((height * maxSide) / width);
              width = maxSide;
            } else {
              width = Math.round((width * maxSide) / height);
              height = maxSide;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Error en canvas"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddVariant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    if (
      variants.some(
        (v) => v.color_name.toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      alert(`Ya existe una variación llamada "${cleanName}".`);
      return;
    }

    const priceNum = newPriceOverride.trim()
      ? Number.parseFloat(newPriceOverride)
      : null;

    const newVar: GenericVariantDraft = {
      id: `var-${Date.now()}-${variants.length}`,
      color_name: cleanName,
      color_hex: newHex,
      total_stock: Math.max(0, newStock),
      rental_price_override:
        priceNum !== null && !Number.isNaN(priceNum) ? priceNum : null,
      image_url: newPhotoUrl.trim() || null,
      images: newPhotoUrl.trim() ? [newPhotoUrl.trim()] : [],
    };

    onChangeVariants([...variants, newVar]);

    // Resetear formulario
    setNewName("");
    setNewStock(50);
    setNewPriceOverride("");
    setNewPhotoUrl("");
  };

  const handleRemoveVariant = (index: number) => {
    const copy = [...variants];
    copy.splice(index, 1);
    onChangeVariants(copy);
  };

  const handleUpdateStock = (index: number, stock: number) => {
    const copy = [...variants];
    copy[index] = { ...copy[index], total_stock: Math.max(0, stock) };
    onChangeVariants(copy);
  };

  const handleUpdatePrice = (index: number, rawVal: string) => {
    const copy = [...variants];
    const num = rawVal.trim() === "" ? null : Number.parseFloat(rawVal);
    copy[index] = {
      ...copy[index],
      rental_price_override: num !== null && !Number.isNaN(num) ? num : null,
    };
    onChangeVariants(copy);
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      const compressed = await compressImage(file);

      if (activeUploadingVariantIndex !== null) {
        // Asignar al variant existente
        const copy = [...variants];
        const v = copy[activeUploadingVariantIndex];
        const existingImages = v.images || [];
        const nextImages = [compressed, ...existingImages.filter((img) => img !== compressed)];
        copy[activeUploadingVariantIndex] = {
          ...v,
          image_url: compressed,
          images: nextImages,
        };
        onChangeVariants(copy);
        setActiveUploadingVariantIndex(null);
      } else {
        // Asignar al nuevo variant en el form
        setNewPhotoUrl(compressed);
      }
    } catch (err) {
      console.error("Error procesando foto:", err);
      alert("Hubo un problema al procesar la imagen.");
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-xs">
      {/* Hidden file input */}
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* Header del Gestor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs text-xs">
              💎
            </span>
            <h4 className="font-extrabold text-blue-950 text-xs">
              Variaciones y Diseños ({variants.length})
            </h4>
          </div>
          <p className="text-[11px] text-blue-800">
            Define colores de copas, cristalería o acabados de platos base con su propio precio, stock y fotos.
          </p>
        </div>

        {/* Resumen de Inventario */}
        <div className="flex items-center gap-2 text-right">
          <div className="rounded-xl bg-white border border-blue-200 px-2.5 py-1 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Stock Total</p>
            <p className="font-black text-blue-900 text-xs">{totalStockCount} pzas.</p>
          </div>
          <div className="rounded-xl bg-white border border-blue-200 px-2.5 py-1 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Renta</p>
            <p className="font-black text-emerald-700 text-xs">{priceRange}</p>
          </div>
        </div>
      </div>

      {/* Formulario: Agregar Nueva Variación */}
      <div className="rounded-xl border border-blue-200 bg-white p-3 space-y-2.5 shadow-xs">
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
          <Plus className="h-3.5 w-3.5 text-blue-600" />
          <span>Agregar Color / Diseño / Acabado:</span>
        </span>

        {/* Paleta rápida de sugerencias de tonos */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 block mb-1">
            Tonos y acabados sugeridos para cristalería y loza:
          </span>
          <div className="flex flex-wrap gap-1">
            {PRESET_TONES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setNewName(preset.name.split(" / ")[0]);
                  setNewHex(preset.hex);
                }}
                className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer ${
                  newHex.toLowerCase() === preset.hex.toLowerCase()
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-extrabold"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs del formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1">
          {/* Nombre */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Nombre de la Variación *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Negra, Dorada, Rattan"
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color Hex & Muestra */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Tono / Color
            </label>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-2 py-1 bg-white">
              <input
                type="color"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className="h-5 w-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
              />
              <span className="font-mono text-[10px] text-slate-500 uppercase">{newHex}</span>
            </div>
          </div>

          {/* Existencias (Stock) */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Stock (Piezas) *
            </label>
            <input
              type="number"
              min={0}
              value={newStock}
              onChange={(e) => setNewStock(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Precio Override */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5" title="Dejar vacío para usar precio base">
              Precio Renta ($)
            </label>
            <input
              type="number"
              step="any"
              min={0}
              value={newPriceOverride}
              onChange={(e) => setNewPriceOverride(e.target.value)}
              placeholder={`Base: $${baseRentalPrice}`}
              className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 text-right outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botón de Agregar y Foto rápida */}
          <div className="sm:col-span-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveUploadingVariantIndex(null);
                fileInputRef.current?.click();
              }}
              title={newPhotoUrl ? "Cambiar foto" : "Subir foto de esta variación"}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                newPhotoUrl
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300"
                  : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {newPhotoUrl ? (
                /* biome-ignore lint/performance/noImgElement: preview */
                <img
                  src={newPhotoUrl}
                  alt="Preview"
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleAddVariant()}
              disabled={!newName.trim()}
              className="flex-1 flex h-8 items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Variaciones Existentes */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-700 block">
          Variaciones registradas ({variants.length}):
        </span>

        {variants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center">
            <p className="text-xs font-bold text-slate-600">
              Aún no has agregado variaciones.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agrega colores como "Transparente", "Negro", "Dorada" o diseños de platos como "Dorado Labrado", "Rattan", etc.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
            {variants.map((v, idx) => {
              const currentPrice =
                v.rental_price_override !== null &&
                v.rental_price_override !== undefined
                  ? v.rental_price_override
                  : baseRentalPrice;
              const hasCustomPrice =
                v.rental_price_override !== null &&
                v.rental_price_override !== undefined &&
                v.rental_price_override !== baseRentalPrice;
              const previewImg = v.image_url || v.images?.[0];
              const photosCount = v.images?.length || (v.image_url ? 1 : 0);

              return (
                <div
                  key={v.id || `var-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-blue-300 transition-all"
                >
                  {/* Foto + Tono + Nombre */}
                  <div className="flex items-center gap-2.5 min-w-[180px]">
                    {/* Botón Foto / Miniatura */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPhotosModal) {
                          onOpenPhotosModal(v);
                        } else {
                          setActiveUploadingVariantIndex(idx);
                          fileInputRef.current?.click();
                        }
                      }}
                      title="Editar fotos de esta variación"
                      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 group cursor-pointer"
                    >
                      {previewImg ? (
                        /* biome-ignore lint/performance/noImgElement: preview */
                        <img
                          src={previewImg}
                          alt={v.color_name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-all"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <Camera className="h-4 w-4" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                          style={{ backgroundColor: v.color_hex || "#d97706" }}
                        />
                        <span className="font-extrabold text-slate-900 text-xs">
                          {v.color_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPhotosModal) {
                              onOpenPhotosModal(v);
                            } else {
                              setActiveUploadingVariantIndex(idx);
                              fileInputRef.current?.click();
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Camera className="h-2.5 w-2.5" />
                          <span>
                            {photosCount > 0 ? `${photosCount} foto${photosCount > 1 ? "s" : ""}` : "Subir foto"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stock + Precio + Eliminar */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    {/* Stock Input */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">Stock:</span>
                      <input
                        type="number"
                        min={0}
                        value={v.total_stock}
                        onChange={(e) =>
                          handleUpdateStock(idx, Number.parseInt(e.target.value, 10) || 0)
                        }
                        className="w-14 rounded-lg border border-slate-300 bg-white py-1 text-center font-extrabold text-slate-900 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Precio Unitario de esta variante */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">Renta $:</span>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={
                          v.rental_price_override !== null &&
                          v.rental_price_override !== undefined
                            ? v.rental_price_override
                            : ""
                        }
                        onChange={(e) => handleUpdatePrice(idx, e.target.value)}
                        placeholder={`${baseRentalPrice}`}
                        className={`w-16 rounded-lg border py-1 text-right font-extrabold text-xs outline-none focus:ring-1 focus:ring-blue-500 ${
                          hasCustomPrice
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-black"
                            : "border-slate-300 bg-white text-slate-900"
                        }`}
                      />
                    </div>

                    {/* Botón Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      title="Eliminar esta variación"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
