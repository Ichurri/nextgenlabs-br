import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCode, endOfDayBrazil } from "@/lib/discounts";
import { discountCodeFieldsSchema } from "@/lib/discount-code.schema";

export const runtime = "nodejs";

// El formulario de edición y el botón de activar/desactivar mandan siempre
// el objeto completo (el cliente ya tiene la fila cargada de la lista) —
// no hay PATCH parcial que reconstruir acá.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = discountCodeFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const { error } = await supabaseAdmin
    .from("discount_codes")
    .update({
      code: normalizeCode(data.code),
      type: data.type,
      value: data.value,
      owner_label: data.ownerLabel,
      is_active: data.isActive,
      max_uses: data.maxUses,
      expires_at: data.expiresAt ? endOfDayBrazil(data.expiresAt) : null,
      min_order_total: data.minOrderTotal,
      max_discount: data.maxDiscount,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un código con ese nombre." },
        { status: 409 }
      );
    }
    console.error("update_discount_code_failed", error.code);
    return NextResponse.json({ error: "No pudimos actualizar el código." }, { status: 500 });
  }

  revalidatePath("/admin/codigos");
  return NextResponse.json({ ok: true });
}
