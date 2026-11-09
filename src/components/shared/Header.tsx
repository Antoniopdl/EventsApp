import { Lock, Settings } from "lucide-react";
import type { AppUser, UserRole } from "@/core/domain/user";

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: AppUser | null;
  onRoleChange: (role: UserRole) => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export function Header({
  currentRole,
  currentUser,
  onRoleChange,
  onOpenSettings,
  onLogout,
}: HeaderProps) {
  const isAdmin = currentRole === "admin";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-lg text-white shadow-xs">
          FE
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-900 leading-tight">
            Fer Eventos
          </h1>
          {currentUser && (
            <p className="text-[10px] text-slate-500 font-medium">
              {currentUser.full_name.split(" ")[0]} (
              {isAdmin ? "Admin" : "Chofer"})
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onRoleChange("admin")}
            className={`rounded-full px-2.5 py-1 font-semibold text-xs transition-all ${
              currentRole === "admin"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Administración
          </button>
          <button
            type="button"
            onClick={() => onRoleChange("driver")}
            className={`rounded-full px-2.5 py-1 font-semibold text-xs transition-all ${
              currentRole === "driver"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Entregas
          </button>
        </div>

        {isAdmin && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configuración de Usuarios y PINs"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Bloquear / Cerrar Sesión"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
