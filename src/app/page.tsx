"use client";

import { CheckCircle2, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EventAgenda } from "@/components/bookings/EventAgenda";
import { QuoteWizard } from "@/components/bookings/QuoteWizard";
import { ClientList } from "@/components/clients/ClientList";
import { DesktopClientManager } from "@/components/desktop/DesktopClientManager";
import { DesktopInventoryManager } from "@/components/desktop/DesktopInventoryManager";
import { DesktopLayout } from "@/components/desktop/DesktopLayout";
import { CategoryManagerModal } from "@/components/inventory/CategoryManagerModal";
import { CreateLooseItemModal } from "@/components/inventory/CreateLooseItemModal";
import { CreatePackageModal } from "@/components/inventory/CreatePackageModal";
import { EditProductModal } from "@/components/inventory/EditProductModal";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { LogisticsTimeline } from "@/components/logistics/LogisticsTimeline";
import { BottomNav, type NavTab } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import { LoginModal } from "@/components/shared/LoginModal";
import { UserSettingsModal } from "@/components/shared/UserSettingsModal";
import type { ClientAddress, ClientWithStats } from "@/core/domain/client";
import type { Category, InventoryItem } from "@/core/domain/inventory";
import type { AppUser, UserRole } from "@/core/domain/user";
import { INITIAL_INVENTORY_SEED } from "@/core/use-cases/inventory";
import { getCategories } from "@/infrastructure/supabase/category-repository";
import {
  deleteItemFromDb,
  getInventoryItems,
  getLastSupabaseError,
  subscribeToInventoryRealtime,
  updateItemDetailsInDb,
  updateItemStockInDb,
  updateVariantStockInDb,
} from "@/infrastructure/supabase/inventory-repository";

