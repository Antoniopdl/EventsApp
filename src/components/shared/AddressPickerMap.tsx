"use client";

import {
  Check,
  Clipboard,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  // Búsqueda interactiva de direcciones
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    {
      place_id?: number | string;
      display_name: string;
      lat: string;
      lon: string;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const distanceKm = calculateDistanceToBodega(lat, lng);
  const freightCost = calculateSuggestedFreight(distanceKm);

  // Escuchar mensajes del mapa interactivo (cuando el usuario arrastra el pin)
  useEffect(() => {
    const handleMapMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PIN_MOVED") {
        const newLat = Number(event.data.lat);
        const newLng = Number(event.data.lng);
        if (!Number.isNaN(newLat) && !Number.isNaN(newLng)) {
          setLat(newLat);
          setLng(newLng);
        }
      }
    };
    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, []);

  // Búsqueda predictiva con autocompletado
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setErrorMsg("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const q = `${text.trim()}, Sinaloa, Mexico`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q,
          )}&limit=5&countrycodes=mx`,
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error("Error buscando dirección:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (s: {
    display_name: string;
    lat: string;
    lon: string;
  }) => {
    const newLat = Number.parseFloat(s.lat);
    const newLng = Number.parseFloat(s.lon);
    setLat(newLat);
    setLng(newLng);
    setAddressText(s.display_name.split(",")[0] || s.display_name);
    setSuggestions([]);
    setSearchQuery("");
  };

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

  // HTML interactivo para el mapa con pin arrastrable
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e2e8f0; }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const lat = ${lat};
          const lng = ${lng};
          const map = L.map('map', { zoomControl: false }).setView([lat, lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          // Marcador arrastrable (Draggable Pin)
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.bindPopup("<b>Ubicación de Entrega</b><br>Arrastra el pin para ajustar el punto exacto.").openPopup();

          marker.on('dragend', function(e) {
            const pos = marker.getLatLng();
            window.parent.postMessage({ type: 'PIN_MOVED', lat: pos.lat, lng: pos.lng }, '*');
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            window.parent.postMessage({ type: 'PIN_MOVED', lat: e.latlng.lat, lng: e.latlng.lng }, '*');
          });
        </script>
      </body>
    </html>
  `;

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
                Ubicación de Entrega y Flete
              </h3>
              <p className="text-[11px] text-slate-500">
                Busca la dirección o arrastra el pin
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {/* Buscador de dirección interactivo */}
          <div className="relative">
            <label
              htmlFor="map-search-input"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Buscar dirección en el mapa
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="map-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Escribe calle, colonia o poblado (ej. Calle Juárez, Alhuey)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearching && (
                <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
              )}
            </div>

            {/* Sugerencias de búsqueda */}
            {suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id ? String(s.place_id) : `${s.lat}-${s.lon}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex w-full items-start gap-2 border-b border-slate-100 p-2.5 text-left text-xs hover:bg-blue-50 last:border-0"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <span className="text-slate-800 font-medium line-clamp-2">
                      {s.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Mágico: Pegar ubicación de WhatsApp */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleClipboardRead}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-2.5 px-3 font-bold text-emerald-800 text-xs shadow-xs transition-all hover:bg-emerald-100 active:scale-98"
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

          {/* Mapa Interactivo con Pin Arrastrable */}
          <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner">
            <iframe
              title="Mapa de Entrega Interactivo"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              srcDoc={mapHtml}
            />
            <div className="absolute top-2 right-2 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800 shadow-xs backdrop-blur-xs">
              📍 {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
            <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
              Arrastra el pin al punto exacto
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

          {/* Selector de Alias */}
          <div>
            <span className="mb-1 block font-bold text-slate-800 text-xs">
              ¿Cómo llamamos a esta dirección?
            </span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_ALIASES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAlias(item.label)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
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
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej. Casa de su tía, Salón Los Arcos..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dirección Textual */}
          <div>
            <label
              htmlFor="addr-text"
              className="mb-1 block font-bold text-slate-800 text-xs"
            >
              Dirección o Calle
            </label>
            <input
              id="addr-text"
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Calle, número exterior y colonia"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notas para el chofer */}
          <div>
            <label
              htmlFor="addr-notes"
              className="mb-1 block font-bold text-slate-800 text-xs"
            >
              Referencias para el Chofer (Opcional)
            </label>
            <textarea
              id="addr-notes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={2}
              placeholder="Ej. Portón negro frente a la tienda, entrar por el callejón..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-sm text-white shadow-md hover:bg-blue-700 active:scale-98"
          >
            <Check className="h-4 w-4" />
            <span>Confirmar Ubicación</span>
          </button>
        </div>
      </div>
    </div>
  );
}
