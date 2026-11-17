"use client";

import { Camera, Check, Palette, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type Category,
  type InventoryItem,
  type InventoryVariant,
  isTableclothCategory,
  type PackageComponent,
  type TableShapeCompatibility,
  type TableclothSize,
} from "@/core/domain/inventory";
import {
  addCustomFabric,
  getFabrics,
} from "@/infrastructure/supabase/category-repository";
import { formatCurrency } from "@/lib/utils";
import { EditPhotoModal } from "./EditPhotoModal";
import { FabricColorSelector } from "./FabricColorSelector";
import { VariantPhotosModal } from "./VariantPhotosModal";

interface EditProductModalProps {
  item: InventoryItem;
  allItems: InventoryItem[];
  categories: Category[];
  onSave: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

export function EditProductModal({
  item,
  allItems,
  categories,
  onSave,
  onClose,
  onNotification,
}: EditProductModalProps) {
  const isPackage = item.item_type === "paquete";

  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<string>(item.category);
  const [rentalPrice, setRentalPrice] = useState<number>(item.rental_price);
  const [replacementPrice, setReplacementPrice] = useState<number>(
    item.replacement_price || 0,
  );
  const [totalStock, setTotalStock] = useState<number>(item.total_stock);
  const [capacityPeople, setCapacityPeople] = useState<number>(
    item.capacity_people || 10,
  );
  const [description, setDescription] = useState(item.description || "");
  const [imageUrl, setImageUrl] = useState(item.image_url || "");
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Sincronizar en caso de que item cambie
  useEffect(() => {
    setName(item.name);
    setCategory(item.category);
    setRentalPrice(item.rental_price);
    setReplacementPrice(item.replacement_price || 0);
    setTotalStock(item.total_stock);
    setCapacityPeople(item.capacity_people || 10);
    setDescription(item.description || "");
    setTableShape(item.table_shape || "redonda");
    setTableclothSize(item.tablecloth_size || "estandar");
    setVariants(item.variants || []);
    if (item.image_url) {
      setImageUrl(item.image_url);
    }
  }, [item]);

  // Compatibilidad con Mesas (Manteles y Sobremanteles)
  const [tableShape, setTableShape] = useState<TableShapeCompatibility>(
    item.table_shape || "redonda",
  );
  const [tableclothSize, setTableclothSize] = useState<TableclothSize>(
    item.tablecloth_size || "estandar",
  );

  // Telas y variantes (solo para manteles/sobremanteles)
  const [fabrics, setFabrics] = useState<string[]>(() => getFabrics());
  const [fabric, setFabric] = useState<string>(item.fabric || "Tergal");
  const [showAddFabric, setShowAddFabric] = useState(false);
  const [newFabricInput, setNewFabricInput] = useState("");
  const [variants, setVariants] = useState<InventoryVariant[]>(
    item.variants || [],
  );
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#2563eb");
  const [newColorStock, setNewColorStock] = useState(10);
  const [editingPhotosVariant, setEditingPhotosVariant] =
    useState<InventoryVariant | null>(null);

  // Componentes si es paquete
  const [mantelBaseQty, setMantelBaseQty] = useState<number>(() => {
    const found = item.package_components?.find(
      (c) =>
        c.customization_type === "mantel_base" ||
        c.component_item?.category === "manteles_base",
    );
    if (found) return found.quantity;
    if (item.description) {
      const match = item.description.match(/(\d+)\s*x?\s*mantel\s*base/i);
      if (match) return Number.parseInt(match[1], 10);
      if (item.description.toLowerCase().includes("mantel base")) return 1;
    }
    return 0;
  });

  const [sobremantelQty, setSobremantelQty] = useState<number>(() => {
    const found = item.package_components?.find(
      (c) =>
        c.customization_type === "sobremantel" ||
        c.component_item?.category === "sobremanteles",
    );
    if (found) return found.quantity;
    if (item.description) {
      const match = item.description.match(/(\d+)\s*x?\s*sobremantel/i);
      if (match) return Number.parseInt(match[1], 10);
      if (item.description.toLowerCase().includes("sobremantel")) return 1;
    }
    return 0;
  });

  const [pkgActiveCategory, setPkgActiveCategory] = useState<string>("todas");
  const [pkgSearchQuery, setPkgSearchQuery] = useState<string>("");

  const [pkgQuantities, setPkgQuantities] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      if (item.package_components && item.package_components.length > 0) {
        for (const comp of item.package_components) {
          if (
            comp.customization_type === "mantel_base" ||
            comp.customization_type === "sobremantel"
          ) {
            continue;
          }
          map[comp.component_item_id] = comp.quantity;
        }
      } else if (item.description) {
        const parts = item.description.split(/\s*\+\s*|\s*,\s*/);
        for (const part of parts) {
          const match = part.match(/(\d+)\s*x?\s*(.+)/i);
          if (match) {
            const qty = Number.parseInt(match[1], 10);
            const rawName = match[2].trim().toLowerCase();
            if (rawName.includes("mantel") || rawName.includes("sobremantel"))
              continue;
            const foundItem = allItems.find(
              (i) =>
                i.item_type !== "paquete" &&
                (i.name.toLowerCase().includes(rawName) ||
                  rawName.includes(i.name.toLowerCase())),
            );
            if (foundItem) {
              map[foundItem.id] = qty;
            }
          }
        }
      }
      return map;
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const showFabricSection = !isPackage && isTableclothCategory(category);

  // Artículos sueltos excluyendo mantelería individual si es paquete
  const looseItems = useMemo(() => {
    return allItems.filter((i) => {
      if (i.item_type === "paquete") return false;
      if (isPackage) {
        const isTablecloth =
          i.category === "manteles_base" ||
          i.category === "sobremanteles" ||
          i.category === "manteleria";
        return !isTablecloth;
      }
      return true;
    });
  }, [allItems, isPackage]);

  // Filtrado de artículos sueltos para receta
  const filteredLooseItems = useMemo(() => {
    return looseItems.filter((comp) => {
      if (pkgActiveCategory !== "todas" && pkgActiveCategory !== "manteleria") {
        if (pkgActiveCategory === "otros") {
          const mainCats = ["mesas", "sillas", "vajilla"];
          if (mainCats.includes(comp.category)) return false;
        } else if (comp.category !== pkgActiveCategory) {
          return false;
        }
      }
      if (!pkgSearchQuery.trim()) return true;
      const q = pkgSearchQuery.toLowerCase();
      return (
        comp.name.toLowerCase().includes(q) ||
        comp.sku.toLowerCase().includes(q)
      );
    });
  }, [looseItems, pkgActiveCategory, pkgSearchQuery]);

  // Stock total de manteles base y sobremanteles
  const totalMantelesBaseStock = useMemo(() => {
    return allItems
      .filter(
        (i) =>
          i.category === "manteles_base" ||
          (i.category === "manteleria" &&
            !i.name.toLowerCase().includes("sobremantel")) ||
          i.name.toLowerCase().includes("mantel base"),
      )
      .reduce((sum, it) => sum + it.total_stock, 0);
  }, [allItems]);

  const totalSobremantelesStock = useMemo(() => {
    return allItems
      .filter(
        (i) =>
          i.category === "sobremanteles" ||
          i.name.toLowerCase().includes("sobremantel"),
      )
      .reduce((sum, it) => sum + it.total_stock, 0);
  }, [allItems]);

  // Auto Capacidad para paquete: 1 silla = 1 persona
  useEffect(() => {
    if (isPackage) {
      let chairs = 0;
      for (const [id, qty] of Object.entries(pkgQuantities)) {
        const comp = allItems.find((i) => i.id === id);
        if (
          comp &&
          (comp.category === "sillas" ||
            comp.name.toLowerCase().includes("silla"))
        ) {
          chairs += qty;
        }
      }
      if (chairs > 0) {
        setCapacityPeople(chairs);
      }
    }
  }, [isPackage, pkgQuantities, allItems]);

  // Auto Stock para paquete: Math.min(stock / qty)
  const { calculatedPkgStock, pkgBottleneck } = useMemo(() => {
    if (!isPackage) {
      return { calculatedPkgStock: totalStock, pkgBottleneck: null };
    }
    const entries = Object.entries(pkgQuantities).filter(([_, qty]) => qty > 0);
    if (entries.length === 0 && mantelBaseQty === 0 && sobremantelQty === 0) {
      return { calculatedPkgStock: 0, pkgBottleneck: null };
    }

    let minPkgs = Number.POSITIVE_INFINITY;
    let bottleneck = "";

    for (const [id, qty] of entries) {
      const it = allItems.find((i) => i.id === id);
      if (!it || qty <= 0) continue;
      const maxForComp = Math.floor(it.total_stock / qty);
      if (maxForComp < minPkgs) {
        minPkgs = maxForComp;
        bottleneck = `${it.name} (${it.total_stock} disponibles)`;
      }
    }

    if (mantelBaseQty > 0) {
      const maxForBase = Math.floor(totalMantelesBaseStock / mantelBaseQty);
      if (maxForBase < minPkgs) {
        minPkgs = maxForBase;
        bottleneck = `Manteles Base (${totalMantelesBaseStock} disponibles)`;
      }
    }

    if (sobremantelQty > 0) {
      const maxForSobre = Math.floor(totalSobremantelesStock / sobremantelQty);
      if (maxForSobre < minPkgs) {
        minPkgs = maxForSobre;
        bottleneck = `Sobremanteles (${totalSobremantelesStock} disponibles)`;
      }
    }

    return {
      calculatedPkgStock:
        minPkgs === Number.POSITIVE_INFINITY ? 0 : Math.max(0, minPkgs),
      pkgBottleneck: bottleneck,
    };
  }, [
    isPackage,
    pkgQuantities,
    mantelBaseQty,
    sobremantelQty,
    allItems,
    totalStock,
    totalMantelesBaseStock,
    totalSobremantelesStock,
  ]);

  useEffect(() => {
    if (isPackage && calculatedPkgStock > 0) {
      setTotalStock(calculatedPkgStock);
    }
  }, [isPackage, calculatedPkgStock]);

  const handleAddFabric = () => {
    if (!newFabricInput.trim()) return;
    const updated = addCustomFabric(newFabricInput);
    setFabrics(updated);
    setFabric(newFabricInput.trim());
    setNewFabricInput("");
    setShowAddFabric(false);
    onNotification(`Tela "${newFabricInput.trim()}" agregada.`);
  };

  const handleAddVariant = () => {
    if (!newColorName.trim()) return;
    const trimmed = newColorName.trim();
    if (
      variants.some((v) => v.color_name.toLowerCase() === trimmed.toLowerCase())
    ) {
      onNotification("Ese color ya está agregado.");
      return;
    }
    const newVar: InventoryVariant = {
      id: `var-${Date.now()}`,
      item_id: item.id,
      color_name: trimmed,
      color_hex: newColorHex,
      fabric: fabric || item.fabric || null,
      total_stock: Math.max(0, newColorStock),
      images: [],
      image_url: null,
    };
    setVariants((prev) => [...prev, newVar]);
    setNewColorName("");
    setNewColorStock(10);
  };

  const handleUpdateVariantStock = (varId: string, stock: number) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === varId ? { ...v, total_stock: Math.max(0, stock) } : v,
      ),
    );
  };

  const handleRemoveVariant = (varId: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== varId));
  };

  const handlePkgQtyChange = (compItemId: string, delta: number) => {
    setPkgQuantities((prev) => {
      const next = Math.max(0, (prev[compItemId] || 0) + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[compItemId];
      } else {
        copy[compItemId] = next;
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const finalVariants = [...variants];
    if (showFabricSection && newColorName.trim()) {
      const trimmed = newColorName.trim();
      const alreadyExists = finalVariants.some(
        (v) => v.color_name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (!alreadyExists) {
        finalVariants.push({
          id: `var-${Date.now()}`,
          item_id: item.id,
          color_name: trimmed,
          color_hex: newColorHex,
          fabric: fabric || item.fabric || null,
          total_stock: Math.max(0, newColorStock),
          images: [],
          image_url: null,
        });
      }
    }

    const computedStock =
      showFabricSection && finalVariants.length > 0
        ? finalVariants.reduce((s, v) => s + v.total_stock, 0)
        : totalStock;

    const updatedComponents: PackageComponent[] | undefined = isPackage
      ? [
          ...Object.entries(pkgQuantities).map(([compId, qty], idx) => {
            const compItem = allItems.find((i) => i.id === compId);
            return {
              id: `pc-${Date.now()}-${idx}`,
              package_id: item.id,
              component_item_id: compId,
              quantity: qty,
              is_customizable: false,
              component_item: compItem,
            };
          }),
          ...(mantelBaseQty > 0
            ? [
                (() => {
                  const baseItem = allItems.find(
                    (i) =>
                      i.category === "manteles_base" ||
                      i.name.toLowerCase().includes("mantel base") ||
                      i.name.toLowerCase().includes("mantel"),
                  );
                  return {
                    id: `pc-${Date.now()}-mb`,
                    package_id: item.id,
                    component_item_id: baseItem?.id || "item-5",
                    quantity: mantelBaseQty,
                    is_customizable: true,
                    customization_type: "mantel_base",
                    component_item: baseItem || {
                      id: "mantel-base-slot",
                      sku: "MANT-BASE-SLOT",
                      name: "Mantel Base",
                      category: "manteles_base",
                      total_stock: 50,
                      rental_price: 45,
                      replacement_price: 240,
                      buffer_cleanup_hours: 48,
                      is_active: true,
                    },
                  };
                })(),
              ]
            : []),
          ...(sobremantelQty > 0
            ? [
                (() => {
                  const sobreItem = allItems.find(
                    (i) =>
                      i.category === "sobremanteles" ||
                      i.name.toLowerCase().includes("sobremantel"),
                  );
                  return {
                    id: `pc-${Date.now()}-sm`,
                    package_id: item.id,
                    component_item_id: sobreItem?.id || "item-8",
                    quantity: sobremantelQty,
                    is_customizable: true,
                    customization_type: "sobremantel",
                    component_item: sobreItem || {
                      id: "sobremantel-slot",
                      sku: "SOBR-SLOT",
                      name: "Sobremantel",
                      category: "sobremanteles",
                      total_stock: 50,
                      rental_price: 30,
                      replacement_price: 160,
                      buffer_cleanup_hours: 48,
                      is_active: true,
                    },
                  };
                })(),
              ]
            : []),
        ]
      : undefined;

    const autoDescription =
      isPackage && updatedComponents && updatedComponents.length > 0
        ? updatedComponents
            .map((c) => {
              const compName =
                c.customization_type === "mantel_base"
                  ? "Mantel Base"
                  : c.customization_type === "sobremantel"
                    ? "Sobremantel"
                    : c.component_item?.name ||
                      allItems.find((i) => i.id === c.component_item_id)
                        ?.name ||
                      "Pieza";
              return `${c.quantity}x ${compName}`;
            })
            .join(" + ")
        : description.trim() || null;

    const finalImageUrl = imageUrl?.trim()
      ? imageUrl.trim()
      : item.image_url || null;

    const compatibleTables =
      category === "manteles_base"
        ? [tableShape]
        : category === "sobremanteles"
          ? tableclothSize === "chico"
            ? ["redonda", "cuadrada_chica"]
            : ["cuadrada_grande"]
          : undefined;

    await onSave(item.id, {
      name: name.trim(),
      category: isPackage ? "paquetes" : category,
      rental_price: rentalPrice,
      replacement_price: replacementPrice,
      total_stock: computedStock,
      capacity_people: isPackage ? capacityPeople : item.capacity_people,
      description: autoDescription,
      image_url: finalImageUrl,
      fabric: showFabricSection ? fabric : null,
      table_shape: category === "manteles_base" ? tableShape : null,
      tablecloth_size:
        category === "sobremanteles" ? tableclothSize : "estandar",
      compatible_tables: compatibleTables,
      variants: showFabricSection ? finalVariants : item.variants,
      package_components: updatedComponents,
    });

    setIsSaving(false);
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
                {isPackage ? "Editar Paquete / Combo" : "Editar Artículo"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Modifica todos los detalles técnicos y precios
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
                onClick={() => setShowPhotoModal(true)}
                className="relative h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group"
              >
                {imageUrl ? (
                  /* biome-ignore lint/performance/noImgElement: preview */
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">
                    📦
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
                  <Camera className="h-4 w-4" />
                </div>
              </button>

              <div className="flex-1">
                <label
                  htmlFor="edit-prod-name"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Nombre
                </label>
                <input
                  id="edit-prod-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Categoría (solo sueltos) */}
            {!isPackage && (
              <div>
                <label
                  htmlFor="edit-prod-cat"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Categoría
                </label>
                <select
                  id="edit-prod-cat"
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
            )}

            {/* Compatibilidad de Mesas (Manteles Base y Sobremanteles) */}
            {!isPackage && category === "manteles_base" && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <label className="text-xs font-bold text-blue-950 block">
                  ¿Para qué forma de mesa es este mantel base?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTableShape("redonda")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      tableShape === "redonda"
                        ? "border-blue-600 bg-white text-blue-900 ring-2 ring-blue-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-lg">🔘</span>
                    <div>
                      <p className="leading-tight font-extrabold">Mesa Redonda</p>
                      <p className="text-[10px] font-medium text-slate-500">
                        10 personas
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableShape("cuadrada")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      tableShape === "cuadrada"
                        ? "border-blue-600 bg-white text-blue-900 ring-2 ring-blue-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-lg">⬛</span>
                    <div>
                      <p className="leading-tight font-extrabold">Mesa Cuadrada</p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Cuadrada / Imperial
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableShape("tablon")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      tableShape === "tablon"
                        ? "border-blue-600 bg-white text-blue-900 ring-2 ring-blue-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-lg">📏</span>
                    <div>
                      <p className="leading-tight font-extrabold">Mesa Tablón</p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Rectangular alargada
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableShape("todas")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      tableShape === "todas"
                        ? "border-blue-600 bg-white text-blue-900 ring-2 ring-blue-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-lg">🌐</span>
                    <div>
                      <p className="leading-tight font-extrabold">Universal</p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Todas las formas
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {!isPackage && category === "sobremanteles" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <label className="text-xs font-bold text-amber-950 block">
                  Tamaño y compatibilidad del sobremantel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTableclothSize("chico")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      tableclothSize === "chico"
                        ? "border-amber-600 bg-white text-amber-900 ring-2 ring-amber-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-xl">🟡</span>
                    <div>
                      <p className="leading-tight font-extrabold">
                        Sobremantel Chico
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                        ✓ Solo mesas redondas y cuadradas chicas
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableclothSize("grande")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      tableclothSize === "grande"
                        ? "border-amber-600 bg-white text-amber-900 ring-2 ring-amber-500/30 shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="text-xl">🔲</span>
                    <div>
                      <p className="leading-tight font-extrabold">
                        Sobremantel Grande
                      </p>
                      <p className="text-[10px] font-semibold text-purple-700 mt-0.5">
                        ✓ Solo mesas cuadradas grandes (Imperial)
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Tela y Variaciones de Color (SOLO Manteles / Sobremanteles) */}
            {showFabricSection && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="edit-prod-fabric"
                      className="text-xs font-bold text-purple-950"
                    >
                      Tipo de Tela
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
                        placeholder="Nueva tela..."
                        className="flex-1 rounded-xl border border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddFabric}
                        className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <select
                      id="edit-prod-fabric"
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                    >
                      {fabrics.map((f) => (
                        <option key={f} value={f}>
                          Tela {f}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Desplegable automático del Muestrario de Colores con Fotos de Textura y Caída */}
                <FabricColorSelector
                  fabric={fabric}
                  selectedVariants={variants}
                  onChangeVariants={(vars) => setVariants(vars)}
                  onOpenPhotosModal={(v) => setEditingPhotosVariant(v)}
                />

                {/* Lista de Colores Activos con Edición de Fotos y Existencias */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-purple-950">
                    <Palette className="h-3.5 w-3.5" />
                    Colores y Existencias en este Mantel
                  </span>

                  {variants.map((v) => {
                    const photosCount =
                      v.images && v.images.length > 0
                        ? v.images.length
                        : v.image_url
                          ? 1
                          : 0;
                    const previewThumb = v.image_url || v.images?.[0];

                    return (
                      <div
                        key={v.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white border border-purple-200 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full border border-slate-300 shrink-0"
                            style={{
                              backgroundColor: v.color_hex || "#2563eb",
                            }}
                          />
                          <span className="font-extrabold text-slate-900">
                            {v.color_name}
                          </span>
                          {v.fabric && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                              {v.fabric}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPhotosVariant(v)}
                            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                              photosCount > 0
                                ? "bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
                                : "bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200"
                            }`}
                          >
                            {previewThumb ? (
                              /* biome-ignore lint/performance/noImgElement: mini thumbnail */
                              <img
                                src={previewThumb}
                                alt={v.color_name}
                                className="h-4 w-4 rounded-full object-cover border border-purple-300 shrink-0"
                              />
                            ) : (
                              <Camera className="h-3.5 w-3.5 text-purple-600" />
                            )}
                            <span>
                              {photosCount > 0
                                ? `📸 ${photosCount} ${photosCount === 1 ? "foto" : "fotos"}`
                                : "+ Fotos"}
                            </span>
                          </button>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Stock:
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={v.total_stock}
                              onChange={(e) =>
                                handleUpdateVariantStock(
                                  v.id,
                                  Number(e.target.value),
                                )
                              }
                              className="w-14 rounded-lg border border-slate-300 px-2 py-0.5 text-center font-bold text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Eliminar este color"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Agregar nuevo color manual */}
                  <div className="flex gap-1.5 items-center pt-2 border-t border-purple-200/50">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="h-8 w-8 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddVariant();
                        }
                      }}
                      placeholder="Nuevo color personalizado (ej. Vino)"
                      className="flex-1 rounded-xl border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={newColorStock}
                      onChange={(e) => setNewColorStock(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddVariant();
                        }
                      }}
                      className="w-14 rounded-xl border border-purple-300 bg-white px-2 py-1.5 text-xs font-bold text-center outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="rounded-xl bg-purple-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      + Color
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Precios y Capacidad / Stock */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="edit-price"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Renta ($)
                </label>
                <input
                  id="edit-price"
                  type="number"
                  min={0}
                  value={rentalPrice}
                  onChange={(e) => setRentalPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-blue-700 outline-none"
                  required
                />
              </div>

              {isPackage ? (
                <div>
                  <label
                    htmlFor="edit-cap"
                    className="block text-[11px] font-bold text-slate-800 mb-1"
                  >
                    Pers. / Cap.
                  </label>
                  <input
                    id="edit-cap"
                    type="number"
                    min={0}
                    value={capacityPeople}
                    onChange={(e) => setCapacityPeople(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="edit-repl"
                    className="block text-[11px] font-bold text-slate-800 mb-1"
                  >
                    Reposición ($)
                  </label>
                  <input
                    id="edit-repl"
                    type="number"
                    min={0}
                    value={replacementPrice}
                    onChange={(e) =>
                      setReplacementPrice(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-stock"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Stock Total
                </label>
                <input
                  id="edit-stock"
                  type="number"
                  min={0}
                  disabled={showFabricSection && variants.length > 0}
                  value={
                    showFabricSection && variants.length > 0
                      ? variants.reduce((s, v) => s + v.total_stock, 0)
                      : totalStock
                  }
                  onChange={(e) => setTotalStock(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none disabled:bg-slate-100"
                />
                {isPackage && pkgBottleneck && (
                  <p className="text-[10px] text-blue-700 font-medium mt-1">
                    ✓ Limitado por {pkgBottleneck}
                  </p>
                )}
              </div>
            </div>

            {/* Descripción (si es paquete) */}
            {isPackage && (
              <div>
                <label
                  htmlFor="edit-desc"
                  className="block text-[11px] font-bold text-slate-800 mb-1"
                >
                  Descripción del Paquete
                </label>
                <input
                  id="edit-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. 1 Mesa Redonda + 10 Sillas + Mantel"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            )}

            {/* Receta de Componentes (si es Paquete) */}
            {isPackage && (
              <div className="space-y-2 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-800">
                    Artículos que incluye este paquete:
                  </span>
                  {calculatedPkgStock > 0 && (
                    <span className="text-[10px] font-bold text-purple-700">
                      Stock: {calculatedPkgStock} paq.
                    </span>
                  )}
                </div>

                {/* Filtro de Categorías */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: "todas", label: "Todas" },
                    { id: "mesas", label: "Mesas" },
                    { id: "sillas", label: "Sillas" },
                    { id: "manteleria", label: "Manteles" },
                    { id: "vajilla", label: "Vajilla" },
                    { id: "otros", label: "Otros" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPkgActiveCategory(tab.id)}
                      className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                        pkgActiveCategory === tab.id
                          ? "bg-purple-700 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Buscador */}
                {pkgActiveCategory !== "manteleria" && (
                  <input
                    type="text"
                    value={pkgSearchQuery}
                    onChange={(e) => setPkgSearchQuery(e.target.value)}
                    placeholder="Filtrar por nombre..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1 px-2.5 text-xs text-slate-900 outline-none"
                  />
                )}

                {/* Slots Genéricos de Mantelería */}
                {(pkgActiveCategory === "todas" ||
                  pkgActiveCategory === "manteleria") && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-2 space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-900 block">
                      Mantelería genérica (se define tela y color al reservar):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center justify-between rounded-lg bg-white border border-purple-200 p-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Mantel Base
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setMantelBaseQty((q) => Math.max(0, q - 1))
                            }
                            className="h-6 w-6 rounded bg-slate-100 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-xs">
                            {mantelBaseQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMantelBaseQty((q) => q + 1)}
                            className="h-6 w-6 rounded bg-purple-700 text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white border border-purple-200 p-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Sobremantel
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSobremantelQty((q) => Math.max(0, q - 1))
                            }
                            className="h-6 w-6 rounded bg-slate-100 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-xs">
                            {sobremantelQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSobremantelQty((q) => q + 1)}
                            className="h-6 w-6 rounded bg-purple-700 text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Artículos sueltos regulares */}
                {pkgActiveCategory !== "manteleria" && (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 no-scrollbar">
                    {filteredLooseItems.map((comp) => {
                      const qty = pkgQuantities[comp.id] || 0;
                      return (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-1.5"
                        >
                          <div className="flex-1 pr-1">
                            <p className="font-bold text-slate-900 text-xs line-clamp-1">
                              {comp.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {formatCurrency(comp.rental_price)} • Stock:{" "}
                              {comp.total_stock}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePkgQtyChange(comp.id, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white font-bold text-xs active:scale-95"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-slate-900 text-xs">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePkgQtyChange(comp.id, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-purple-700 font-bold text-white text-xs active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>
                {isSaving ? "Guardando..." : "Guardar Todos los Cambios"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {showPhotoModal && (
        <EditPhotoModal
          itemName={name}
          currentImageUrl={imageUrl}
          onSavePhoto={(newUrl) => setImageUrl(newUrl)}
          onClose={() => setShowPhotoModal(false)}
        />
      )}

      {/* Modal de Fotos por Variación de Color / Tela */}
      {editingPhotosVariant && (
        <VariantPhotosModal
          colorName={editingPhotosVariant.color_name}
          colorHex={editingPhotosVariant.color_hex}
          fabricName={editingPhotosVariant.fabric || fabric || item.fabric}
          itemName={name}
          initialImages={
            editingPhotosVariant.images && editingPhotosVariant.images.length > 0
              ? editingPhotosVariant.images
              : editingPhotosVariant.image_url
                ? [editingPhotosVariant.image_url]
                : []
          }
          initialPrimaryUrl={editingPhotosVariant.image_url}
          onSave={(imgs, primary) => {
            setVariants((prev) =>
              prev.map((v) =>
                v.id === editingPhotosVariant.id
                  ? {
                      ...v,
                      images: imgs,
                      image_url: primary || imgs[0] || null,
                      fabric: v.fabric || fabric || item.fabric || null,
                    }
                  : v,
              ),
            );
            setEditingPhotosVariant(null);
            onNotification(
              `Fotos de "${editingPhotosVariant.color_name}" actualizadas.`,
            );
          }}
          onClose={() => setEditingPhotosVariant(null)}
        />
      )}
    </>
  );
}
