"use client";

import {
  Camera,
  Check,
  Link as LinkIcon,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useState } from "react";

interface VariantPhotosModalProps {
  colorName: string;
  colorHex?: string | null;
  fabricName?: string | null;
  itemName: string;
  initialImages?: string[];
  initialPrimaryUrl?: string | null;
  onSave: (images: string[], primaryUrl: string) => void;
  onClose: () => void;
}

const TABLECLOTH_PRESETS = [
  {
    label: "Azul Rey (Tergal / Satín)",
    url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80",
    colorHex: "#1d4ed8",
  },
  {
    label: "Azul Rey Textura Mesa",
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    colorHex: "#1d4ed8",
  },
  {
    label: "Blanco Puro Clásico",
    url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80",
    colorHex: "#f8fafc",
  },
  {
    label: "Satín Negro Elegante",
    url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80",
    colorHex: "#0f172a",
  },
  {
    label: "Beige / Crema Banquete",
    url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80",
    colorHex: "#e7d8c5",
  },
  {
    label: "Rosa Pastel / Blush",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    colorHex: "#f472b6",
  },
  {
    label: "Dorado Champagne",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80",
    colorHex: "#d97706",
  },
  {
    label: "Vino Tinto / Borgoña",
    url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
    colorHex: "#881337",
  },
  {
    label: "Verde Esmeralda",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
    colorHex: "#059669",
  },
];

