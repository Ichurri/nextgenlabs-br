# Fase 11 — El comprobante persiste el pedido

> **Requisito**: leé `00-contexto.md` completo antes de empezar.
> Esta fase **revoca la decisión 3 de la Fase 9** ("el comprobante que genera el admin no se
> persiste") y **elimina el estado `shipped`**.

---

## 0. Cómo ejecutar este plan

Escrito el 2026-08-04 para ejecutarse en una sesión nueva. **Todas las decisiones están
tomadas** — no hay nada que consultarle al dueño. Si aparece una bifurcación que este documento
no resuelve, es un hueco del plan: pará y preguntá, no elijas por tu cuenta.

**Orden**: Bloque A → B → C → D, en ese orden. Cada bloque termina con un checkpoint que tiene
que pasar antes de seguir. **Un commit por bloque**, mensaje en inglés, con el trailer
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Antes de cada commit**: `npm run build` limpio y `npm test` en verde. Sin excepción.

**Antes de explorar código**: `graphify query "<pregunta>"` (hay un hook que lo exige).
**Después de modificar código**: `graphify update .`

**No hace falta `npm run db:types`**: la migración de esta fase no agrega ni saca columnas ni
cambia la firma de ninguna función (`create_order(payload jsonb) → table(token, order_number)`
queda igual). `src/types/database.ts` no cambia.

---

## 1. El cambio, en una frase

El comprobante que arma el admin desde un mensaje de WhatsApp **deja de ser un PDF suelto que se
descarga**: crea un pedido real en la base, descuenta stock y aparece en `/admin`. El panel de
pedidos pasa a ser la lista única de todo lo vendido, sin filtros ni estados.

### Decisiones tomadas (2026-08-04). No las re-litigues.

1. **El comprobante persiste.** `/api/admin/recibos` inserta en `orders` + `order_items` vía la
   RPC `create_order` (que ya existe y hoy no tiene llamador) y devuelve **JSON**, no bytes de
   PDF. El PDF se sigue generando, pero on-demand desde `/api/pedido/[token]/comprobante`, que ya
   funciona y no se toca.
2. **No hay descarga automática.** Al generar, el formulario redirige a `/admin` con el pedido
   nuevo resaltado. El dueño baja el PDF desde la tarjeta del pedido cuando lo va a mandar.
3. **Un solo estado.** `paid`. Se va `shipped`: el CHECK de Postgres, el filtro del panel, el
   badge de la tarjeta y el parámetro `status` de los helpers de WhatsApp.
4. **Un solo mensaje al comprador**, literal:
   `Gracias por confiar en nosotros, acá está tu comprobante de recibo.`
   Sin número de pedido — el número va en el PDF, que es lo que el dueño adjunta a mano. WhatsApp
   no permite adjuntar archivos por deep link (`wa.me`): el flujo es *bajar el PDF → abrir el chat
   → adjuntar*, y la UI tiene que ordenar esos dos pasos uno al lado del otro.
5. **El ajuste manual de stock (sumar/restar) NO se toca.** Es el único camino para las ventas
   que no pasan por la página, y sigue siendo indispensable. Quedan intactos, tal cual están hoy:
   `/admin/productos/[id]/stock`, `StockAdjustForm.tsx` (campo "Cantidad — positivo suma,
   negativo resta" + motivo obligatorio), `POST /api/admin/productos/[id]/stock` y
   `StockMovementList.tsx`. **Ningún bloque de esta fase edita esos cuatro archivos.**
6. **Lo único que se va es el "deshacer el descuento de stock" del formulario de comprobante**,
   que es otra cosa: un enlace que revertía en bloque el batch del comprobante recién generado, y
   que no sobrevive al redirect a `/admin`. Con él queda sin llamador el endpoint
   `DELETE /api/admin/stock/[batchId]` — ojo, `/api/admin/stock/[batchId]`, **no**
   `/api/admin/productos/[id]/stock`, que es el del punto 5 y se queda. La RPC
   `revert_stock_batch` se queda en la base sin uso: no cuesta nada y no se borra en esta fase.
   Un comprobante duplicado ahora se ve en la lista de pedidos y su stock se corrige con el mismo
   ajuste manual del punto 5, que además deja el motivo escrito.
6. **La validación de precios y stock pasa a leer el catálogo fresco** (`getAdminCatalog()`), no
   el cacheado (`getCatalog()`). Ver Bloque C: hoy son dos catálogos distintos y eso es un bug
   real, no una mejora opcional.

### Lo que NO se toca

```
# Ajuste manual de stock — intocable, es el camino de las ventas fuera de la web
src/app/admin/productos/[id]/stock/page.tsx      src/components/admin/StockAdjustForm.tsx
src/app/api/admin/productos/[id]/stock/route.ts  src/components/admin/StockMovementList.tsx

# Resto
src/lib/pdf/OrderReceipt.tsx (salvo el Record de STATUS_LABEL)
src/app/api/pedido/[token]/comprobante/route.ts (salvo el header de descarga, Bloque B)
src/app/pedido/[token]/page.tsx        src/lib/orders.ts        src/lib/money.ts
src/lib/discounts.ts                   src/lib/whatsapp-parse.ts
src/lib/dal.ts / auth.ts               supabase/migrations/* ya aplicadas
```

---

## 2. Bloque A — Un solo estado: `paid`

**Objetivo**: sacar `shipped` de la base, del panel y de los helpers de WhatsApp, y dejar el
mensaje nuevo.

### A1. Migración

Nuevo archivo `supabase/migrations/20260804190000_orders_paid_only.sql`:

```sql
-- Fase 11: todo pedido nace pagado y el estado no cambia nunca más. "shipped"
-- dejó de tener sentido: el dueño despacha por WhatsApp y no lo registra acá.
-- La columna `status` se queda (la leen orders_overview y
-- discount_code_attribution), pero con un solo valor posible.
update orders set status = 'paid' where status <> 'paid';

alter table orders drop constraint orders_status_check;

alter table orders add constraint orders_status_check
  check (status = 'paid');
```

Aplicar contra el proyecto linkeado antes de seguir (`supabase db push` o pegándola en el SQL
editor, como el resto del repo). **No** hace falta tocar las vistas: `o.status = 'paid'` en
`discount_code_attribution` sigue siendo válido y ahora es siempre verdadero para pedidos.

### A2. `src/lib/orders-data.ts`

```ts
// Todo pedido nace pagado (ver /api/admin/recibos) y el estado no cambia: no
// hay "pending", "cancelled" ni "shipped" (Fase 11).
const ORDER_STATUSES = ["paid"] as const;
```

`parseOrderStatus` queda igual — la guarda sigue siendo real y ahora tira si alguien mete
`shipped` a mano en la base.

### A3. `src/lib/whatsapp.ts`

Reemplazar el bloque "Negocio → comprador" entero:

```ts
// ─── Negocio → comprador ────────────────────────────────────────────────
// wa.me apunta acá al número DEL COMPRADOR (customer_phone, ya normalizado a
// solo dígitos por phoneSchema en orders.schema.ts), no al del negocio.
//
// WhatsApp no deja adjuntar archivos por deep link: este helper solo abre el
// chat con el texto listo. El PDF lo adjunta el dueño a mano, por eso la
// tarjeta del pedido pone el botón de descarga al lado de este enlace.

/** Único mensaje al comprador: el comprobante va adjunto a mano. */
export function buildCustomerReceiptMessage(): string {
  return "Gracias por confiar en nosotros, acá está tu comprobante de recibo.";
}

export function buildCustomerWhatsAppUrl(phoneDigits: string): string {
  const message = buildCustomerReceiptMessage();
  return `https://wa.me/${encodeURIComponent(phoneDigits)}?text=${encodeURIComponent(message)}`;
}
```

Sacar el import de `OrderStatus` si queda sin uso.

### A4. `src/lib/whatsapp.test.ts`

Reemplazar los `describe("buildCustomerStatusMessage")` y `describe("buildCustomerWhatsAppUrl")`
(líneas 166–206) por:

```ts
describe("buildCustomerReceiptMessage", () => {
  it("es el texto acordado con el dueño, sin número de pedido", () => {
    expect(buildCustomerReceiptMessage()).toBe(
      "Gracias por confiar en nosotros, acá está tu comprobante de recibo."
    );
  });
});

describe("buildCustomerWhatsAppUrl", () => {
  it("apunta a wa.me con el teléfono del comprador (no el del negocio)", () => {
    expect(buildCustomerWhatsAppUrl("69437674").startsWith("https://wa.me/69437674?text=")).toBe(
      true
    );
  });

  it("el teléfono queda correctamente escapado en la URL", () => {
    const url = buildCustomerWhatsAppUrl("+591 69437674");
    expect(url).toContain(encodeURIComponent("+591 69437674"));
    expect(url).not.toContain(" ");
  });

  it("codifica el mensaje en el parámetro text", () => {
    const url = buildCustomerWhatsAppUrl("69437674");
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(buildCustomerReceiptMessage());
  });
});
```

Ajustar el import de arriba del archivo (`buildCustomerStatusMessage` → `buildCustomerReceiptMessage`).

### A5. `src/lib/pdf/OrderReceipt.tsx`

Solo el Record de la línea 123:

```ts
const STATUS_LABEL: Record<ReceiptData["status"], string> = {
  paid: "Pagado",
};
```

El PDF sigue mostrando "Estado: Pagado" — en un comprobante eso es información, no una opción.

### A6. `src/app/admin/page.tsx`

- Borrar `STATUS_FILTERS`, `StatusFilter`, `isStatusFilter` y todo el `<nav>` de filtros (líneas
  15–25 y 88–102).
- `searchParams` pasa a ser `Promise<{ page?: string }>`.
- La query pierde el `if (status !== "all")`: siempre trae todos los pedidos.
- `PageLink` pierde la prop `status`; el href queda `/admin?page=${page}`.
- El estado vacío pasa a `"Todavía no hay pedidos."`.

### A7. `src/components/admin/OrderCard.tsx`

- Borrar `STATUS_LABEL`, `STATUS_BADGE_CLASS`, el `<span>` del badge y el import de
  `parseOrderStatus` / `OrderStatus`.
- `buildCustomerWhatsAppUrl(order.customer_phone)` — un solo argumento.

**Checkpoint A**: `npm test` verde, `npm run build` limpio, `/admin` muestra todos los pedidos sin
tabs ni badges, y el enlace del teléfono abre WhatsApp con el texto nuevo. Commit.

---

## 3. Bloque B — El comprobante crea el pedido

**Objetivo**: `/api/admin/recibos` persiste y devuelve JSON.

### B1. Migración de `create_order`

Nuevo archivo `supabase/migrations/20260804190100_create_order_for_receipts.sql`. Copiar el
cuerpo de `20260730190000_revert_customer_accounts.sql` (líneas 18–78) con **dos** cambios:

1. El insert en `orders` agrega `paid_at`:

```sql
  insert into orders (
    order_number, token,
    customer_name, customer_phone, customer_city, customer_address, customer_note,
    subtotal, discount, shipping, total,
    discount_code, discount_code_label,
    paid_at
  )
  values (
    v_order_number, v_token,
    payload->>'customer_name', payload->>'customer_phone', payload->>'customer_city',
    payload->>'customer_address', payload->>'customer_note',
    (payload->>'subtotal')::numeric(12,2), (payload->>'discount')::numeric(12,2),
    (payload->>'shipping')::numeric(12,2), (payload->>'total')::numeric(12,2),
    payload->>'discount_code', payload->>'discount_code_label',
    now()
  )
  returning id into v_order_id;
```

2. La redención llena también las columnas de comprobante, para que
   `discount_code_attribution` sume igual por las dos ramas del `coalesce`:

```sql
  if v_discount_code_id is not null then
    insert into discount_redemptions (
      code_id, order_id, code, discount_amount,
      receipt_number, receipt_total, customer_name, is_paid
    )
    values (
      v_discount_code_id, v_order_id, payload->>'discount_code',
      (payload->>'discount')::numeric(12,2),
      v_order_number, (payload->>'total')::numeric(12,2),
      payload->>'customer_name', true
    );
  end if;
```

Mantener los `revoke`/`grant` del final tal cual. Encabezá el archivo con un comentario que diga
que `create_order` vuelve a tener llamador (Fase 11) y que el claim del código, el pedido, los
ítems y la redención quedan en **una sola transacción** — que es la mejora concreta sobre el
camino de la Fase 9 (`claim_discount_code_use` + insert suelto + render).

Aplicar la migración antes de seguir.

### B2. `src/app/api/admin/recibos/route.ts`

Reescribir de la línea 93 al final. La primera mitad (auth, parseo, `calculateOrderTotals`,
evaluación del código) **no cambia** salvo lo del Bloque C.

```ts
  // Segunda pasada: con el descuento evaluado, para que el umbral de envío
  // gratis se calcule sobre subtotal-después-de-descuento.
  const totals = calculateOrderTotals(items, catalog, discountAmount, customer.city);
  const orderNumber = generateOrderNumber();
  const token = generateToken();

  // El pedido, sus ítems, el claim del código y la redención entran en una
  // sola transacción (create_order). Si el código se agotó entre la validación
  // de arriba y este momento, no se crea nada.
  const { error: orderError } = await supabaseAdmin.rpc("create_order", {
    payload: {
      order_number: orderNumber,
      token,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_city: customer.city,
      customer_address: customer.address ?? null,
      customer_note: customer.note ?? null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      discount_code: discountCodeRow?.code ?? null,
      discount_code_label: discountLabel,
      discount_code_id: discountCodeRow?.id ?? null,
      items: totals.lines.map((line) => ({
        slug: line.slug,
        name: line.name,
        dose: line.dose,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      })),
    },
  });

  if (orderError) {
    if (orderError.code === "NGL01") {
      return NextResponse.json(
        { error: "Este código ya alcanzó su límite de usos." },
        { status: 409 }
      );
    }
    console.error("create_order_failed", orderError.code);
    return NextResponse.json({ error: "No pudimos guardar el pedido." }, { status: 500 });
  }

  // El pedido ya existe: si el descuento de stock falla, se avisa y se sigue —
  // perder el descuento de stock es molesto, perder la venta es peor.
  let stockWarning = false;
  try {
    const { error: stockError } = await supabaseAdmin.rpc("register_sale_stock", {
      payload: {
        receipt_number: orderNumber,
        items: totals.lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
      },
    });
    if (stockError) {
      console.error("register_sale_stock_failed", stockError.code);
      stockWarning = true;
    }
  } catch (err) {
    console.error("register_sale_stock_threw", err);
    stockWarning = true;
  }

  revalidateTag("catalog", { expire: 0 });

  return NextResponse.json({ orderNumber, token, stockWarning }, { status: 201 });
```

Borrar del archivo: los imports de `renderOrderReceiptPdf`, `ReceiptData`, `claim_discount_code_use`
y todo el bloque que armaba `receipt` y los headers del PDF. Agregar `generateToken` al import de
`@/lib/orders`. **Sacar `export const runtime = "nodejs"`** solo si ya no queda nada de
`@react-pdf/renderer` en el archivo — que es el caso; dejarlo no rompe nada, pero sacarlo con el
comentario que lo justificaba es más honesto.

Actualizar el docblock de arriba del POST: ya no dice "no persiste ningún pedido".

> `claim_discount_code_use` queda sin llamador en el código. **No se borra la RPC** de la base:
> es un `create or replace` de 20 líneas y borrarla no aporta nada. Sí anotalo en el comentario
> del archivo de la migración B1.

### B3. `src/components/admin/ReceiptBuilderForm.tsx`

- Borrar `filenameFromContentDisposition`, los estados `stockBatchId` / `undoState`, la función
  `undoStockBatch` y todo el JSX de "deshacer".
- Agregar `const router = useRouter()` (`next/navigation`).
- El `handleSubmit`, tras un `res.ok`:

```ts
      const body = (await res.json()) as { orderNumber: string; stockWarning: boolean };

      if (body.stockWarning) {
        // No redirige: el dueño tiene que leer el aviso y corregir el stock a mano.
        setStockWarning(true);
        setCreatedOrderNumber(body.orderNumber);
        return;
      }

      router.push(`/admin?nuevo=${encodeURIComponent(body.orderNumber)}`);
      router.refresh();
```

- El aviso de stock pasa a incluir el número y un enlace a `/admin`:

```tsx
      {stockWarning && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p>
            El pedido {createdOrderNumber} quedó guardado, pero no pudimos descontar el stock.
            Restalo a mano con &ldquo;Ajustar stock&rdquo; en la ficha del producto.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Link href="/admin/productos" className="focus-ring rounded underline">
              Ir a productos
            </Link>
            <Link href="/admin" className="focus-ring rounded underline">
              Ir a pedidos
            </Link>
          </div>
        </div>
      )}
