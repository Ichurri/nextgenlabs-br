import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { OrderCard, type OrderWithItems } from "@/components/admin/OrderCard";

export const metadata: Metadata = {
  title: "Pedidos | Panel",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireSession();

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const query = supabaseAdmin
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  const orders = (data ?? []) as OrderWithItems[];
  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/recibos/nuevo"
            className="focus-ring rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            + Nuevo comprobante
          </Link>
          <Link
            href="/admin/productos"
            className="focus-ring rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            Productos
          </Link>
          <Link
            href="/admin/codigos"
            className="focus-ring rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            Códigos de descuento
          </Link>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="focus-ring rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mt-8 text-sm text-danger">
          No pudimos cargar los pedidos. Probá de nuevo.
        </p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no hay pedidos.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>
            ← Anterior
          </PageLink>
          <span className="text-muted">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            Siguiente →
          </PageLink>
        </div>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted opacity-40">{children}</span>;
  }
  return (
    <Link
      href={`/admin?page=${page}`}
      className="focus-ring rounded text-accent-light hover:underline"
    >
      {children}
    </Link>
  );
}
