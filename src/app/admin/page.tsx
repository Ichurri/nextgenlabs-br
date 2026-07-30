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

const STATUS_FILTERS = [
  { value: "pending", label: "Pendientes" },
  { value: "paid", label: "Pagados" },
  { value: "shipped", label: "Despachados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "all", label: "Todos" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return STATUS_FILTERS.some((f) => f.value === value);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireSession();

  const params = await searchParams;
  const status: StatusFilter = isStatusFilter(params.status) ? params.status : "pending";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  const orders = (data ?? []) as OrderWithItems[];
  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <div className="flex items-center gap-3">
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

      <nav className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin?status=${f.value}`}
            className={`focus-ring rounded-full border px-3 py-1.5 text-sm transition ${
              status === f.value
                ? "border-accent bg-accent/10 text-accent-light"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-8 text-sm text-danger">
          No pudimos cargar los pedidos. Probá de nuevo.
        </p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No hay pedidos en este filtro.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          <PageLink status={status} page={page - 1} disabled={page <= 1}>
            ← Anterior
          </PageLink>
          <span className="text-muted">
            Página {page} de {totalPages}
          </span>
          <PageLink status={status} page={page + 1} disabled={page >= totalPages}>
            Siguiente →
          </PageLink>
        </div>
      )}
    </div>
  );
}

function PageLink({
  status,
  page,
  disabled,
  children,
}: {
  status: StatusFilter;
  page: number;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted opacity-40">{children}</span>;
  }
  return (
    <Link
      href={`/admin?status=${status}&page=${page}`}
      className="focus-ring rounded text-accent-light hover:underline"
    >
      {children}
    </Link>
  );
}
