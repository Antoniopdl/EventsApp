"use client";

import { Camera, Check, Users } from "lucide-react";
import { useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { formatCurrency } from "@/lib/utils";
import { EditPhotoModal } from "./EditPhotoModal";

interface InventoryCardProps {
  item: InventoryItem;
  role: UserRole;
  isEditMode: boolean;
  onAdjustStock: (id: string, delta: number) => void;
  onUpdateDetails: (
    id: string,
    updates: Partial<InventoryItem>,
  ) => Promise<void>;
  onUpdateVariantStock: (variantId: string, newStock: number) => Promise<void>;
}

export function InventoryCard({
  item,
  role,
  isEditMode,
  onAdjustStock,
  onUpdateDetails,
  onUpdateVariantStock,
}: InventoryCardProps) {
  const isAdmin = role === "admin";
  const [nameInput, setNameInput] = useState(item.name);
  const [priceInput, setPriceInput] = useState(String(item.rental_price));
  const [stockInput, setStockInput] = useState(String(item.total_stock));
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const flashSaved = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  const handleNameBlur = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== item.name) {
      await onUpdateDetails(item.id, { name: trimmed });
      flashSaved();
    }
  };

  const handlePriceBlur = async () => {
    const num = Number.parseFloat(priceInput);
    if (!Number.isNaN(num) && num >= 0 && num !== item.rental_price) {
      await onUpdateDetails(item.id, { rental_price: num });
      flashSaved();
    }
  };

  const handleStockBlur = async () => {
    const num = Number.parseInt(stockInput, 10);
    if (!Number.isNaN(num) && num >= 0 && num !== item.total_stock) {
      await onUpdateDetails(item.id, { total_stock: num });
      flashSaved();
    }
  };

  const handleSavePhoto = async (newImageUrl: string) => {
    await onUpdateDetails(item.id, { image_url: newImageUrl });
    flashSaved();
  };

  const isPackage = item.item_type === "paquete";
  const hasVariants = item.variants && item.variants.length > 0;

  return (
    <>
      <div
        className={`flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
          isEditMode
            ? "border-amber-300 ring-2 ring-amber-200/50 bg-amber-50/20"
            : "border-slate-200 bg-white shadow-xs hover:shadow-md"
        }`}
      >
        {/* Imagen & Badges */}
        <div className="relative h-28 bg-slate-100 group">
          {item.image_url ? (
            /* biome-ignore lint/performance/noImgElement: Soporte de imagen remota */
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 text-2xl">
              📦
            </div>
          )}

          {/* Botón de Cambiar Foto en Modo Edición */}
          {isEditMode && isAdmin && (
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/85 py-1 px-2 text-[10px] font-bold text-white shadow-md backdrop-blur-xs hover:bg-slate-900 transition-all active:scale-95"
            >
              <Camera className="h-3 w-3 text-amber-400" />
              <span>Cambiar Foto</span>
            </button>
          )}

          {/* Badge de Precio / Input en Modo Edición */}
          <div className="absolute top-2 left-2">
            {isEditMode ? (
              <div className="flex items-center gap-0.5 rounded-lg bg-white px-2 py-1 shadow-md border border-amber-300">
                <span className="text-[10px] font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={handlePriceBlur}
                  className="w-12 text-xs font-bold text-slate-900 outline-none text-right"
                />
              </div>
            ) : (
              <span className="rounded-md bg-white/95 px-2 py-0.5 font-bold text-[11px] text-slate-900 backdrop-blur-xs shadow-xs">
                {formatCurrency(item.rental_price)}
              </span>
            )}
          </div>

          {/* Capacidad o Badge de Paquete */}
          {isPackage && item.capacity_people ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-blue-600 px-1.5 py-0.5 font-bold text-[10px] text-white shadow-xs">
              <Users className="h-3 w-3" />
              <span>{item.capacity_people} pers.</span>
            </span>
          ) : (
            <span
              className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 font-bold text-[10px] text-white shadow-xs ${
                item.total_stock < 20 ? "bg-amber-500" : "bg-emerald-600"
              }`}
            >
              {item.total_stock} disp.
            </span>
          )}

          {savedSuccess && (
            <span className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs animate-in fade-in">
              <Check className="h-3 w-3" /> Guardado
            </span>
          )}
        </div>

        {/* Contenido & Variantes */}
        <div className="flex flex-1 flex-col justify-between p-2.5 space-y-2">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              {isPackage && (
                <span className="rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1 py-0.2">
                  COMBO
                </span>
              )}
              {item.fabric && (
                <span className="rounded-md bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 capitalize">
                  Tela {item.fabric}
                </span>
              )}
            </div>

            {/* Nombre editable o estático */}
            {isEditMode ? (
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-amber-800 uppercase block">
                  Nombre de artículo:
                </span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ) : (
              <h3 className="line-clamp-2 font-bold text-slate-900 text-xs leading-tight">
                {item.name}
              </h3>
            )}

            {isPackage && item.description && !isEditMode && (
              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                {item.description}
              </p>
            )}
          </div>

          {/* Variantes de Color para Mantelería */}
          {hasVariants && (
            <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Colores Disponibles:
              </span>
              <div className="flex flex-wrap gap-1">
                {item.variants?.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: v.color_hex || "#2563eb" }}
                    />
                    <span className="font-medium text-slate-700">
                      {v.color_name}
                    </span>
                    {isEditMode ? (
                      <input
                        type="number"
                        defaultValue={v.total_stock}
                        onBlur={(e) =>
                          onUpdateVariantStock(v.id, Number(e.target.value))
                        }
                        className="w-8 border-b border-amber-400 text-center font-bold text-[10px] outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">
                        ({v.total_stock})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controles de Stock / Modo Edición */}
          {isAdmin && (
            <div>
              {isEditMode ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-white p-1">
                  <span className="text-[10px] font-bold text-slate-500 pl-1">
                    Stock Total:
                  </span>
                  <input
                    type="number"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    onBlur={handleStockBlur}
                    className="w-16 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-right font-bold text-xs outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item.id, -5)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-700 text-xs shadow-2xs hover:bg-slate-100 active:scale-95"
                  >
                    -5
                  </button>
                  <span className="font-black text-slate-800 text-xs">
                    {item.total_stock}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item.id, 5)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs shadow-2xs hover:bg-blue-700 active:scale-95"
                  >
                    +5
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPhotoModal && (
        <EditPhotoModal
          itemName={item.name}
          currentImageUrl={item.image_url}
          onSavePhoto={handleSavePhoto}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </>
  );
}
