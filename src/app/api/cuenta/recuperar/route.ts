import { NextResponse } from "next/server";
import { recoverSchema } from "@/lib/customer.schema";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = recoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá un correo válido." }, { status: 400 });
  }

  const supabase = await createSupabaseAuthClient();
  // El link del correo pasa primero por /api/cuenta/confirmar, que canjea el
  // código por una sesión (server-side, para poder escribir la cookie) antes
  // de mandar al comprador a /cuenta/nueva-contrasena.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteConfig.url}/api/cuenta/confirmar`,
  });

  // Siempre la misma respuesta exista o no la cuenta: no hay que dar pistas
  // a quien intenta enumerar correos registrados.
  return NextResponse.json({ ok: true });
}
