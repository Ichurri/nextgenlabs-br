import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/dal";

export const runtime = "nodejs";

// Redirige en vez de devolver JSON: así el botón de logout puede ser un
// <form method="post"> plano, sin componente cliente ni fetch.
export async function POST(request: Request) {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}