export default function Home() {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [tab, setTab] = useState<NavTab>("inventory");
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY_SEED);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modo de visualización en laptop (escritorio por defecto en pantallas grandes, pero alternable)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Modales compartidos de inventario
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showCreateLooseModal, setShowCreateLooseModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(
    null,
  );

  // Modales generales
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);

  // Cliente preseleccionado para cotizar
  const [quoteClient, setQuoteClient] = useState<ClientWithStats | null>(null);
  const [quoteAddress, setQuoteAddress] = useState<ClientAddress | null>(null);

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  }, []);

  // Verificar sesión persistida (bloqueo estricto si no hay sesión)
  useEffect(() => {
    const saved = localStorage.getItem("fer_eventos_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppUser;
        if (parsed?.username && parsed?.role) {
          setCurrentUser(parsed);
          setRole(parsed.role);
          if (parsed.role === "driver") {
            setTab("logistics");
          }
        }
      } catch {
        localStorage.removeItem("fer_eventos_auth_user");
      }
    }
    setIsAuthChecked(true);
  }, []);

  // Carga inicial de inventario SOLO cuando el usuario ya está autenticado
  useEffect(() => {
    if (!currentUser) return;

    setCategories(getCategories());
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
  }, [currentUser, showNotification]);

  const handleDeleteItem = async (id: string, name: string) => {
    const ok = await deleteItemFromDb(id);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      showNotification(`"${name}" eliminado del inventario.`);
    } else {
      showNotification("Error al eliminar el producto.");
    }
  };

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
      showNotification("Datos guardados correctamente");
    } else {
      const detail = getLastSupabaseError();
      showNotification(
        detail
          ? `Error servidor: ${detail}`
          : "Error al guardar en el servidor",
      );
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
    if (currentUser?.role !== "admin" && newRole === "admin") {
      showNotification("Solo Administración puede cambiar a este modo.");
      return;
    }
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

  // Pantalla de carga inicial mientras se verifica la sesión
  if (!isAuthChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Lock className="h-8 w-8 text-blue-400 animate-pulse" />
          <p className="text-xs font-semibold text-slate-300">
            Verificando acceso seguro...
          </p>
        </div>
      </div>
    );
  }

  // Bloqueo Estricto: si no hay usuario autenticado, NO se muestra ni se carga ningún dato
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <LoginModal
          onSuccess={(user) => {
            setCurrentUser(user);
            setRole(user.role);
            if (user.role === "driver") {
              setTab("logistics");
            } else {
              setTab("inventory");
            }
            showNotification(`Bienvenido, ${user.full_name.split(" ")[0]}`);
          }}
        />
      </div>
    );
  }

  // Renderizado en Modo Escritorio para Laptop/Computadora (Solo cuando viewMode === 'desktop' y sea admin)
  if (viewMode === "desktop" && role === "admin") {
    return (
      <div className="relative">
        <DesktopLayout
          currentUser={currentUser}
          currentRole={role}
          activeTab={tab}
          onTabChange={(newTab) => setTab(newTab as NavTab)}
          onRoleChange={handleRoleChange}
          onOpenSettings={() => setShowUserSettingsModal(true)}
          onLogout={handleLogout}
          onSwitchToMobileView={() => setViewMode("mobile")}
          onNotification={showNotification}
        >
          {tab === "inventory" && (
            <DesktopInventoryManager
              items={items}
              categories={categories}
              onOpenCreateLoose={() => setShowCreateLooseModal(true)}
              onOpenCreatePackage={() => setShowCreatePackageModal(true)}
              onOpenCategoryManager={() => setShowCategoryManager(true)}
              onOpenFullEdit={(item) => setEditingProduct(item)}
              onUpdateDetails={handleUpdateDetails}
              onDeleteItem={handleDeleteItem}
              onNotification={showNotification}
            />
          )}

          {tab === "clients" && (
            <DesktopClientManager
              onStartQuoteWithClient={(c, addr) => {
                handleStartQuoteFromClient(c, addr);
                setTab("quote");
              }}
              onNotification={showNotification}
            />
          )}

          {tab === "quote" && (
            <div className="max-w-3xl mx-auto">
              <QuoteWizard
                inventory={items}
                initialClient={quoteClient}
                initialAddress={quoteAddress}
                onNotification={showNotification}
                onBookingCreated={() => {
                  showNotification("¡Renta agendada! Consulta en la Agenda.");
                }}
              />
            </div>
          )}

          {tab === "events" && (
            <div className="max-w-4xl mx-auto">
              <EventAgenda onNotification={showNotification} />
            </div>
          )}

          {tab === "logistics" && (
            <div className="max-w-4xl mx-auto">
              <LogisticsTimeline
                role={role}
                onNotification={showNotification}
              />
            </div>
          )}
        </DesktopLayout>

        {/* Notificación Toast Flotante */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="font-semibold text-xs">{toastMessage}</p>
          </div>
        )}

        {/* Modales de Inventario en Desktop */}
        {showCreateLooseModal && (
          <CreateLooseItemModal
            categories={categories}
            onClose={() => setShowCreateLooseModal(false)}
            onItemCreated={(newItem) => {
              setItems((prev) => [newItem, ...prev]);
              showNotification(`Artículo "${newItem.name}" creado con éxito.`);
            }}
            onNotification={showNotification}
          />
        )}

        {showCreatePackageModal && (
          <CreatePackageModal
            availableItems={items}
            onClose={() => setShowCreatePackageModal(false)}
            onPackageCreated={(newPkg) => {
              setItems((prev) => [newPkg, ...prev]);
              showNotification(`Paquete "${newPkg.name}" creado con éxito.`);
            }}
            onNotification={showNotification}
          />
        )}

        {showCategoryManager && (
          <CategoryManagerModal
            categories={categories}
            onClose={() => setShowCategoryManager(false)}
            onCategoriesUpdated={(updated) => setCategories(updated)}
            onNotification={showNotification}
          />
        )}

        {editingProduct && (
          <EditProductModal
            item={editingProduct}
            allItems={items}
            categories={categories}
            onClose={() => setEditingProduct(null)}
            onSave={handleUpdateDetails}
            onNotification={showNotification}
          />
        )}

        {showUserSettingsModal && (
          <UserSettingsModal
            onClose={() => setShowUserSettingsModal(false)}
            onNotification={showNotification}
          />
        )}
      </div>
    );
  }

  // Renderizado en Modo Móvil (iPhone / Teléfono) - 100% Intacto
  return (
    <div className="flex min-h-screen justify-center bg-slate-100 sm:p-4">
      <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[850px] sm:max-h-[880px] sm:rounded-[36px] sm:border-8 sm:border-slate-800">
        <Header
          currentRole={role}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          onOpenSettings={() => setShowUserSettingsModal(true)}
          onLogout={handleLogout}
          onSwitchToDesktop={() => setViewMode("desktop")}
        />

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24 no-scrollbar">
          {tab === "inventory" && role === "admin" && (
            <InventoryGrid
              items={items}
              role={role}
              onAdjustStock={handleAdjustStock}
              onUpdateDetails={handleUpdateDetails}
              onUpdateVariantStock={handleUpdateVariantStock}
              onItemCreated={(newItem) => {
                setItems((prev) => [newItem, ...prev]);
                showNotification(`${newItem.name} agregado al inventario.`);
              }}
              onNotification={showNotification}
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
