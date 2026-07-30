import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/customer.schema";
import { createCustomerAccount } from "@/lib/customer-dal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const { email, password, fullName, phone, city, address } = parsed.data;
  const result = await createCustomerAccount({ email, password, fullName, phone, city, address });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
