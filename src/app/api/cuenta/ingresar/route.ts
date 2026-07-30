import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/customer.schema";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá tu correo y contraseña." }, { status: 400 });
  }

  const supabase = await createSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Mismo mensaje para correo inexistente que para contraseña incorrecta:
  // no hay que dar pistas sobre qué cuentas existen.
  if (error) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
