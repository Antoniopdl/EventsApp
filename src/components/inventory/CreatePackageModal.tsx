"use client";

import { Check, PackagePlus, X } from "lucide-react";
import { useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import { createPackageInDb } from "@/infrastructure/supabase/inventory-repository";
import { formatCurrency } from "@/lib/utils";

interface CreatePackageModalProps {
  availableItems: InventoryItem[];
  onPackageCreated: (newPkg: InventoryItem) => void;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

export function CreatePackageModal({
  availableItems,
  onPackageCreated,
  onClose,
  onNotification,
}: CreatePackageModalProps) {
  const [name, setName] = useState("");
  const [rentalPrice, setRentalPrice] = useState<number>(250);
  const [capacityPeople, setCapacityPeople] = useState<number>(10);
  const [totalStock, setTotalStock] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState<string>(
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80",
  );
  const [selectedComponents, setSelectedComponents] = useState<
    Record<string, number>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solo artículos individuales para armar la receta
  const looseItems = availableItems.filter((i) => i.item_type !== "paquete");

  const handleSetQty = (itemId: string, delta: number) => {
    setSelectedComponents((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = next;
      }
      return updated;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotification("Escribe el nombre del paquete.");
      return;
    }
    if (rentalPrice <= 0) {
      onNotification("Ingresa un precio de renta válido.");
      return;
    }

    const componentList = Object.entries(selectedComponents).map(
      ([itemId, qty]) => ({
        component_item_id: itemId,
        quantity: qty,
      }),
    );

    if (componentList.length === 0) {
      onNotification("Agrega al menos un artículo que componga el paquete.");
      return;
    }

    setIsSubmitting(true);
    const created = await createPackageInDb(
      {
        name: name.trim(),
        rental_price: rentalPrice,
        capacity_people: capacityPeople,
        total_stock: totalStock,
        image_url: imageUrl,
      },
      componentList,
    );
    setIsSubmitting(false);

    if (created) {
      onNotification(`Paquete "${created.name}" creado con éxito.`);
      onPackageCreated(created);
      onClose();
    } else {
      onNotification("Error al guardar el paquete en el servidor.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Crear Nuevo Paquete / Combo
              </h3>
              <p className="text-[11px] text-slate-500">
                Arma un combo con artículos individuales
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

        {/* Formulario */}
        <form
          onSubmit={handleCreate}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar"
        >
          {/* Nombre del paquete */}
          <div>
            <label
              htmlFor="pkg-name"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Nombre del Paquete
            </label>
            <input
              id="pkg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Paquete Redondo Fiesta 10p"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Foto del paquete */}
          <div>
            <label
              htmlFor="pkg-photo"
              className="block text-[11px] font-bold text-slate-800 mb-1"
            >
              Foto del Paquete (URL)
            </label>
            <input
              id="pkg-photo"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Precio y Capacidad */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="pkg-price"
                className="block text-[11px] font-bold text-slate-800 mb-1"
              >
                Precio Renta ($)
              </label>
              <input
                id="pkg-price"
                type="number"
                min={1}
                value={rentalPrice}
                onChange={(e) => setRentalPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="pkg-capacity"
                className="block text-[11px] font-bold text-slate-800 mb-1"
              >
                Capacidad (Pers.)
              </label>
              <input
                id="pkg-capacity"
                type="number"
                min={0}
                value={capacityPeople}
                onChange={(e) => setCapacityPeople(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="pkg-stock"
                className="block text-[11px] font-bold text-slate-800 mb-1"
              >
                Disponibles
              </label>
              <input
                id="pkg-stock"
                type="number"
                min={0}
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Receta de Componentes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-bold text-slate-800">
                Artículos que incluye este paquete:
              </span>
              <span className="text-[10px] text-blue-700 font-bold">
                {Object.keys(selectedComponents).length} seleccionados
              </span>
            </div>

            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 no-scrollbar">
              {looseItems.map((item) => {
                const qty = selectedComponents[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-900 text-xs line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatCurrency(item.rental_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetQty(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-slate-900 text-xs">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetQty(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs active:scale-95 hover:bg-blue-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>
              {isSubmitting ? "Guardando paquete..." : "Guardar Paquete"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
