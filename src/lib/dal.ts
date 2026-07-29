import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

// Solo se importa desde Server Components y Route Handlers de /admin —
// nunca desde un componente cliente. Lee ADMIN_SESSION_SECRET, igual que
// supabase-admin.ts con la service key.
export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // ~7 días

/**
 * Verificación real de la sesión: firma HMAC + expiración contra
 * ADMIN_SESSION_SECRET. Memoizada con cache() de React — una sola
 * verificación por render, sin importar cuántas páginas la invoquen.
 * proxy.ts NO reemplaza esto: solo mira si la cookie existe.
 */
export const getSession = cache(async (): Promise<boolean> => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;

  return verifySession(token, secret);
});

/** Server Components de /admin: sin sesión válida, redirige al login. */
export async function requireSession(): Promise<void> {
  const authenticated = await getSession();
  if (!authenticated) redirect("/admin/login");
}

/** Route Handlers de /api/admin: sin sesión válida, 401. Con sesión, null. */
export async function requireApiSession(): Promise<NextResponse | null> {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return null;
}
