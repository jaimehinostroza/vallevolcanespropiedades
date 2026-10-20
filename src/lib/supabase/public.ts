import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anónimo sin cookies, para lecturas públicas dentro de funciones con "use cache".
 * No usar para acciones del panel de administración.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
