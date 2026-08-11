# Fase 12 — Link de ventas por código

> **Requisito**: leé `00-contexto.md` completo y `fase-6-codigos-de-descuento.md` §1 (modelo de
> amenaza) antes de empezar. Esta fase se apoya en la vista `discount_code_attribution` y en la
> tabla `discount_redemptions`, que ya existen y funcionan.

---

## 0. Cómo ejecutar este plan

Escrito el 2026-08-04 para ejecutarse en una sesión nueva. **Todas las decisiones están tomadas**
— no hay nada que consultarle al dueño. Si aparece una bifurcación que este documento no
resuelve, es un hueco del plan: pará y preguntá, no elijas por tu cuenta.

**Orden**: Bloque A → B → C → D, en ese orden. Cada bloque termina con un checkpoint que tiene que
pasar antes de seguir. **Un commit por bloque**, mensaje en inglés, con el trailer
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Antes de cada commit**: `npm run build` limpio y `npm test` en verde. Sin excepción.

**Antes de explorar código**: `graphify query "<pregunta>"` (hay un hook que lo exige).
**Después de modificar código**: `graphify update .`

**`npm run db:types` sí hace falta**: el Bloque A agrega una columna y una vista. Corré el script
después de aplicar la migración A y antes de escribir cualquier TypeScript que las use.

