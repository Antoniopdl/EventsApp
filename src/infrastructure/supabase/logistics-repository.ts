import {
  type DailyCashSummary,
  FLEET_DEFAULTS,
  type FuelLog,
  type IncidentReport,
  type Vehicle,
} from "@/core/domain/logistics";
import { isSupabaseConfigured, supabase } from "./client";

const FUEL_STORAGE_KEY = "fer_eventos_fuel_logs";
const INCIDENTS_STORAGE_KEY = "fer_eventos_incident_reports";

/**
 * Obtiene el catálogo de vehículos de la flota.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured || !supabase) {
    return FLEET_DEFAULTS;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("is_active", true)
    .order("fuel_cost_per_km", { ascending: true });

  if (error || !data || data.length === 0) {
    return FLEET_DEFAULTS;
  }

  return data as Vehicle[];
}

/**
 * Obtiene los registros de combustible de una fecha específica.
 */
export async function getFuelLogs(date: string): Promise<FuelLog[]> {
  if (typeof window !== "undefined") {
    const rawLocal = localStorage.getItem(FUEL_STORAGE_KEY);
    const localLogs: FuelLog[] = rawLocal ? JSON.parse(rawLocal) : [];
    const filtered = localLogs.filter((l) => l.trip_date === date);

    if (!isSupabaseConfigured || !supabase) {
      return filtered;
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*, vehicles(name), app_users(full_name)")
    .eq("trip_date", date)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  interface RawFuelItem {
    id: string;
    vehicle_id?: string | null;
    driver_id?: string | null;
    trip_date: string;
    amount_mxn: number;
    liters?: number | null;
    fuel_type: "gasolina_magna" | "gasolina_premium" | "diesel";
    notes?: string | null;
    created_at?: string;
    vehicles?: { name: string } | null;
    app_users?: { full_name: string } | null;
  }

  return data.map((d: RawFuelItem) => ({
    id: d.id,
    vehicle_id: d.vehicle_id,
    vehicle_name: d.vehicles?.name,
    driver_id: d.driver_id,
    driver_name: d.app_users?.full_name,
    trip_date: d.trip_date,
    amount_mxn: Number(d.amount_mxn),
    liters: d.liters ? Number(d.liters) : null,
    fuel_type: d.fuel_type,
    notes: d.notes,
    created_at: d.created_at,
  }));
}

/**
 * Guarda una nueva recarga de combustible en ruta.
 */
export async function createFuelLog(
  log: Omit<FuelLog, "id" | "created_at">,
): Promise<FuelLog> {
  const newLog: FuelLog = {
    ...log,
    id: `fuel-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(FUEL_STORAGE_KEY);
    const logs: FuelLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(newLog);
    localStorage.setItem(FUEL_STORAGE_KEY, JSON.stringify(logs));
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from("fuel_logs").insert([
      {
        vehicle_id: log.vehicle_id || null,
        driver_id: log.driver_id || null,
        trip_date: log.trip_date,
        amount_mxn: log.amount_mxn,
        liters: log.liters || null,
        fuel_type: log.fuel_type,
        notes: log.notes || null,
      },
    ]);
  }

  return newLog;
}

/**
 * Obtiene los reportes de incidentes o faltantes.
 */
export async function getIncidentReports(
  bookingId?: string,
): Promise<IncidentReport[]> {
  if (typeof window !== "undefined") {
    const rawLocal = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    const localIncidents: IncidentReport[] = rawLocal
      ? JSON.parse(rawLocal)
      : [];
    if (bookingId) {
      return localIncidents.filter((i) => i.booking_id === bookingId);
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  let query = supabase
    .from("incident_reports")
    .select("*, inventory_items(name), app_users(full_name)")
    .order("created_at", { ascending: false });

  if (bookingId) {
    query = query.eq("booking_id", bookingId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  interface RawIncidentItem {
    id: string;
    booking_id: string;
    driver_id?: string | null;
    item_id?: string | null;
    incident_type: "faltante" | "roto" | "manchado_grave";
    quantity: number;
    unit_replacement_cost: number;
    total_penalty: number;
    admin_status: "pendiente" | "cobrado_cliente" | "perdonado";
    notes?: string | null;
    created_at?: string;
    inventory_items?: { name: string } | null;
    app_users?: { full_name: string } | null;
  }

  return data.map((d: RawIncidentItem) => ({
    id: d.id,
    booking_id: d.booking_id,
    driver_id: d.driver_id,
    driver_name: d.app_users?.full_name,
    item_id: d.item_id,
    item_name: d.inventory_items?.name,
    incident_type: d.incident_type,
    quantity: d.quantity,
    unit_replacement_cost: Number(d.unit_replacement_cost),
    total_penalty: Number(d.total_penalty),
    admin_status: d.admin_status,
    notes: d.notes,
    created_at: d.created_at,
  }));
}

/**
 * Guarda un reporte de daño o faltante generado por el chofer al recoger.
 */
export async function createIncidentReport(
  report: Omit<IncidentReport, "id" | "created_at">,
): Promise<IncidentReport> {
  const newReport: IncidentReport = {
    ...report,
    id: `incident-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    const list: IncidentReport[] = raw ? JSON.parse(raw) : [];
    list.unshift(newReport);
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(list));
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from("incident_reports").insert([
      {
        booking_id: report.booking_id,
        driver_id: report.driver_id || null,
        item_id: report.item_id || null,
        incident_type: report.incident_type,
        quantity: report.quantity,
        unit_replacement_cost: report.unit_replacement_cost,
        total_penalty: report.total_penalty,
        admin_status: report.admin_status,
        notes: report.notes || null,
      },
    ]);
  }

  return newReport;
}

/**
 * Calcula la liquidación de caja diaria de la ruta.
 */
export function calculateDailySettlement(
  date: string,
  totalCollected: number,
  fuelLogs: FuelLog[],
  totalStops: number,
  completedStops: number,
): DailyCashSummary {
  const totalFuel = fuelLogs.reduce((acc, log) => acc + log.amount_mxn, 0);
  const netCash = Math.max(0, totalCollected - totalFuel);

  return {
    date,
    total_cash_collected: totalCollected,
    total_fuel_spent: totalFuel,
    net_cash_to_hand_over: netCash,
    total_stops: totalStops,
    completed_stops: completedStops,
  };
}
