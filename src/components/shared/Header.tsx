import type { UserRole } from "@/core/domain/user";

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export function Header({ currentRole, onRoleChange }: HeaderProps) {
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
          <p className="font-medium text-slate-500 text-xs">
            Angostura, Sinaloa
          </p>
        </div>
      </div>

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
          Mamá
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
          Chofer
        </button>
      </div>
    </header>
  );
}
