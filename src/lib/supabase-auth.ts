import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase Auth con la anon key: NO salta RLS (a diferencia de
 * supabase-admin.ts). Se usa únicamente para signIn/signUp/signOut/reset de
 * contraseña — nunca para leer o escribir pedidos, catálogo ni nada del
 * negocio, eso sigue yendo por supabase-admin.ts con la service key.
 *
 * La anon key vive acá server-side (SUPABASE_ANON_KEY, sin NEXT_PUBLIC_)
 * porque este archivo solo se importa desde Route Handlers y Server
 * Components de /cuenta y /checkout — nunca desde un componente cliente. Si
 * un ejemplo de la documentación de @supabase/ssr te pide createBrowserClient,
 * es la señal de que estás yendo por el camino equivocado: acá no hay cliente
 * de Supabase en el navegador.
 *
 * Hay que crear un cliente nuevo en cada request (no se puede compartir uno
 * global) porque las cookies son por request.
 */
export async function createSupabaseAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component: las cookies no se pueden escribir acá. Un
            // refresh de token que ocurra durante ese render se pierde hasta
            // el próximo request — es el comportamiento esperado cuando no
            // hay un middleware que reescriba la respuesta (ver el docstring
            // de createServerClient en @supabase/ssr).
          }
        },
      },
    }
  );
}
