"use client";

import { Check, Home, MapPin, X } from "lucide-react";
import { useState } from "react";
import type { ClientAddress } from "@/core/domain/client";
import { ClientAddressSchema } from "@/core/validations/client";
import { AddressPickerMap } from "../shared/AddressPickerMap";

interface EditAddressModalProps {
  clientId: string;
  initialAddress?: ClientAddress | null;
  onSave: (
    addressData: Omit<ClientAddress, "id" | "created_at" | "updated_at">,
    addressId?: string,
  ) => Promise<void>;
  onClose: () => void;
}

const COMMON_ALIASES = [
  { label: "Casa propia", icon: "🏠" },
  { label: "Casa de su mamá", icon: "👵" },
  { label: "Casa de su suegra", icon: "🏡" },
  { label: "Rancho / Parcela", icon: "🌾" },
  { label: "Patio familiar", icon: "🎉" },
];

export function EditAddressModal({
  clientId,
  initialAddress,
  onSave,
  onClose,
}: EditAddressModalProps) {
  const [alias, setAlias] = useState(
    initialAddress?.alias || "Casa de su mamá",
  );
  const [addressText, setAddressText] = useState(
    initialAddress?.address_text || "",
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
  const [isDefault, setIsDefault] = useState(
    initialAddress?.is_default || false,
  );
  const [showMap, setShowMap] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const validation = ClientAddressSchema.safeParse({
      alias,
      address_text: addressText,
      latitude: lat,
      longitude: lng,
      delivery_notes: deliveryNotes || null,
      is_default: isDefault,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Datos incompletos");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          client_id: clientId,
          alias: alias.trim(),
          address_text: addressText.trim(),
          latitude: lat,
          longitude: lng,
          delivery_notes: deliveryNotes.trim() || null,
          is_default: isDefault,
        },
        initialAddress?.id,
      );
      onClose();
    } catch {
      setErrorMsg("Ocurrió un error al guardar la dirección.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center p-0 sm:p-4 animate-in fade-in duration-150">
        <div className="flex w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[92vh]">
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Home className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                {initialAddress
                  ? "Editar Dirección"
                  : "Nueva Dirección Familiar"}
              </h3>
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
            onSubmit={handleSubmit}
            className="p-4 space-y-3.5 overflow-y-auto no-scrollbar"
          >
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Chips de Alias */}
            <div>
              <label
                htmlFor="addressAliasInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Nombre de la Dirección (Alias)
              </label>
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
                id="addressAliasInput"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej. Casa de su mamá, Rancho San Isidro"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            {/* Calle y Número */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="addressTextInput"
                  className="font-semibold text-slate-700 text-xs"
                >
                  Calle, Número y Colonia
                </label>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <MapPin className="h-3 w-3" />
                  <span>{lat ? "Ajustar en Mapa" : "Ubicar en Mapa"}</span>
                </button>
              </div>
              <input
                id="addressTextInput"
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Ej. Calle Benito Juárez #210, Angostura Centro"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {lat && lng && (
                <p className="mt-1 text-[10px] text-emerald-700 font-medium">
                  📍 Ubicación GPS guardada ({lat.toFixed(4)}, {lng.toFixed(4)})
                </p>
              )}
            </div>

            {/* Notas para el chofer */}
            <div>
              <label
                htmlFor="deliveryNotesInput"
                className="mb-1 block font-semibold text-slate-700 text-xs"
              >
                Referencias para el Chofer / Repartidor
              </label>
              <textarea
                id="deliveryNotesInput"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ej. Portón blanco, frente al kínder, entrar por el callejón de terracería"
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Switch de predeterminada */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="font-semibold text-slate-700 text-xs">
                Dirección principal / predeterminada
              </span>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded-md text-blue-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving ? "Guardando..." : "Guardar Dirección"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {showMap && (
        <AddressPickerMap
          initialAlias={alias}
          initialAddress={addressText}
          initialNotes={deliveryNotes}
          initialLat={lat}
          initialLng={lng}
          onConfirm={(data) => {
            setAlias(data.alias);
            setAddressText(data.address_text);
            setDeliveryNotes(data.delivery_notes);
            setLat(data.latitude);
            setLng(data.longitude);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}
