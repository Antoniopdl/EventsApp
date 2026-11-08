"use client";

import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  CheckCircle2,
  Navigation,
  X,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/core/domain/user";

interface LogisticsTimelineProps {
  role: UserRole;
  onNotification: (msg: string) => void;
}

export function LogisticsTimeline({
  role,
  onNotification,
}: LogisticsTimelineProps) {
  const [stop1Completed, setStop1Completed] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [jarronCount, setJarronCount] = useState(4);
  const [stop2Completed, setStop2Completed] = useState(false);

  const isAdmin = role === "admin";

  const handleCompleteStop1 = () => {
    setStop1Completed(true);
    onNotification("✅ Entrega #1 registrada como completada.");
  };

  const handleFinishCheckout = (allGood: boolean) => {
    setShowCheckoutModal(false);
    setStop2Completed(true);
    if (allGood) {
      onNotification("✅ Mobiliario completo. Depósito liberado íntegro.");
    } else {
      onNotification("⚠️ Se registró retención por daño. Notificación enviada.");
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Rutas del Día</h2>
          <p className="text-slate-500 text-xs">Sábado, 14 de Noviembre 2026</p>
        </div>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-800 text-xs">
          2 Paradas
        </span>
      </div>

      {/* Parada 1: Entrega en la mañana */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-[11px] text-amber-800">
            <ArrowUp className="h-3 w-3" />
            <span>Entrega 10:30 AM</span>
          </span>
          <span className="font-bold text-slate-400 text-xs">Parada #1</span>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-xs">
            Boda López & García
          </h4>
          <p className="text-[11px] text-slate-500">
            Salón Los Arcos, Calle Juárez #45, Angostura
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2 font-medium text-[11px] text-slate-700">
          📦 Carga: 100 Sillas Tiffany, 10 Mesas Redondas, 10 Manteles
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs transition-colors hover:bg-slate-200 active:scale-95"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            <span>Navegar GPS</span>
          </a>

          <button
            type="button"
            onClick={handleCompleteStop1}
            disabled={stop1Completed}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-xs shadow-xs transition-all active:scale-95 ${
              stop1Completed
                ? "bg-slate-100 text-slate-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>{stop1Completed ? "Completado" : "Entregado"}</span>
          </button>
        </div>
      </div>

      {/* Parada 2: Recolección en la noche */}
      <div className="space-y-2 rounded-2xl border-2 border-blue-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 font-bold text-[11px] text-purple-800">
            <ArrowDown className="h-3 w-3" />
            <span>Recolección 11:30 PM</span>
          </span>
          <span className="font-bold text-blue-600 text-xs">Parada #2</span>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-xs">XV Años Camila</h4>
          <p className="text-[11px] text-slate-500">
            Casino Ejidal, Colonia Agrícola México
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2 font-medium text-[11px] text-amber-900">
          <span>⚠️ Incluye: 4 Jarrones Cristal (Frágiles)</span>
          {isAdmin && (
            <span className="font-bold text-amber-800">Depósito: $600</span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-1/3 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs hover:bg-slate-200"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            <span>GPS</span>
          </a>

          <button
            type="button"
            onClick={() => setShowCheckoutModal(true)}
            disabled={stop2Completed}
            className={`flex w-2/3 items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-xs shadow-xs transition-all active:scale-95 ${
              stop2Completed
                ? "bg-slate-100 text-slate-400"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{stop2Completed ? "Recogido" : "Revisar & Recoger"}</span>
          </button>
        </div>
      </div>

      {/* Modal de Check-Out / Daños */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="w-full max-w-sm space-y-4 rounded-t-[28px] bg-white p-5 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Revisión al Recoger
                </h3>
                <p className="text-[11px] text-slate-500">
                  XV Años Camila • Casino Ejidal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                <div>
                  <p className="font-bold text-slate-800">Silla Tiffany</p>
                  <p className="text-[11px] text-slate-500">
                    Rentadas: 100 • $250 c/u reposición
                  </p>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 text-xs">
                  100 / 100
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <div>
                  <p className="font-bold text-amber-950">
                    Jarrón Cristal (Frágil)
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Rentados: 4 • $300 c/u reposición
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setJarronCount((prev) => Math.max(0, prev - 1))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 font-bold text-amber-900"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-amber-950 text-xs">
                    {jarronCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setJarronCount((prev) => Math.min(4, prev + 1))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 font-bold text-amber-900"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-slate-200 border-dashed p-3 text-center">
              <button
                type="button"
                className="mx-auto flex items-center justify-center gap-1.5 font-bold text-blue-600 text-xs"
              >
                <Camera className="h-4 w-4" />
                <span>Foto de Evidencia (Cámara iPhone)</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleFinishCheckout(true)}
                className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white text-xs shadow-md active:scale-95"
              >
                ✅ Todo Completo (Liberar Depósito)
              </button>
              {jarronCount < 4 && (
                <button
                  type="button"
                  onClick={() => handleFinishCheckout(false)}
                  className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white text-xs shadow-md active:scale-95"
                >
                  ⚠️ Retener ${(4 - jarronCount) * 300} por daño
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
