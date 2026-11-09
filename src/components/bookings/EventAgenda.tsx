"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Booking } from "@/core/domain/booking";
import {
  getBookings,
  updateBookingAdvance,
} from "@/infrastructure/supabase/booking-repository";
import { formatCurrency } from "@/lib/utils";

interface EventAgendaProps {
  onNotification: (msg: string) => void;
}

export function EventAgenda({ onNotification }: EventAgendaProps) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 10 = Noviembre (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(14);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Modal para abonar anticipo
  const [selectedBookingForPayment, setSelectedBookingForPayment] =
    useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const loadData = useCallback(async () => {
    const list = await getBookings();
    setBookings(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // Días del mes y día de la semana de inicio
  const { daysInMonth, startWeekday } = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    return { daysInMonth: totalDays, startWeekday: firstDay };
  }, [currentYear, currentMonth]);

  // Mapa de días que tienen rentas en el mes actual
  const bookingsByDay = useMemo(() => {
    const map: Record<number, Booking[]> = {};
    for (const b of bookings) {
      if (!b.delivery_datetime) continue;
      const d = new Date(b.delivery_datetime);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(b);
      }
    }
    return map;
  }, [bookings, currentYear, currentMonth]);

  // Eventos mostrados (del día seleccionado o de todo el mes)
  const displayedEvents = useMemo(() => {
    if (selectedDay !== null) {
      return bookingsByDay[selectedDay] || [];
    }
    // Si no hay día seleccionado, mostrar todos los del mes ordenados
    const list: Booking[] = [];
    Object.keys(bookingsByDay)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((d) => {
        list.push(...bookingsByDay[d]);
      });
    return list;
  }, [selectedDay, bookingsByDay]);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForPayment || paymentAmount <= 0) return;

    setIsSavingPayment(true);
    const ok = await updateBookingAdvance(
      selectedBookingForPayment.id,
      paymentAmount,
    );
    setIsSavingPayment(false);

    if (ok) {
      onNotification(
        `✅ Abono de ${formatCurrency(paymentAmount)} registrado con éxito.`,
      );
      setSelectedBookingForPayment(null);
      setPaymentAmount(500);
      loadData();
    } else {
      onNotification("Error al registrar el abono.");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Cabecera del Mes */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className="font-extrabold text-slate-900 text-sm">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <p className="text-[11px] text-slate-500">
            {Object.keys(bookingsByDay).length} días con eventos
          </p>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendario Minimalista de Círculos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
        {/* Nombres de los días */}
        <div className="grid grid-cols-7 text-center font-bold text-[11px] text-slate-400">
          <span>D</span>
          <span>L</span>
          <span>M</span>
          <span>M</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
        </div>

        {/* Matriz de Círculos */}
        <div className="grid grid-cols-7 gap-y-2 justify-items-center">
          {/* Espacios vacíos antes del día 1 */}
          {["pad-0", "pad-1", "pad-2", "pad-3", "pad-4", "pad-5"]
            .slice(0, startWeekday)
            .map((padKey) => (
              <div key={padKey} className="h-9 w-9" />
            ))}

          {/* Días del Mes */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const hasRentals = Boolean(bookingsByDay[day]?.length);
            const isSelected = selectedDay === day;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() =>
                  setSelectedDay((prev) => (prev === day ? null : day))
                }
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs transition-all active:scale-90 ${
                  hasRentals
                    ? "bg-blue-600 text-white font-extrabold shadow-xs hover:bg-blue-700"
                    : "border border-slate-200 bg-white text-slate-700 font-semibold hover:border-slate-400"
                } ${isSelected ? "ring-2 ring-amber-500 ring-offset-2 scale-105" : ""}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Leyenda Minimalista */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            <span>Con Renta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
            <span>Sin Evento</span>
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs">
            {selectedDay !== null
              ? `Eventos del ${selectedDay} de ${monthNames[currentMonth]}`
              : `Todos los Eventos de ${monthNames[currentMonth]}`}
          </h3>
          {selectedDay !== null && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              Ver todo el mes
            </button>
          )}
        </div>

        {displayedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            No hay rentas programadas para este día.
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedEvents.map((b) => {
              const dateStr = b.delivery_datetime
                ? new Date(b.delivery_datetime).toLocaleDateString("es-MX", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "Fecha";

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                      {dateStr}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        b.balance_due === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {b.balance_due === 0 ? "Liquidado" : "Anticipo Pagado"}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      {b.client_name}
                    </h4>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="line-clamp-1">{b.event_address}</span>
                    </p>
                  </div>

                  {/* Detalle Financiero */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-[11px] border border-slate-100">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Total
                      </span>
                      <span className="font-black text-slate-900">
                        {formatCurrency(b.total_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Anticipo
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(b.advance_payment || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Saldo
                      </span>
                      <span
                        className={`font-black ${
                          b.balance_due > 0
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(b.balance_due || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Botón para abonar anticipo posterior */}
                  {b.balance_due > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForPayment(b)}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 font-bold text-xs text-emerald-800 shadow-2xs hover:bg-emerald-100 active:scale-98"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Registrar Abono / Anticipo en Efectivo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Registrar Abono de Anticipo */}
      {selectedBookingForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Registrar Abono de Anticipo
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedBookingForPayment.client_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForPayment(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-amber-800">Total del Evento:</span>
                <span className="font-bold text-amber-950">
                  {formatCurrency(selectedBookingForPayment.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800">Anticipo Acumulado:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(
                    selectedBookingForPayment.advance_payment || 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-amber-200/60 pt-1 font-bold">
                <span className="text-amber-900">Saldo Pendiente:</span>
                <span className="text-amber-950">
                  {formatCurrency(selectedBookingForPayment.balance_due || 0)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3">
              <div>
                <label
                  htmlFor="agenda-payment-amount"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Monto que el cliente va a dar ahora ($ MXN):
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    $
                  </span>
                  <input
                    id="agenda-payment-amount"
                    type="number"
                    min={1}
                    max={selectedBookingForPayment.balance_due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPayment || paymentAmount <= 0}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-xs text-white shadow-md hover:bg-emerald-700 active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isSavingPayment ? "Guardando abono..." : "Guardar Abono"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
