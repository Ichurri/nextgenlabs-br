import { NextResponse, type NextRequest } from "next/server";

// Mismo nombre que ADMIN_SESSION_COOKIE en src/lib/dal.ts. No se importa de
// ahí para no arrastrar next/headers ni verifySession a este archivo: acá
// solo interesa si la cookie existe.
const ADMIN_SESSION_COOKIE = "admin_session";

/**
 * Chequeo OPTIMISTA: solo mira si la cookie está presente, no verifica su
 * firma ni expiración. Es una mejora de UX (evita el flash de la pantalla
 * protegida antes del redirect), no la defensa real — esa vive en
 * requireSession()/requireApiSession() de src/lib/dal.ts, que corre
 * independientemente de este archivo. Si se borra proxy.ts, /admin sigue
 * protegido.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has(ADMIN_SESSION_COOKIE);

  if (pathname === "/admin/login") {
    if (hasCookie) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!hasCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