**Next 16 — leelo antes de escribir la página**: este repo corre `next@16.2.10`. `export const
dynamic` y `export const revalidate` ya no existen como opciones de segmento (ver
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`:
solo quedan `dynamicParams`, `runtime`, `preferredRegion`, `maxDuration`). **No los agregues** —
el repo no los usa en ningún archivo y el default ya es el correcto: una ruta con parámetro
dinámico sin `generateStaticParams` se renderiza por request, y `cacheComponents` no está activo
en `next.config.ts`.

---

## 1. El cambio, en una frase

Cada código de descuento pasa a tener **su propio link secreto** que la persona dueña del código
abre para ver cuántas ventas trajo y por cuánto — sin login, sin ver nada de otro código y sin un
solo dato de los compradores.

### Decisiones tomadas (2026-08-04). No las re-litigues.

1. **El link es la credencial.** Cada fila de `discount_codes` lleva un `public_token` opaco y la
   página vive en `/mis-ventas/[token]`. Sin login, sin PIN, sin cuenta — exactamente el mismo
   modelo que `/pedido/[token]`, que ya está en producción y el dueño ya entiende.
2. **Un link por código, no por persona.** `owner_label` es texto libre, no hay entidad "persona"
   en la base y no se crea una acá. Si alguien tiene dos códigos, recibe dos links.
3. **La persona ve**: cantidad de ventas, monto total vendido, y una lista de sus ventas con
   **fecha y monto, nada más**. Ni nombre, ni teléfono, ni ciudad, ni qué producto se compró.
4. **No hay comisión calculada.** La página informa; la comisión se arregla por WhatsApp. Un
   número de plata en pantalla se vuelve una promesa de pago que después hay que discutir.
5. **`owner_label` nunca sale del servidor.** Es criterio de aceptación de la Fase 6 y se mantiene:
   la página muestra el **código** (`MAFE10`), no la etiqueta interna. Ninguna consulta de esta
   fase selecciona esa columna — ni siquiera para descartarla en el cliente.
6. **"Ventas" = la rama pagada.** Se cuenta lo mismo que la columna "Pagados" del panel
   (`o.status = 'paid' or dr.is_paid`). Desde la Fase 11 todo pedido nace pagado, así que en la
   práctica es todo salvo pedidos históricos que quedaron sin cobrar. Un solo número en la
   pantalla del influencer: nada de "generados vs. pagados", esa distinción es del dueño.
7. **El monto de cada venta es `orders.total`, con envío incluido**, igual que "Facturado
   (pagado)" en `/admin/codigos`. Si acá restáramos el envío, el número de la persona no cuadraría
   con el del dueño y eso se discute por WhatsApp. La columna se llama "Total del pedido"
   justamente para que se entienda qué es.
8. **El token se genera en Postgres, no en la app.** Va como `default` de la columna, así una fila
   insertada a mano desde el table editor de Supabase también nace con su link.
9. **El link se puede regenerar** desde `/admin/codigos`. Es la única forma de revocar un link que
   se filtró: no hay sesión que cerrar.

### Lo que NO se toca

```
src/lib/discounts.ts            src/lib/orders.ts            src/lib/money.ts
src/lib/dal.ts / auth.ts        src/lib/orders-data.ts       src/proxy.ts
src/app/api/pedidos/route.ts    src/app/api/descuentos/validar/route.ts
src/app/api/admin/recibos/route.ts                           src/components/CartDrawer.tsx
supabase/migrations/* ya aplicadas
```

Si tu diff toca alguno de esos, algo salió mal.

---

## 2. Bloque A — El token y la vista de ventas

**Objetivo**: que cada código tenga su token y que exista una fuente de datos que **por
construcción** no pueda filtrar datos del comprador.

### A1. Migración

Nuevo archivo `supabase/migrations/20260804210000_discount_code_public_token.sql`:

```sql
-- Fase 12: cada código lleva un token opaco que da acceso a una página
-- pública de solo lectura con las ventas de ESE código. Sin login: el link es
-- la credencial, igual que /pedido/[token].
--
-- El default se evalúa en Postgres para que una fila insertada a mano desde
-- el table editor también nazca con su token. gen_random_uuid() es built-in
-- desde PG13 (no depende de pgcrypto, que no está garantizado en el
-- search_path del proyecto) y sin guiones da 32 hex chars = 122 bits de
-- azar, la misma forma que generateToken() en src/lib/orders.ts.
--
-- El default es VOLATILE, así que el ALTER reescribe la tabla y evalúa la
-- expresión por fila: cada código existente sale con un token distinto. Es lo
-- que queremos, y con este volumen de filas el rewrite es instantáneo.
alter table discount_codes
  add column public_token text not null unique
    default replace(gen_random_uuid()::text, '-', '');

-- Una fila por canje, sin un solo dato del comprador. Es la única fuente de
-- la lista de /mis-ventas/[token]: no existe customer_name, ni teléfono, ni
-- ciudad, ni los ítems. Si mañana alguien quiere mostrar más, tiene que
-- agregarlo acá a propósito — no puede filtrarse por un select("*") distraído.
--
-- sold_at: para pedidos históricos coincide con dr.created_at; para
-- comprobantes de la Fase 9 (sin order_id) el único dato disponible es
-- dr.created_at, que es cuando el dueño registró la venta.
--
-- is_paid: mismo criterio que la columna "Pagados" de
-- discount_code_attribution. El coalesce es necesario acá y no allá porque
-- un FILTER trata NULL como falso, pero una columna de select devolvería NULL.
create view discount_code_sales as
select
  dr.id,
  dr.code_id,
  coalesce(o.created_at, dr.created_at)                 as sold_at,
  coalesce(o.total, dr.receipt_total, 0)::numeric(12,2) as sale_total,
  (coalesce(o.status = 'paid', false) or dr.is_paid)    as is_paid
from discount_redemptions dr
left join orders o on o.id = dr.order_id;

-- Ninguna vista de este proyecto la consulta un cliente anónimo: todo el
-- acceso es server-side con la service_role key. Supabase otorga SELECT por
-- default a anon/authenticated sobre lo nuevo en el schema public, y una
-- vista sin security_invoker se evalúa con los permisos de su dueño — o sea
-- que el RLS de discount_redemptions/orders NO la protege. Estos revokes
-- cierran eso. Son idempotentes: si el grant no existía, no pasa nada.
revoke all on discount_code_sales       from anon, authenticated;
revoke all on discount_code_attribution from anon, authenticated;
revoke all on orders_overview           from anon, authenticated;
```

Aplicala contra el proyecto linkeado (`supabase db push` o pegándola en el SQL editor, como el
resto del repo) **antes de seguir**.

### A2. Verificar los grants

Corré esto en el SQL editor después de aplicar la migración:

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee;
```

**Resultado esperado: ninguna fila para `discount_code_sales`, `discount_code_attribution` ni
`orders_overview`.** Si aparece alguna otra vista o tabla con grants a `anon` que no esperabas,
**anotalo y avisá — no la toques en esta fase**, no está en el alcance y merece su propia mirada.

### A3. Tipos

```bash
npm run db:types
```

Verificá en el diff de `src/types/database.ts` que aparecen `public_token` en `discount_codes` y
la vista `discount_code_sales`. Si el diff trae otras cosas, es que la base tenía cambios sin
migración en el repo: pará y avisá.

**Checkpoint A**: la migración aplicada, la consulta de A2 sin filas, `src/types/database.ts`
regenerado, `npm run build` limpio y `npm test` en verde. En el SQL editor,
`select code, public_token from discount_codes;` devuelve un token distinto por código, ninguno
nulo. Commit.

---

## 3. Bloque B — La página `/mis-ventas/[token]`

### B1. `src/lib/discount-links.ts` (nuevo)

Los dos links que se le pasan a una persona, en un solo lugar y puros — es lo único testeable de
esta fase.

```ts
import { siteConfig } from "@/config/site";

/** Link para compartir: el catálogo con el descuento ya cargado (ver ApplyCodeFromUrl). */
export function buildCodeShareUrl(code: string): string {
  return `${siteConfig.url}/catalogo?codigo=${encodeURIComponent(code)}`;
}

/**
 * Link privado con las ventas de un código. El token ES la credencial: quien
 * lo tenga ve estos números, por eso se regenera desde el panel si se filtra.
 */
export function buildCodeSalesUrl(publicToken: string): string {
  return `${siteConfig.url}/mis-ventas/${encodeURIComponent(publicToken)}`;
}
```

### B2. `src/lib/discount-sales-data.ts` (nuevo)

```ts
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
```

> Si `npm run db:types` tipó las columnas de la vista como no-nullable y los `as string` sobran,
> **sacalos** — están ahí porque las vistas suelen salir nullable, no porque queramos un cast.

### B3. `src/lib/format.ts` — fecha boliviana compartida

Hoy `formatBoliviaDate` está duplicada como función privada en
`src/app/admin/codigos/page.tsx` y en `src/lib/discounts.ts`. En vez de escribir una tercera,
agregala a `format.ts`:

```ts
/** Fecha en horario boliviano (UTC−4 fijo). Ver la trampa de timestamptz en fase-6 §11. */
export function formatBoliviaDate(iso: string): string {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(new Date(iso));
}
```

En el Bloque C se borra la copia privada de `admin/codigos/page.tsx` (archivo que igual vamos a
editar). **La copia de `src/lib/discounts.ts` se queda donde está**: ese módulo es puro a
propósito y no lo tocamos en esta fase.

### B4. `src/components/CopyableLink.tsx` (nuevo, client)

Se usa en la página pública y en el panel, por eso vive en `components/` y no en
`components/admin/`.

```tsx
"use client";

import { useState } from "react";

/**
 * Campo de solo lectura + botón Copiar. Mismo patrón que PaymentInstructions:
 * si la Clipboard API falla (contexto no seguro, permiso denegado) no hay
 * respaldo razonable — el texto está a la vista y se selecciona a mano.
 */
export function CopyableLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin acción de respaldo: el link está visible y se copia a mano.
    }
  }

  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="focus-ring min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="focus-ring shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-2"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
