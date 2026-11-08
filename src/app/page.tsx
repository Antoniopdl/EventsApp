"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { QuoteWizard } from "@/components/bookings/QuoteWizard";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { LogisticsTimeline } from "@/components/logistics/LogisticsTimeline";
import { BottomNav, type NavTab } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import type { InventoryItem } from "@/core/domain/inventory";
import type { UserRole } from "@/core/domain/user";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { isSupabaseConfigured } from "@/infrastructure/supabase/client";
import {
  getInventoryItems,
  subscribeToInventoryRealtime,
  updateItemStockInDb,
} from "@/infrastructure/supabase/inventory-repository";

export default function Home() {
  const [role, setRole] = useState<UserRole>("admin");
  const [tab, setTab] = useState<NavTab>("inventory");
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY_SEED);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Carga inicial desde Supabase y suscripción en tiempo real
  useEffect(() => {
    getInventoryItems().then((loadedItems) => {
      if (loadedItems && loadedItems.length > 0) {
        setItems(loadedItems);
      }
    });

    const unsubscribe = subscribeToInventoryRealtime((updatedItem) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      );
      showNotification(`En vivo: Stock de ${updatedItem.name} actualizado`);
    });

    return () => {
      unsubscribe();
    };
  }, [showNotification]);

  const handleAdjustStock = async (id: string, delta: number) => {
    const currentItem = items.find((i) => i.id === id);
    if (!currentItem) return;

    const newStock = Math.max(0, currentItem.total_stock + delta);

    // Optimistic update local
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, total_stock: newStock } : item,
      ),
    );

    showNotification(`Stock de ${currentItem.name}: ${newStock}`);

    // Persistir en Supabase si está configurado
    await updateItemStockInDb(id, newStock);
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-100 sm:p-4">
      <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[850px] sm:max-h-[880px] sm:rounded-[36px] sm:border-8 sm:border-slate-800">
        <Header currentRole={role} onRoleChange={setRole} />

        {/* Indicador de Estado de Conexión a Base de Datos */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    isSupabaseConfigured ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isSupabaseConfigured ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="font-semibold text-slate-700">
                {isSupabaseConfigured
                  ? "Supabase Conectado (En vivo)"
                  : "Modo Local (Listo para Anon Key)"}
              </span>
            </div>
            <span className="font-medium text-slate-400">
              {items.length} Artículos
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24 no-scrollbar">
          {tab === "inventory" && (
            <InventoryGrid
              items={items}
              role={role}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {tab === "quote" && <QuoteWizard inventory={items} />}

          {tab === "logistics" && (
            <LogisticsTimeline role={role} onNotification={showNotification} />
          )}

          {tab === "events" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-sm">
                  Agenda de Noviembre 2026
                </h2>
                <span className="font-bold text-blue-600 text-xs">
                  2 Eventos
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border-emerald-500 border-l-4 bg-white p-3 shadow-xs">
                  <div>
                    <p className="font-bold text-[11px] text-emerald-700">
                      Sábado 14 Nov • 2:00 PM
                    </p>
                    <h4 className="font-bold text-slate-800 text-xs">
                      Boda Gómez - Salón Bugambilias
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      120 Sillas Tiffany, 12 Mesas
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700 text-xs">
                    Liquidado
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border-amber-500 border-l-4 bg-white p-3 shadow-xs">
                  <div>
                    <p className="font-bold text-[11px] text-amber-700">
                      Domingo 15 Nov • 4:00 PM
                    </p>
                    <h4 className="font-bold text-slate-800 text-xs">
                      Bautizo Mateo - Casa Club
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      50 Sillas Plegables, 5 Mesas
                    </p>
                  </div>
                  <span className="rounded-lg bg-amber-100 px-2 py-1 font-bold text-amber-800 text-xs">
                    Anticipo 50%
                  </span>
                </div>
              </div>
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
