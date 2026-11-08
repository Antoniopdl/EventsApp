"use client";

import { ArrowLeft, ArrowRight, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { InventoryItem } from "@/core/domain/inventory";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { formatCurrency } from "@/lib/utils";

interface QuoteWizardProps {
  inventory: InventoryItem[];
}

export function QuoteWizard({ inventory }: QuoteWizardProps) {
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("2026-11-14");
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [pickupType, setPickupType] = useState("mismo_dia_noche");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );
  const [address, setAddress] = useState("Salón Los Arcos, Angostura Centro");
  const [freightCost, setFreightCost] = useState(350);

  const adjustQty = (id: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const calculateSubtotal = () => {
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const item = inventory.find((i) => i.id === id);
      return sum + (item ? item.rental_price * qty : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const deposit = 500;
  const total = subtotal + freightCost + deposit;
  const advance = total * 0.5;

  const handleShareWhatsApp = () => {
    const phone = clientPhone || FER_EVENTOS_CONFIG.phone;
    const itemsText = Object.entries(selectedItems)
      .map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        return item ? `• ${qty}x ${item.name}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const message =
      `¡Hola ${clientName || "Cliente"}! 👋 Te saluda Fer Eventos.\n\n` +
      `Te comparto la cotización formal para tu evento del ${deliveryDate}:\n\n` +
      `📦 *Mobiliario Cotizado:*\n${itemsText}\n\n` +
      `🚚 *Flete a:* ${address}\n` +
      `💰 *Subtotal Mobiliario:* ${formatCurrency(subtotal)}\n` +
      `🚚 *Flete y Montaje:* ${formatCurrency(freightCost)}\n` +
      `🛡️ *Depósito en Garantía (Reembolsable):* ${formatCurrency(deposit)}\n` +
      `👉 *TOTAL:* ${formatCurrency(total)}\n\n` +
      `✨ *Anticipo del 50% para apartar fecha:* ${formatCurrency(advance)}\n\n` +
      `¿Deseas confirmar tu reservación? Estamos para servirte.`;

    const url = `https://wa.me/52${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
        <div>
          <span className="font-bold text-blue-900 text-xs">
            Asistente de Cotización
          </span>
          <p className="font-medium text-[11px] text-blue-700">
            {step === 1 && "Paso 1: Cliente & Horarios"}
            {step === 2 && "Paso 2: Selección de Mobiliario"}
            {step === 3 && "Paso 3: Dirección & Flete (Maps)"}
            {step === 4 && "Paso 4: Resumen & WhatsApp"}
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs shadow-xs">
          {step}/4
        </div>
      </div>

      {/* Paso 1: Cliente & Fechas */}
      {step === 1 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <label
              htmlFor="clientNameInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Nombre del Cliente
            </label>
            <input
              id="clientNameInput"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej. Familia Gómez / Salón Fiesta"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="clientPhoneInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              WhatsApp (10 dígitos)
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-slate-200 border-r-0 bg-slate-100 px-3 font-medium text-slate-500 text-xs">
                🇲🇽 +52
              </span>
              <input
                id="clientPhoneInput"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="6971234567"
                className="w-full rounded-r-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="deliveryDateInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Fecha Entrega
              </label>
              <input
                id="deliveryDateInput"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="deliveryTimeInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Hora
              </label>
              <input
                id="deliveryTimeInput"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="pickupTypeSelect"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Tipo de Recolección
            </label>
            <select
              id="pickupTypeSelect"
              value={pickupType}
              onChange={(e) => setPickupType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mismo_dia_noche">
                Mismo día por la noche (Ej. 11:30 PM)
              </option>
              <option value="dia_siguiente">
                Día siguiente al mediodía (12:00 PM)
              </option>
              <option value="multidia">Evento de 2 o más días</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-sm text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
          >
            <span>Seleccionar Mobiliario</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Paso 2: Mobiliario */}
      {step === 2 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-slate-500 text-xs">
            Selecciona el mobiliario requerido para esta fecha:
          </p>
          <div className="max-h-[350px] space-y-2.5 overflow-y-auto pr-1">
            {inventory.map((item) => {
              const qty = selectedItems[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    {item.image_url ? (
                      /* biome-ignore lint/performance/noImgElement: imagen dinamica */
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-xs">
                        📦
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatCurrency(item.rental_price)} c/u •{" "}
                        <span className="font-semibold text-emerald-700">
                          {item.total_stock} en bodega
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, -10)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-slate-900 text-xs">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, 10)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-semibold text-slate-700 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex w-2/3 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white text-xs shadow-md"
            >
              <span>Continuar a Flete</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Dirección & Flete */}
      {step === 3 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <label
              htmlFor="eventAddressInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Dirección del Evento / Salón
            </label>
            <div className="relative">
              <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-red-500" />
              <input
                id="eventAddressInput"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nombre del salón o calle y número"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                Origen: Bodega Agrícola México
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                8.4 km ida y vuelta
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="freightCostInput"
                className="font-bold text-slate-800 text-xs"
              >
                Costo de Flete y Maniobra:
              </label>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-500 text-xs">$</span>
                <input
                  id="freightCostInput"
                  type="number"
                  value={freightCost}
                  onChange={(e) => setFreightCost(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-blue-700 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-semibold text-slate-700 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex w-2/3 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white text-xs shadow-md"
            >
              <span>Ver Resumen</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Resumen & WhatsApp */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cotización Formal
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cliente: {clientName || "Sin nombre"}
                </p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-600 text-xs">
                {FER_EVENTOS_CONFIG.name}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              {Object.entries(selectedItems).map(([id, qty]) => {
                const item = inventory.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex justify-between text-slate-700">
                    <span>
                      {qty}x {item.name}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(item.rental_price * qty)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Mobiliario:</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Flete y Logística:</span>
                <span className="font-bold">{formatCurrency(freightCost)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Depósito en Garantía:</span>
                <span className="font-bold">{formatCurrency(deposit)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900 text-sm">
                <span>Total a Pagar:</span>
                <span className="text-blue-700">{formatCurrency(total)}</span>
              </div>
              <p className="pt-0.5 font-semibold text-[11px] text-emerald-700">
                Anticipo 50% para apartar: {formatCurrency(advance)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-sm text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Enviar por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full rounded-xl bg-slate-100 py-2.5 font-semibold text-slate-600 text-xs"
          >
            Modificar Datos
          </button>
        </div>
      )}
    </div>
  );
}