```

### B5. `src/app/mis-ventas/[token]/page.tsx` (nuevo)

Página pública, dentro del layout normal del sitio (header, footer, age gate) — igual que
`/pedido/[token]`. **Sin `export const dynamic`** (ver §0).

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCodeSalesByPublicToken } from "@/lib/discount-sales-data";
import { buildCodeShareUrl } from "@/lib/discount-links";
import { formatPrice, formatBoliviaDate } from "@/lib/format";
import { CopyableLink } from "@/components/CopyableLink";

export const metadata: Metadata = {
  title: "Tus ventas",
  robots: { index: false, follow: false },
};

export default async function CodeSalesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const summary = await getCodeSalesByPublicToken(token);
  if (!summary) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">Tus ventas</p>
      <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{summary.code}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            summary.isActive
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted"
          }`}
        >
          {summary.isActive ? "Activo" : "Inactivo"}
        </span>
        <span className="text-muted">
          {summary.expiresAt
            ? `Vence el ${formatBoliviaDate(summary.expiresAt)}`
            : "Sin vencimiento"}
        </span>
        {summary.maxUses !== null && (
          <span className="text-muted">
            Usos: {summary.usedCount} de {summary.maxUses}
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Ventas</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{summary.salesCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted">Vendido</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-accent-light">
            {formatPrice(summary.revenueTotal)}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-6">
        <p className="text-sm font-semibold">Compartí tu código</p>
        <p className="mt-1 text-sm text-muted">
          Con este link el descuento se aplica solo apenas la persona entra. No hace falta que
          escriba nada.
        </p>
        <div className="mt-4">
          <CopyableLink url={buildCodeShareUrl(summary.code)} label="Tu link para compartir" />
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Detalle</h2>
        {summary.sales.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Todavía no hay ventas con tu código. Compartí tu link y volvé a mirar.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {summary.sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-muted">{formatBoliviaDate(sale.soldAt)}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(sale.total)}</span>
                </li>
              ))}
            </ul>
            {summary.truncated && (
              <p className="mt-3 text-xs text-muted">
                Mostramos tus últimas 100 ventas. Los totales de arriba las cuentan todas.
              </p>
            )}
          </>
        )}
        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Cada venta es un pedido que ya cobramos. El monto es el total del pedido, envío
          incluido. Por privacidad de nuestros clientes no mostramos quién compró ni qué compró.
        </p>
      </div>

      <p className="mt-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger">
        Este link es tuyo: cualquiera que lo tenga ve estos números. No lo compartas. Si se te
        escapó, avisanos y te damos uno nuevo.
      </p>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/catalogo" className="focus-ring rounded hover:text-foreground">
          Ver el catálogo
        </Link>
      </p>
    </div>
  );
}
```

### B6. `src/app/robots.ts`

Agregar la ruta al `disallow`, junto a `/pedido/`:

```ts
    disallow: ["/pedido/", "/mis-ventas/", "/api/", "/checkout", "/admin"],
