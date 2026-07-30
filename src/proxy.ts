import { NextResponse, type NextRequest } from "next/server";

// Mismo nombre que ADMIN_SESSION_COOKIE en src/lib/dal.ts. No se importa de
// ahí para no arrastrar next/headers ni verifySession a este archivo: acá
// solo interesa si la cookie existe.
const ADMIN_SESSION_COOKIE = "admin_session";

// Rutas de /cuenta que tienen que quedar alcanzables SIN sesión: son
// justamente donde se consigue una. El resto de /cuenta/:path* sí exige
// cookie (Fase 8, Bloque A).
const PUBLIC_CUENTA_PATHS = new Set([
  "/cuenta/ingresar",
  "/cuenta/registro",
  "/cuenta/recuperar",
  "/cuenta/nueva-contrasena",
]);

/**
 * La cookie de sesión de Supabase se llama `sb-<project-ref>-auth-token` y
 * puede venir partida en `.0`/`.1` cuando el JWT es grande — buscar por
 * substring evita depender del nombre exacto.
 */
function hasCustomerSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.includes("-auth-token"));
}

/**
 * Mismo chequeo OPTIMISTA que el de /admin de acá abajo: solo mira si la
 * cookie está presente, nunca verifica firma ni expiración. La defensa real
 * vive en requireCustomer()/requireApiCustomer() de src/lib/customer-dal.ts.
 */
function handleCuenta(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_CUENTA_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!hasCustomerSessionCookie(request)) {
    const url = new URL("/cuenta/ingresar", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

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

  if (pathname.startsWith("/cuenta")) {
    return handleCuenta(request);
  }

  // El checkout se mantiene alcanzable SIN sesión a propósito (Fase 8,
  // Bloque B): el comprador se registra en el mismo submit del formulario,
  // no antes. La puerta real es el 401 de POST /api/pedidos sin sesión —
  // acá no se bloquea nada, solo queda documentado que el proxy pasó por
  // este caso a propósito.
  if (pathname === "/checkout") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const hasAdminCookie = request.cookies.has(ADMIN_SESSION_COOKIE);

    if (pathname === "/admin/login") {
      if (hasAdminCookie) return NextResponse.redirect(new URL("/admin", request.url));
      return NextResponse.next();
    }

    if (!hasAdminCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*", "/checkout"],
};
