import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/format";
import { parseDiscountType } from "@/lib/discounts";
import { DiscountCodeToggle } from "@/components/admin/DiscountCodeToggle";
import type { DiscountCodeFields } from "@/lib/discount-code.schema";

export const metadata: Metadata = {
  title: "Códigos de descuento | Panel",
  robots: { index: false, follow: false },
};

function toDateInputValue(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date(iso));
}

function formatBoliviaDate(iso: string | null): string {
  if (!iso) return "Sin vencimiento";
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(new Date(iso));
}

export default async function AdminCodigosPage() {
  await requireSession();

  const { data, error } = await supabaseAdmin.from("discount_code_attribution").select("*");
  const codes = data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="focus-ring rounded text-sm text-muted hover:text-foreground">
            ← Pedidos
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Códigos de descuento</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/codigos/reporte"
            className="focus-ring rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            Reporte
          </Link>
          <Link
            href="/admin/codigos/nuevo"
            className="focus-ring rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            + Nuevo código
          </Link>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-xs text-muted">
        &ldquo;Pedidos generados&rdquo; cuenta todo pedido creado con el código, aunque nunca se
        haya cobrado — nadie marca solo el sistema cuándo se paga. &ldquo;Pagados&rdquo; es el
        número real: solo pedidos que marcaste como pagados en{" "}
        <Link href="/admin" className="underline">
          Pedidos
        </Link>
        .
      </p>

      {error ? (
        <p className="mt-8 text-sm text-danger">No pudimos cargar los códigos.</p>
      ) : codes.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no creaste ningún código.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {codes.map((c) => {
            // La vista agrega dc.* junto con conteos: en la práctica estas
            // columnas nunca son null (siempre viene de una fila real de
            // discount_codes), pero el tipo generado las marca nullable
            // porque no puede probar que el join no las pierda.
            if (
              c.id === null ||
              c.code === null ||
              c.type === null ||
              c.value === null ||
              c.owner_label === null ||
              c.is_active === null ||
              c.used_count === null
            ) {
              return null;
            }

            const fields: DiscountCodeFields = {
              code: c.code,
              type: parseDiscountType(c.type),
              value: Number(c.value),
              ownerLabel: c.owner_label,
              isActive: c.is_active,
              maxUses: c.max_uses,
              expiresAt: toDateInputValue(c.expires_at),
              minOrderTotal: c.min_order_total !== null ? Number(c.min_order_total) : null,
              maxDiscount: c.max_discount !== null ? Number(c.max_discount) : null,
            };

            return (
              <article key={c.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold">{c.code}</p>
                    <p className="text-xs text-muted">{c.owner_label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        c.is_active
                          ? "border-success bg-success/10 text-success"
                          : "border-border text-muted"
                      }`}
                    >
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
                    <Link
                      href={`/admin/codigos/${c.id}/editar`}
                      className="focus-ring rounded text-sm text-accent-light hover:underline"
                    >
                      Editar
                    </Link>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Stat
                    label="Tipo"
                    value={fields.type === "percent" ? `${fields.value}%` : formatPrice(fields.value)}
                  />
                  <Stat label="Usos" value={`${c.used_count}${c.max_uses ? ` / ${c.max_uses}` : ""}`} />
                  <Stat label="Vence" value={formatBoliviaDate(c.expires_at)} />
                  <Stat
                    label="Compra mínima"
                    value={fields.minOrderTotal !== null ? formatPrice(fields.minOrderTotal) : "Sin mínimo"}
                  />
                </div>

                <div className="mt-3 grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-4">
                  <Stat label="Pedidos generados" value={String(c.redemption_count ?? 0)} />
                  <Stat label="Descuento (generado)" value={formatPrice(Number(c.discount_total ?? 0))} />
                  <Stat label="Pedidos pagados" value={String(c.paid_redemption_count ?? 0)} />
                  <Stat label="Facturado (pagado)" value={formatPrice(Number(c.paid_revenue_total ?? 0))} />
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  <DiscountCodeToggle id={c.id} fields={fields} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
