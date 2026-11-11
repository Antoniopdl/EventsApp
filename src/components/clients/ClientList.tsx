"use client";

import { MessageCircle, Plus, Search, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type ClientAddress,
  type ClientDetails,
  type ClientWithStats,
  getClientLoyaltyTier,
} from "@/core/domain/client";
import {
  createClientInDb,
  deleteClientAddressInDb,
  getClientDetails,
  getClientsWithStats,
  saveClientAddressInDb,
  searchClients,
  updateClientAddressInDb,
  updateClientInDb,
} from "@/infrastructure/supabase/client-repository";
import { ClientDetailModal } from "./ClientDetailModal";
import { EditClientModal } from "./EditClientModal";

interface ClientListProps {
  onStartQuoteWithClient: (
    client: ClientWithStats,
    address?: ClientAddress,
  ) => void;
  onNotification: (msg: string) => void;
}

export function ClientList({
  onStartQuoteWithClient,
  onNotification,
}: ClientListProps) {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    const data = await getClientsWithStats();
    setClients(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    const results = await searchClients(query);
    setClients(results);
  };

  const handleSelectClient = async (client: ClientWithStats) => {
    let details = await getClientDetails(client.id);
    if (!details) {
      details = {
        ...client,
        bookings: [],
      };
    }
    setSelectedClient(details);
  };

  const handleUpdateClient = async (updated: Partial<ClientDetails>) => {
    if (!selectedClient) return;
    const ok = await updateClientInDb(selectedClient.id, updated);
    if (ok) {
      setSelectedClient((prev) => (prev ? { ...prev, ...updated } : null));
      onNotification("Datos de la clienta actualizados con éxito");
      loadClients();
    }
  };

  const handleSaveAddress = async (
    addrData: Omit<ClientAddress, "id" | "created_at" | "updated_at">,
    addrId?: string,
  ) => {
    if (!selectedClient) return;
    if (addrId) {
      await updateClientAddressInDb(addrId, addrData);
      onNotification("Dirección actualizada correctamente");
    } else {
      await saveClientAddressInDb(addrData);
      onNotification("Nueva dirección guardada");
    }
    const refreshed = await getClientDetails(selectedClient.id);
    if (refreshed) setSelectedClient(refreshed);
    loadClients();
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!selectedClient) return;
    await deleteClientAddressInDb(addrId);
    onNotification("Dirección eliminada");
    const refreshed = await getClientDetails(selectedClient.id);
    if (refreshed) setSelectedClient(refreshed);
    loadClients();
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Barra de Búsqueda y Crear */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar clienta por nombre o teléfono..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex h-10 items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 font-bold text-xs text-white shadow-xs hover:bg-blue-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva</span>
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span>{clients.length} clientas registradas</span>
        <span>Sistema de Lealtad Activo</span>
      </div>

      {/* Lista de Clientas */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
          Cargando directorio de clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="font-bold text-slate-700 text-xs">
            No se encontraron clientes
          </p>
          <p className="text-[11px] text-slate-400">
            Intenta con otro nombre o agrega una nueva clienta.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const loyalty = getClientLoyaltyTier(c.bookings_count);

            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-xs hover:border-blue-300 transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleSelectClient(c)}
                  className="flex items-center gap-2.5 flex-1 text-left active:scale-99"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 font-bold text-xs shrink-0">
                    {c.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-xs">
                        {c.full_name}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[9px] font-bold ${loyalty.bgClass} ${loyalty.colorClass} border ${loyalty.borderClass}`}
                      >
                        {loyalty.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {c.phone_whatsapp} • {c.bookings_count}{" "}
                      {c.bookings_count === 1 ? "evento" : "eventos"}
                    </p>
                    {c.addresses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.addresses.slice(0, 2).map((addr) => (
                          <span
                            key={addr.id}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                          >
                            {addr.alias}
                          </span>
                        ))}
                        {c.addresses.length > 2 && (
                          <span className="text-[9px] text-slate-400">
                            +{c.addresses.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/52${c.phone_whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onUpdateClient={handleUpdateClient}
          onSaveAddress={handleSaveAddress}
          onDeleteAddress={handleDeleteAddress}
          onStartQuote={(cl, addr) => {
            setSelectedClient(null);
            onStartQuoteWithClient(cl, addr);
          }}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {showCreateModal && (
        <EditClientModal
          client={{ id: "", full_name: "", phone_whatsapp: "", notes: "" }}
          onSave={async (newCli) => {
            const created = await createClientInDb({
              full_name: newCli.full_name || "",
              phone_whatsapp: newCli.phone_whatsapp || "",
              notes: newCli.notes,
            });
            if (created) {
              onNotification("Nueva clienta registrada con éxito");
              loadClients();
            }
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
