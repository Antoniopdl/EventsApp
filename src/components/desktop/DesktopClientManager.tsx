"use client";

import { Eye, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ClientAddress,
  type ClientDetails,
  type ClientWithStats,
  getClientLoyaltyTier,
} from "@/core/domain/client";
import {
  createClientInDb,
  deleteClientAddressInDb,
  deleteClientInDb,
  getClientDetails,
  getClientsWithStats,
  saveClientAddressInDb,
  updateClientInDb,
} from "@/infrastructure/supabase/client-repository";
import { formatCurrency } from "@/lib/utils";
import { ClientDetailModal } from "../clients/ClientDetailModal";
import { EditClientModal } from "../clients/EditClientModal";

interface DesktopClientManagerProps {
  onStartQuoteWithClient: (
    client: ClientWithStats,
    address?: ClientAddress,
  ) => void;
  onNotification: (msg: string) => void;
}

export function DesktopClientManager({
  onStartQuoteWithClient,
  onNotification,
}: DesktopClientManagerProps) {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const list = await getClientsWithStats();
    setClients(list);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const tier = getClientLoyaltyTier(c.bookings_count).tier;
      if (tierFilter !== "all" && tier !== tierFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.full_name.toLowerCase().includes(q);
        const matchPhone = c.phone_whatsapp.includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [clients, tierFilter, search]);

  const stats = useMemo(() => {
    const total = clients.length;
    const gold = clients.filter(
      (c) => getClientLoyaltyTier(c.bookings_count).tier === "oro",
    ).length;
    const silver = clients.filter(
      (c) => getClientLoyaltyTier(c.bookings_count).tier === "plata",
    ).length;
    const bronze = clients.filter(
      (c) => getClientLoyaltyTier(c.bookings_count).tier === "bronce",
    ).length;
    const totalSpent = clients.reduce((sum, c) => sum + c.total_spent, 0);
    return { total, gold, silver, bronze, totalSpent };
  }, [clients]);

  const handleDeleteClient = async (id: string, name: string) => {
    const ok = await deleteClientInDb(id);
    if (ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      onNotification(`Cliente "${name}" eliminado.`);
    } else {
      onNotification("Error al eliminar el cliente.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Tarjeta de Métricas de Clientes */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black text-sm">
              {stats.total}
            </span>
            <div>
              <p className="font-bold text-slate-900">Total Clientes</p>
              <p className="text-[11px] text-slate-500">
                {formatCurrency(stats.totalSpent)} facturado histórico
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold">
              🥇 Oro: {stats.gold}
            </span>
            <span className="text-slate-400 font-bold">
              🥈 Plata: {stats.silver}
            </span>
            <span className="text-amber-700 font-bold">
              🥉 Bronce: {stats.bronze}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>+ Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, WhatsApp o correo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTierFilter("all")}
            className={`rounded-lg px-2.5 py-1.5 transition-all ${
              tierFilter === "all"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600"
            }`}
          >
            Todos ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setTierFilter("oro")}
            className={`rounded-lg px-2.5 py-1.5 transition-all ${
              tierFilter === "oro"
                ? "bg-white text-amber-700 shadow-2xs"
                : "text-slate-600"
            }`}
          >
            🥇 Oro
          </button>
          <button
            type="button"
            onClick={() => setTierFilter("plata")}
            className={`rounded-lg px-2.5 py-1.5 transition-all ${
              tierFilter === "plata"
                ? "bg-white text-slate-700 shadow-2xs"
                : "text-slate-600"
            }`}
          >
            🥈 Plata
          </button>
          <button
            type="button"
            onClick={() => setTierFilter("bronce")}
            className={`rounded-lg px-2.5 py-1.5 transition-all ${
              tierFilter === "bronce"
                ? "bg-white text-amber-800 shadow-2xs"
                : "text-slate-600"
            }`}
          >
            🥉 Bronce
          </button>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 pl-4 pr-2">Cliente</th>
                <th className="px-3 py-3">Contacto / WhatsApp</th>
                <th className="px-3 py-3">Nivel de Lealtad</th>
                <th className="px-3 py-3 text-center">Eventos</th>
                <th className="px-3 py-3 text-right">Total Gastado</th>
                <th className="py-3 pr-4 pl-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const loyalty = getClientLoyaltyTier(client.bookings_count);
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={async () => {
                        const details = await getClientDetails(client.id);
                        if (details) setSelectedClient(details);
                      }}
                    >
                      {/* Nombre y Dirección Principal */}
                      <td className="py-3 pl-4 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-blue-700 text-sm">
                            {client.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs hover:text-blue-600">
                              {client.full_name}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {client.addresses[0]?.address_text ||
                                "Sin dirección registrada"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp / Teléfono */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-bold text-slate-900">
                            {client.phone_whatsapp}
                          </span>
                        </div>
                        {client.email && (
                          <span className="text-[11px] text-slate-400">
                            {client.email}
                          </span>
                        )}
                      </td>

                      {/* Nivel de Lealtad */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black shadow-2xs border border-slate-200 bg-slate-50">
                          <span>{loyalty.badge}</span>
                          <span>{loyalty.tierName}</span>
                        </span>
                      </td>

                      {/* Eventos */}
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 font-extrabold text-blue-700 text-xs">
                          {client.bookings_count} rentas
                        </span>
                      </td>

                      {/* Total Gastado */}
                      <td className="px-3 py-3 text-right">
                        <span className="font-black text-slate-900 text-xs">
                          {formatCurrency(client.total_spent)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 pr-4 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onStartQuoteWithClient(
                                client,
                                client.addresses[0],
                              )
                            }
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Cotizar evento para este cliente"
                          >
                            Cotizar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const details = await getClientDetails(client.id);
                              if (details) setSelectedClient(details);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Ver ficha e historial"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingClientId(client.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle / Historial */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onUpdateClient={async (updatedData) => {
            await updateClientInDb(selectedClient.id, updatedData);
            loadClients();
            const fresh = await getClientDetails(selectedClient.id);
            if (fresh) setSelectedClient(fresh);
          }}
          onSaveAddress={async (addressData) => {
            await saveClientAddressInDb(addressData);
            loadClients();
            const fresh = await getClientDetails(selectedClient.id);
            if (fresh) setSelectedClient(fresh);
          }}
          onDeleteAddress={async (addressId) => {
            await deleteClientAddressInDb(addressId);
            loadClients();
            const fresh = await getClientDetails(selectedClient.id);
            if (fresh) setSelectedClient(fresh);
          }}
          onStartQuote={(c, addr) => {
            setSelectedClient(null);
            onStartQuoteWithClient(c, addr);
          }}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Modal de Creación de Cliente */}
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
              setClients((prev) => [created, ...prev]);
              setShowCreateModal(false);
              onNotification(`Cliente "${created.full_name}" registrado.`);
            }
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Confirmación de Eliminación de Cliente */}
      {deletingClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  ¿Eliminar cliente?
                </h4>
                <p className="text-xs text-slate-500">
                  Esta acción quitará a la persona del directorio y sus
                  direcciones registradas.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingClientId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = clients.find((c) => c.id === deletingClientId);
                  if (target) {
                    await handleDeleteClient(target.id, target.full_name);
                  }
                  setDeletingClientId(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
