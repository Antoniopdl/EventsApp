import { CalendarDays, Package, Plus, Truck, Users } from "lucide-react";
import type { UserRole } from "@/core/domain/user";

export type NavTab = "inventory" | "clients" | "quote" | "logistics" | "events";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  role: UserRole;
}

export function BottomNav({ activeTab, onTabChange, role }: BottomNavProps) {
  const isAdmin = role === "admin";

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onTabChange("inventory")}
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          activeTab === "inventory"
            ? "font-bold text-blue-600"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Package className="h-5 w-5" />
        <span>Inventario</span>
      </button>

      {isAdmin && (
        <button
          type="button"
          onClick={() => onTabChange("clients")}
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            activeTab === "clients"
              ? "font-bold text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Clientes</span>
        </button>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => onTabChange("quote")}
          className="flex flex-col items-center gap-0.5 font-medium text-[10px] text-slate-400 hover:text-slate-600"
        >
          <div className="-mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-transform active:scale-95">
            <Plus className="h-5 w-5" />
          </div>
          <span>Cotizar</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onTabChange("logistics")}
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          activeTab === "logistics"
            ? "font-bold text-blue-600"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Truck className="h-5 w-5" />
        <span>Rutas</span>
      </button>

      {isAdmin && (
        <button
          type="button"
          onClick={() => onTabChange("events")}
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            activeTab === "events"
              ? "font-bold text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span>Agenda</span>
        </button>
      )}
    </nav>
  );
}
