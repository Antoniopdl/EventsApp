"use client";

import {
  Camera,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

interface EditPhotoModalProps {
  itemName: string;
  currentImageUrl?: string | null;
  onSavePhoto: (newImageUrl: string) => void;
  onClose: () => void;
}

const PHOTO_PRESETS = [
  {
    label: "Silla Tiffany Blanca",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Silla Tiffany Dorada",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Silla Herrería / Plegable",
    url: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Silla Avant Garde Blanca",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Mesa Redonda Banquete",
    url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Mesa Tablón Rectangular",
    url: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Mesa Cuadrada",
    url: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Mantel Redondo Blanco",
    url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Mantel Satín / Negro",
    url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Centro de Mesa / Jarrón",
    url: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=300&q=80",
  },
  {
    label: "Carpa / Toldo de Eventos",
    url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=300&q=80",
  },
];

export function EditPhotoModal({
  itemName,
  currentImageUrl,
  onSavePhoto,
  onClose,
}: EditPhotoModalProps) {
  const [photoUrl, setPhotoUrl] = useState(currentImageUrl || "");
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">(
    "upload",
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convertir a base64 para previsualización inmediata y guardado
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!photoUrl.trim()) return;
    onSavePhoto(photoUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Cambiar Foto</h3>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {itemName}
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

        {/* Vista previa de la foto actual o elegida */}
        <div className="p-4 bg-slate-100 flex items-center justify-center">
          <div className="relative h-36 w-full max-w-[240px] rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white">
            {photoUrl ? (
              /* biome-ignore lint/performance/noImgElement: Previsualización de imagen */
              <img
                src={photoUrl}
                alt="Vista previa"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 gap-1">
                <ImageIcon className="h-8 w-8" />
                <span className="text-[10px]">Sin imagen asignada</span>
              </div>
            )}
          </div>
        </div>

        {/* Pestañas de Selección */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "upload"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Subir Archivo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "presets"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fotos de Catálogo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "url"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pegar Link
          </button>
        </div>

        {/* Contenido de pestaña */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar max-h-56">
          {activeTab === "upload" && (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors">
                <Upload className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-xs font-bold text-blue-900">
                  Seleccionar foto de tu teléfono o computadora
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  JPG, PNG o WEBP de alta calidad
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === "presets" && (
            <div className="grid grid-cols-2 gap-2">
              {PHOTO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPhotoUrl(p.url)}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition-all ${
                    photoUrl === p.url
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/30"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="h-16 w-full rounded-lg overflow-hidden bg-slate-100 mb-1">
                    {/* biome-ignore lint/performance/noImgElement: preset image */}
                    <img
                      src={p.url}
                      alt={p.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 line-clamp-1">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-2">
              <label
                htmlFor="photoUrlInput"
                className="block text-xs font-bold text-slate-700"
              >
                Pega la URL directa de la imagen:
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  id="photoUrlInput"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs text-slate-900 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <div className="border-t border-slate-100 p-3 bg-slate-50">
          <button
            type="button"
            onClick={handleSave}
            disabled={!photoUrl}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>Guardar Foto del Producto</span>
          </button>
        </div>
      </div>
    </div>
  );
}
