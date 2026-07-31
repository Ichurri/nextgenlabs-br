import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { productFieldsSchema, archiveProductSchema } from "@/lib/product.schema";

export const runtime = "nodejs";

// ?accion=archivar: solo cambia is_active (archivar o reactivar), sin tocar
// el resto del producto. Sin ese query param: edición completa del
// formulario. El slug nunca se escribe acá aunque venga en el body — es
// inmutable, ver product.schema.ts.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const accion = new URL(request.url).searchParams.get("accion");

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
