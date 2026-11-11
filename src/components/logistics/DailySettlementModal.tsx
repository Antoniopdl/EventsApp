"use client";

import { Check, DollarSign, Fuel, Receipt, X } from "lucide-react";
import type { Booking } from "@/core/domain/booking";
import type { FuelLog } from "@/core/domain/logistics";
import { formatCurrency } from "@/lib/utils";

interface DailySettlementModalProps {
  date: string;
  bookings: Booking[];
  completedStops: Record<string, boolean>;
  fuelLogs: FuelLog[];
  onClose: () => void;
}

export function DailySettlementModal({
  date,
  bookings,
  completedStops,
  fuelLogs,
  onClose,
}: DailySettlementModalProps) {
  // Suma de saldos cobrados en paradas completadas o registradas
  const collectedBookings = bookings.filter((b) => completedStops[b.id]);
  const totalCollected = collectedBookings.reduce(
    (acc, b) => acc + (b.balance_due || 0),
    0,
  );

  const totalFuel = fuelLogs.reduce((acc, f) => acc + f.amount_mxn, 0);
  const netCash = Math.max(0, totalCollected - totalFuel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">
                Liquidación de Caja del Día
              </h3>
              <p className="text-[10px] text-slate-600">{date}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Tarjeta de Resumen Neto Principal */}
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Cobrado en Efectivo:</span>
              </span>
              <span className="font-bold text-emerald-950 text-sm">
                +{formatCurrency(totalCollected)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-amber-500" />
                <span>Gastado en Combustible:</span>
              </span>
              <span className="font-bold text-rose-600 text-sm">
                -{formatCurrency(totalFuel)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">
                  EFECTIVO NETO A ENTREGAR:
                </span>
                <span className="text-[10px] text-slate-500">
                  (Para entregar a Mamá en bodega)
                </span>
              </div>
              <span className="font-black text-emerald-700 text-xl">
                {formatCurrency(netCash)}
              </span>
            </div>
          </div>

          {/* Desglose de Cobros por Parada */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-900 text-xs block">
              Eventos con Cobro ({collectedBookings.length} completados)
            </span>
            {collectedBookings.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-xl">
                Aún no hay paradas marcadas como completadas con saldo cobrado.
              </p>
            ) : (
              <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                {collectedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl bg-white p-2 text-xs border border-slate-100"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {b.client_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {b.address_alias || b.event_address}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-700 text-xs">
                      {formatCurrency(b.balance_due || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desglose de Cargas de Gasolina */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-900 text-xs block">
              Recargas de Combustible ({fuelLogs.length})
            </span>
            {fuelLogs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-xl">
                No se registraron gastos de combustible en esta fecha.
              </p>
            ) : (
              <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                {fuelLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl bg-white p-2 text-xs border border-slate-100"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {log.vehicle_name || "Vehículo"}
                      </p>
                      {log.notes && (
                        <p className="text-[10px] text-slate-500">
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-rose-600 text-xs">
                      -{formatCurrency(log.amount_mxn)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 font-bold text-xs text-white shadow-xs hover:bg-black active:scale-98"
          >
            <Check className="h-4 w-4" />
            <span>Listo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
