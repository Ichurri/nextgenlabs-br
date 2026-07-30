import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export const runtime = "nodejs";

/**
 * Adonde apunta el redirectTo de resetPasswordForEmail(). El link del correo
 * de recuperación llega acá con ?code=..., y el canje por sesión tiene que
 * pasar por un Route Handler (no por la página /cuenta/nueva-contrasena
 * directo, que es un Server Component): las cookies de sesión solo se pueden
 * escribir desde acá, nunca desde un Server Component en render. Ver el
 * comentario de setAll() en src/lib/supabase-auth.ts.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/cuenta/nueva-contrasena", request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/cuenta/recuperar?error=link_invalido", request.url)
  );
}
