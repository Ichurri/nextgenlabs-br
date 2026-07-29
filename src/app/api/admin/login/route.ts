import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPassword, signSession } from "@/lib/auth";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/dal";

export const runtime = "nodejs";

const loginSchema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá la contraseña." }, { status: 400 });
  }

  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!storedHash || !secret) {
    console.error("admin_login_not_configured");
    return NextResponse.json(
      { error: "El panel todavía no está configurado." },
      { status: 500 }
    );
  }

  // Mismo mensaje y status para contraseña incorrecta que para cualquier
  // otro fallo de verificación: no hay "usuario" que enumerar, pero tampoco
  // se da información sobre por qué falló.
  if (!verifyPassword(parsed.data.password, storedHash)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = signSession(secret, ADMIN_SESSION_MAX_AGE_SECONDS);
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