```

`sitemap.ts` **no se toca**: sus rutas son una lista explícita, `/mis-ventas` no está y no tiene
por qué estarlo.

**Checkpoint B**: sacá un `public_token` real del SQL editor, abrí `/mis-ventas/<ese-token>` y
verificá **las cinco cosas**: (1) los dos números de arriba coinciden exactamente con "Pedidos
pagados" y "Facturado (pagado)" de ese mismo código en `/admin/codigos`; (2) la lista muestra una
fila por venta con fecha y monto; (3) `/mis-ventas/loquesea` devuelve 404; (4) en el HTML que baja
el navegador (`Ver código fuente`, no el inspector) **no aparece el `owner_label`** — buscalo con
Ctrl+F; (5) `/robots.txt` incluye `Disallow: /mis-ventas/`. Probalo además en 375px de ancho.
Commit.

---

## 4. Bloque C — El link en el panel

**Objetivo**: que el dueño pueda copiarle el link a la persona sin entrar a Supabase, y
regenerarlo si se filtró.

### C1. `POST /api/admin/codigos/[id]/link` (nuevo)

`src/app/api/admin/codigos/[id]/link/route.ts`:

```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateToken } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Regenera el token del link de ventas. Es la única forma de revocar un link
 * que se filtró: no hay sesión que cerrar, el token ES la credencial.
 *
 * generateToken() son 16 bytes de randomBytes en hex — misma forma y mismo
 * orden de azar que el default de Postgres (un gen_random_uuid() sin guiones).
 * No va por el PATCH de al lado a propósito: ese manda el objeto completo del
 * formulario y pisaría el token con undefined.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("discount_codes")
    .update({ public_token: generateToken() })
    .eq("id", id);

  if (error) {
    console.error("regenerate_code_link_failed", error.code);
    return NextResponse.json({ error: "No pudimos regenerar el link." }, { status: 500 });
  }

  revalidatePath("/admin/codigos");
  return NextResponse.json({ ok: true });
}
```

### C2. `src/components/admin/RegenerateCodeLink.tsx` (nuevo, client)

Mismo patrón que `DiscountCodeToggle`. El `window.confirm` es el que ya usan
`ProductArchiveToggle` y `CategoryList`.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegenerateCodeLink({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    const confirmed = window.confirm(
      "Vas a generar un link nuevo y el anterior deja de funcionar. Vas a tener que pasarle el link nuevo a la persona. ¿Seguimos?"
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/codigos/${id}/link`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No pudimos regenerar el link.");
        return;
      }
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        className="focus-ring rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Generando…" : "Generar link nuevo"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
```

### C3. `src/app/admin/codigos/page.tsx`

1. **Borrar la función privada `formatBoliviaDate`** (líneas 20–28) e importar la de
   `@/lib/format` (B3). `toDateInputValue` se queda: hace otra cosa.
2. Después de la consulta a `discount_code_attribution`, agregar la de tokens:

```tsx
  // El token vive solo en la tabla base y NO en discount_code_attribution: la
  // vista arranca con `dc.*`, que se expandió al crearse y no incluye la
  // columna nueva. Meterlo ahí obligaría a recrear la vista, y no hace falta
  // — esta consulta son dos columnas de una tabla de diez filas.
  const { data: tokenRows } = await supabaseAdmin
    .from("discount_codes")
    .select("id, public_token");
  const tokensById = new Map((tokenRows ?? []).map((row) => [row.id, row.public_token]));
