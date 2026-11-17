"use client";

import {
  Camera,
  Check,
  Edit2,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type FabricColorSwatch,
  type FabricDefinition,
  getMasterFabricCatalog,
  resetMasterFabricCatalog,
} from "@/core/domain/fabric-catalog";
import {
  deleteFabricFromDb,
  fetchFabricCatalogFromDb,
  saveFabricCatalogToDb,
} from "@/infrastructure/supabase/fabric-catalog-repository";

interface FabricMasterCatalogManagerProps {
  onClose: () => void;
  onNotification?: (msg: string) => void;
}

const COMMON_HEX_PRESETS = [
  { name: "Blanco", hex: "#f8fafc" },
  { name: "Negro", hex: "#0f172a" },
  { name: "Arena", hex: "#e2d9cc" },
  { name: "Azul Rey", hex: "#1d4ed8" },
  { name: "Azul Marino", hex: "#1e3a8a" },
  { name: "Azul Cielo", hex: "#38bdf8" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Vino", hex: "#881337" },
  { name: "Palo de Rosa", hex: "#fbcfe8" },
  { name: "Rosa Medio", hex: "#f472b6" },
  { name: "Bugambilia", hex: "#a21caf" },
  { name: "Lila Pastel", hex: "#c084fc" },
  { name: "Verde Esmeralda", hex: "#059669" },
  { name: "Verde Limón", hex: "#84cc16" },
  { name: "Amarillo Canario", hex: "#facc15" },
  { name: "Dorado / Oro", hex: "#eab308" },
  { name: "Naranja", hex: "#f97316" },
  { name: "Gris Plata", hex: "#94a3b8" },
];

export function FabricMasterCatalogManager({
  onClose,
  onNotification,
}: FabricMasterCatalogManagerProps) {
  const [catalog, setCatalog] = useState<FabricDefinition[]>(() =>
    getMasterFabricCatalog(),
  );
  const [selectedFabricSlug, setSelectedFabricSlug] =
    useState<string>("tergal");
  const [searchColor, setSearchColor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<string | null>(null);

  // Modales secundarios de edición
  const [editingFabric, setEditingFabric] = useState<{
    isNew: boolean;
    name: string;
    slug: string;
    description: string;
  } | null>(null);

  const [editingColor, setEditingColor] = useState<{
    isNew: boolean;
    color_name: string;
    color_hex: string;
    texture_url: string;
    drape_url?: string;
    index?: number;
  } | null>(null);

  // Estados visuales de tarjetas (alternar entre foto de Textura y Caída)
  const [cardPhotoModes, setCardPhotoModes] = useState<
    Record<string, "texture" | "drape">
  >({});

  // Cargar catálogo actualizado desde Supabase al abrir
  useEffect(() => {
    fetchFabricCatalogFromDb().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setCatalog(loaded);
        if (!loaded.some((f) => f.slug === selectedFabricSlug)) {
          setSelectedFabricSlug(loaded[0].slug);
        }
      }
    });
  }, [selectedFabricSlug]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (onNotification) onNotification(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeFabric = useMemo(() => {
    return (
      catalog.find((f) => f.slug === selectedFabricSlug) ||
      catalog[0] || {
        name: "Sin telas",
        slug: "none",
        description: "",
        colors: [],
      }
    );
  }, [catalog, selectedFabricSlug]);

  const filteredColors = useMemo(() => {
    if (!activeFabric.colors) return [];
    if (!searchColor.trim()) return activeFabric.colors;
    const q = searchColor.toLowerCase().trim();
    return activeFabric.colors.filter((c) =>
      c.color_name.toLowerCase().includes(q),
    );
  }, [activeFabric, searchColor]);

  // Comprimir foto a base64 (máx 800px, liviana y sin costo de hosting)
  const processImageFile = (file: File): Promise<string> => {
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
          if (!ctx) return resolve(reader.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Guardar todo el catálogo maestro
  const handleSaveAll = async (newCatalog: FabricDefinition[]) => {
    setIsSaving(true);
    setCatalog(newCatalog);
    const ok = await saveFabricCatalogToDb(newCatalog);
    setIsSaving(false);
    if (ok) {
      showToast("✅ Muestrario maestro guardado y sincronizado con éxito.");
    } else {
      showToast("⚠️ Guardado localmente. Sincronización en la nube pendiente.");
    }
  };

  // Crear o editar tela
  const handleSaveFabric = () => {
    if (!editingFabric || !editingFabric.name.trim()) return;
    const cleanName = editingFabric.name.trim();
    const cleanSlug =
      editingFabric.slug.trim().toLowerCase() ||
      cleanName.toLowerCase().replace(/\s+/g, "-");

    let updated: FabricDefinition[];
    if (editingFabric.isNew) {
      if (catalog.some((f) => f.slug === cleanSlug)) {
        alert("Ya existe una tela con ese identificador. Elige otro nombre.");
        return;
      }
      const newFab: FabricDefinition = {
        name: cleanName,
        slug: cleanSlug,
        description:
          editingFabric.description.trim() || "Tela para mantelería y eventos.",
        colors: [],
      };
      updated = [...catalog, newFab];
      setSelectedFabricSlug(cleanSlug);
    } else {
      updated = catalog.map((f) => {
        if (f.slug === editingFabric.slug) {
          return {
            ...f,
            name: cleanName,
            description: editingFabric.description.trim(),
          };
        }
        return f;
      });
    }

    setEditingFabric(null);
    handleSaveAll(updated);
  };

  // Eliminar tela
  const handleDeleteFabric = async (slug: string) => {
    const fab = catalog.find((f) => f.slug === slug);
    if (!fab) return;
    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar la tela "${fab.name}" y sus ${fab.colors.length} colores del muestrario maestro?`,
    );
    if (!confirmDelete) return;

    const updated = catalog.filter((f) => f.slug !== slug);
    await deleteFabricFromDb(slug);
    setCatalog(updated);
    if (updated.length > 0) {
      setSelectedFabricSlug(updated[0].slug);
    }
    showToast(`🗑️ Tela "${fab.name}" eliminada.`);
  };

  // Crear o guardar color dentro de la tela activa
  const handleSaveColor = () => {
    if (!editingColor || !editingColor.color_name.trim()) return;

    const swatch: FabricColorSwatch = {
      color_name: editingColor.color_name.trim(),
      color_hex: editingColor.color_hex || "#1d4ed8",
      texture_url:
        editingColor.texture_url ||
        editingColor.drape_url ||
        "/telas/tergal blanco.jpg",
      drape_url: editingColor.drape_url || undefined,
    };

    const updated = catalog.map((fab) => {
      if (fab.slug !== activeFabric.slug) return fab;

      let newColors = [...fab.colors];
      if (editingColor.isNew) {
        newColors.push(swatch);
      } else if (editingColor.index !== undefined && editingColor.index >= 0) {
        newColors[editingColor.index] = swatch;
      } else {
        newColors = newColors.map((c) =>
          c.color_name.toLowerCase() === swatch.color_name.toLowerCase()
            ? swatch
            : c,
        );
      }
      return { ...fab, colors: newColors };
    });

    setEditingColor(null);
    handleSaveAll(updated);
    showToast(`✨ Color "${swatch.color_name}" guardado.`);
  };

  // Eliminar color de la tela activa
  const handleDeleteColor = (colorName: string) => {
    const confirmDel = window.confirm(
      `¿Deseas eliminar el color "${colorName}" de la tela ${activeFabric.name}?`,
    );
    if (!confirmDel) return;

    const updated = catalog.map((fab) => {
      if (fab.slug !== activeFabric.slug) return fab;
      return {
        ...fab,
        colors: fab.colors.filter(
          (c) => c.color_name.toLowerCase() !== colorName.toLowerCase(),
        ),
      };
    });

    handleSaveAll(updated);
    showToast(`🗑️ Color "${colorName}" eliminado.`);
  };

  // Restaurar valores de fábrica
  const handleResetDefaults = () => {
    const confirmReset = window.confirm(
      "⚠️ ¿Deseas restablecer el muestrario maestro a los valores iniciales de fábrica (48 fotos y colores)? Perderás telas o colores personalizados que hayas agregado.",
    );
    if (!confirmReset) return;

    const initial = resetMasterFabricCatalog();
    setCatalog(initial);
    setSelectedFabricSlug("tergal");
    showToast("🔄 Muestrario maestro restablecido a valores iniciales.");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
        {/* Toast Notificación */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-xl animate-in slide-in-from-top">
            <Check className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Encabezado Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 font-black text-white shadow-lg shadow-purple-900/40">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white">
                  Muestrario Maestro de Telas y Colores
                </h2>
                <span className="rounded-full bg-purple-950 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  Panel Administrador
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Edita nombres, tonos HEX y fotos reales (textura y caída) para
                el catálogo de clientes y cotizaciones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
              title="Restaurar a los 48 colores originales"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Restaurar Original</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Barra de Telas (Tabs) */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 py-2.5 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {catalog.map((fab) => {
              const isSelected = fab.slug === activeFabric.slug;
              return (
                <button
                  key={fab.slug}
                  type="button"
                  onClick={() => setSelectedFabricSlug(fab.slug)}
                  className={`flex items-center gap-2 shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{fab.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {fab.colors?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setEditingFabric({
                isNew: true,
                name: "",
                slug: "",
                description: "",
              })
            }
            className="flex items-center gap-1 shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Tela</span>
          </button>
        </div>

        {/* Barra Informativa de la Tela Activa */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white">
                Tela {activeFabric.name}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setEditingFabric({
                    isNew: false,
                    name: activeFabric.name,
                    slug: activeFabric.slug,
                    description: activeFabric.description || "",
                  })
                }
                className="text-slate-400 hover:text-purple-400 transition-colors"
                title="Editar descripción de la tela"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              {catalog.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteFabric(activeFabric.slug)}
                  className="text-slate-400 hover:text-rose-400 transition-colors"
                  title="Eliminar esta tela"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              {activeFabric.description || "Sin descripción asignada."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchColor}
                onChange={(e) => setSearchColor(e.target.value)}
                placeholder="Buscar color..."
                className="w-40 sm:w-48 rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setEditingColor({
                  isNew: true,
                  color_name: "",
                  color_hex: "#1d4ed8",
                  texture_url: "",
                  drape_url: "",
                })
              }
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-900/30 hover:bg-purple-500 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar Color</span>
            </button>
          </div>
        </div>

        {/* Grid de Colores de la Tela */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredColors.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 text-center p-6">
              <Palette className="h-10 w-10 text-slate-600 mb-2" />
              <h4 className="font-bold text-white text-sm">
                No hay colores registrados
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchColor
                  ? "No se encontraron colores con ese nombre."
                  : `Esta tela aún no tiene colores asignados. Haz clic en "Agregar Color" para comenzar.`}
              </p>
              <button
                type="button"
                onClick={() =>
                  setEditingColor({
                    isNew: true,
                    color_name: "",
                    color_hex: "#1d4ed8",
                    texture_url: "",
                    drape_url: "",
                  })
                }
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Primer Color</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredColors.map((swatch, idx) => {
                const cardKey = `${activeFabric.slug}-${swatch.color_name}`;
                const mode = cardPhotoModes[cardKey] || "texture";
                const displayPhoto =
                  mode === "drape" && swatch.drape_url
                    ? swatch.drape_url
                    : swatch.texture_url || "/telas/tergal blanco.jpg";
                const hasTwoPhotos = Boolean(
                  swatch.texture_url && swatch.drape_url,
                );

                return (
                  <div
                    key={cardKey}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-md hover:border-slate-700 transition-all group"
                  >
                    {/* Visualizador de Foto */}
                    <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={displayPhoto}
                        alt={`${activeFabric.name} ${swatch.color_name}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Badge con tono de color */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-2 rounded-full bg-slate-950/85 px-2.5 py-1 text-xs font-black text-white backdrop-blur-md border border-white/10 shadow-md">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: swatch.color_hex }}
                        />
                        <span className="truncate max-w-[110px]">
                          {swatch.color_name}
                        </span>
                      </div>

                      {/* Selector Textura / Caída si tiene ambas fotos */}
                      {hasTwoPhotos && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-black/85 p-0.5 backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setCardPhotoModes((prev) => ({
                                ...prev,
                                [cardKey]: "texture",
                              }))
                            }
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold transition-all ${
                              mode === "texture"
                                ? "bg-purple-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            🔍 Textura
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCardPhotoModes((prev) => ({
                                ...prev,
                                [cardKey]: "drape",
                              }))
                            }
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold transition-all ${
                              mode === "drape"
                                ? "bg-purple-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            ✨ Caída
                          </button>
                        </div>
                      )}

                      {/* Botón Lupa Zoom */}
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(displayPhoto)}
                        className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-xs hover:bg-slate-900 transition-all opacity-80 group-hover:opacity-100"
                        title="Ver foto ampliada"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Ficha de Detalles y Acciones */}
                    <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2.5 bg-slate-950">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-white text-sm truncate">
                            {swatch.color_name}
                          </h4>
                          <span className="font-mono text-[10px] text-slate-400">
                            {swatch.color_hex}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {hasTwoPhotos
                            ? "2 fotos: Textura y Caída registradas"
                            : "1 foto registrada"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingColor({
                              isNew: false,
                              color_name: swatch.color_name,
                              color_hex: swatch.color_hex,
                              texture_url: swatch.texture_url,
                              drape_url: swatch.drape_url,
                              index: idx,
                            })
                          }
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 py-1.5 text-xs font-bold text-slate-200 hover:bg-purple-600 hover:text-white transition-all"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteColor(swatch.color_name)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:bg-rose-950 hover:text-rose-300 transition-all"
                          title="Eliminar este color"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Modal Secundario: Edición de Tela */}
        {editingFabric && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-400" />
                  <span>
                    {editingFabric.isNew ? "Nueva Tela" : "Editar Tela"}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingFabric(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    <span>Nombre de la Tela *</span>
                    <input
                      type="text"
                      value={editingFabric.name}
                      onChange={(e) =>
                        setEditingFabric({
                          ...editingFabric,
                          name: e.target.value,
                          slug: editingFabric.isNew
                            ? e.target.value.toLowerCase().replace(/\s+/g, "-")
                            : editingFabric.slug,
                        })
                      }
                      placeholder="ej. Tergal, Shantung, Razo Kim"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-normal"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    <span>Identificador (Slug)</span>
                    <input
                      type="text"
                      disabled={!editingFabric.isNew}
                      value={editingFabric.slug}
                      onChange={(e) =>
                        setEditingFabric({
                          ...editingFabric,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "-"),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 outline-none disabled:opacity-60 font-normal"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    <span>Descripción / Características</span>
                    <textarea
                      rows={3}
                      value={editingFabric.description}
                      onChange={(e) =>
                        setEditingFabric({
                          ...editingFabric,
                          description: e.target.value,
                        })
                      }
                      placeholder="ej. Tela elegante, resistente a manchas, de caída firme."
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-normal"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingFabric(null)}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFabric}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md"
                >
                  Guardar Tela
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Secundario: Edición / Creación de Color */}
        {editingColor && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
          >
            <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 my-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full border border-white/30"
                    style={{ backgroundColor: editingColor.color_hex }}
                  />
                  <h4 className="font-extrabold text-sm sm:text-base text-white">
                    {editingColor.isNew
                      ? `Nuevo Color para Tela ${activeFabric.name}`
                      : `Editar Color "${editingColor.color_name}" (${activeFabric.name})`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingColor(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre y Tono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      <span>Nombre del Color *</span>
                      <input
                        type="text"
                        value={editingColor.color_name}
                        onChange={(e) =>
                          setEditingColor({
                            ...editingColor,
                            color_name: e.target.value,
                          })
                        }
                        placeholder="ej. Azul Rey, Verde Menta, Rosa Palo"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-normal"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      <span>Código HEX del Color</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={editingColor.color_hex}
                          onChange={(e) =>
                            setEditingColor({
                              ...editingColor,
                              color_hex: e.target.value,
                            })
                          }
                          className="h-8 w-10 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-0.5"
                        />
                        <input
                          type="text"
                          value={editingColor.color_hex}
                          onChange={(e) =>
                            setEditingColor({
                              ...editingColor,
                              color_hex: e.target.value,
                            })
                          }
                          placeholder="#1d4ed8"
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-purple-500 font-normal"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Presets Rápidos de Tonos */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                    Tonos frecuentes para eventos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_HEX_PRESETS.map((p) => (
                      <button
                        key={p.hex + p.name}
                        type="button"
                        onClick={() =>
                          setEditingColor({
                            ...editingColor,
                            color_hex: p.hex,
                            color_name: editingColor.color_name || p.name,
                          })
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-600"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subida y Selección de Fotos (Foto 1 y Foto 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  {/* Foto 1: Textura */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-purple-300 flex items-center gap-1">
                        <span>🔍 Foto 1: Textura</span>
                      </span>
                      {editingColor.texture_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewZoom(editingColor.texture_url)
                          }
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          Ver grande
                        </button>
                      )}
                    </div>

                    <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                      {editingColor.texture_url ? (
                        <img
                          src={editingColor.texture_url}
                          alt="Foto textura"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-500">
                          <Camera className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] block">
                            Sin foto de textura
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-purple-600/80 py-1.5 text-xs font-bold text-white hover:bg-purple-600 cursor-pointer transition-all">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Subir desde dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const b64 = await processImageFile(file);
                              setEditingColor({
                                ...editingColor,
                                texture_url: b64,
                              });
                            }
                          }}
                        />
                      </label>

                      <input
                        type="text"
                        value={editingColor.texture_url}
                        onChange={(e) =>
                          setEditingColor({
                            ...editingColor,
                            texture_url: e.target.value,
                          })
                        }
                        placeholder="o pega ruta / URL..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Foto 2: Caída en Mesa */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-purple-300 flex items-center gap-1">
                        <span>✨ Foto 2: Caída en Mesa</span>
                      </span>
                      {editingColor.drape_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewZoom(editingColor.drape_url || null)
                          }
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          Ver grande
                        </button>
                      )}
                    </div>

                    <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                      {editingColor.drape_url ? (
                        <img
                          src={editingColor.drape_url}
                          alt="Foto caída"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-500">
                          <Camera className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] block">
                            Opcional: Caída de la tela
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-purple-600/80 py-1.5 text-xs font-bold text-white hover:bg-purple-600 cursor-pointer transition-all">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Subir desde dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const b64 = await processImageFile(file);
                              setEditingColor({
                                ...editingColor,
                                drape_url: b64,
                              });
                            }
                          }}
                        />
                      </label>

                      <input
                        type="text"
                        value={editingColor.drape_url || ""}
                        onChange={(e) =>
                          setEditingColor({
                            ...editingColor,
                            drape_url: e.target.value,
                          })
                        }
                        placeholder="o pega ruta / URL..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingColor(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveColor}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-900/40"
                >
                  Guardar Color
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visor Lightbox */}
        {previewZoom && (
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="fixed inset-0 z-70 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md cursor-zoom-out"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewZoom(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPreviewZoom(null);
            }}
          >
            <div className="relative max-h-[90vh] max-w-2xl">
              <img
                src={previewZoom}
                alt="Foto ampliada"
                className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
              />
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(null)}
                  className="rounded-xl bg-white/20 px-4 py-1 text-xs font-bold text-white hover:bg-white/30"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
