"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MessageCircle,
  Palette,
  Search,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  FABRIC_CATALOG,
  findColorByFabricAndName,
  getPresetPhotosForFabricAndColor,
} from "@/core/domain/fabric-catalog";
import {
  type InventoryItem,
  getTableCompatibilityLabel,
  isTableclothCategory,
} from "@/core/domain/inventory";
import { formatCurrency } from "@/lib/utils";

interface TableclothCatalogModalProps {
  items: InventoryItem[];
  onClose: () => void;
  onNotification?: (msg: string) => void;
}

export interface CatalogVariantEntry {
  uniqueKey: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemType: string;
  rentalPrice: number;
  fabric: string;
  variantId: string;
  colorName: string;
  colorHex: string;
  totalStock: number;
  tableCompatibilityLabel?: string;
  images: string[];
  primaryImage: string;
}

export function TableclothCatalogModal({
  items,
  onClose,
  onNotification,
}: TableclothCatalogModalProps) {
  const [selectedFabric, setSelectedFabric] = useState<string>("todas");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [activePhotoIndices, setActivePhotoIndices] = useState<
    Record<string, number>
  >({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Extraer todas las variaciones de mantelería disponibles
  const catalogEntries: CatalogVariantEntry[] = useMemo(() => {
    const entries: CatalogVariantEntry[] = [];

    const tableclothItems = items.filter((item) =>
      isTableclothCategory(item.category || ""),
    );

    for (const item of tableclothItems) {
      const baseFabric = item.fabric || "Tergal";
      const itemDefaultImg = item.image_url || "";

      if (item.variants && item.variants.length > 0) {
        for (const v of item.variants) {
          const vFabric = v.fabric || baseFabric || "Tergal";
          const preset = getPresetPhotosForFabricAndColor(
            vFabric,
            v.color_name,
          );
          const masterCol = findColorByFabricAndName(vFabric, v.color_name);

          let vImages: string[] = [];
          if (
            v.images &&
            v.images.length > 0 &&
            !v.images[0].includes("unsplash.com")
          ) {
            vImages = v.images;
          } else if (preset && preset.all.length > 0) {
            vImages = preset.all;
          } else if (v.image_url && !v.image_url.includes("unsplash.com")) {
            vImages = [v.image_url];
          } else if (itemDefaultImg && !itemDefaultImg.includes("unsplash.com")) {
            vImages = [itemDefaultImg];
          } else {
            vImages = ["/telas/tergal blanco.jpg"];
          }

          const primary =
            v.image_url && !v.image_url.includes("unsplash.com")
              ? v.image_url
              : vImages[0] || "/telas/tergal blanco.jpg";

          entries.push({
            uniqueKey: `${item.id}-${v.id}`,
            itemId: item.id,
            itemName: item.name,
            itemCategory: item.category,
            itemType:
              item.category === "sobremanteles" ? "Sobremantel" : "Mantel Base",
            rentalPrice: v.rental_price_override || item.rental_price,
            fabric: vFabric,
            variantId: v.id,
            colorName: v.color_name,
            colorHex: v.color_hex || masterCol?.color_hex || "#2563eb",
            totalStock: v.total_stock,
            tableCompatibilityLabel: getTableCompatibilityLabel(item),
            images: vImages,
            primaryImage: primary,
          });
        }
      } else {
        const preset = getPresetPhotosForFabricAndColor(baseFabric, "Blanco");
        const masterCol = findColorByFabricAndName(baseFabric, "Blanco");
        const fallbackImgs =
          preset?.all && preset.all.length > 0
            ? preset.all
            : itemDefaultImg && !itemDefaultImg.includes("unsplash.com")
              ? [itemDefaultImg]
              : ["/telas/tergal blanco.jpg"];

        // Artículo sin variantes específicas aún
        entries.push({
          uniqueKey: `${item.id}-default`,
          itemId: item.id,
          itemName: item.name,
          itemCategory: item.category,
          itemType:
            item.category === "sobremanteles" ? "Sobremantel" : "Mantel Base",
          rentalPrice: item.rental_price,
          fabric: baseFabric,
          variantId: "default",
          colorName: "Blanco",
          colorHex: masterCol?.color_hex || "#f8fafc",
          totalStock: item.total_stock,
          tableCompatibilityLabel: getTableCompatibilityLabel(item),
          images: fallbackImgs,
          primaryImage: fallbackImgs[0],
        });
      }
    }

    // Complementar con cualquier tela/color de FABRIC_CATALOG que no esté aún en la lista
    for (const fab of FABRIC_CATALOG) {
      for (const col of fab.colors) {
        const alreadyListed = entries.some(
          (e) =>
            e.fabric.toLowerCase() === fab.name.toLowerCase() &&
            e.colorName.toLowerCase() === col.color_name.toLowerCase(),
        );
        if (!alreadyListed) {
          const photos = [col.texture_url];
          if (col.drape_url) photos.push(col.drape_url);
          entries.push({
            uniqueKey: `modal-cat-${fab.slug}-${col.color_name}`,
            itemId: `cat-${fab.slug}`,
            itemName: `Mantel ${fab.name} ${col.color_name}`,
            itemCategory: "manteles_base",
            itemType: "Mantel Base",
            rentalPrice: 45.0,
            fabric: fab.name,
            variantId: `var-${col.color_name}`,
            colorName: col.color_name,
            colorHex: col.color_hex,
            totalStock: 20,
            tableCompatibilityLabel: "Mesas Redondas y Cuadradas",
            images: photos,
            primaryImage: photos[0],
          });
        }
      }
    }

    return entries;
  }, [items]);

  // Lista de telas únicas presentes en el catálogo
  const availableFabrics = useMemo(() => {
    const set = new Set<string>();
    for (const entry of catalogEntries) {
      if (entry.fabric) set.add(entry.fabric);
    }
    return Array.from(set);
  }, [catalogEntries]);

  // Filtrado reactivo
  const filteredEntries = useMemo(() => {
    return catalogEntries.filter((entry) => {
      // Filtro de tela
      if (
        selectedFabric !== "todas" &&
        entry.fabric.toLowerCase() !== selectedFabric.toLowerCase()
      ) {
        return false;
      }

      // Filtro de categoría
      if (selectedCategory !== "todas") {
        if (
          selectedCategory === "manteles_base" &&
          entry.itemCategory !== "manteles_base"
        )
          return false;
        if (
          selectedCategory === "sobremanteles" &&
          entry.itemCategory !== "sobremanteles"
        )
          return false;
      }

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchColor = entry.colorName.toLowerCase().includes(q);
        const matchItem = entry.itemName.toLowerCase().includes(q);
        const matchFabric = entry.fabric.toLowerCase().includes(q);
        if (!matchColor && !matchItem && !matchFabric) return false;
      }

      return true;
    });
  }, [catalogEntries, selectedFabric, selectedCategory, searchQuery]);

  // Navegación en carrusel de fotos por tarjeta
  const handlePrevPhoto = (key: string, total: number) => {
    setActivePhotoIndices((prev) => {
      const cur = prev[key] || 0;
      return { ...prev, [key]: cur <= 0 ? total - 1 : cur - 1 };
    });
  };

  const handleNextPhoto = (key: string, total: number) => {
    setActivePhotoIndices((prev) => {
      const cur = prev[key] || 0;
      return { ...prev, [key]: cur >= total - 1 ? 0 : cur + 1 };
    });
  };

  // Compartir ficha por WhatsApp
  const handleShareWhatsApp = (entry: CatalogVariantEntry) => {
    const text = `¡Hola! Te comparto las opciones de mantelería de Fer Eventos ✨\n\n🧵 *${entry.itemName}*\n🎨 *Color:* ${entry.colorName}\n✨ *Tela:* ${entry.fabric}\n📦 *Existencias:* ${entry.totalStock} disponibles\n💰 *Precio:* ${formatCurrency(entry.rentalPrice)} c/u\n\n¿Te apartamos este color para tu evento?`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    if (onNotification) {
      onNotification(`Abriendo WhatsApp con detalles de ${entry.colorName}...`);
    }
  };

  // Copiar ficha de texto
  const handleCopyDetails = (entry: CatalogVariantEntry) => {
    const text = `Fer Eventos • ${entry.itemName} en color ${entry.colorName} (Tela ${entry.fabric}) - ${entry.totalStock} piezas disponibles (${formatCurrency(entry.rentalPrice)} c/u).`;
    navigator.clipboard.writeText(text);
    setCopiedKey(entry.uniqueKey);
    setTimeout(() => setCopiedKey(null), 2000);
    if (onNotification) {
      onNotification(
        `Detalles de ${entry.colorName} copiados al portapapeles.`,
      );
    }
  };

  // Compartir catálogo completo formateado
  const handleShareAllWhatsApp = () => {
    let summary = `✨ *Catálogo de Manteles y Sobremanteles • Fer Eventos*\n\n`;

    const groupedByFabric: Record<string, string[]> = {};
    for (const e of catalogEntries) {
      if (!groupedByFabric[e.fabric]) groupedByFabric[e.fabric] = [];
      const line = `• ${e.colorName} (${e.itemName}): ${e.totalStock} pzas`;
      if (!groupedByFabric[e.fabric].includes(line)) {
        groupedByFabric[e.fabric].push(line);
      }
    }

    for (const [fabric, lines] of Object.entries(groupedByFabric)) {
      summary += `🧵 *Tela ${fabric}:*\n${lines.join("\n")}\n\n`;
    }

    summary += `Puedes consultar fotos y catálogo completo con nosotros. ¡Con gusto te atendemos!`;
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-full max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl border border-slate-200">
        {/* Encabezado Principal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                  Muestrario de Manteles y Telas
                </h2>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-800">
                  Modo Cliente
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Catálogo visual para mostrar o enviar fotos de colores a tus
                clientes en 1 toque.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareAllWhatsApp}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-95"
              title="Compartir resumen de todos los colores por WhatsApp"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>Enviar Resumen por WhatsApp</span>
            </button>

            <a
              href="/catalogo"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
              title="Abrir vista pública del cliente"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden md:inline">Ver Vista Pública</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="border-b border-slate-200 bg-white/80 p-3 sm:px-6 backdrop-blur-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por color (ej. Azul Rey, Vino, Oro, Rosa)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtro Tipo */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedCategory("todas")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  selectedCategory === "todas"
                    ? "bg-white text-purple-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("manteles_base")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  selectedCategory === "manteles_base"
                    ? "bg-white text-purple-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Manteles Base
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("sobremanteles")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  selectedCategory === "sobremanteles"
                    ? "bg-white text-purple-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sobremanteles
              </button>
            </div>
          </div>

          {/* Chips de Telas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-bold scrollbar-none">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Tela:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFabric("todas")}
              className={`rounded-xl px-3 py-1 text-xs shrink-0 transition-all ${
                selectedFabric === "todas"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Todas las telas ({catalogEntries.length})
            </button>
            {availableFabrics.map((fabric) => {
              const count = catalogEntries.filter(
                (e) => e.fabric.toLowerCase() === fabric.toLowerCase(),
              ).length;
              return (
                <button
                  key={fabric}
                  type="button"
                  onClick={() => setSelectedFabric(fabric)}
                  className={`rounded-xl px-3 py-1 text-xs shrink-0 transition-all ${
                    selectedFabric.toLowerCase() === fabric.toLowerCase()
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  Tela {fabric} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Galería de Tarjetas de Colores */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-purple-500 mb-3 text-2xl">
                🎨
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                No se encontraron manteles con ese filtro
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Prueba buscando otro nombre de color o seleccionando
                &ldquo;Todas las telas&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredEntries.map((entry) => {
                const totalPhotos = entry.images.length;
                const photoIdx = activePhotoIndices[entry.uniqueKey] || 0;
                const activePhotoUrl =
                  entry.images[photoIdx] || entry.primaryImage;
                const isCopied = copiedKey === entry.uniqueKey;

                return (
                  <div
                    key={entry.uniqueKey}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all group"
                  >
                    {/* Visualizador de Foto con Carrusel y Zoom */}
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                      {activePhotoUrl ? (
                        <button
                          type="button"
                          className="h-full w-full p-0 border-0 bg-transparent cursor-pointer text-left"
                          onClick={() =>
                            setLightboxImage({
                              url: activePhotoUrl,
                              title: `${entry.itemName} - ${entry.colorName} (Tela ${entry.fabric})`,
                            })
                          }
                        >
                          {/* biome-ignore lint/performance/noImgElement: imagen de catálogo */}
                          <img
                            src={activePhotoUrl}
                            alt={`${entry.itemName} en ${entry.colorName}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                          />
                        </button>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-300">
                          <Palette className="h-10 w-10 text-slate-300 mb-1" />
                          <span className="text-[11px] font-bold text-slate-400">
                            Sin fotos aún
                          </span>
                        </div>
                      )}

                      {/* Flechas de Carrusel si hay 2 o más fotos */}
                      {totalPhotos > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevPhoto(entry.uniqueKey, totalPhotos);
                            }}
                            className="absolute top-1/2 left-2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur-xs hover:bg-slate-900 transition-all active:scale-95"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextPhoto(entry.uniqueKey, totalPhotos);
                            }}
                            className="absolute top-1/2 right-2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur-xs hover:bg-slate-900 transition-all active:scale-95"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          {/* Indicador de número de foto e indicador de puntos */}
                          <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1.5 pointer-events-none">
                            {entry.images.map((img, i) => (
                              <span
                                key={`dot-${entry.uniqueKey}-${img}`}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === photoIdx
                                    ? "w-4 bg-white"
                                    : "w-1.5 bg-white/50"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Badges superiores */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-xs shadow-md">
                          <span
                            className="h-3 w-3 rounded-full border border-white shrink-0"
                            style={{ backgroundColor: entry.colorHex }}
                          />
                          <span>{entry.colorName}</span>
                        </span>
                      </div>

                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {totalPhotos > 1 && (
                          <span className="rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            {photoIdx === 0 ? "🔍 Textura" : "✨ Caída"}
                          </span>
                        )}
                        {activePhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                url: activePhotoUrl,
                                title: `${entry.itemName} - ${entry.colorName} (Tela ${entry.fabric})`,
                              })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-xs hover:bg-slate-900 transition-all"
                            title="Ver en pantalla completa"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Información y Acciones para Mamá / Clientes */}
                    <div className="flex flex-1 flex-col justify-between p-3.5 space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            Tela {entry.fabric}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">
                            {entry.itemType}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                          {entry.itemName}
                        </h4>

                        {entry.tableCompatibilityLabel && (
                          <div className="mt-1">
                            <span className="inline-block rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold px-2 py-0.5">
                              {entry.tableCompatibilityLabel}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[11px]">
                              Existencias:
                            </span>
                            <span className="font-bold text-slate-800 ml-1">
                              {entry.totalStock} pzas
                            </span>
                          </div>
                          <span className="font-extrabold text-blue-700 text-xs">
                            {formatCurrency(entry.rentalPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción Rápida */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(entry)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyDetails(entry)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                            isCopied
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Barra Inferior Informativa */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-slate-700">
              Mostrando {filteredEntries.length} opciones de colores y telas
            </span>
          </div>
          <span className="font-medium text-slate-400">
            Toca WhatsApp en cualquier color para compartirlo directamente con
            tu cliente.
          </span>
        </div>
      </div>

      {/* Lightbox / Visor de Imagen en Pantalla Completa */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-black/95 p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxImage(null);
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl shadow-2xl">
            {/* biome-ignore lint/performance/noImgElement: Lightbox en pantalla completa */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto object-contain rounded-2xl"
            />
          </div>
          <p className="mt-3 text-center text-sm font-bold text-white/90">
            {lightboxImage.title}
          </p>
          <p className="text-[11px] text-white/50">
            Toca en cualquier parte para cerrar
          </p>
        </div>
      )}
    </div>
  );
}
