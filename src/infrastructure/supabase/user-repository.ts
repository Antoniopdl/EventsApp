import type { AppUser } from "@/core/domain/user";
import { isSupabaseConfigured, supabase } from "./client";

const USERS_STORAGE_KEY = "fer_eventos_app_users_v1";

const DEFAULT_USERS_SEED: AppUser[] = [
  {
    id: "user-admin",
    username: "admin",
    pin_code: "123456",
    role: "admin",
    full_name: "Administración General",
    is_active: true,
  },
  {
    id: "user-mama",
    username: "mama",
    pin_code: "112233",
    role: "admin",
    full_name: "Tere / Mamá",
    is_active: true,
  },
  {
    id: "user-antonio",
    username: "antonio",
    pin_code: "778899",
    role: "admin",
    full_name: "Antonio (Administración)",
    is_active: true,
  },
  {
    id: "user-driver",
    username: "chofer",
    pin_code: "654321",
    role: "driver",
    full_name: "Repartidor / Entregas",
    is_active: true,
  },
];

function getLocalUsers(): AppUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS_SEED;
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS_SEED));
    return DEFAULT_USERS_SEED;
  }
  try {
    const parsed = JSON.parse(raw) as AppUser[];
    return parsed.length > 0 ? parsed : DEFAULT_USERS_SEED;
  } catch {
    return DEFAULT_USERS_SEED;
  }
}

function saveLocalUsers(users: AppUser[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }
}

/**
 * Autentica un usuario con su nombre de usuario (o rol) y PIN de 6 dígitos.
 */
export async function authenticateWithPin(
  username: string,
  pin: string,
): Promise<AppUser | null> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPin = pin.trim();

  // 1. Intentar primero con Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("username", cleanUser)
        .eq("pin_code", cleanPin)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        return data as AppUser;
      }
    } catch (e) {
      console.warn("Supabase auth error, falling back to local users:", e);
    }
  }

  // 2. Fallback resiliente a usuarios locales / semilla
  const localList = getLocalUsers();
  const found = localList.find(
    (u) =>
      u.is_active &&
      u.username.toLowerCase() === cleanUser &&
      u.pin_code === cleanPin,
  );

  return found || null;
}

/**
 * Obtiene la lista de usuarios y roles configurados en el sistema.
 */
export async function getAppUsers(): Promise<AppUser[]> {
  const localUsers = getLocalUsers();

  if (!isSupabaseConfigured || !supabase) {
    return localUsers;
  }

  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });

    if (error || !data || data.length === 0) {
      return localUsers;
    }

    // Unir con usuarios locales para no perder usuarios recién creados
    const remoteUsers = data as AppUser[];
    const combined = [...remoteUsers];
    for (const loc of localUsers) {
      if (!combined.some((r) => r.username === loc.username)) {
        combined.push(loc);
      }
    }
    saveLocalUsers(combined);
    return combined;
  } catch {
    return localUsers;
  }
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

  // 1. Actualizar en almacenamiento local siempre
  const current = getLocalUsers();
  const updated = current.map((u) =>
    u.id === userId ? { ...u, pin_code: newPin } : u,
  );
  saveLocalUsers(updated);

  // 2. Replicar en Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("app_users")
        .update({
          pin_code: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } catch (e) {
      console.warn("Error replicando PIN a Supabase:", e);
    }
  }

  return true;
}

/**
 * Crea un nuevo usuario o chofer con su PIN de 6 dígitos.
 */
export async function createAppUser(
  user: Omit<AppUser, "id" | "created_at" | "updated_at">,
): Promise<AppUser | null> {
  const cleanUsername = user.username.trim().toLowerCase();
  const cleanPin = user.pin_code.trim();
  const cleanFullName = user.full_name.trim();

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    pin_code: cleanPin,
    role: user.role,
    full_name: cleanFullName,
    is_active: user.is_active ?? true,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar de inmediato en almacenamiento local para respuesta instantánea
  const current = getLocalUsers();
  if (current.some((u) => u.username === cleanUsername)) {
    // Si ya existe con el mismo username, actualizamos sus datos
    const updated = current.map((u) =>
      u.username === cleanUsername ? { ...u, ...newUser, id: u.id } : u,
    );
    saveLocalUsers(updated);
    return updated.find((u) => u.username === cleanUsername) || newUser;
  }

  saveLocalUsers([...current, newUser]);

  // 2. Replicar en Supabase si está configurado
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .insert([
          {
            username: cleanUsername,
            pin_code: cleanPin,
            role: user.role,
            full_name: cleanFullName,
            is_active: newUser.is_active,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return data as AppUser;
      }
    } catch (e) {
      console.warn("Error replicando usuario a Supabase:", e);
    }
  }

  return newUser;
}
