import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateToken } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Regenera el token del link de ventas. Es la única forma de revocar un link
 * que se filtró: no hay sesión que cerrar, el token ES la credencial.
 *
 * generateToken() son 16 bytes de randomBytes en hex — misma forma y mismo
 * orden de azar que el default de Postgres (un gen_random_uuid() sin guiones).
 * No va por el PATCH de al lado a propósito: ese manda el objeto completo del
 * formulario y pisaría el token con undefined.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("discount_codes")
    .update({ public_token: generateToken() })
    .eq("id", id);

  if (error) {
    console.error("regenerate_code_link_failed", error.code);
    return NextResponse.json({ error: "No pudimos regenerar el link." }, { status: 500 });
  }

  revalidatePath("/admin/codigos");
  return NextResponse.json({ ok: true });
}
