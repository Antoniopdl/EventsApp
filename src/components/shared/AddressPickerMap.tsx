"use client";

import { Check, Clipboard, MapPin, Navigation, X } from "lucide-react";
import { useState } from "react";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import {
  calculateDistanceToBodega,
  calculateSuggestedFreight,
  parseWhatsAppLocation,
} from "@/lib/location-parser";
import { formatCurrency } from "@/lib/utils";

interface AddressPickerMapProps {
  initialAlias?: string;
  initialAddress?: string;
  initialNotes?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (data: {
    alias: string;
    address_text: string;
    latitude: number;
    longitude: number;
    delivery_notes: string;
    distance_km: number;
    freight_cost: number;
  }) => void;
  onClose: () => void;
}

const COMMON_ALIASES = [
  { label: "Casa propia", icon: "🏠" },
  { label: "Casa de su mamá", icon: "👵" },
  { label: "Casa de su suegra", icon: "🏡" },
  { label: "Rancho / Parcela", icon: "🌾" },
  { label: "Patio familiar", icon: "🎉" },
];

export function AddressPickerMap({
  initialAlias = "Casa propia",
  initialAddress = "",
  initialNotes = "",
  initialLat = FER_EVENTOS_CONFIG.latitude,
  initialLng = FER_EVENTOS_CONFIG.longitude,
  onConfirm,
  onClose,
}: AddressPickerMapProps) {
  const [alias, setAlias] = useState(initialAlias);
  const [addressText, setAddressText] = useState(initialAddress);
  const [deliveryNotes, setDeliveryNotes] = useState(initialNotes);
  const [lat, setLat] = useState(initialLat || FER_EVENTOS_CONFIG.latitude);
  const [lng, setLng] = useState(initialLng || FER_EVENTOS_CONFIG.longitude);
  const [pasteInput, setPasteInput] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const distanceKm = calculateDistanceToBodega(lat, lng);
  const freightCost = calculateSuggestedFreight(distanceKm);

  const handlePasteWhatsApp = (text: string) => {
    setErrorMsg("");
    const parsed = parseWhatsAppLocation(text);
    if (parsed) {
      setLat(parsed.latitude);
      setLng(parsed.longitude);
      if (!addressText) {
        setAddressText(
          `Ubicación GPS (${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)})`,
        );
      }
      setShowPasteBox(false);
      setPasteInput("");
    } else {
      setErrorMsg("No se detectaron coordenadas válidas en el enlace pegado.");
    }
  };

  const handleClipboardRead = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handlePasteWhatsApp(text);
    } catch {
      setShowPasteBox(true);
    }
  };

  const handleSave = () => {
    onConfirm({
      alias: alias.trim() || "Casa particular",
      address_text:
        addressText.trim() ||
        `Angostura (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      latitude: lat,
      longitude: lng,
      delivery_notes: deliveryNotes.trim(),
      distance_km: distanceKm,
      freight_cost: freightCost,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center p-0 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Ubicación de Entrega
              </h3>
              <p className="text-[11px] text-slate-500">
                Angostura y comunidades cercanas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Botón Mágico: Pegar ubicación de WhatsApp */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleClipboardRead}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-3 px-4 font-bold text-emerald-800 text-xs shadow-xs transition-all hover:bg-emerald-100 active:scale-98"
            >
              <Clipboard className="h-4 w-4 text-emerald-600" />
              <span>📋 Pegar ubicación de WhatsApp</span>
            </button>

            {showPasteBox && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-600">
                  Pega aquí el enlace de Google Maps que te envió la clienta:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... o coordenadas"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handlePasteWhatsApp(pasteInput)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white text-xs"
                  >
                    Ubicar
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {errorMsg}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mini Mapa Táctil Interactivo */}
          <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
            <iframe
              title="Mapa de Entrega"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
            />
            <div className="absolute top-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
              📍 {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          </div>

          {/* Cálculo de Distancia y Flete Automático */}
          <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-3">
            <div>
              <p className="font-semibold text-blue-900 text-xs flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
                <span>Distancia desde Bodega:</span>
              </p>
              <p className="text-[11px] text-blue-700">
                {distanceKm} km (Angostura, Col. Agrícola México)
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium uppercase">
                Flete sugerido
              </span>
              <p className="font-bold text-blue-700 text-base">
                {formatCurrency(freightCost)}
              </p>
            </div>
          </div>

          {/* Selector de Alias con Chips Familiares */}
          <div>
            <label
              htmlFor="mapAliasInput"
              className="mb-1.5 block font-bold text-slate-800 text-xs"
            >
              ¿Cómo llamamos a esta dirección?
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_ALIASES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAlias(item.label)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    alias === item.label
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <input
              id="mapAliasInput"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="O escribe otro nombre: ej. Rancho El Refugio"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Calle y Número */}
          <div>
            <label
              htmlFor="mapAddressInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Calle, Número y Colonia
            </label>
            <input
              id="mapAddressInput"
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Ej. Calle Morelos #142, La Palma"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Referencias para el Chofer */}
          <div>
            <label
              htmlFor="mapNotesInput"
              className="mb-1 block font-semibold text-slate-700 text-xs"
            >
              Referencias para el Chofer (Opcional)
            </label>
            <input
              id="mapNotesInput"
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Ej. Portón blanco frente al kínder, entrar por el callejón"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botón de Confirmación */}
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-sm text-white shadow-md transition-all hover:bg-blue-700 active:scale-98"
          >
            <Check className="h-4 w-4" />
            <span>Confirmar Ubicación y Flete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
