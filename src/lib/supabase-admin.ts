import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase con la service_role key: salta RLS.
 * Solo se importa desde Route Handlers (runtime Node) — nunca desde un
 * componente cliente ni un archivo que termine alcanzado por uno. Un error
 * de "service role key is not defined" en el navegador significa eso.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