```

3. Dentro del `.map`, después del bloque de estadísticas y antes del `<div>` del
   `DiscountCodeToggle`, insertar los links:

```tsx
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <CopyableLink
                    url={buildCodeShareUrl(c.code)}
                    label="Link para compartir (aplica el descuento solo)"
                  />
                  {tokensById.get(c.id) && (
                    <CopyableLink
                      url={buildCodeSalesUrl(tokensById.get(c.id)!)}
                      label="Link privado de ventas (pasáselo solo a esta persona)"
                    />
                  )}
                </div>
```

4. En el `<div>` del pie, poner el toggle y el regenerar uno al lado del otro:

```tsx
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <DiscountCodeToggle id={c.id} fields={fields} />
                  <RegenerateCodeLink id={c.id} />
                </div>
```

5. Imports nuevos: `CopyableLink`, `RegenerateCodeLink`, `buildCodeShareUrl`, `buildCodeSalesUrl`,
   `formatBoliviaDate`.
6. Agregar al `<p>` de ayuda de arriba una frase más:

```tsx
        {" "}El <strong>link privado de ventas</strong> de cada código es para la persona dueña
        del código: ahí ve sus ventas y su monto, nada más. Si se filtra, tocá &ldquo;Generar link
        nuevo&rdquo;.
```

**Checkpoint C**: en `/admin/codigos`, cada tarjeta muestra los dos links con su botón Copiar; el
link privado copiado y pegado en una ventana de incógnito abre la página del Bloque B con los
números de ese código. Tocá "Generar link nuevo": la página se refresca con un link distinto, el
viejo pasa a dar 404 y el nuevo funciona. Verificá también en 375px que los links no desbordan la
tarjeta. Commit.

---

## 5. Bloque D — Tests, documentación y limpieza

### D1. `src/lib/discount-links.test.ts` (nuevo)

```ts
import { describe, expect, it } from "vitest";
import { buildCodeShareUrl, buildCodeSalesUrl } from "@/lib/discount-links";
import { siteConfig } from "@/config/site";

describe("buildCodeShareUrl", () => {
  it("es absoluto y apunta al catálogo con el código en el query", () => {
    expect(buildCodeShareUrl("MAFE10")).toBe(`${siteConfig.url}/catalogo?codigo=MAFE10`);
  });

  it("escapa caracteres que romperían el query string", () => {
    expect(buildCodeShareUrl("MAFE&10")).toBe(`${siteConfig.url}/catalogo?codigo=MAFE%2610`);
  });
});

describe("buildCodeSalesUrl", () => {
  it("es absoluto y lleva el token en el path", () => {
    expect(buildCodeSalesUrl("abc123")).toBe(`${siteConfig.url}/mis-ventas/abc123`);
  });

  it("escapa el token para que no se salga del segmento de ruta", () => {
    expect(buildCodeSalesUrl("a/b")).toBe(`${siteConfig.url}/mis-ventas/a%2Fb`);
  });
});
```

> El resto de la fase es SQL y renderizado: la agregación vive en vistas que ya se verifican en
> los checkpoints contra los números del panel. **No inventes tests de integración con Supabase
> mockeado** — este repo no tiene esa infraestructura y montarla acá es otro proyecto.

### D2. `docs/codigos-de-descuento.md`

Dos cambios, los dos para el dueño:

1. **Sección nueva**, después de "Compartir un link con el código ya cargado":

```markdown
## Pasarle a la persona su link de ventas

Cada código tiene un **link privado** donde la persona ve, ella sola, cuántas ventas trajo su
código y por cuánto. No necesita contraseña ni cuenta: el link es la llave.

En `/admin/codigos`, en la tarjeta del código, copiá **Link privado de ventas** y mandáselo por
WhatsApp. Ahí la persona ve:

- cuántas ventas trajo su código y el monto total,
- la lista de esas ventas con fecha y monto,
- su link para compartir, listo para copiar.

