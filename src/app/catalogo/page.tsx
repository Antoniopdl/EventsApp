"use client";

import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Palette,
  Search,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FABRIC_CATALOG,
  findColorByFabricAndName,
  getPresetPhotosForFabricAndColor,
} from "@/core/domain/fabric-catalog";
import type { InventoryItem } from "@/core/domain/inventory";
import {
  getTableCompatibilityLabel,
  isTableclothCategory,
} from "@/core/domain/inventory";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { getInventoryItems } from "@/infrastructure/supabase/inventory-repository";
import { formatCurrency } from "@/lib/utils";

interface CatalogEntry {
  uniqueKey: string;
  itemName: string;
  fabric: string;
  colorName: string;
  colorHex: string;
  rentalPrice: number;
  totalStock: number;
  tableCompatibilityLabel?: string;
  images: string[];
}

export default function CatalogoPublicoPage() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY_SEED);
  const [selectedFabric, setSelectedFabric] = useState<string>("todas");
  const [search, setSearch] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    getInventoryItems().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setItems(loaded);
      }
    });
  }, []);

  const entries: CatalogEntry[] = useMemo(() => {
    const list: CatalogEntry[] = [];
    const tablecloths = items.filter((it) =>
      isTableclothCategory(it.category || ""),
    );

    for (const item of tablecloths) {
      const baseFabric = item.fabric || "Tergal";
      const itemImg = item.image_url || "";

      if (item.variants && item.variants.length > 0) {
        for (const v of item.variants) {
          const vFabric = v.fabric || baseFabric || "Tergal";
          const preset = getPresetPhotosForFabricAndColor(
            vFabric,
            v.color_name,
          );
          const masterCol = findColorByFabricAndName(vFabric, v.color_name);

          let imgs: string[] = [];
          if (
            v.images &&
            v.images.length > 0 &&
            !v.images[0].includes("unsplash.com")
          ) {
            imgs = v.images;
          } else if (preset && preset.all.length > 0) {
            imgs = preset.all;
          } else if (v.image_url && !v.image_url.includes("unsplash.com")) {
            imgs = [v.image_url];
          } else if (itemImg && !itemImg.includes("unsplash.com")) {
            imgs = [itemImg];
          } else {
            imgs = ["/telas/tergal blanco.jpg"];
          }

          list.push({
            uniqueKey: `${item.id}-${v.id}`,
            itemName: item.name,
            fabric: vFabric,
            colorName: v.color_name,
            colorHex: v.color_hex || masterCol?.color_hex || "#2563eb",
            rentalPrice: v.rental_price_override || item.rental_price,
            totalStock: v.total_stock,
            tableCompatibilityLabel: getTableCompatibilityLabel(item),
            images: imgs,
          });
        }
      } else {
        const preset = getPresetPhotosForFabricAndColor(baseFabric, "Blanco");
        const masterCol = findColorByFabricAndName(baseFabric, "Blanco");
        const fallbackImgs =
          preset?.all && preset.all.length > 0
            ? preset.all
            : itemImg && !itemImg.includes("unsplash.com")
              ? [itemImg]
              : ["/telas/tergal blanco.jpg"];

        list.push({
          uniqueKey: `${item.id}-def`,
          itemName: item.name,
          fabric: baseFabric,
          colorName: "Blanco",
          colorHex: masterCol?.color_hex || "#f8fafc",
          rentalPrice: item.rental_price,
          totalStock: item.total_stock,
          tableCompatibilityLabel: getTableCompatibilityLabel(item),
          images: fallbackImgs,
        });
      }
    }

    // Complementar con cualquier tela y color del muestrario de fotos que falte
    for (const fab of FABRIC_CATALOG) {
      for (const col of fab.colors) {
        const alreadyListed = list.some(
          (e) =>
            e.fabric.toLowerCase() === fab.name.toLowerCase() &&
            e.colorName.toLowerCase() === col.color_name.toLowerCase(),
        );
        if (!alreadyListed) {
          const photos = [col.texture_url];
          if (col.drape_url) photos.push(col.drape_url);
          list.push({
            uniqueKey: `cat-${fab.slug}-${col.color_name}`,
            itemName: `Mantel ${fab.name} ${col.color_name}`,
            fabric: fab.name,
            colorName: col.color_name,
            colorHex: col.color_hex,
            rentalPrice: 45.0,
            totalStock: 20,
            tableCompatibilityLabel: "Mesas Redondas y Cuadradas",
            images: photos,
          });
        }
      }
    }

    return list;
  }, [items]);

  const fabrics = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.fabric) set.add(e.fabric);
    }
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (
        selectedFabric !== "todas" &&
        e.fabric.toLowerCase() !== selectedFabric.toLowerCase()
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          e.colorName.toLowerCase().includes(q) ||
          e.fabric.toLowerCase().includes(q) ||
          e.itemName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, selectedFabric, search]);

  const handleConsultWhatsApp = (entry: CatalogEntry) => {
    const text = `¡Hola Fer Eventos! Vi su catálogo digital y me interesa consultar disponibilidad del *${entry.itemName}* en color *${entry.colorName}* (Tela *${entry.fabric}*). ¿Me podrían dar información para mi evento?`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Barra Superior Brandeada */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 font-black text-white text-base shadow-lg shadow-purple-900/40">
              FE
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white">
                Fer Eventos
              </h1>
              <p className="text-[11px] font-bold text-purple-400">
                Catálogo de Manteles y Telas
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Contactar</span>
          </a>
        </div>
      </header>

      {/* Hero y Filtros */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-950/80 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-300 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Muestrario
              Oficial de Colores
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Encuentra la combinación perfecta para tu evento
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
              Explora nuestras fotos reales en tela Tergal, Satín y más. Toca en
              cualquier color para consultar disponibilidad directa con
              nosotros.
            </p>
          </div>

          {/* Buscador y Filtro de Telas */}
          <div className="space-y-2.5 pt-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar color (ej. Azul Rey, Vino, Rosa, Dorado)..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedFabric("todas")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all ${
                  selectedFabric === "todas"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Todas las telas ({entries.length})
              </button>
              {fabrics.map((f) => {
                const count = entries.filter(
                  (e) => e.fabric.toLowerCase() === f.toLowerCase(),
                ).length;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFabric(f)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all ${
                      selectedFabric.toLowerCase() === f.toLowerCase()
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Tela {f} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Manteles */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Palette className="h-12 w-12 text-slate-600 mb-2" />
            <p className="font-bold text-slate-300 text-sm">
              No encontramos manteles con ese nombre o tela
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Intenta con otro término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filtered.map((entry) => {
              const count = entry.images.length;
              const photoIndex = photoIndices[entry.uniqueKey] || 0;
              const currentPhoto = entry.images[photoIndex] || entry.images[0];

              return (
                <div
                  key={entry.uniqueKey}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 shadow-lg hover:border-slate-700 transition-all"
                >
                  {/* Foto con Carrusel */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-900">
                    {currentPhoto ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(currentPhoto)}
                        className="h-full w-full p-0 border-0 bg-transparent text-left cursor-pointer"
                      >
                        {/* biome-ignore lint/performance/noImgElement: imagen pública */}
                        <img
                          src={currentPhoto}
                          alt={`${entry.itemName} en ${entry.colorName}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-700 text-3xl">
                        🎨
                      </div>
                    )}

                    {count > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoIndices((prev) => {
                              const cur = prev[entry.uniqueKey] || 0;
                              return {
                                ...prev,
                                [entry.uniqueKey]:
                                  cur <= 0 ? count - 1 : cur - 1,
                              };
                            });
                          }}
                          className="absolute top-1/2 left-2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-xs hover:bg-slate-900"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoIndices((prev) => {
                              const cur = prev[entry.uniqueKey] || 0;
                              return {
                                ...prev,
                                [entry.uniqueKey]:
                                  cur >= count - 1 ? 0 : cur + 1,
                              };
                            });
                          }}
                          className="absolute top-1/2 right-2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-xs hover:bg-slate-900"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 pointer-events-none">
                          {entry.images.map((img, i) => (
                            <span
                              key={`dot-${entry.uniqueKey}-${img}`}
                              className={`h-1.5 rounded-full transition-all ${
                                i === photoIndex
                                  ? "w-4 bg-white"
                                  : "w-1.5 bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Badge de Color */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-black text-white backdrop-blur-md shadow-md border border-white/10">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: entry.colorHex }}
                      />
                      <span>{entry.colorName}</span>
                    </div>

                    {count > 1 && (
                      <div className="absolute top-2.5 right-11 flex items-center">
                        <span className="rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                          {photoIndex === 0 ? "🔍 Textura" : "✨ Caída"}
                        </span>
                      </div>
                    )}

                    {currentPhoto && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(currentPhoto)}
                        className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-xs hover:bg-slate-900 transition-all cursor-pointer"
                        title="Ver foto en grande"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ficha */}
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-purple-950 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-300">
                          Tela {entry.fabric}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-white text-sm">
                        {entry.itemName}
                      </h3>
                      {entry.tableCompatibilityLabel && (
                        <div className="mt-1">
                          <span className="inline-block rounded-md bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px] font-bold px-2 py-0.5">
                            {entry.tableCompatibilityLabel}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Color {entry.colorName} • Renta:{" "}
                        <span className="font-bold text-white">
                          {formatCurrency(entry.rentalPrice)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConsultWhatsApp(entry)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-98 transition-all"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Consultar este color</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-in fade-in cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxUrl(null);
          }}
        >
          <div className="relative max-h-[90vh] max-w-3xl">
            {/* biome-ignore lint/performance/noImgElement: lightbox full image */}
            <img
              src={lightboxUrl}
              alt="Foto mantel ampliada"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-xs font-bold text-white/60">
              Toca para cerrar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
