"use client";

import {
  Boxes,
  Calendar,
  ChevronRight,
  LogOut,
  Package,
  Settings,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppUser, UserRole } from "@/core/domain/user";

interface DesktopLayoutProps {
  currentUser: AppUser | null;
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRoleChange: (role: UserRole) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSwitchToMobileView: () => void;
  onNotification?: (msg: string) => void;
  children: ReactNode;
}

export function DesktopLayout({
  currentUser,
  currentRole,
  activeTab,
  onTabChange,
  onRoleChange,
  onOpenSettings,
  onLogout,
  onSwitchToMobileView,
  _onNotification,
  children,
}: DesktopLayoutProps & { _onNotification?: (msg: string) => void }) {
  const navigationItems = [
    {
      id: "inventory",
      label: "Inventario y Catálogo",
      icon: Boxes,
      badge: "Gestor",
    },
    {
      id: "quote",
      label: "Cotizador de Eventos",
      icon: Package,
      badge: "Paso a paso",
    },
    {
      id: "clients",
      label: "Directorio de Clientes",
      icon: Users,
      badge: "CRM",
    },
    {
      id: "events",
      label: "Agenda y Calendario",
      icon: Calendar,
      badge: "Eventos",
    },
    {
      id: "logistics",
      label: "Logística y Rutas",
      icon: Truck,
      badge: "Entregas",
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Barra Lateral Izquierda (Sidebar) */}
      <aside className="flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 shadow-sm select-none">
        <div className="space-y-6">
          {/* Logo y Encabezado de Fer Eventos */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black text-white text-base shadow-md">
              FE
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Fer Eventos
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                Panel de Administración
              </p>
            </div>
          </div>

          {/* Selector de Rol (Admin / Entregas) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onRoleChange("admin")}
                className={`rounded-xl py-1.5 transition-all ${
                  currentRole === "admin"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => onRoleChange("driver")}
                className={`rounded-xl py-1.5 transition-all ${
                  currentRole === "driver"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Entregas
              </button>
            </div>
          </div>

          {/* Menú de Navegación Principal */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Módulos Principales
            </p>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all active:scale-98 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </nav>

          {/* Acceso Directo al Catálogo de Manteles para Clientes */}
          <a
            href="/catalogo"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-between rounded-2xl border border-purple-200 bg-purple-50/70 px-3.5 py-2.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-all active:scale-98"
            title="Abrir catálogo público de manteles para compartir con clientes"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🎨</span>
              <span>Catálogo Clientes</span>
            </div>
            <span className="text-[10px] font-extrabold text-purple-700 bg-purple-200/60 px-1.5 py-0.5 rounded-md">
              Link ↗
            </span>
          </a>
        </div>

        {/* Zona Inferior: Botón de Alternar a Vista Móvil y Perfil */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {/* Botón para alternar a vista de teléfono en pantalla */}
          <button
            type="button"
            onClick={onSwitchToMobileView}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all active:scale-98"
            title="Ver la aplicación en formato celular iPhone"
          >
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span>Vista Móvil (iPhone)</span>
          </button>

          {/* Usuario y Ajustes */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-2.5 border border-slate-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-blue-700 text-xs">
                {currentUser?.full_name?.charAt(0) || "A"}
              </div>
              <div className="truncate text-left">
                <p className="truncate text-xs font-bold text-slate-900">
                  {currentUser?.full_name?.split(" ")[0] || "Administrador"}
                </p>
                <p className="text-[10px] text-slate-400 font-medium capitalize">
                  {currentRole === "admin" ? "Administración" : "Chofer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-blue-600 transition-colors"
                title="Configuración de usuarios y Supabase"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido Principal de Escritorio */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra Superior de Escritorio */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-2xs">
          <div>
            <h1 className="text-base font-black text-slate-900">
              {activeTab === "inventory" &&
                "Inventario y Catálogo de Mobiliario"}
              {activeTab === "quote" && "Cotizador de Eventos y Rentas"}
              {activeTab === "clients" && "Directorio de Clientes"}
              {activeTab === "events" && "Agenda y Calendario de Eventos"}
              {activeTab === "logistics" && "Logística de Rutas y Fletes"}
            </h1>
            <p className="text-[11px] font-semibold text-slate-400">
              Gestión para computadora y laptop en pantalla completa
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Estado de Supabase en Vivo */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Conectado</span>
            </div>

            {/* Alternar Vista Móvil */}
            <button
              type="button"
              onClick={onSwitchToMobileView}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Smartphone className="h-4 w-4 text-slate-500" />
              <span>Ver como Celular</span>
            </button>
          </div>
        </header>

        {/* Área scrolleable de trabajo */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
