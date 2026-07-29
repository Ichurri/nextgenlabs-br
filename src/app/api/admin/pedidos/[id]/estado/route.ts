import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const estadoSchema = z.object({
  status: z.enum(["pending", "paid", "cancelled"]),
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

  // Las tres transiciones son libres y reversibles: no hay máquina de
  // estados, el CHECK constraint de Postgres es la última red.
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", id);

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
