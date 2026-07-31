import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Deshace el descuento de stock de un comprobante (batch_id) — para el caso
// de haberlo generado dos veces. Idempotente: el RPC no hace nada si ya no
// quedan movimientos sin deshacer en el batch.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { batchId } = await params;

  const { error } = await supabaseAdmin.rpc("revert_stock_batch", { p_batch_id: batchId });
  if (error) {
    console.error("revert_stock_batch_failed", error.code);
    return NextResponse.json(
      { error: "No pudimos deshacer el descuento de stock." },
      { status: 500 }
    );
  }

  revalidateTag("catalog", { expire: 0 });
  return NextResponse.json({ ok: true });
}
