import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCode, endOfDayBrazil } from "@/lib/discounts";
import { discountCodeFieldsSchema } from "@/lib/discount-code.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

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
  const { error } = await supabaseAdmin.from("discount_codes").insert({
    code: normalizeCode(data.code),
    type: data.type,
    value: data.value,
    owner_label: data.ownerLabel,
    is_active: data.isActive,
    max_uses: data.maxUses,
    expires_at: data.expiresAt ? endOfDayBrazil(data.expiresAt) : null,
    min_order_total: data.minOrderTotal,
    max_discount: data.maxDiscount,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un código con ese nombre." },
        { status: 409 }
      );
    }
    console.error("create_discount_code_failed", error.code);
    return NextResponse.json({ error: "No pudimos crear el código." }, { status: 500 });
  }

  revalidatePath("/admin/codigos");
  return NextResponse.json({ ok: true }, { status: 201 });
}
