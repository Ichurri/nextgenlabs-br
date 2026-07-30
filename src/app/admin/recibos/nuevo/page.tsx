import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { ReceiptBuilderForm } from "@/components/admin/ReceiptBuilderForm";

export const metadata: Metadata = {
  title: "Nuevo comprobante | Panel",
  robots: { index: false, follow: false },
};

export default async function NuevoReciboPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/admin" className="focus-ring rounded text-sm text-muted hover:text-foreground">
        ← Pedidos
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Nuevo comprobante</h1>
      <p className="mt-2 text-sm text-muted">
        Pegá el mensaje de pedido que te mandó el comprador por WhatsApp, revisá lo que
        entendimos y generá el PDF. No se guarda ningún pedido en el sistema.
      </p>
      <div className="mt-6">
        <ReceiptBuilderForm />
      </div>
    </div>
  );
}
