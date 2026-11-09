export type UserRole = "admin" | "driver";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface AppUser {
  id: string;
  username: string;
  pin_code: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessConfig {
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  default_freight_base: number;
  default_freight_km_rate: number;
}

export const FER_EVENTOS_CONFIG: BusinessConfig = {
  name: "Fer Eventos",
  phone: "6971022914",
  address: "Colonia Agrícola México, Angostura, Sinaloa",
  latitude: 25.1059649,
  longitude: -107.9491486,
  default_freight_base: 250.0,
  default_freight_km_rate: 15.0,
};
