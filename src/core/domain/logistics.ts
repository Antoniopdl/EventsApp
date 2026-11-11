export type VehicleFuelType = "gasolina_magna" | "gasolina_premium" | "diesel";

export interface Vehicle {
  id: string;
  name: string;
  fuel_type: VehicleFuelType;
  km_per_liter: number;
  fuel_cost_per_km: number;
  max_package_capacity: number;
  plate_number?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FuelLog {
  id: string;
  vehicle_id?: string | null;
  vehicle_name?: string;
  driver_id?: string | null;
  driver_name?: string;
  trip_date: string; // YYYY-MM-DD
  amount_mxn: number;
  liters?: number | null;
  fuel_type: VehicleFuelType;
  notes?: string | null;
  created_at?: string;
}

export type IncidentType = "faltante" | "roto" | "manchado_grave";
export type IncidentStatus = "pendiente" | "cobrado_cliente" | "perdonado";

export interface IncidentReport {
  id: string;
  booking_id: string;
  client_name?: string;
  driver_id?: string | null;
  driver_name?: string;
  item_id?: string | null;
  item_name?: string;
  incident_type: IncidentType;
  quantity: number;
  unit_replacement_cost: number;
  total_penalty: number;
  admin_status: IncidentStatus;
  notes?: string | null;
  created_at?: string;
}

export interface DailyCashSummary {
  date: string;
  total_cash_collected: number;
  total_fuel_spent: number;
  net_cash_to_hand_over: number;
  total_stops: number;
  completed_stops: number;
}

export const FLEET_DEFAULTS: Vehicle[] = [
  {
    id: "veh-nissan-np300",
    name: "Nissan NP300 (Gasolina)",
    fuel_type: "gasolina_magna",
    km_per_liter: 8.8,
    fuel_cost_per_km: 2.72,
    max_package_capacity: 8,
    is_active: true,
  },
  {
    id: "veh-tacoma-traila",
    name: "Toyota Tacoma + Traila/Remolque",
    fuel_type: "gasolina_magna",
    km_per_liter: 6.0,
    fuel_cost_per_km: 4.0,
    max_package_capacity: 16,
    is_active: true,
  },
  {
    id: "veh-super-duty-diesel",
    name: "La Dutty Diésel (Ford Super Duty)",
    fuel_type: "diesel",
    km_per_liter: 5.8,
    fuel_cost_per_km: 4.57,
    max_package_capacity: 30,
    is_active: true,
  },
];
