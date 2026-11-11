"use client";

import { Fuel, Plus, X } from "lucide-react";
import { useState } from "react";
import type {
  FuelLog,
  Vehicle,
  VehicleFuelType,
} from "@/core/domain/logistics";
import { createFuelLog } from "@/infrastructure/supabase/logistics-repository";

interface FuelExpenseModalProps {
  vehicles: Vehicle[];
  currentDate: string;
  onFuelLogged: (log: FuelLog) => void;
  onClose: () => void;
}

export function FuelExpenseModal({
  vehicles,
  currentDate,
  onFuelLogged,
  onClose,
}: FuelExpenseModalProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    vehicles[0]?.id || "",
  );
  const [amountMxn, setAmountMxn] = useState<number>(300);
  const [fuelType, setFuelType] = useState<VehicleFuelType>("gasolina_magna");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVehicleChange = (vId: string) => {
    setSelectedVehicleId(vId);
    const v = vehicles.find((item) => item.id === vId);
    if (v) {
      setFuelType(v.fuel_type);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountMxn <= 0) return;

    setIsSubmitting(true);
    const chosenVehicle = vehicles.find((v) => v.id === selectedVehicleId);

    const log = await createFuelLog({
      vehicle_id: selectedVehicleId || null,
      vehicle_name: chosenVehicle?.name || "Camioneta",
      driver_name: "Chofer en Turno",
      trip_date: currentDate,
      amount_mxn: amountMxn,
      fuel_type: fuelType,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);
    onFuelLogged(log);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Fuel className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">
                Registrar Carga de Combustible
              </h3>
              <p className="text-[10px] text-slate-600">
                Se descontará del efectivo en ruta
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Vehículo que cargó */}
          <div>
            <label
              htmlFor="fuel-vehicle"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              ¿Qué vehículo cargó combustible?
            </label>
            <select
              id="fuel-vehicle"
              value={selectedVehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monto en pesos */}
          <div>
            <label
              htmlFor="fuel-amount"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Monto Pagado en Gasolinera ($ MXN)
            </label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 font-bold text-slate-400 text-sm">
                $
              </span>
              <input
                id="fuel-amount"
                type="number"
                min={1}
                step={10}
                value={amountMxn}
                onChange={(e) => setAmountMxn(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm font-black text-amber-700 outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Botones de montos rápidos */}
          <div className="flex gap-1.5">
            {[200, 300, 500, 800].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmountMxn(quick)}
                className={`flex-1 rounded-xl py-1 text-xs font-bold transition-all active:scale-95 ${
                  amountMxn === quick
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ${quick}
              </button>
            ))}
          </div>

          {/* Notas o referencia */}
          <div>
            <label
              htmlFor="fuel-notes"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Gasolinera / Referencia (opcional)
            </label>
            <input
              id="fuel-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Gasolinera Audón Cárdenas, ticket #451"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || amountMxn <= 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 font-bold text-xs text-white shadow-md hover:bg-amber-600 active:scale-98 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>
              {isSubmitting ? "Registrando..." : "Guardar Carga de Gasolina"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
