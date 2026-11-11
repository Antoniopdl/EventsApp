"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Fuel,
  MapPin,
  Navigation,
  Phone,
  Receipt,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Booking } from "@/core/domain/booking";
import {
  FLEET_DEFAULTS,
  type FuelLog,
  type Vehicle,
} from "@/core/domain/logistics";
import type { UserRole } from "@/core/domain/user";
import {
  optimizeRouteAndRecommendVehicle,
  type RouteOptimizationResult,
} from "@/core/use-cases/OptimizeDeliveryRoute";
import { getBookings } from "@/infrastructure/supabase/booking-repository";
import {
  getFuelLogs,
  getVehicles,
} from "@/infrastructure/supabase/logistics-repository";
import { formatCurrency } from "@/lib/utils";
import { DailySettlementModal } from "./DailySettlementModal";
import { FuelExpenseModal } from "./FuelExpenseModal";
import { IncidentReportModal } from "./IncidentReportModal";

interface LogisticsTimelineProps {
  role: UserRole;
  onNotification: (msg: string) => void;
}

export function LogisticsTimeline({
  role: _role,
  onNotification,
}: LogisticsTimelineProps) {
  const [selectedDate, setSelectedDate] = useState("2026-11-14");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(FLEET_DEFAULTS);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [completedStops, setCompletedStops] = useState<Record<string, boolean>>(
    {},
  );

  // Modales
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [incidentBooking, setIncidentBooking] = useState<Booking | null>(null);

  const loadData = useCallback(async () => {
    const [loadedBookings, loadedVehicles] = await Promise.all([
      getBookings(),
      getVehicles(),
    ]);
    setBookings(loadedBookings);
    setVehicles(loadedVehicles);
  }, []);

  const loadFuel = useCallback(async (date: string) => {
    const logs = await getFuelLogs(date);
    setFuelLogs(logs);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadFuel(selectedDate);
  }, [selectedDate, loadFuel]);

  // Generar un rango de 14 días (3 días pasados, hoy, 10 futuros)
  const daysRange = useMemo(() => {
    const list = [];
    const base = new Date("2026-11-14T00:00:00");
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = -3; i <= 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const isoDate = d.toISOString().split("T")[0];
      const isToday = i === 0;

      list.push({
        isoDate,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        isToday,
      });
    }
    return list;
  }, []);

  // Filtrar eventos y paradas para la fecha seleccionada
  const dayBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = b.delivery_datetime?.split("T")[0];
      return bDate === selectedDate;
    });
  }, [bookings, selectedDate]);

  // Optimización de ruta y recomendación de vehículo
  const routeOptimization: RouteOptimizationResult = useMemo(() => {
    return optimizeRouteAndRecommendVehicle(dayBookings, vehicles);
  }, [dayBookings, vehicles]);

  const handleToggleStop = (stopId: string, clientName: string) => {
    setCompletedStops((prev) => {
      const isDone = !prev[stopId];
      if (isDone) {
        onNotification(`✅ Entrega para ${clientName} completada.`);
      }
      return { ...prev, [stopId]: isDone };
    });
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Carrusel Deslizable de Días (Horizontal Date Carousel) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Seleccionar Día de Ruta</span>
          </span>
          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
            {dayBookings.length}{" "}
            {dayBookings.length === 1 ? "Evento" : "Eventos"}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {daysRange.map((d) => {
            const isSelected = selectedDate === d.isoDate;
            const hasEvents = bookings.some(
              (b) => b.delivery_datetime?.split("T")[0] === d.isoDate,
            );

            return (
              <button
                key={d.isoDate}
                type="button"
                onClick={() => setSelectedDate(d.isoDate)}
                className={`flex min-w-[58px] flex-col items-center justify-center rounded-2xl py-2.5 px-2 transition-all active:scale-95 shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/40"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {d.dayName}
                </span>
                <span className="text-base font-black leading-tight mt-0.5">
                  {d.dayNumber}
                </span>
                {d.isToday ? (
                  <span
                    className={`mt-1 rounded-md px-1 py-0.2 text-[8px] font-black uppercase ${
                      isSelected
                        ? "bg-white text-blue-700"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    Hoy
                  </span>
                ) : hasEvents ? (
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-blue-600"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botones de Operación en Ruta: Combustible y Liquidación */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowFuelModal(true)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3 font-bold text-xs text-amber-900 shadow-2xs hover:bg-amber-100 active:scale-95"
        >
          <Fuel className="h-4 w-4 text-amber-600" />
          <span>+ Cargar Gasolina</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSettlementModal(true)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 font-bold text-xs text-emerald-900 shadow-2xs hover:bg-emerald-100 active:scale-95"
        >
          <Receipt className="h-4 w-4 text-emerald-600" />
          <span>Liquidar Caja</span>
        </button>
      </div>

      {/* Tarjeta del Vehículo Recomendado y Abrir Ruta Multi-Parada */}
      {dayBookings.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">
                  {routeOptimization.recommendedVehicle?.name || "Nissan NP300"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {routeOptimization.totalPackages} paquetes totales en ruta
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 block">
                Combustible Est.
              </span>
              <span className="font-black text-xs text-blue-700">
                {formatCurrency(routeOptimization.estimatedFuelCostMxn)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 bg-slate-50 rounded-xl p-2 font-medium">
            💡 {routeOptimization.explanation}
          </p>

          {/* Botón Destacado: Abrir Ruta Completa Multi-Parada */}
          <a
            href={routeOptimization.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-xs text-white shadow-md hover:bg-blue-700 active:scale-98 transition-transform"
          >
            <Route className="h-4 w-4" />
            <span>🗺️ Abrir Ruta Completa del Día en Google Maps</span>
          </a>
        </div>
      )}

      {/* Lista de Rutas y Paradas del Día Seleccionado */}
      {dayBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
          <Truck className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-xs">
            Sin rutas programadas para este día
          </p>
          <p className="text-[11px] text-slate-500">
            Desliza en el carrusel superior para consultar otras fechas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayBookings.map((b, idx) => {
            const isDone = completedStops[b.id];
            const time = b.delivery_datetime
              ? new Date(b.delivery_datetime).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "11:00 AM";

            return (
              <div
                key={b.id}
                className={`space-y-2.5 rounded-3xl border p-4 transition-all shadow-xs ${
                  isDone
                    ? "border-emerald-300 bg-emerald-50/40 opacity-80"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-[11px] text-blue-800">
                    <Clock className="h-3 w-3" />
                    <span>Entrega {time}</span>
                  </span>
                  <span className="font-black text-slate-400 text-xs">
                    Parada #{idx + 1}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-sm">
                      {b.client_name}
                    </h4>
                    {b.client_phone && (
                      <a
                        href={`tel:${b.client_phone}`}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg hover:bg-blue-100"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Llamar</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="line-clamp-1">{b.event_address}</span>
                  </p>
                  {b.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      "{b.notes}"
                    </p>
                  )}
                </div>

                {/* Desglose de Carga para el Chofer */}
                <div className="rounded-2xl bg-slate-50 p-2.5 font-medium text-xs text-slate-800 border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-1">
                    📦 Mobiliario a Entregar:
                  </span>
                  {b.items && b.items.length > 0 ? (
                    <ul className="space-y-0.5">
                      {b.items.map((it) => (
                        <li
                          key={it.id || it.item_id}
                          className="text-slate-700"
                        >
                          • <span className="font-bold">{it.quantity}x</span>{" "}
                          {it.item_name || "Mobiliario"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-600">
                      Mobiliario completo para evento
                    </span>
                  )}
                </div>

                {/* Saldo y Cobro al Entregar */}
                {b.balance_due > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Cobrar en efectivo al entregar:</span>
                    </span>
                    <span className="font-black text-amber-950 text-base">
                      {formatCurrency(b.balance_due)}
                    </span>
                  </div>
                )}

                {/* Botón de Reportar Daño / Faltante en Recolección */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIncidentBooking(b)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 py-1.5 font-bold text-[11px] text-rose-700 hover:bg-rose-100 active:scale-95"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>⚠️ Reportar Faltante o Daño al Recoger</span>
                  </button>
                </div>

                {/* Botones de Navegación GPS y Completar */}
                <div className="flex gap-2 pt-1">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(b.event_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 py-2.5 font-bold text-slate-800 text-xs transition-colors hover:bg-slate-200 active:scale-95"
                  >
                    <Navigation className="h-3.5 w-3.5 text-blue-600" />
                    <span>Navegar GPS</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleStop(b.id, b.client_name || "Clienta")
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 font-bold text-xs shadow-xs transition-all active:scale-95 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isDone ? "Completada" : "Marcar Entregada"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showFuelModal && (
        <FuelExpenseModal
          vehicles={vehicles}
          currentDate={selectedDate}
          onFuelLogged={(log) => {
            setFuelLogs((prev) => [log, ...prev]);
            onNotification(
              `⛽ Carga de ${formatCurrency(log.amount_mxn)} registrada.`,
            );
          }}
          onClose={() => setShowFuelModal(false)}
        />
      )}

      {showSettlementModal && (
        <DailySettlementModal
          date={selectedDate}
          bookings={dayBookings}
          completedStops={completedStops}
          fuelLogs={fuelLogs}
          onClose={() => setShowSettlementModal(false)}
        />
      )}

      {incidentBooking && (
        <IncidentReportModal
          booking={incidentBooking}
          onIncidentCreated={(report) => {
            onNotification(
              `⚠️ Reporte de ${report.quantity}x ${report.item_name} enviado. Llama a Mamá.`,
            );
          }}
          onClose={() => setIncidentBooking(null)}
        />
      )}
    </div>
  );
}
