"use client";

import { AlertTriangle, CheckCircle2, Phone, X } from "lucide-react";
import { useState } from "react";
import type { Booking } from "@/core/domain/booking";
import type { IncidentReport, IncidentType } from "@/core/domain/logistics";
import { FER_EVENTOS_CONFIG } from "@/core/domain/user";
import { createIncidentReport } from "@/infrastructure/supabase/logistics-repository";
import { formatCurrency } from "@/lib/utils";

interface IncidentReportModalProps {
  booking: Booking;
  onIncidentCreated: (report: IncidentReport) => void;
  onClose: () => void;
}

export function IncidentReportModal({
  booking,
  onIncidentCreated,
  onClose,
}: IncidentReportModalProps) {
  const [incidentType, setIncidentType] = useState<IncidentType>("faltante");
  const [selectedItemName, setSelectedItemName] = useState(
    booking.items?.[0]?.item_name || "Silla de Herrería",
  );
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(350); // Precio de reposición base
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdReport, setCreatedReport] = useState<IncidentReport | null>(
    null,
  );

  const totalPenalty = quantity * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const report = await createIncidentReport({
      booking_id: booking.id,
      client_name: booking.client_name,
      driver_name: "Chofer en Turno",
      item_name: selectedItemName,
      incident_type: incidentType,
      quantity,
      unit_replacement_cost: unitCost,
      total_penalty: totalPenalty,
      admin_status: "pendiente",
      notes: notes.trim() || null,
    });

    setCreatedReport(report);
    setIsSubmitted(true);
    onIncidentCreated(report);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">
                Reportar Faltante o Daño
              </h3>
              <p className="text-[10px] text-slate-600 line-clamp-1">
                {booking.client_name}
              </p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {isSubmitted && createdReport ? (
            <div className="space-y-4 py-2 text-center animate-in zoom-in-95">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  Reporte Registrado con Éxito
                </h4>
                <p className="text-xs text-slate-600">
                  {createdReport.quantity}x {createdReport.item_name} (
                  {createdReport.incident_type})
                </p>
                <p className="font-extrabold text-rose-600 text-base">
                  Cargo estimado: {formatCurrency(createdReport.total_penalty)}
                </p>
              </div>

              {/* Botón Destacado: Llamar a Mamá */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2 text-left">
                <span className="font-extrabold text-amber-950 text-xs block">
                  ⚠️ Acción obligatoria antes de retirarte:
                </span>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Comunícate de inmediato con Mamá para avisarle del faltante y
                  que ella te indique cómo proceder con la clienta.
                </p>

                <a
                  href={`tel:${FER_EVENTOS_CONFIG.phone}`}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-xs text-white shadow-md hover:bg-emerald-700 active:scale-95"
                >
                  <Phone className="h-4 w-4" />
                  <span>Llamar a Mamá ({FER_EVENTOS_CONFIG.phone})</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 text-xs hover:bg-slate-200"
              >
                Cerrar y Continuar Ruta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Tipo de incidente */}
              <div>
                <span className="block text-xs font-bold text-slate-800 mb-1">
                  ¿Qué problema ocurrió?
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "faltante", label: "Faltó Mueble" },
                      { id: "roto", label: "Mueble Roto" },
                      { id: "manchado_grave", label: "Quemado/Cera" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setIncidentType(t.id)}
                      className={`rounded-xl py-2 px-1 text-[11px] font-bold transition-all active:scale-95 ${
                        incidentType === t.id
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Artículo afectado */}
              <div>
                <label
                  htmlFor="incident-item-name"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Artículo afectado
                </label>
                <input
                  id="incident-item-name"
                  type="text"
                  value={selectedItemName}
                  onChange={(e) => setSelectedItemName(e.target.value)}
                  placeholder="Ej. Silla Tiffany Dorada, Mantel negro..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Cantidad y Costo de reposición */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="incident-quantity"
                    className="block text-[11px] font-bold text-slate-800 mb-1"
                  >
                    Cantidad
                  </label>
                  <input
                    id="incident-quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="incident-unit-cost"
                    className="block text-[11px] font-bold text-slate-800 mb-1"
                  >
                    Reposición c/u ($)
                  </label>
                  <input
                    id="incident-unit-cost"
                    type="number"
                    min={1}
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Desglose de penalización */}
              <div className="flex items-center justify-between rounded-xl bg-rose-50 p-2.5 border border-rose-200">
                <span className="font-bold text-rose-950 text-xs">
                  Cargo Total de Reposición:
                </span>
                <span className="font-black text-rose-700 text-sm">
                  {formatCurrency(totalPenalty)}
                </span>
              </div>

              {/* Notas del chofer */}
              <div>
                <label
                  htmlFor="incident-notes"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Detalles o explicación (opcional)
                </label>
                <textarea
                  id="incident-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. El cliente dice que su tía se llevó la silla y la devuelve mañana..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 font-bold text-xs text-white shadow-md hover:bg-rose-700 active:scale-98"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Confirmar y Notificar a Mamá</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
