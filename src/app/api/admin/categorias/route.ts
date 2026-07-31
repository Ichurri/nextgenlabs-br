import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const createCategorySchema = z.object({ name: z.string().trim().min(1, "Ingresá un nombre.") });

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  // Se agrega al final del orden manual, con huecos de 10 como la semilla
  // del Bloque A.
  const { data: last } = await supabaseAdmin
    .from("product_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("product_categories").insert({
    name: parsed.data.name,
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre." },
        { status: 409 }
      );
    }
    console.error("create_category_failed", error.code);
    return NextResponse.json({ error: "No pudimos crear la categoría." }, { status: 500 });
  }

  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/categorias");
  return NextResponse.json({ ok: true }, { status: 201 });
}
