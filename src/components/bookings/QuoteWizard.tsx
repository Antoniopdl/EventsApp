"use client";

import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Search,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ClientAddress, ClientWithStats } from "@/core/domain/client";
import type { InventoryItem } from "@/core/domain/inventory";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { createBookingInDb } from "@/infrastructure/supabase/booking-repository";
import { searchClients } from "@/infrastructure/supabase/client-repository";
import { formatCurrency } from "@/lib/utils";
import { AddressPickerMap } from "../shared/AddressPickerMap";

interface QuoteWizardProps {
  inventory: InventoryItem[];
  initialClient?: ClientWithStats | null;
  initialAddress?: ClientAddress | null;
  onBookingCreated?: () => void;
  onNotification?: (msg: string) => void;
}

export function QuoteWizard({
  inventory,
  initialClient,
  initialAddress,
  onBookingCreated,
  onNotification,
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
    initialAddress?.alias || "Casa propia",
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

  // Filtros de Mobiliario (Paso 2)
  const [furnitureView, setFurnitureView] = useState<
    "paquetes" | "individuales"
  >("paquetes");
  const [furnitureSearch, setFurnitureSearch] = useState("");

  // Finanzas ajustables
  const [deposit, setDeposit] = useState<number>(0); // Default $0
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [setupFee, setSetupFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingFolio, setConfirmedBookingFolio] = useState<
    string | null
  >(null);

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

  const setItemExactQty = (id: string, qty: number) => {
    setSelectedItems((prev) => {
      const next = Math.max(0, qty);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const adjustQty = (id: string, delta: number) => {
    const current = selectedItems[id] || 0;
    setItemExactQty(id, current + delta);
  };

  const calculateSubtotal = () => {
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const item = inventory.find((i) => i.id === id);
      return sum + (item ? item.rental_price * qty : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const total = subtotal + freightCost + setupFee + deposit;
  const balanceDue = Math.max(0, total - advancePayment);

  // Filtrado de mobiliario en Paso 2
  const filteredMobiliario = useMemo(() => {
    return inventory.filter((item) => {
      const isPkg = item.item_type === "paquete";
      if (furnitureView === "paquetes" && !isPkg) return false;
      if (furnitureView === "individuales" && isPkg) return false;

      if (!furnitureSearch.trim()) return true;
      const q = furnitureSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [inventory, furnitureView, furnitureSearch]);

  // Contadores de selección
  const selectedCounts = useMemo(() => {
    let pkgs = 0;
    let pieces = 0;
    for (const [id, qty] of Object.entries(selectedItems)) {
      const it = inventory.find((i) => i.id === id);
      if (it?.item_type === "paquete") pkgs += qty;
      else pieces += qty;
    }
    return { pkgs, pieces };
  }, [selectedItems, inventory]);

  // Confirmar reserva en Supabase
  const handleConfirmRental = async () => {
    setIsSubmitting(true);
    const startDatetime = `${deliveryDate}T${deliveryTime}:00Z`;
    const endDatetime = `${deliveryDate}T23:59:00Z`;

    const bookingItems = Object.entries(selectedItems)
      .map(([id, qty]) => {
        const item = inventory.find((i) => i.id === id);
        if (!item) return null;
        return {
          item_id: item.id,
          quantity: qty,
          unit_price_applied: item.rental_price,
        };
      })
      .filter(Boolean) as {
      item_id: string;
      quantity: number;
      unit_price_applied: number;
    }[];

    const created = await createBookingInDb(
      {
        client_id: selectedClient?.id,
        client_name: clientName || "Cliente Particular",
        client_phone: clientPhone || FER_EVENTOS_CONFIG.phone,
        address_alias: addressAlias,
        event_address: address,
        delivery_notes: deliveryNotes,
        latitude: lat,
        longitude: lng,
        freight_distance_km: distanceKm,
        freight_cost: freightCost,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        delivery_datetime: startDatetime,
        pickup_datetime: endDatetime,
        subtotal_furniture: subtotal,
        security_deposit: deposit,
        advance_payment: advancePayment,
        total_amount: total,
        requires_setup: requiresSetup,
        setup_fee: setupFee,
      },
      bookingItems,
    );

    setIsSubmitting(false);

    if (created) {
      setConfirmedBookingFolio(created.folio);
      if (onNotification) {
        onNotification(`¡Renta ${created.folio} confirmada con éxito!`);
      }
      if (onBookingCreated) {
        onBookingCreated();
      }
    } else if (onNotification) {
      onNotification("Error al guardar la renta en el servidor.");
    }
  };

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
      `🚚 *Flete:* ${formatCurrency(freightCost)}\n` +
      (requiresSetup
        ? `🛠️ *Servicio de Montaje Completo:* ${formatCurrency(setupFee)}\n`
        : "") +
      (deposit > 0
        ? `🛡️ *Depósito en Garantía (Reembolsable):* ${formatCurrency(deposit)}\n`
        : "") +
      `👉 *TOTAL:* ${formatCurrency(total)}\n` +
      (advancePayment > 0
        ? `✨ *Anticipo Registrado:* ${formatCurrency(advancePayment)}\n`
        : "") +
      (balanceDue > 0
        ? `💵 *Saldo Pendiente:* ${formatCurrency(balanceDue)}\n\n`
        : "\n") +
      (confirmedBookingFolio
        ? `🔖 *Folio de Reserva:* ${confirmedBookingFolio}\n\n`
        : "") +
      `¿Deseas confirmar algún detalle adicional? Estamos para servirte.`;

    const url = `https://wa.me/52${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Barra de Progreso Continua sin Números */}
      <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900">
            {step === 1 && "Paso 1: Clienta & Dirección"}
            {step === 2 && "Paso 2: Selección de Mobiliario"}
            {step === 3 && "Paso 3: Flete & Mapa"}
            {step === 4 && "Paso 4: Confirmación & Presupuesto"}
          </span>
          <span className="font-bold text-blue-600 text-[11px]">
            {Math.round((step / 4) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Paso 1: Clienta, Fechas y Dirección */}
      {step === 1 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Nombre con autocompletado */}
          <div className="relative">
            <label
              htmlFor="wizard-client-name"
              className="mb-1 block font-bold text-slate-950 text-xs"
            >
              Nombre de la Clienta (o escribe para buscar)
            </label>
            <div className="relative">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="wizard-client-name"
                type="text"
                value={clientName}
                onChange={(e) => handleNameInput(e.target.value)}
                placeholder="Ej. Carmen López, Lupita..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
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
                      <p className="font-bold text-slate-900">{c.full_name}</p>
                      <p className="text-[10px] text-slate-600">
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
              htmlFor="wizard-client-phone"
              className="mb-1 block font-bold text-slate-950 text-xs"
            >
              Teléfono de WhatsApp
            </label>
            <input
              id="wizard-client-phone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ej. 6971022914"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de Direcciones Frecuentes si existe */}
          {selectedClient && selectedClient.addresses.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
              <span className="font-bold text-blue-950 text-[11px] block">
                Direcciones guardadas de{" "}
                {selectedClient.full_name.split(" ")[0]}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedClient.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => applyAddress(addr)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      addressAlias === addr.alias
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-red-600" />
                <span>{addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-xs hover:underline"
              >
                Buscar / Ajustar Pin 📍
              </button>
            </div>
            <p className="text-slate-800 text-xs font-medium line-clamp-2">
              {address}
            </p>
            {deliveryNotes && (
              <p className="text-[11px] text-slate-600 italic">
                "{deliveryNotes}"
              </p>
            )}
          </div>

          {/* Fechas del evento: Corrección de layout y no desbordamiento */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label
                htmlFor="wizard-event-date"
                className="mb-1 block font-bold text-slate-950 text-xs"
              >
                Fecha del Evento
              </label>
              <input
                id="wizard-event-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="wizard-event-time"
                className="mb-1 block font-bold text-slate-950 text-xs"
              >
                Hora de Entrega
              </label>
              <input
                id="wizard-event-time"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Paso 2: Mobiliario con Toggle, Búsqueda y Persistencia */}
      {step === 2 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Toggle Paquetes / Artículos Sueltos (Sin emojis) */}
          <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFurnitureView("paquetes")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
                furnitureView === "paquetes"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Paquetes</span>
            </button>
            <button
              type="button"
              onClick={() => setFurnitureView("individuales")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all ${
                furnitureView === "individuales"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>Artículos Sueltos</span>
            </button>
          </div>

          {/* Buscador de Mobiliario */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={furnitureSearch}
              onChange={(e) => setFurnitureSearch(e.target.value)}
              placeholder="Buscar silla, mesa, mantel..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Resumen de Selecciones Activas */}
          {(selectedCounts.pkgs > 0 || selectedCounts.pieces > 0) && (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px]">
              <span className="font-bold text-blue-900">
                Seleccionado:{" "}
                {selectedCounts.pkgs > 0 ? `${selectedCounts.pkgs} paq. ` : ""}
                {selectedCounts.pieces > 0
                  ? `${selectedCounts.pieces} pzas.`
                  : ""}
              </span>
              <span className="font-extrabold text-blue-700">
                {formatCurrency(subtotal)}
              </span>
            </div>
          )}

          {/* Lista de Mobiliario con Selector Unitario */}
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
            {filteredMobiliario.map((item) => {
              const qty = selectedItems[item.id] || 0;
              const isPkg = item.item_type === "paquete";

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-900 text-xs line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {formatCurrency(item.rental_price)} c/u
                      {isPkg && item.capacity_people
                        ? ` • ${item.capacity_people} pers.`
                        : ""}
                    </p>
                  </div>

                  {/* Controles de Cantidad (+ / - unitarios y campo numérico) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white font-black text-slate-800 text-sm active:scale-95 shadow-2xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty === 0 ? "" : qty}
                      onChange={(e) =>
                        setItemExactQty(
                          item.id,
                          Number.parseInt(e.target.value, 10) || 0,
                        )
                      }
                      placeholder="0"
                      className="w-10 rounded-lg border border-slate-300 bg-white py-1 text-center font-extrabold text-slate-900 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white text-sm active:scale-95 shadow-2xs hover:bg-blue-700"
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
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs"
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

      {/* Paso 3: Flete & Ubicación */}
      {step === 3 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Destino: {addressAlias}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="font-bold text-blue-600 text-xs hover:underline"
              >
                Abrir Mapa & Pin 📍
              </button>
            </div>
            <p className="text-xs text-slate-800 font-semibold">{address}</p>
            <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 text-xs">
              <span className="text-slate-700 font-medium">
                Distancia: {distanceKm} km desde Bodega
              </span>
              <span className="font-extrabold text-blue-800">
                Flete sugerido: {formatCurrency(freightCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label
              htmlFor="wizardFreightCostInput"
              className="font-bold text-slate-950 text-xs"
            >
              Costo de Flete Acordado:
            </label>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-500 text-xs">$</span>
              <input
                id="wizardFreightCostInput"
                type="number"
                value={freightCost}
                onChange={(e) => setFreightCost(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-blue-700 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Opción de Montaje Completo */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <span className="font-bold text-slate-950 text-xs block">
                ¿Deseas montaje completo?
              </span>
              <span className="text-[10px] text-slate-500">
                (Personal abre mesas y acomoda sillas y manteles)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !requiresSetup;
                setRequiresSetup(nextVal);
                setSetupFee(nextVal ? 300 : 0);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold text-xs transition-all active:scale-95 ${
                requiresSetup
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {requiresSetup ? "✓ Sí (+$300)" : "No (a pie de camión)"}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs"
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

      {/* Paso 4: Presupuesto, Anticipo y Confirmación */}
      {step === 4 && (
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Clienta:</span>
              <span className="font-bold text-slate-900">
                {clientName || "Sin registrar"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Lugar:</span>
              <span className="font-semibold text-slate-900 text-right">
                {addressAlias}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Fecha:</span>
              <span className="font-semibold text-slate-900">
                {deliveryDate} ({deliveryTime})
              </span>
            </div>
          </div>

          {/* Desglose de Totales */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">
                Subtotal Mobiliario:
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">
                Flete de Entrega:
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(freightCost)}
              </span>
            </div>
            {requiresSetup && (
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">
                  Servicio de Montaje:
                </span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(setupFee)}
                </span>
              </div>
            )}

            {/* Depósito en Garantía (Default $0) */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2">
              <label
                htmlFor="wizardDepositInput"
                className="text-slate-700 font-semibold"
              >
                Depósito en Garantía:
              </label>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-500 text-xs">$</span>
                <input
                  id="wizardDepositInput"
                  type="number"
                  min={0}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-slate-900 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Total General */}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
              <span className="font-black text-slate-950">TOTAL:</span>
              <span className="font-black text-blue-700 text-base">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Anticipo Recibido */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-200 p-2.5">
              <div>
                <label
                  htmlFor="wizardAdvanceInput"
                  className="font-bold text-emerald-950 block"
                >
                  Anticipo Recibido:
                </label>
                <span className="text-[10px] text-emerald-700">
                  Pago por adelantado
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-emerald-700 text-xs">$</span>
                <input
                  id="wizardAdvanceInput"
                  type="number"
                  min={0}
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-right font-extrabold text-emerald-800 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Saldo Pendiente */}
            <div className="flex justify-between rounded-xl bg-slate-100 p-2 text-xs font-bold text-slate-800">
              <span>Saldo Pendiente al Entregar:</span>
              <span
                className={
                  balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                }
              >
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-2 pt-2">
            {confirmedBookingFolio ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-center space-y-1">
                <span className="flex items-center justify-center gap-1 font-extrabold text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Renta Confirmada: {confirmedBookingFolio}</span>
                </span>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Guardada en la agenda y lista para entrega.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmRental}
                disabled={isSubmitting || subtotal === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-sm text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{isSubmitting ? "Guardando..." : "Confirmar renta"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white font-bold text-xs text-emerald-700 shadow-2xs hover:bg-emerald-50 active:scale-98"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
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
