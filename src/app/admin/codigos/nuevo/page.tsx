import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { DiscountCodeForm } from "@/components/admin/DiscountCodeForm";

export const metadata: Metadata = {
  title: "Nuevo código | Panel",
  robots: { index: false, follow: false },
};

export default async function NuevoCodigoPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/admin/codigos"
        className="focus-ring rounded text-sm text-muted hover:text-foreground"
      >
        ← Códigos de descuento
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Nuevo código</h1>
      <div className="mt-6">
        <DiscountCodeForm mode="create" />
      </div>
    </div>
  );
}
