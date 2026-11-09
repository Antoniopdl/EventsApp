"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EventAgenda } from "@/components/bookings/EventAgenda";
import { QuoteWizard } from "@/components/bookings/QuoteWizard";
import { ClientList } from "@/components/clients/ClientList";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { LogisticsTimeline } from "@/components/logistics/LogisticsTimeline";
import { BottomNav, type NavTab } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import { LoginModal } from "@/components/shared/LoginModal";
import { UserSettingsModal } from "@/components/shared/UserSettingsModal";
import type { ClientAddress, ClientWithStats } from "@/core/domain/client";
import type { InventoryItem } from "@/core/domain/inventory";
import type { AppUser, UserRole } from "@/core/domain/user";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import {
  getInventoryItems,
  subscribeToInventoryRealtime,
  updateItemDetailsInDb,
  updateItemStockInDb,
  updateVariantStockInDb,
} from "@/infrastructure/supabase/inventory-repository";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [tab, setTab] = useState<NavTab>("inventory");
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY_SEED);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modales
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);

  // Cliente preseleccionado para cotizar
  const [quoteClient, setQuoteClient] = useState<ClientWithStats | null>(null);
  const [quoteAddress, setQuoteAddress] = useState<ClientAddress | null>(null);

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Verificar sesión persistida
  useEffect(() => {
    const saved = localStorage.getItem("fer_eventos_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppUser;
        setCurrentUser(parsed);
        setRole(parsed.role);
        if (parsed.role === "driver") {
          setTab("logistics");
        }
      } catch {
        setShowLoginModal(true);
      }
    }
  }, []);

  // Carga inicial de inventario y suscripción en tiempo real
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
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, total_stock: newStock } : item,
      ),
    );
    showNotification(`Stock de ${currentItem.name}: ${newStock}`);
    await updateItemStockInDb(id, newStock);
  };

  const handleUpdateDetails = async (
    id: string,
    updates: Partial<InventoryItem>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
    const success = await updateItemDetailsInDb(id, updates);
    if (success) {
      showNotification("Datos guardados automáticamente");
    } else {
      showNotification("Error al guardar en el servidor");
    }
  };

  const handleUpdateVariantStock = async (
    variantId: string,
    newStock: number,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.variants) return item;
        const hasVariant = item.variants.some((v) => v.id === variantId);
        if (!hasVariant) return item;
        return {
          ...item,
          variants: item.variants.map((v) =>
            v.id === variantId ? { ...v, total_stock: newStock } : v,
          ),
        };
      }),
    );
    const success = await updateVariantStockInDb(variantId, newStock);
    if (success) {
      showNotification(`Stock de variante actualizado: ${newStock}`);
    } else {
      showNotification("Error al actualizar variante");
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === "driver") {
      setTab("logistics");
      showNotification("Modo Entregas activado.");
    } else {
      showNotification("Modo Administración activado.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("fer_eventos_auth_user");
    setCurrentUser(null);
    setShowLoginModal(true);
  };

  const handleStartQuoteFromClient = (
    client: ClientWithStats,
    address?: ClientAddress,
  ) => {
    setQuoteClient(client);
    setQuoteAddress(address || client.addresses[0] || null);
    setTab("quote");
    showNotification(
      `Iniciando cotización para ${client.full_name.split(" ")[0]}`,
    );
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-100 sm:p-4">
      <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[850px] sm:max-h-[880px] sm:rounded-[36px] sm:border-8 sm:border-slate-800">
        <Header
          currentRole={role}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          onOpenSettings={() => setShowUserSettingsModal(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24 no-scrollbar">
          {tab === "inventory" && role === "admin" && (
            <InventoryGrid
              items={items}
              role={role}
              onAdjustStock={handleAdjustStock}
              onUpdateDetails={handleUpdateDetails}
              onUpdateVariantStock={handleUpdateVariantStock}
              onPackageCreated={(newPkg) => {
                setItems((prev) => [newPkg, ...prev]);
                showNotification(
                  `Paquete ${newPkg.name} agregado al inventario.`,
                );
              }}
            />
          )}

          {tab === "clients" && role === "admin" && (
            <ClientList
              onStartQuoteWithClient={handleStartQuoteFromClient}
              onNotification={showNotification}
            />
          )}

          {tab === "quote" && role === "admin" && (
            <QuoteWizard
              inventory={items}
              initialClient={quoteClient}
              initialAddress={quoteAddress}
              onNotification={showNotification}
              onBookingCreated={() => {
                showNotification("¡Renta agendada! Consulta en la Agenda.");
              }}
            />
          )}

          {tab === "logistics" && (
            <LogisticsTimeline role={role} onNotification={showNotification} />
          )}

          {tab === "events" && role === "admin" && (
            <EventAgenda onNotification={showNotification} />
          )}
        </main>

        {/* Notificación Toast Flotante */}
        {toastMessage && (
          <div className="absolute top-16 right-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="font-semibold text-xs">{toastMessage}</p>
          </div>
        )}

        <BottomNav activeTab={tab} onTabChange={setTab} role={role} />

        {/* Modal de Inicio de Sesión con PIN de 6 Dígitos */}
        {showLoginModal && (
          <LoginModal
            onSuccess={(user) => {
              setCurrentUser(user);
              setRole(user.role);
              setShowLoginModal(false);
              if (user.role === "driver") {
                setTab("logistics");
              }
              showNotification(`Bienvenido, ${user.full_name.split(" ")[0]}`);
            }}
            onClose={currentUser ? () => setShowLoginModal(false) : undefined}
          />
        )}

        {/* Modal de Configuración de Usuarios y PINs */}
        {showUserSettingsModal && (
          <UserSettingsModal
            onClose={() => setShowUserSettingsModal(false)}
            onNotification={showNotification}
          />
        )}
      </div>
    </div>
  );
}
