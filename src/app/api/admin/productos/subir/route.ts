import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const COA_MAX_BYTES = 10 * 1024 * 1024;

// Por mime declarado: extensiones que se aceptan en el nombre del archivo, y
// la extensión canónica con la que se guarda (jpg y jpeg entran, se guardan
// siempre como .jpg). Se valida por contenido Y por extensión — un .pdf
// renombrado a .png con mimetype image/png igual pasaría el primer check
// solo, por eso el segundo.
const IMAGE_RULES: Record<string, { exts: string[]; storeExt: string }> = {
  "image/webp": { exts: ["webp"], storeExt: "webp" },
  "image/jpeg": { exts: ["jpg", "jpeg"], storeExt: "jpg" },
  "image/png": { exts: ["png"], storeExt: "png" },
};

function extensionOf(filename: string): string {
  return filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
}

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind");
  const slug = form.get("slug");

  if (!(file instanceof File) || (kind !== "imagen" && kind !== "coa")) {
    return NextResponse.json({ error: "Faltan datos del archivo." }, { status: 400 });
  }
  if (typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: "Escribí un slug válido antes de subir el archivo." },
      { status: 400 }
    );
  }

  const suffix = randomBytes(4).toString("hex");

  if (kind === "imagen") {
    const rule = IMAGE_RULES[file.type];
    const ext = extensionOf(file.name);
    if (!rule || !rule.exts.includes(ext)) {
      return NextResponse.json(
        { error: "La imagen tiene que ser WEBP, JPEG o PNG." },
        { status: 400 }
      );
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen no puede pesar más de 2 MB." },
        { status: 400 }
      );
    }

    const path = `productos/${slug}-${suffix}.${rule.storeExt}`;
    const { error } = await supabaseAdmin.storage
      .from("catalogo")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error("upload_product_image_failed", error.message);
      return NextResponse.json({ error: "No pudimos subir la imagen." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("catalogo").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  }

  // kind === "coa"
  if (file.type !== "application/pdf" || extensionOf(file.name) !== "pdf") {
    return NextResponse.json({ error: "El COA tiene que ser un PDF." }, { status: 400 });
  }
  if (file.size > COA_MAX_BYTES) {
    return NextResponse.json({ error: "El COA no puede pesar más de 10 MB." }, { status: 400 });
  }

  const path = `coa/${slug}-${suffix}.pdf`;
  const { error } = await supabaseAdmin.storage
    .from("catalogo")
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (error) {
    console.error("upload_product_coa_failed", error.message);
    return NextResponse.json({ error: "No pudimos subir el COA." }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("catalogo").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
