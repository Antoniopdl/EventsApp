import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes("tu-anon"),
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  url: string;
  hasKey: boolean;
  keyPrefix: string;
  ok: boolean;
  error?: string;
}> {
  const url = supabaseUrl ? `${supabaseUrl.slice(0, 22)}...` : "(vacía)";
  const hasKey = Boolean(supabaseAnonKey);
  const keyPrefix = supabaseAnonKey
    ? `${supabaseAnonKey.slice(0, 10)}...`
    : "(vacía)";

  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      url,
      hasKey,
      keyPrefix,
      ok: false,
      error: "Variables NEXT_PUBLIC_SUPABASE_... no configuradas en el bundle",
    };
  }

  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id")
      .limit(1);
    if (error) {
      return {
        configured: true,
        url,
        hasKey,
        keyPrefix,
        ok: false,
        error: error.message,
      };
    }
    return {
      configured: true,
      url,
      hasKey,
      keyPrefix,
      ok: true,
    };
  } catch (e) {
    return {
      configured: true,
      url,
      hasKey,
      keyPrefix,
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}
