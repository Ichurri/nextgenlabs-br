import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const estadoSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "cancelled"]),
});

export async function POST(
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

  const parsed = estadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  // Las cuatro transiciones son libres y reversibles: no hay máquina de
  // estados, el CHECK constraint de Postgres es la última red.
  //
  // paid_at registra cuándo se confirmó el pago (Fase 7 B3): se fija al
  // pasar a "paid" y se limpia solo al volver a "pending". "shipped" y
  // "cancelled" no la tocan — un pedido despachado o cancelado sigue
  // habiendo sido pagado en ese momento, si lo estuvo.
  const update: { status: string; paid_at?: string | null } = { status: parsed.data.status };
  if (parsed.data.status === "paid") update.paid_at = new Date().toISOString();
  if (parsed.data.status === "pending") update.paid_at = null;

  const { error } = await supabaseAdmin.from("orders").update(update).eq("id", id);

  if (error) {
    console.error("update_order_status_failed", error.code);
    return NextResponse.json(
      { error: "No pudimos actualizar el pedido." },
      { status: 500 }
    );
  }

  revalidatePath("/admin");
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
