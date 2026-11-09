import type { AppUser } from "@/core/domain/user";
import { isSupabaseConfigured, supabase } from "./client";

/**
 * Autentica un usuario con su nombre de usuario (o rol) y PIN de 6 dígitos.
 */
export async function authenticateWithPin(
  username: string,
  pin: string,
): Promise<AppUser | null> {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback local si no hay conexión
    if (pin === "123456" || pin === "112233") {
      return {
        id: "mock-admin",
        username: "admin",
        pin_code: pin,
        role: "admin",
        full_name: "Administración",
        is_active: true,
      };
    }
    if (pin === "654321") {
      return {
        id: "mock-driver",
        username: "chofer",
        pin_code: pin,
        role: "driver",
        full_name: "Repartidor / Entregas",
        is_active: true,
      };
    }
    return null;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .eq("pin_code", pin.trim())
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AppUser;
}

/**
 * Obtiene la lista de usuarios y roles configurados en el sistema.
 */
export async function getAppUsers(): Promise<AppUser[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        id: "local-admin",
        username: "admin",
        pin_code: "123456",
        role: "admin",
        full_name: "Administración General",
        is_active: true,
      },
      {
        id: "local-mama",
        username: "mama",
        pin_code: "112233",
        role: "admin",
        full_name: "Tere / Mamá",
        is_active: true,
      },
      {
        id: "local-driver",
        username: "chofer",
        pin_code: "654321",
        role: "driver",
        full_name: "Repartidor / Entregas",
        is_active: true,
      },
    ];
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error || !data) return [];
  return data as AppUser[];
}

/**
 * Actualiza el PIN de 6 dígitos de un usuario.
 */
export async function updateUserPin(
  userId: string,
  newPin: string,
): Promise<boolean> {
  if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return false;
  }

  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from("app_users")
    .update({
      pin_code: newPin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return !error;
}

/**
 * Crea un nuevo usuario o chofer con su PIN de 6 dígitos.
 */
export async function createAppUser(
  user: Omit<AppUser, "id" | "created_at" | "updated_at">,
): Promise<AppUser | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("app_users")
    .insert([
      {
        username: user.username.trim().toLowerCase(),
        pin_code: user.pin_code.trim(),
        role: user.role,
        full_name: user.full_name.trim(),
        is_active: user.is_active,
      },
    ])
    .select()
    .single();

  if (error || !data) return null;
  return data as AppUser;
}
