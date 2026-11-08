"use client";

import {
  Calendar,
  Edit2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ClientAddress, ClientDetails } from "@/core/domain/client";
import { formatCurrency } from "@/lib/utils";
import { EditAddressModal } from "./EditAddressModal";
import { EditClientModal } from "./EditClientModal";

interface ClientDetailModalProps {
  client: ClientDetails;
  onUpdateClient: (updatedData: Partial<ClientDetails>) => Promise<void>;
  onSaveAddress: (
    addressData: Omit<ClientAddress, "id" | "created_at" | "updated_at">,
    addressId?: string,
  ) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onStartQuote: (
    client: ClientDetails,
    selectedAddress?: ClientAddress,
  ) => void;
  onClose: () => void;
}

export function ClientDetailModal({
  client,
  onUpdateClient,
  onSaveAddress,
  onDeleteAddress,
  onStartQuote,
  onClose,
}: ClientDetailModalProps) {
  const [showEditClient, setShowEditClient] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(
    null,
  );
  const [showNewAddress, setShowNewAddress] = useState(false);

  const handleOpenWhatsApp = () => {
    const cleanPhone = client.phone_whatsapp.replace(/\D/g, "");
    const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(
      `¡Hola ${client.full_name}! 👋 Te saludamos de Fer Eventos.`,
    )}`;
    window.open(url, "_blank");
  };

  const handleOpenGps = (addr: ClientAddress) => {
    const url =
      addr.latitude && addr.longitude
        ? `https://maps.google.com/?q=${addr.latitude},${addr.longitude}`
        : `https://maps.google.com/?q=${encodeURIComponent(addr.address_text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center p-0 sm:p-4 animate-in fade-in duration-150">
        <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white text-sm shadow-xs">
                {client.full_name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {client.full_name}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {client.phone_whatsapp}
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

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {/* Acciones Rápidas */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 font-bold text-xs text-white shadow-xs hover:bg-emerald-700 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat de WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEditClient(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 font-bold text-xs text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                <span>Editar Datos</span>
              </button>
            </div>

            {/* Notas familiares */}
            {client.notes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">
                  📌 Nota familiar:
                </span>
                <p className="text-amber-800">{client.notes}</p>
              </div>
            )}

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-medium text-slate-500 uppercase">
                  Eventos Rentados
                </span>
                <p className="font-bold text-slate-900 text-base">
                  {client.bookings_count}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-medium text-slate-500 uppercase">
                  Total Invertido
                </span>
                <p className="font-bold text-blue-700 text-base">
                  {formatCurrency(client.total_spent)}
                </p>
              </div>
            </div>

            {/* Sección de Direcciones Familiares */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  Direcciones Frecuentes ({client.addresses.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNewAddress(true)}
                  className="flex items-center gap-1 font-bold text-[11px] text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3 w-3" />
                  <span>Agregar Dirección</span>
                </button>
              </div>

              {client.addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Sin direcciones guardadas aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {client.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-bold text-[11px] text-blue-700">
                          <MapPin className="h-3 w-3 text-blue-600" />
                          {addr.alias}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenGps(addr)}
                            title="Ver en Google Maps"
                            className="text-slate-400 hover:text-blue-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAddress(addr)}
                            title="Editar dirección"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAddress(addr.id)}
                            title="Eliminar dirección"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {addr.address_text}
                      </p>
                      {addr.delivery_notes && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{addr.delivery_notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Rentas */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Historial de Rentas y Eventos</span>
              </h4>

              {client.bookings.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-400">
                  No hay eventos registrados para esta clienta.
                </div>
              ) : (
                <div className="space-y-2">
                  {client.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-blue-700">
                          {booking.delivery_datetime.substring(0, 10)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                          {booking.status}
                        </span>
                      </div>
                      <p className="font-semibold text-xs text-slate-800">
                        {booking.event_address}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>
                          Total: {formatCurrency(booking.total_amount)}
                        </span>
                        <span className="font-medium text-emerald-700">
                          {booking.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botón Inferior: Nueva Cotización */}
          <div className="border-t border-slate-100 p-3 bg-slate-50">
            <button
              type="button"
              onClick={() => onStartQuote(client)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98"
            >
              <span>
                ✨ Iniciar Cotización para {client.full_name.split(" ")[0]}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showEditClient && (
        <EditClientModal
          client={client}
          onSave={onUpdateClient}
          onClose={() => setShowEditClient(false)}
        />
      )}

      {(showNewAddress || editingAddress) && (
        <EditAddressModal
          clientId={client.id}
          initialAddress={editingAddress}
          onSave={onSaveAddress}
          onClose={() => {
            setShowNewAddress(false);
            setEditingAddress(null);
          }}
        />
      )}
    </>
  );
}