```

- El texto del botón pasa de `"Generar comprobante"` a `"Guardar pedido y generar comprobante"`,
  y de `"Generando…"` a `"Guardando…"`.
- Mientras `stockWarning` o el redirect están en curso, el botón queda deshabilitado (agregar
  `|| createdOrderNumber !== null` al `disabled`): sin esto un doble clic crea dos pedidos.

### B4. `src/app/admin/recibos/nuevo/page.tsx`

Cambiar el copy del `<p>` (línea 22–25):

```tsx
      <p className="mt-2 text-sm text-muted">
        Pegá el mensaje de pedido que te mandó el comprador por WhatsApp, revisá lo que
        entendimos y guardalo. El pedido queda en la lista de Pedidos, con su comprobante en PDF
        y el stock ya descontado.
      </p>
```

### B5. `/admin`: resaltar el pedido nuevo y facilitar el PDF

`src/app/admin/page.tsx`:

- `searchParams` pasa a `Promise<{ page?: string; nuevo?: string }>`.
- Si `params.nuevo` está, mostrar arriba de la lista:

```tsx
      {params.nuevo && (
        <p className="mt-6 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Pedido {params.nuevo} guardado. Bajá el comprobante y mandáselo por WhatsApp.
        </p>
      )}
```

- Pasar `highlight={order.order_number === params.nuevo}` a `<OrderCard />`.

`src/components/admin/OrderCard.tsx`:

- Prop nueva `highlight?: boolean`; cuando es `true`, el `<article>` suma
  `ring-1 ring-success` a su className.
- El teléfono del bloque de datos deja de ser un enlace y pasa a ser
  `<p className="text-muted">{order.customer_phone}</p>`: la acción de WhatsApp queda una sola
  vez, en el pie, al lado de la descarga del PDF (que es el paso previo obligatorio).
- El pie de la tarjeta pasa a tener los dos pasos, en orden:

```tsx
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-lg font-bold">{formatPrice(order.total)}</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a
            href={`/api/pedido/${order.token}/comprobante?descargar=1`}
            className="focus-ring rounded font-medium text-accent-light hover:underline"
          >
            Descargar comprobante
          </a>
          <a
            href={buildCustomerWhatsAppUrl(order.customer_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded font-medium text-accent-light hover:underline"
          >
            Enviar por WhatsApp
          </a>
        </div>
      </div>
```

`src/app/api/pedido/[token]/comprobante/route.ts` — única modificación: soportar `?descargar=1`
para forzar la descarga en vez de abrir el visor del navegador.

```ts
  const url = new URL(_request.url);
  const disposition = url.searchParams.get("descargar") === "1" ? "attachment" : "inline";
```

y usarlo en el header `Content-Disposition`. Renombrar `_request` a `request`.

**Checkpoint B**: pegar un mensaje de WhatsApp de prueba en `/admin/recibos/nuevo`, guardarlo, y
verificar **las cuatro cosas**: (1) el navegador no descarga nada, (2) `/admin` abre con el banner
verde y la tarjeta resaltada arriba de todo, (3) "Descargar comprobante" baja el PDF con el mismo
número de pedido, (4) en Supabase hay una fila en `orders` con `status = 'paid'`, `paid_at` no
nulo y sus `order_items`. Si el mensaje traía código de descuento, además: `discount_redemptions`
tiene una fila con `order_id` **y** `receipt_number`, y `used_count` del código subió exactamente
1. Commit.

---

## 4. Bloque C — El stock se descuenta contra el catálogo real

**Objetivo**: cerrar el desfase entre el catálogo que ve el editor de ítems y el que valida el
servidor.

**El bug**: `/admin/recibos/nuevo` arma el selector de productos con `getAdminCatalog()` (sin
cache, incluye archivados), pero `/api/admin/recibos` valida precio y stock con `getCatalog()`
(cacheado 1 h, solo `is_active = true`). Consecuencias reales hoy:

- un producto archivado que aparece en el selector hace fallar el comprobante con
  `No encontramos el producto "<slug>"`;
- el chequeo `isInStock()` lee `stock_qty` de hasta una hora atrás, así que puede bloquear un
  producto ya repuesto o dejar pasar uno que se agotó por otra vía.

**El arreglo**, en `src/app/api/admin/recibos/route.ts`: reemplazar el import y la línea 53.

```ts
import { getAdminCatalog } from "@/lib/products-data";
```

```ts
  // El comprobante es de una venta que YA ocurrió por WhatsApp: se valida
  // contra el catálogo fresco del panel (el mismo que llena el selector de
  // ReceiptItemsEditor), no contra el cacheado del sitio público. Así el
  // precio y el stock son los de este segundo, y un producto archivado se
  // puede facturar igual.
  const { products, categories } = await getAdminCatalog();
  const catalog: Catalog = { products, categories: categories.map((c) => c.name) };
```

Importar el tipo `Catalog` desde `@/lib/products.types`. `AdminProduct extends Product`, así que
`calculateOrderTotals` lo acepta sin cambios.

`getCatalog` queda sin uso en este archivo pero sigue usándose en el sitio público — no la toques.
`revalidateTag("catalog")` se queda: el sitio público sí lee del cache y tiene que enterarse del
stock nuevo.

**Checkpoint C**: con un producto de `stock_qty = 10` y `track_stock = true`, generar un
comprobante de 2 unidades. Verificar: (1) `/admin/productos` muestra 8, (2) `stock_movements`
tiene una fila `type = 'sale'`, `qty = -2`, `stock_after = 8` y `receipt_number` igual al número
del pedido, (3) la ficha del producto en el sitio público muestra el stock nuevo sin esperar la
hora de cache. Repetir con un producto de `track_stock = false`: no debe generar movimiento ni
tocar `stock_qty`.

Y la contraparte manual, que es la que sostiene las ventas fuera de la web: en
`/admin/productos/[id]/stock` de ese mismo producto, registrar un ajuste de `+3` con motivo, y
verificar que el stock sube a 11, que aparece la fila `type = 'adjustment'` con el motivo escrito
en `StockMovementList` y que el sitio público lo refleja. Después un `-1` para confirmar que
restar también funciona. Commit.

---

## 5. Bloque D — Limpieza

1. Borrar `src/app/api/admin/stock/[batchId]/route.ts` — **solo ese archivo**, el del
   `DELETE`/`revert_stock_batch`; su único llamador era el botón de deshacer que se fue en B3.
   Antes de borrarlo, confirmá con `grep -rn "api/admin/stock/" src/` que no queda ninguna
   referencia. **No confundir con `src/app/api/admin/productos/[id]/stock/route.ts`**, que es el
   `POST` del ajuste manual de sumar/restar y **se queda**: si el grep te devuelve una ruta que
   empieza con `api/admin/productos/`, es la que no se toca.
2. `src/app/admin/codigos/reporte/page.tsx`, el `<p>` de ayuda: la frase
   *"comprobantes con «ya está pagado» tildado"* describe un checkbox que no existe. Reemplazar
   el párrafo por:
   `Cada pedido de la lista es una venta cobrada: "Generados" y "Pagados" solo difieren por pedidos históricos que quedaron sin cobrar.`
3. `graphify update .`
4. `npm run build` + `npm test` + `npx tsc --noEmit`. Commit.

**Checkpoint D**: build limpio, tests verdes, y dos pasadas manuales completas:

1. **Venta por la web**: carrito en el sitio → mensaje de WhatsApp → pegar en
   `/admin/recibos/nuevo` → guardar → `/admin` → descargar comprobante → abrir el chat de
   WhatsApp con el texto nuevo → adjuntar el PDF a mano.
2. **Venta fuera de la web**: `/admin/productos` → ficha del producto → "Ajustar stock" con un
   valor negativo y el motivo → el stock baja y queda el movimiento registrado. Este camino tiene
   que funcionar exactamente igual que antes de la fase.

---

## 6. Archivos tocados

| Archivo | Bloque | Qué |
|---|---|---|
| `supabase/migrations/20260804190000_orders_paid_only.sql` | A | nuevo |
| `supabase/migrations/20260804190100_create_order_for_receipts.sql` | B | nuevo |
| `src/lib/orders-data.ts` | A | `ORDER_STATUSES = ["paid"]` |
| `src/lib/whatsapp.ts` | A | mensaje único, sin `status` |
| `src/lib/whatsapp.test.ts` | A | tests del mensaje nuevo |
| `src/lib/pdf/OrderReceipt.tsx` | A | `STATUS_LABEL` de una sola clave |
| `src/app/admin/page.tsx` | A, B | sin filtros; banner + highlight |
| `src/components/admin/OrderCard.tsx` | A, B | sin badge; descargar + WhatsApp |
| `src/app/api/admin/recibos/route.ts` | B, C | persiste y devuelve JSON; catálogo fresco |
| `src/components/admin/ReceiptBuilderForm.tsx` | B | redirect en vez de descarga |
| `src/app/admin/recibos/nuevo/page.tsx` | B | copy |
| `src/app/api/pedido/[token]/comprobante/route.ts` | B | `?descargar=1` |
| `src/app/api/admin/stock/[batchId]/route.ts` | D | borrado (undo de batch, sin llamador) |
| `src/app/admin/codigos/reporte/page.tsx` | D | copy |

Y los que **no** aparecen acá a propósito, el ajuste manual de stock: `StockAdjustForm.tsx`,
`StockMovementList.tsx`, `admin/productos/[id]/stock/page.tsx` y
`api/admin/productos/[id]/stock/route.ts`. Si tu diff los toca, algo salió mal.

---

## 7. Riesgos conocidos

- **Doble envío del formulario** = dos pedidos y doble descuento de stock. Mitigado por el
  `disabled` de B3, no por la base: no hay unicidad por contenido. Si aparece un duplicado, se
  corrige a mano desde la ficha del producto.
- **`create_order` no valida stock**. La única barrera contra vender un producto agotado es
  `isInStock()` dentro de `calculateOrderTotals`, y `stock_qty` puede quedar negativo si el
  comprobante entra entre dos lecturas. Es intencional (Fase 10: "puede ser negativo a propósito,
  venta sin stock") y el panel lo muestra.
- **Los 10 pedidos históricos** de la Fase 5 no tienen `paid_at`. Ninguna vista ni pantalla lo
  lee, así que no rompe nada; no los rellenes.
