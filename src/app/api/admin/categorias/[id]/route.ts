import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const renameSchema = z.object({ name: z.string().trim().min(1, "Ingresá un nombre.") });
const archiveSchema = z.object({ isActive: z.boolean() });

// Tres comportamientos según ?accion=:
// - (sin accion): renombrar, body { name }
// - mover: intercambia sort_order con el vecino activo, ?direction=up|down
// - archivar: body { isActive } — archivar exige 0 productos activos
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

    const { data: categories, error: listError } = await supabaseAdmin
      .from("product_categories")
      .select("id, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    if (listError || !categories) {
      console.error("move_category_list_failed", listError?.code);
      return NextResponse.json({ error: "No pudimos reordenar." }, { status: 500 });
    }

    const index = categories.findIndex((c) => c.id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || neighborIndex < 0 || neighborIndex >= categories.length) {
      return NextResponse.json({ error: "No se puede mover más." }, { status: 400 });
    }

    const current = categories[index];
    const neighbor = categories[neighborIndex];

    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabaseAdmin
        .from("product_categories")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", current.id),
      supabaseAdmin
        .from("product_categories")
        .update({ sort_order: current.sort_order })
        .eq("id", neighbor.id),
    ]);

    if (err1 || err2) {
      console.error("move_category_swap_failed", err1?.code, err2?.code);
      return NextResponse.json({ error: "No pudimos reordenar." }, { status: 500 });
    }

    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/admin/categorias");
    return NextResponse.json({ ok: true });
  }

  if (accion === "archivar") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }
    const parsed = archiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    if (!parsed.data.isActive) {
      const { count, error: countError } = await supabaseAdmin
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id)
        .eq("is_active", true);

      if (countError) {
        console.error("count_active_products_failed", countError.code);
        return NextResponse.json({ error: "No pudimos archivar la categoría." }, { status: 500 });
      }
      if (count && count > 0) {
        return NextResponse.json(
          {
            error: `Esta categoría tiene ${count} producto${count === 1 ? "" : "s"} activo${
              count === 1 ? "" : "s"
            }. Movelos o archivalos primero.`,
          },
          { status: 409 }
        );
      }
    }

    const { error } = await supabaseAdmin
      .from("product_categories")
      .update({ is_active: parsed.data.isActive })
      .eq("id", id);

    if (error) {
      console.error("archive_category_failed", error.code);
      return NextResponse.json(
        { error: "No pudimos actualizar la categoría." },
        { status: 500 }
      );
    }

    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/admin/categorias");
    return NextResponse.json({ ok: true });
  }

  // Renombrar
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("product_categories")
    .update({ name: parsed.data.name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre." },
        { status: 409 }
      );
    }
    console.error("rename_category_failed", error.code);
    return NextResponse.json(
      { error: "No pudimos renombrar la categoría." },
      { status: 500 }
    );
  }

  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/categorias");
  return NextResponse.json({ ok: true });
}