export function VariantPhotosModal({
  colorName,
  colorHex,
  fabricName,
  itemName,
  initialImages = [],
  initialPrimaryUrl,
  onSave,
  onClose,
}: VariantPhotosModalProps) {
  // Asegurar que initialPrimaryUrl esté incluido en images si no venía en la lista
  const [images, setImages] = useState<string[]>(() => {
    const list = [...initialImages];
    if (initialPrimaryUrl && !list.includes(initialPrimaryUrl)) {
      list.unshift(initialPrimaryUrl);
    }
    return list;
  });

  const [primaryUrl, setPrimaryUrl] = useState<string>(
    initialPrimaryUrl || initialImages[0] || "",
  );
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">(
    "upload",
  );
  const [urlInput, setUrlInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<string | null>(null);

  // Comprimir foto a base64 (máx 800px, peso ligero ideal para catálogo móvil)
  const processFileToCompressedBase64 = (file: File): Promise<string> => {
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
          const maxSide = 800;
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
          if (!ctx) return resolve(reader.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressed);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMultipleFilesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const newCompressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const base64 = await processFileToCompressedBase64(file);
          newCompressedList.push(base64);
        }
      }

      setImages((prev) => {
        const merged = [...prev, ...newCompressedList];
        if (!primaryUrl && merged.length > 0) {
          setPrimaryUrl(merged[0]);
        }
        return merged;
      });
    } catch (err) {
      console.error("Error al procesar fotos:", err);
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setImages((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      if (!primaryUrl) setPrimaryUrl(trimmed);
      return next;
    });
    setUrlInput("");
  };

  const handleAddPreset = (url: string) => {
    setImages((prev) => {
      if (prev.includes(url)) return prev;
      const next = [...prev, url];
      if (!primaryUrl) setPrimaryUrl(url);
      return next;
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const urlToRemove = images[indexToRemove];
    const filtered = images.filter((_, idx) => idx !== indexToRemove);
    setImages(filtered);
    if (primaryUrl === urlToRemove) {
      setPrimaryUrl(filtered[0] || "");
    }
  };

  const handleSetPrimary = (url: string) => {
    setPrimaryUrl(url);
  };

  const handleSave = () => {
    const resolvedPrimary = primaryUrl || images[0] || "";
    onSave(images, resolvedPrimary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className="h-7 w-7 rounded-full border-2 border-white shadow-xs shrink-0"
              style={{ backgroundColor: colorHex || "#2563eb" }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                  Fotos de {colorName}
                </h3>
                {fabricName && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 font-bold text-[10px] text-purple-800">
                    Tela {fabricName}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                {itemName} • {images.length}{" "}
                {images.length === 1 ? "foto agregada" : "fotos agregadas"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Galería de fotos actuales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Galería de este Color ({images.length})
              </span>
              {images.length > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Marca con ⭐ la foto de portada
                </span>
              )}
            </div>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-2">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-700 text-xs">
                  Sin fotos para el color {colorName}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  Sube las fotos reales de tu mantel (puedes subir varias tomas,
                  caída de tela o mesa montada).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {images.map((imgUrl, idx) => {
                  const isPrimary =
                    primaryUrl === imgUrl || (!primaryUrl && idx === 0);
                  return (
                    <div
                      key={imgUrl}
                      className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                        isPrimary
                          ? "border-blue-600 ring-2 ring-blue-500/30"
                          : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {/* biome-ignore lint/performance/noImgElement: previsualización de foto de mantel */}
                      <img
                        src={imgUrl}
                        alt={`${colorName} - foto ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {/* Badge Principal */}
                      {isPrimary && (
                        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-lg bg-blue-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-md">
                          <Star className="h-2.5 w-2.5 fill-current" /> Portada
                        </span>
                      )}

                      {/* Barra de acciones flotante */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-1.5 opacity-90 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(imgUrl)}
                          className="rounded-lg bg-white/20 p-1 text-white hover:bg-white/40 transition-colors"
                          title="Ver en grande"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center gap-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(imgUrl)}
                              className="rounded-lg bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-600 transition-colors"
                              title="Hacer portada principal"
                            >
                              Hacer Portada
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="rounded-lg bg-rose-600/80 p-1 text-white hover:bg-rose-600 transition-colors"
                            title="Eliminar foto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selector de métodos para agregar fotos */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Subir Fotos (Cámara / Archivos)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  activeTab === "presets"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Muestrario de Presets</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  activeTab === "url"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Enlace URL</span>
              </button>
            </div>

            {/* Tab: Subir múltiples fotos */}
            {activeTab === "upload" && (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-5 text-center cursor-pointer hover:bg-blue-50/70 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm mb-1.5">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold text-blue-900 text-xs">
                    {isProcessing
                      ? "Procesando fotos..."
                      : "Toca aquí para tomar foto o elegir de tu galería"}
                  </span>
                  <span className="text-[11px] text-blue-700/80 mt-0.5">
                    Puedes seleccionar 2 o más fotos a la vez • Se optimizan
                    automáticamente
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleFilesUpload}
                    disabled={isProcessing}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Tab: Presets de Mantelería */}
            {activeTab === "presets" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-medium">
                  Fotos listas para manteles en alta calidad:
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {TABLECLOTH_PRESETS.map((preset) => {
                    const isAlreadyAdded = images.includes(preset.url);
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handleAddPreset(preset.url)}
                        disabled={isAlreadyAdded}
                        className={`group relative flex flex-col items-center rounded-xl border p-1 text-left transition-all ${
                          isAlreadyAdded
                            ? "border-emerald-300 bg-emerald-50/50 opacity-60"
                            : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs"
                        }`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
                          {/* biome-ignore lint/performance/noImgElement: preset thumbnail */}
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-full w-full object-cover"
                          />
                          <span
                            className="absolute top-1 left-1 h-3 w-3 rounded-full border border-white shadow-xs"
                            style={{ backgroundColor: preset.colorHex }}
                          />
                        </div>
                        <span className="mt-1 line-clamp-1 w-full text-[10px] font-bold text-slate-700">
                          {preset.label}
                        </span>
                        {isAlreadyAdded && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700">
                            <Check className="h-2.5 w-2.5" /> Agregada
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Pegar URL */}
            {activeTab === "url" && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/foto-mantel-azul.jpg"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  + Agregar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Guardar Fotos ({images.length})</span>
          </button>
        </div>
      </div>

      {/* Visor Zoom de Pantalla Completa (Lightbox) */}
      {previewZoom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in cursor-zoom-out"
          onClick={() => setPreviewZoom(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreviewZoom(null);
          }}
        >
          <div className="relative max-h-[90vh] max-w-2xl">
            {/* biome-ignore lint/performance/noImgElement: Lightbox preview */}
            <img
              src={previewZoom}
              alt="Vista ampliada"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-xs font-bold text-white/80">
              {colorName} {fabricName ? `• Tela ${fabricName}` : ""} (Toca en
              cualquier lugar para cerrar)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
