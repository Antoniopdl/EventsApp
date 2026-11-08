"use client";

import {
  ArrowLeft,
  ArrowRight,
  Home,
  MapPin,
  MessageCircle,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ClientAddress, ClientWithStats } from "@/core/domain/client";
import type { InventoryItem } from "@/core/domain/inventory";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { searchClients } from "@/infrastructure/supabase/client-repository";
import { formatCurrency } from "@/lib/utils";
import { AddressPickerMap } from "../shared/AddressPickerMap";

interface QuoteWizardProps {
  inventory: InventoryItem[];
  initialClient?: ClientWithStats | null;
  initialAddress?: ClientAddress | null;
}

export function QuoteWizard({
  inventory,
  initialClient,
  initialAddress,
}: QuoteWizardProps) {
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState(initialClient?.full_name || "");
  const [clientPhone, setClientPhone] = useState(
    initialClient?.phone_whatsapp || "",
  );
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(
    initialClient || null,
  );
  const [matchingClients, setMatchingClients] = useState<ClientWithStats[]>([]);

  // Dirección y Logística
  const [addressAlias, setAddressAlias] = useState(
    initialAddress?.alias || "Casa de su mamá",
  );
  const [address, setAddress] = useState(
    initialAddress?.address_text || "Angostura Centro",
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    initialAddress?.delivery_notes || "",
  );
  const [lat, setLat] = useState<number | null>(
    initialAddress?.latitude || null,
  );
  const [lng, setLng] = useState<number | null>(
    initialAddress?.longitude || null,
  );
  const [distanceKm, setDistanceKm] = useState(8.4);
  const [freightCost, setFreightCost] = useState(250);
  const [showMapModal, setShowMapModal] = useState(false);

  // Fecha y artículos
  const [deliveryDate, setDeliveryDate] = useState("2026-11-14");
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (initialClient) {
      setClientName(initialClient.full_name);
      setClientPhone(initialClient.phone_whatsapp);
      setSelectedClient(initialClient);
    }
    if (initialAddress) {
      setAddressAlias(initialAddress.alias);
      setAddress(initialAddress.address_text);
      setDeliveryNotes(initialAddress.delivery_notes || "");
    }
  }, [initialClient, initialAddress]);

  const handleNameInput = async (val: string) => {
    setClientName(val);
    if (val.length >= 2) {
      const results = await searchClients(val);
      setMatchingClients(results);
    } else {
      setMatchingClients([]);
    }
  };

  const handleSelectClient = (c: ClientWithStats) => {
    setSelectedClient(c);
    setClientName(c.full_name);
    setClientPhone(c.phone_whatsapp);
    setMatchingClients([]);
    const defaultAddr = c.addresses.find((a) => a.is_default) || c.addresses[0];
    if (defaultAddr) {
      applyAddress(defaultAddr);
    }
  };

  const applyAddress = (addr: ClientAddress) => {
    setAddressAlias(addr.alias);
    setAddress(addr.address_text);
    setDeliveryNotes(addr.delivery_notes || "");
    setLat(addr.latitude || null);
    setLng(addr.longitude || null);
  };

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
      `🚚 *Lugar de Entrega:* ${addressAlias} (${address})\n` +
      (deliveryNotes ? `📌 *Referencias:* ${deliveryNotes}\n` : "") +
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
    <div className="space-y-3">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
        <div>
          <span className="font-bold text-blue-900 text-xs">
            Cotizador Fer Eventos
          </span>
          <p className="font-medium text-[11px] text-blue-700">
            {step === 1 && "Paso 1: Clienta & Dirección"}
            {step === 2 && "Paso 2: Selección de Mobiliario"}
            {step === 3 && "Paso 3: Flete & Ubicación"}
            {step === 4 && "Paso 4: Presupuesto & WhatsApp"}
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs shadow-xs">
          {step}/4
        </div>
      </div>

      {/* Paso 1: Clienta & Direcciones Frecuentes */}
      {step === 1 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Campo de Nombre con sugerencias inteligentes para Mamá */}
          <div className="relative">
            <label
              htmlFor="wizardClientNameInput"
              className="mb-1 block font-bold text-slate-800 text-xs"
            >
              Nombre de la Clienta (o escribe para buscar)
            </label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="wizardClientNameInput"
                type="text"
                value={clientName}
                onChange={(e) => handleNameInput(e.target.value)}
                placeholder="Ej. Carmen, Lupita, Rocío..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {matchingClients.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {matchingClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="flex w-full items-center justify-between p-2.5 text-left text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.full_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {c.phone_whatsapp}
                      </p>
                    </div>
                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      Seleccionar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label
              htmlFor="wizardClientPhoneInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Teléfono de WhatsApp
            </label>
            <input
              id="wizardClientPhoneInput"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ej. 6971022914"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de Direcciones Frecuentes si la clienta existe */}
          {selectedClient && selectedClient.addresses.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
              <span className="font-bold text-blue-900 text-[11px] block">
                Direcciones guardadas de{" "}
                {selectedClient.full_name.split(" ")[0]}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedClient.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => applyAddress(addr)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      addressAlias === addr.alias
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Home className="h-3 w-3" />
                    <span>{addr.alias}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dirección Seleccionada y Botón de Mapa */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                <span>{addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-[11px] hover:underline"
              >
                Cambiar / Ubicar
              </button>
            </div>
            <p className="text-slate-600 text-xs font-medium">{address}</p>
            {deliveryNotes && (
              <p className="text-[11px] text-slate-500 italic">
                "{deliveryNotes}"
              </p>
            )}
          </div>

          {/* Fechas del evento */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="wizardDeliveryDateInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Fecha del Evento
              </label>
              <input
                id="wizardDeliveryDateInput"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="wizardDeliveryTimeInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Hora de Entrega
              </label>
              <input
                id="wizardDeliveryTimeInput"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98"
          >
            <span>Continuar a Mobiliario</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Paso 2: Mobiliario */}
      {step === 2 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-slate-500 text-xs">
            Selecciona el mobiliario requerido:
          </p>
          <div className="max-h-[350px] space-y-2.5 overflow-y-auto pr-1 no-scrollbar">
            {inventory.map((item) => {
              const qty = selectedItems[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, -10)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-xs active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-slate-900 text-xs">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, 10)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs active:scale-95"
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
              <span>Revisar Flete</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Flete & Mapa */}
      {step === 3 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Destino: {addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-xs hover:underline"
              >
                Abrir Mapa 📍
              </button>
            </div>
            <p className="text-xs text-slate-700 font-medium">{address}</p>
            <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 text-xs">
              <span className="text-slate-600 font-medium">
                Distancia: {distanceKm} km desde Bodega
              </span>
              <span className="font-bold text-blue-700">
                Flete sugerido: {formatCurrency(freightCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label
              htmlFor="wizardFreightCostInput"
              className="font-bold text-slate-800 text-xs"
            >
              Ajustar Costo de Flete:
            </label>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-500 text-xs">$</span>
              <input
                id="wizardFreightCostInput"
                type="number"
                value={freightCost}
                onChange={(e) => setFreightCost(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-blue-700 text-xs"
              />
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
              <span>Ver Presupuesto</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Resumen & WhatsApp */}
      {step === 4 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Clienta:</span>
              <span className="font-bold text-slate-800">
                {clientName || "Sin registrar"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Entrega:</span>
              <span className="font-medium text-slate-800 text-right">
                {addressAlias}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Fecha:</span>
              <span className="font-medium text-slate-800">
                {deliveryDate} ({deliveryTime})
              </span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal Mobiliario:</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Flete y Montaje:</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(freightCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Depósito en Garantía:</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(deposit)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
              <span className="font-bold text-slate-900">Total:</span>
              <span className="font-black text-blue-700">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-sm text-white shadow-md hover:bg-emerald-700 active:scale-98"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Enviar a WhatsApp de Clienta</span>
            </button>
          </div>
        </div>
      )}

      {showMapModal && (
        <AddressPickerMap
          initialAlias={addressAlias}
          initialAddress={address}
          initialNotes={deliveryNotes}
          initialLat={lat}
          initialLng={lng}
          onConfirm={(data) => {
            setAddressAlias(data.alias);
            setAddress(data.address_text);
            setDeliveryNotes(data.delivery_notes);
            setLat(data.latitude);
            setLng(data.longitude);
            setDistanceKm(data.distance_km);
            setFreightCost(data.freight_cost);
            setShowMapModal(false);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
