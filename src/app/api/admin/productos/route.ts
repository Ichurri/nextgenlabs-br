import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { productFieldsSchema } from "@/lib/product.schema";

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

  const parsed = productFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const { error } = await supabaseAdmin.from("products").insert({
    slug: data.slug,
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
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un producto con ese slug." },
        { status: 409 }
      );
    }
    console.error("create_product_failed", error.code);
    return NextResponse.json({ error: "No pudimos crear el producto." }, { status: 500 });
  }

  // { expire: 0 }: revalidación inmediata y bloqueante, no stale-while-
  // revalidate — el checkpoint exige ver el cambio "tras recargar", no
  // "eventualmente". Ver Next 16 revalidateTag(tag, profile).
  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/productos");
  return NextResponse.json({ ok: true }, { status: 201 });
}
