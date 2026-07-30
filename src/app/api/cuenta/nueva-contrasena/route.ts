import { NextResponse } from "next/server";
import { newPasswordSchema } from "@/lib/customer.schema";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = newPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Contraseña inválida." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseAuthClient();

  // updateUser() necesita la sesión de recuperación que /api/cuenta/confirmar
  // ya dejó en la cookie. Sin esa sesión (link vencido o nunca canjeado), no
  // hay nada que actualizar.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json(
      { error: "Tu link de recuperación venció. Pedí uno nuevo." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json(
      { error: "No pudimos actualizar la contraseña. Probá de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
