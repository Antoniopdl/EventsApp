"use client";

import { CheckCircle2, PlusCircle, Route } from "lucide-react";
import { useState } from "react";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { BottomNav, type NavTab } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import type { UserRole } from "@/core/domain/user";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";

export default function Home() {
  const [role, setRole] = useState<UserRole>("admin");
  const [tab, setTab] = useState<NavTab>("inventory");
  const [items, setItems] = useState(INITIAL_INVENTORY_SEED);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAdjustStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, total_stock: Math.max(0, item.total_stock + delta) }
          : item,
      ),
    );
    const affected = items.find((i) => i.id === id);
    if (affected) {
      showNotification(`Stock de ${affected.name} actualizado`);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-100 sm:p-4">
      <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[850px] sm:max-h-[880px] sm:rounded-[36px] sm:border-8 sm:border-slate-800">
        <Header currentRole={role} onRoleChange={setRole} />

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24 no-scrollbar">
          {tab === "inventory" && (
            <InventoryGrid
              items={items}
              role={role}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {tab === "quote" && (
            <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-center">
              <PlusCircle className="mx-auto h-10 w-10 text-blue-600" />
              <h2 className="font-bold text-base text-slate-900">
                Asistente de Cotización
              </h2>
              <p className="text-slate-600 text-xs">
                Genera cotizaciones en 4 pasos con cálculo de flete en Google
                Maps y botón directo a WhatsApp.
              </p>
            </div>
          )}

          {tab === "logistics" && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Route className="h-5 w-5" />
                <h2 className="font-bold text-sm text-slate-900">
                  Rutas del Día (Timeline)
                </h2>
              </div>
              <p className="text-slate-500 text-xs">
                Entregas y recolecciones programadas para hoy desde la bodega de
                Angostura, Sinaloa.
              </p>
            </div>
          )}

          {tab === "events" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <h2 className="font-bold text-sm text-slate-900">
                Agenda de Eventos
              </h2>
              <p className="mt-1 text-slate-500 text-xs">
                Calendario mensual de disponibilidad y reservas activas.
              </p>
            </div>
          )}
        </main>

        <BottomNav activeTab={tab} onTabChange={setTab} role={role} />

        {toastMessage && (
          <div className="fixed top-14 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 font-semibold text-white text-xs shadow-lg backdrop-blur-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
