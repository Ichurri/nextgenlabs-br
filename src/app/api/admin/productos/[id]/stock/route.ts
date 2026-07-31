import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const adjustSchema = z.object({
  quantity: z
    .number()
    .int("La cantidad tiene que ser un número entero.")
    .refine((n) => n !== 0, "La cantidad no puede ser 0."),
  reason: z.string().trim().min(1, "Ingresá el motivo."),
});

// Ajuste manual: positivo = restock (reposición), negativo = adjustment
// (corrección). No pasa por el RPC de ventas — es un solo producto, sin
// necesidad de atomicidad multi-fila.
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

  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const { data: product, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("stock_qty")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !product) {
    return NextResponse.json({ error: "No encontramos el producto." }, { status: 404 });
  }

  const { quantity, reason } = parsed.data;
  const newStock = product.stock_qty + quantity;
  const type = quantity > 0 ? "restock" : "adjustment";

  const { error: updateError } = await supabaseAdmin
    .from("products")
    .update({ stock_qty: newStock })
    .eq("id", id);

  if (updateError) {
    console.error("adjust_stock_update_failed", updateError.code);
    return NextResponse.json({ error: "No pudimos ajustar el stock." }, { status: 500 });
  }

  const { error: movementError } = await supabaseAdmin.from("stock_movements").insert({
    product_id: id,
    type,
    qty: quantity,
    stock_after: newStock,
    reason,
  });

  if (movementError) {
    // El stock ya se actualizó — el movimiento es solo el registro
    // histórico. No revertimos: perder el registro es peor que perder la
    // trazabilidad de este ajuste puntual.
    console.error("adjust_stock_movement_failed", movementError.code);
  }

  revalidateTag("catalog", { expire: 0 });
  revalidatePath(`/admin/productos/${id}/stock`);
  revalidatePath("/admin/productos");
  return NextResponse.json({ ok: true, stockQty: newStock });
}
