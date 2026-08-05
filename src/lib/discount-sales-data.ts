import { supabaseAdmin } from "@/lib/supabase-admin";

export type CodeSale = { id: string; soldAt: string; total: number };

export type CodeSalesSummary = {
  code: string;
  isActive: boolean;
  expiresAt: string | null;
  usedCount: number;
  maxUses: number | null;
  salesCount: number;
  revenueTotal: number;
  sales: CodeSale[];
  truncated: boolean;
};

// Con el volumen de este negocio no se llega nunca, pero una lista sin techo
// es una página que un día tarda 8 segundos. Los totales NO salen de esta
// lista: salen de la vista, así que truncar no los ensucia.
const SALES_LIMIT = 100;

/**
 * Todo lo que ve la persona dueña de un código, a partir de su token.
 * Devuelve null si el token no existe — la página responde 404, sin decir si
 * el token era inválido o el código fue borrado.
 *
 * Las tres consultas piden columnas explícitas. `owner_label` no se
 * selecciona en ninguna: es información interna del negocio y no entra
 * siquiera a la memoria de este proceso (Fase 6 §4).
 */
export async function getCodeSalesByPublicToken(
  token: string
): Promise<CodeSalesSummary | null> {
  // El token vive solo en la tabla base, que tiene RLS sin policies: es
  // inalcanzable desde afuera aunque alguien consiga la anon key.
  const { data: code } = await supabaseAdmin
    .from("discount_codes")
    .select("id")
    .eq("public_token", token)
    .maybeSingle();

  if (!code) return null;

  // Los totales salen de la MISMA vista que lee /admin/codigos, para que el
  // número de la persona y el del dueño sean el mismo número.
  const { data: summary } = await supabaseAdmin
    .from("discount_code_attribution")
    .select(
      "code, is_active, expires_at, used_count, max_uses, paid_redemption_count, paid_revenue_total"
    )
    .eq("id", code.id)
    .maybeSingle();

  // Igual que en /admin/codigos: la vista tipa estas columnas nullable por el
  // join, pero vienen siempre de una fila real de discount_codes.
  if (
    !summary ||
    summary.code === null ||
    summary.is_active === null ||
    summary.used_count === null
  ) {
    return null;
  }

  const { data: sales } = await supabaseAdmin
    .from("discount_code_sales")
    .select("id, sold_at, sale_total")
    .eq("code_id", code.id)
    .eq("is_paid", true)
    .order("sold_at", { ascending: false })
    .limit(SALES_LIMIT + 1); // +1 solo para saber si hay más

  const rows = sales ?? [];

  return {
    code: summary.code,
    isActive: summary.is_active,
    expiresAt: summary.expires_at,
    usedCount: summary.used_count,
    maxUses: summary.max_uses,
    salesCount: summary.paid_redemption_count ?? 0,
    revenueTotal: Number(summary.paid_revenue_total ?? 0),
    sales: rows.slice(0, SALES_LIMIT).map((row) => ({
      id: row.id as string,
      soldAt: row.sold_at as string,
      total: Number(row.sale_total ?? 0),
    })),
    truncated: rows.length > SALES_LIMIT,
  };
}
