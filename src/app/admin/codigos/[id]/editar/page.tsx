import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseDiscountType } from "@/lib/discounts";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";
import type { DiscountCodeFields } from "@/lib/discount-code.schema";

export const metadata: Metadata = {
  title: "Editar código | Panel",
  robots: { index: false, follow: false },
};

function toDateInputValue(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date(iso));
}

export default async function EditarCodigoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const { data: row } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const initialValues: DiscountCodeFields = {
    code: row.code,
    type: parseDiscountType(row.type),
    value: Number(row.value),
    ownerLabel: row.owner_label,
    isActive: row.is_active,
    maxUses: row.max_uses,
    expiresAt: toDateInputValue(row.expires_at),
    minOrderTotal: row.min_order_total !== null ? Number(row.min_order_total) : null,
    maxDiscount: row.max_discount !== null ? Number(row.max_discount) : null,
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/admin/codigos"
        className="focus-ring rounded text-sm text-muted hover:text-foreground"
      >
        ← Códigos de descuento
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Editar {row.code}</h1>
      <div className="mt-6">
        <DiscountCodeForm mode="edit" codeId={id} initialValues={initialValues} />
      </div>
    </div>
  );
}
