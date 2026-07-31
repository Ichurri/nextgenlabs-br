import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { productFieldsSchema, archiveProductSchema } from "@/lib/product.schema";

export const runtime = "nodejs";

// ?accion=archivar: solo cambia is_active (archivar o reactivar), sin tocar
// el resto del producto. ?accion=mover: intercambia sort_order con el
// vecino activo (Bloque D, orden global del catálogo — no por categoría).
// Sin query param: edición completa del formulario. El slug nunca se
// escribe acá aunque venga en el body — es inmutable, ver product.schema.ts.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const url = new URL(request.url);
  const accion = url.searchParams.get("accion");

  if (accion === "mover") {
    const direction = url.searchParams.get("direction");
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Dirección inválida." }, { status: 400 });
    }

    const { data: products, error: listError } = await supabaseAdmin
      .from("products")
      .select("id, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    if (listError || !products) {
      console.error("move_product_list_failed", listError?.code);
      return NextResponse.json({ error: "No pudimos reordenar." }, { status: 500 });
    }

    const index = products.findIndex((p) => p.id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || neighborIndex < 0 || neighborIndex >= products.length) {
      return NextResponse.json({ error: "No se puede mover más." }, { status: 400 });
    }

    const current = products[index];
    const neighbor = products[neighborIndex];

    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabaseAdmin.from("products").update({ sort_order: neighbor.sort_order }).eq("id", current.id),
      supabaseAdmin.from("products").update({ sort_order: current.sort_order }).eq("id", neighbor.id),
    ]);

    if (err1 || err2) {
      console.error("move_product_swap_failed", err1?.code, err2?.code);
      return NextResponse.json({ error: "No pudimos reordenar." }, { status: 500 });
    }

    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/admin/productos");
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (accion === "archivar") {
    const parsed = archiveProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_active: parsed.data.isActive })
      .eq("id", id);

    if (error) {
      console.error("archive_product_failed", error.code);
      return NextResponse.json(
        { error: "No pudimos actualizar el producto." },
        { status: 500 }
      );
    }

    // { expire: 0 }: revalidación inmediata y bloqueante, no stale-while-
    // revalidate — ver el comentario equivalente en /api/admin/productos.
    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/admin/productos");
    return NextResponse.json({ ok: true });
  }

  const parsed = productFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      name: data.name,
      dose: data.dose,
      price: data.price,
      purity: data.purity,
      form: data.form,
      category_id: data.categoryId,
      image: data.image,
      highlights: data.highlights,
      description: data.description ?? null,
      coa_url: data.coaUrl ?? null,
      featured: data.featured,
      is_new: data.isNew,
      track_stock: data.trackStock,
    })
    .eq("id", id);

  if (error) {
    console.error("update_product_failed", error.code);
    return NextResponse.json(
      { error: "No pudimos actualizar el producto." },
      { status: 500 }
    );
  }

  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/productos");
  return NextResponse.json({ ok: true });
}