**Lo que no ve**: nombres, teléfonos ni direcciones de compradores, qué producto se vendió, ni
nada de los demás códigos. Tampoco ve el nombre que vos le pusiste en "De quién es".

Si el link se le escapa a alguien más, tocá **Generar link nuevo** en esa misma tarjeta: el
anterior deja de funcionar en el acto y le pasás el nuevo.
```

2. **Corregir la sección "Leer los números de cada código"**: describe un check *"ya está
   pagado"* al generar el comprobante que la Fase 11 eliminó. Reemplazar los dos bullets y la
   frase de la comisión por:

```markdown
- **Pedidos generados** / **Descuento (generado)**: todo pedido creado con ese código. Incluye
  pedidos históricos que quedaron sin cobrar, así que puede sobreestimar.
- **Pedidos pagados** / **Facturado (pagado)**: las ventas cobradas. Desde que el comprobante lo
  generás vos, todo lo que registrás nace pagado, así que este número y el de arriba solo se
  separan por pedidos viejos.

**Si le vas a pagar una comisión a alguien, usá siempre "Pagados".** Es el mismo número que ve la
persona en su link de ventas.
```

### D3. Cierre

1. `graphify update .`
2. `npm run build`, `npm test`, `npx tsc --noEmit` — los tres limpios.
3. Commit.

**Checkpoint D**: build limpio, tests verdes, `tsc` sin errores, y una pasada completa de punta a
punta: crear un código nuevo en `/admin/codigos` → copiar su link privado → abrirlo en incógnito
(debe mostrar 0 ventas y el estado vacío) → generar un comprobante en `/admin/recibos/nuevo`
usando ese código → recargar el link privado → aparece 1 venta con la fecha de hoy y el total del
pedido, y los números coinciden con los de `/admin/codigos`.

---

## 6. Archivos tocados

| Archivo | Bloque | Qué |
|---|---|---|
| `supabase/migrations/20260804210000_discount_code_public_token.sql` | A | nuevo |
| `src/types/database.ts` | A | regenerado (`npm run db:types`) |
| `src/lib/discount-links.ts` | B | nuevo |
| `src/lib/discount-sales-data.ts` | B | nuevo |
| `src/lib/format.ts` | B | `formatBoliviaDate` compartida |
| `src/components/CopyableLink.tsx` | B | nuevo |
| `src/app/mis-ventas/[token]/page.tsx` | B | nuevo |
| `src/app/robots.ts` | B | `disallow` de `/mis-ventas/` |
| `src/app/api/admin/codigos/[id]/link/route.ts` | C | nuevo |
| `src/components/admin/RegenerateCodeLink.tsx` | C | nuevo |
| `src/app/admin/codigos/page.tsx` | C | links, regenerar, fecha compartida |
| `src/lib/discount-links.test.ts` | D | nuevo |
| `docs/codigos-de-descuento.md` | D | sección nueva + corrección Fase 11 |

---

## 7. Riesgos conocidos

- **El link es la credencial.** Quien lo tenga ve esos números, y un token en una URL viaja en el
  historial del navegador y en cualquier reenvío de WhatsApp. Es aceptable porque lo que expone
  son conteos y montos de un solo código, sin datos de clientes — el mismo razonamiento de la
  Fase 6 §1 y de `/pedido/[token]`. La mitigación es "Generar link nuevo", no criptografía.
- **Los grants de `anon` sobre las vistas.** El revoke de A1 asume que Supabase los había
  otorgado por default. Si la consulta de A2 devuelve filas después de aplicar la migración, algo
  las está re-otorgando (un trigger de `alter default privileges` propio del proyecto): **pará y
  avisá antes de seguir**, no es algo que se resuelva improvisando.
- **`sold_at` de los comprobantes de la Fase 9** es cuando el dueño registró la venta, no cuando
  ocurrió. Puede haber días de diferencia y la persona podría preguntarlo. No hay dato mejor en
  la base; no lo inventes.
- **Cambiar `siteConfig.url`** rompe todos los links ya repartidos, porque son absolutos. Es lo
  correcto (tienen que ser pegables en WhatsApp) pero anotalo si algún día se compra un dominio.
- **La lista se corta en 100.** Los totales no, salen de la vista. Si algún código llega ahí de
  verdad, la solución es paginar, no subir el límite.
