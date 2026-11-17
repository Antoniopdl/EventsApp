"use client";

import {
  Camera,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  Plus,
  Sparkles,
  Square,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FABRIC_CATALOG,
  getPresetPhotosForFabricAndColor,
  getRegisteredColorsForFabric,
} from "@/core/domain/fabric-catalog";
import type { InventoryVariant } from "@/core/domain/inventory";
import { FabricMasterCatalogManager } from "./FabricMasterCatalogManager";

interface FabricColorSelectorProps {
  fabric: string;
  selectedVariants: InventoryVariant[];
  onChangeVariants: (variants: InventoryVariant[]) => void;
  onOpenPhotosModal?: (variant: InventoryVariant) => void;
}

export function FabricColorSelector({
  fabric,
  selectedVariants,
  onChangeVariants,
  onOpenPhotosModal,
}: FabricColorSelectorProps) {
  const [showAllColors, setShowAllColors] = useState(true);
  const [showMasterManager, setShowMasterManager] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [previewZoom, setPreviewZoom] = useState<{
    url: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const handler = () => setCatalogVersion((v) => v + 1);
    window.addEventListener("fer_eventos_fabric_catalog_updated", handler);
    return () =>
      window.removeEventListener("fer_eventos_fabric_catalog_updated", handler);
  }, []);

  // Colores predefinidos de esta tela en el muestrario
  const presetColors = useMemo(() => {
    return getRegisteredColorsForFabric(fabric);
  }, [fabric, catalogVersion]);

  // Mapa de variantes activas por nombre de color (case-insensitive)
  const activeMap = useMemo(() => {
    const map = new Map<string, InventoryVariant>();
    for (const v of selectedVariants) {
      map.set(v.color_name.toLowerCase().trim(), v);
    }
    return map;
  }, [selectedVariants]);

  // Alternar selección de un color del catálogo
  const handleTogglePresetColor = (
    colorName: string,
    colorHex: string,
    textureUrl: string,
    drapeUrl?: string,
  ) => {
    const key = colorName.toLowerCase().trim();
    if (activeMap.has(key)) {
      // Quitarlo
      onChangeVariants(
        selectedVariants.filter(
          (v) => v.color_name.toLowerCase().trim() !== key,
        ),
      );
    } else {
      // Agregarlo con sus 2 fotos (textura y caída)
      const images: string[] = [textureUrl];
      if (drapeUrl) images.push(drapeUrl);

      const newVariant: InventoryVariant = {
        id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_id: "",
        color_name: colorName,
        color_hex: colorHex,
        fabric: fabric,
        total_stock: 15,
        image_url: textureUrl,
        images: images,
      };
      onChangeVariants([...selectedVariants, newVariant]);
    }
  };

  // Modificar stock de un color activo
  const handleStockChange = (colorName: string, newStock: number) => {
    const key = colorName.toLowerCase().trim();
    onChangeVariants(
      selectedVariants.map((v) => {
        if (v.color_name.toLowerCase().trim() === key) {
          return { ...v, total_stock: Math.max(0, newStock) };
        }
        return v;
      }),
    );
  };

  // Seleccionar todos los colores de esta tela con stock predeterminado
  const handleSelectAllPresets = () => {
    const updated = [...selectedVariants];
    for (const p of presetColors) {
      const key = p.color_name.toLowerCase().trim();
      if (!activeMap.has(key)) {
        const images: string[] = [p.texture_url];
        if (p.drape_url) images.push(p.drape_url);

        updated.push({
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          item_id: "",
          color_name: p.color_name,
          color_hex: p.color_hex,
          fabric: fabric,
          total_stock: 12,
          image_url: p.texture_url,
          images: images,
        });
      }
    }
    onChangeVariants(updated);
  };

  // Desmarcar todos los colores de esta tela
  const handleDeselectAllPresets = () => {
    const presetNames = new Set(
      presetColors.map((p) => p.color_name.toLowerCase().trim()),
    );
    onChangeVariants(
      selectedVariants.filter(
        (v) => !presetNames.has(v.color_name.toLowerCase().trim()),
      ),
    );
  };

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3">
      {/* Encabezado del Muestrario de esta Tela */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-purple-950">
              Colores Disponibles en Tela {fabric}
            </h4>
            <p className="text-[10px] font-medium text-purple-700/80">
              {presetColors.length > 0
                ? `${presetColors.length} colores con fotos reales de textura y caída registradas.`
                : "Sin muestrario precargado para esta tela. Puedes agregar colores manuales."}
            </p>
          </div>
        </div>

        {presetColors.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowMasterManager(true)}
              className="flex items-center gap-1 rounded-lg border border-purple-300 bg-white px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-100 transition-colors shadow-2xs"
              title="Abrir editor del muestrario maestro de telas"
            >
              <FolderOpen className="h-3 w-3 text-purple-600" />
              <span>Editar Muestrario</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAllPresets}
              className="rounded-lg bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-800 hover:bg-purple-200 transition-colors"
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={handleDeselectAllPresets}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Desmarcar
            </button>
          </div>
        )}
      </div>

      {/* Grid de Colores del Muestrario de la Tela */}
      {presetColors.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presetColors.map((swatch) => {
              const key = swatch.color_name.toLowerCase().trim();
              const activeVariant = activeMap.get(key);
              const isChecked = Boolean(activeVariant);

              return (
                <div
                  key={swatch.color_name}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-2 text-xs transition-all ${
                    isChecked
                      ? "border-purple-300 bg-white shadow-xs ring-1 ring-purple-400/40"
                      : "border-purple-200/60 bg-white/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Checkbox y Nombre */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePresetColor(
                          swatch.color_name,
                          swatch.color_hex,
                          swatch.texture_url,
                          swatch.drape_url,
                        )
                      }
                      className="text-purple-700 hover:text-purple-900 shrink-0 cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 fill-purple-100 text-purple-700" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                    </button>

                    {/* Color Swatch Dot */}
                    <span
                      className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                      style={{ backgroundColor: swatch.color_hex }}
                    />

                    {/* Nombre de color */}
                    <span
                      className={`line-clamp-1 font-bold ${
                        isChecked ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {swatch.color_name}
                    </span>
                  </div>

                  {/* Fotos (Textura y Caída) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Miniatura 1: Textura */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewZoom({
                          url: swatch.texture_url,
                          label: `${fabric} ${swatch.color_name} • Textura`,
                        })
                      }
                      className="relative h-6 w-6 overflow-hidden rounded-md border border-slate-200 bg-slate-100 hover:scale-110 transition-transform cursor-pointer"
                      title="Ver textura de la tela"
                    >
                      {/* biome-ignore lint/performance/noImgElement: mini foto textura */}
                      <img
                        src={swatch.texture_url}
                        alt="Textura"
                        className="h-full w-full object-cover"
                      />
                    </button>

                    {/* Miniatura 2: Caída */}
                    {swatch.drape_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewZoom({
                            url: swatch.drape_url || "",
                            label: `${fabric} ${swatch.color_name} • Caída en mesa`,
                          })
                        }
                        className="relative h-6 w-6 overflow-hidden rounded-md border border-slate-200 bg-slate-100 hover:scale-110 transition-transform cursor-pointer"
                        title="Ver caída de la tela en la mesa"
                      >
                        {/* biome-ignore lint/performance/noImgElement: mini foto caída */}
                        <img
                          src={swatch.drape_url}
                          alt="Caída"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    )}

                    {/* Input de Existencias si está marcado */}
                    {isChecked && activeVariant && (
                      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-purple-200">
                        <input
                          type="number"
                          min={0}
                          value={activeVariant.total_stock}
                          onChange={(e) =>
                            handleStockChange(
                              swatch.color_name,
                              Number(e.target.value),
                            )
                          }
                          className="w-12 rounded-lg border border-purple-300 bg-white px-1.5 py-0.5 text-center font-bold text-xs text-purple-950 outline-none focus:ring-1 focus:ring-purple-500"
                          title="Existencias de este color"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">
                          pzas
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen de Colores Seleccionados para este Mantel */}
      <div className="flex items-center justify-between border-t border-purple-200/60 pt-2 text-[11px]">
        <span className="font-bold text-purple-950">
          Total colores activados:{" "}
          <span className="text-purple-700">
            {selectedVariants.length} colores
          </span>
        </span>
        <span className="font-medium text-slate-500">
          Stock total:{" "}
          <strong className="text-slate-800">
            {selectedVariants.reduce((sum, v) => sum + v.total_stock, 0)} pzas
          </strong>
        </span>
      </div>

      {/* Lightbox Mini Preview */}
      {previewZoom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 p-4 animate-in fade-in cursor-zoom-out"
          onClick={() => setPreviewZoom(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreviewZoom(null);
          }}
        >
          <div className="relative max-h-[85vh] max-w-lg">
            {/* biome-ignore lint/performance/noImgElement: lightbox preview */}
            <img
              src={previewZoom.url}
              alt={previewZoom.label}
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-xs font-bold text-white/90">
              {previewZoom.label} (Toca para cerrar)
            </p>
          </div>
        </div>
      )}

      {showMasterManager && (
        <FabricMasterCatalogManager
          onClose={() => setShowMasterManager(false)}
        />
      )}
    </div>
  );
}
