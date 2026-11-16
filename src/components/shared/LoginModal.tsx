"use client";

import { Delete, Lock, ShieldAlert, User, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/core/domain/user";
import { authenticateWithPin } from "@/infrastructure/supabase/user-repository";

interface LoginModalProps {
  onSuccess: (user: AppUser) => void;
  onClose?: () => void;
}

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [usernameInput, setUsernameInput] = useState("");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      const cleanUser = usernameInput.trim().toLowerCase();
      if (!cleanUser) {
        setErrorMsg("Escribe tu nombre de usuario primero.");
        setPin("");
        return;
      }
      if (pinToTest.length !== 6) return;

      setLoading(true);
      setErrorMsg("");

      const authenticated = await authenticateWithPin(cleanUser, pinToTest);
      setLoading(false);

      if (authenticated) {
        localStorage.setItem(
          "fer_eventos_auth_user",
          JSON.stringify(authenticated),
        );
        onSuccess(authenticated);
      } else {
        setErrorMsg("Usuario o PIN incorrecto. Acceso denegado.");
        setPin("");
      }
    },
    [pin, usernameInput, onSuccess],
  );

  // Verificación automática al completar 6 dígitos si ya escribió el usuario
  useEffect(() => {
    if (pin.length === 6 && usernameInput.trim().length > 0) {
      handleVerify(pin);
    }
  }, [pin, usernameInput, handleVerify]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Fer Eventos
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Acceso Privado Protegido
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

        {/* Campo de Usuario Privado */}
        <div className="pt-4 space-y-1.5">
          <label
            htmlFor="login-username"
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            Usuario
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={usernameInput}
              onChange={(e) => {
                setErrorMsg("");
                setUsernameInput(e.target.value);
              }}
              placeholder="Ingresa tu usuario"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-2.5 pr-3 pl-9 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Indicador de PIN de 6 dígitos */}
        <div className="pt-4 text-center space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            PIN de Seguridad (6 dígitos)
          </span>
          <div className="flex justify-center gap-2.5 py-1">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const filled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    filled
                      ? "bg-blue-600 border-blue-600 scale-110"
                      : "border-slate-300 bg-slate-50"
                  }`}
                />
              );
            })}
          </div>
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <p className="text-[11px] font-bold">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Teclado Numérico Táctil */}
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleDigit(num)}
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-lg shadow-2xs hover:bg-slate-100 active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 font-bold text-slate-600 text-xs hover:bg-slate-200 active:scale-95"
          >
            Limpiar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDigit("0")}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-lg shadow-2xs hover:bg-slate-100 active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400 font-medium">
          Solo personal autorizado de Fer Eventos.
        </p>
      </div>
    </div>
  );
}
