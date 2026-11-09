"use client";

import { Delete, Lock, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/core/domain/user";
import {
  authenticateWithPin,
  getAppUsers,
} from "@/infrastructure/supabase/user-repository";

interface LoginModalProps {
  onSuccess: (user: AppUser) => void;
  onClose?: () => void;
}

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAppUsers().then((loaded) => {
      setUsers(loaded);
      if (loaded.length > 0) {
        setSelectedUser(loaded[0]);
      }
    });
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setErrorMsg("");
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg("");
    setPin("");
  };

  const handleVerify = useCallback(
    async (pinToTest = pin) => {
      if (!selectedUser || pinToTest.length !== 6) return;
      setLoading(true);
      setErrorMsg("");

      const authenticated = await authenticateWithPin(
        selectedUser.username,
        pinToTest,
      );
      setLoading(false);

      if (authenticated) {
        localStorage.setItem(
          "fer_eventos_auth_user",
          JSON.stringify(authenticated),
        );
        onSuccess(authenticated);
      } else {
        setErrorMsg("PIN incorrecto. Intenta nuevamente.");
        setPin("");
      }
    },
    [pin, selectedUser, onSuccess],
  );

  // Verificación automática al llegar a 6 dígitos
  useEffect(() => {
    if (pin.length === 6 && selectedUser) {
      handleVerify(pin);
    }
  }, [pin, selectedUser, handleVerify]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-sm flex-col rounded-3xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Acceso al Sistema
              </h3>
              <p className="text-[11px] text-slate-500">
                Selecciona tu usuario y PIN
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selector de Usuario */}
        <div className="pt-4 space-y-1.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Usuario
          </span>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const isAdmin = u.role === "admin";
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setPin("");
                    setErrorMsg("");
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all active:scale-95 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/30"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold text-slate-900 text-xs line-clamp-1">
                    {u.full_name.split(" ")[0]}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold mt-1 ${
                      isAdmin
                        ? "bg-purple-100 text-purple-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isAdmin ? "Administración" : "Entregas"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Indicador de 6 Dígitos */}
        <div className="py-4 text-center">
          <p className="text-xs text-slate-600 font-medium mb-2">
            Ingresa tu PIN de 6 dígitos:
          </p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? "border-blue-600 bg-blue-600 scale-110"
                      : "border-slate-300 bg-slate-100"
                  }`}
                />
              );
            })}
          </div>
          {errorMsg && (
            <p className="mt-2 text-xs font-bold text-rose-600 animate-in shake">
              {errorMsg}
            </p>
          )}
          {loading && (
            <p className="mt-2 text-xs font-semibold text-blue-600 animate-pulse">
              Verificando PIN...
            </p>
          )}
        </div>

        {/* Teclado Numérico Táctil */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-800 text-lg shadow-2xs hover:bg-slate-200 active:scale-90 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-50 font-semibold text-slate-500 text-xs hover:bg-slate-100 active:scale-95"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-800 text-lg shadow-2xs hover:bg-slate-200 active:scale-90 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
