# Fase 5 — Pedidos, pago por QR/transferencia y comprobante PDF

> **Requisito**: leé `00-contexto.md` completo antes de empezar. Este plan no repite lo que
> está ahí (decisiones del cliente, reglas del dinero, convenciones, cómo se habla con Supabase).

---

## Objetivo

Que un comprador pueda cerrar un pedido en el sitio, ver cómo pagarlo, descargar un comprobante
en PDF y mandarle al dueño el número de pedido por WhatsApp — sin que el dueño tenga que
transcribir nada a mano.

**Checkpoint de la fase**: hacer un pedido real de punta a punta con dos productos, descargar
el PDF, verificar que los montos del PDF coinciden exactamente con los de la pantalla, y que el
botón de WhatsApp abre un mensaje con el número de pedido y el link correctos.

---

## 1. Dependencias a instalar

```bash
npm i @supabase/supabase-js zod @react-pdf/renderer
```

Y bajar la fuente regular (la bold ya está en el repo):

```bash
curl -sL -o src/assets/fonts/Inter-Regular.ttf "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf"
```

> Verificá que el archivo pese ~300KB y no sea una página de error HTML antes de commitear.
> Si esa URL cambió, buscá cualquier fuente de Inter Regular en formato `.ttf`. El requisito real
> es que soporte acentos y `ñ` — el comprobante está en español.

---

## 2. Esquema de base de datos

Crear en el SQL editor de Supabase. Guardá el SQL en `supabase/migrations/0001_orders.sql`
dentro del repo aunque no uses el CLI de Supabase — es documentación viva del esquema.

```sql
create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique,          -- NGL-260727-K4XQ (visible, se dicta por WhatsApp)
  token         text not null unique,          -- 32 hex, va en la URL del comprobante

  customer_name  text not null,
  customer_phone text not null,                -- WhatsApp del comprador
  customer_city  text not null,
  customer_address text,
  customer_note  text,

  subtotal      numeric(12,2) not null,
  discount      numeric(12,2) not null default 0,
  shipping      numeric(12,2) not null default 0,
  total         numeric(12,2) not null,

  -- Previsto para la Fase 6. En la Fase 5 quedan siempre en null.
  discount_code       text,
  discount_code_label text,

  status        text not null default 'pending'
                check (status in ('pending','paid','cancelled')),
  created_at    timestamptz not null default now()
);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  slug        text not null,
  name        text not null,      -- snapshot: el producto puede cambiar de nombre después
  dose        text not null,      -- snapshot
  unit_price  numeric(12,2) not null,
  quantity    integer not null check (quantity > 0),
  line_total  numeric(12,2) not null
);

create index order_items_order_id_idx on order_items(order_id);
create index orders_created_at_idx on orders(created_at desc);

-- RLS activo y SIN policies: nadie entra desde afuera.
-- Todo el acceso es server-side con la service_role key, que salta RLS.
alter table orders enable row level security;
alter table order_items enable row level security;
```

**Por qué el snapshot de `name`, `dose` y `unit_price`**: si mañana el cliente cambia un precio en
`products.ts`, el comprobante de un pedido viejo tiene que seguir mostrando lo que se cobró ese
día. Nunca resuelvas los datos del comprobante leyendo `products.ts` en el momento de generar el
PDF — leelos de `order_items`.

---

## 3. Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/lib/money.ts` | `round2()` y helpers de cálculo. Puro, testeable. |
| `src/lib/supabase-admin.ts` | Cliente Supabase con service key. **Solo se importa desde Route Handlers.** |
| `src/lib/orders.ts` | Lógica pura: `calculateOrderTotals()`, `generateOrderNumber()`, `generateToken()`. |
| `src/lib/orders.schema.ts` | Schemas Zod del checkout. |
| `src/config/payment.ts` | Datos de pago (QR, banco, cuenta) — todo `PLACEHOLDER`. |
| `src/config/shipping.ts` | Costo de envío nacional — `PLACEHOLDER`. |
| `src/app/checkout/page.tsx` | Formulario de datos del comprador. |
| `src/components/CheckoutForm.tsx` | `"use client"`, el formulario en sí. |
| `src/app/api/pedidos/route.ts` | `POST` → crea la orden. Runtime Node. |
| `src/app/pedido/[token]/page.tsx` | Página del pedido: resumen, QR, instrucciones, botones. |
| `src/components/PaymentInstructions.tsx` | Bloque de QR + datos bancarios + copiar al portapapeles. |
| `src/app/api/pedido/[token]/comprobante/route.ts` | `GET` → devuelve el PDF. Runtime Node. |
| `src/lib/pdf/OrderReceipt.tsx` | El documento `@react-pdf/renderer`. |
| `src/lib/money.test.ts`, `src/lib/orders.test.ts` | Tests. |
| `public/pago/qr.png` | **PLACEHOLDER**: el QR real lo da el cliente. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/app/carrito/page.tsx` | Agregar el CTA primario "Continuar al pedido" → `/checkout`. El botón de WhatsApp queda como secundario, no lo borres. |
| `src/components/CartDrawer.tsx` | Mismo cambio de jerarquía. |
| `src/app/robots.ts` | `disallow: ["/pedido/", "/api/", "/checkout"]` |
| `src/app/sitemap.ts` | Verificar que no incluya `/pedido/` ni `/checkout`. |
| `.env.example` | Crear/actualizar con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. |

---

## 4. Flujo, paso a paso

### 4.1 `/checkout`

Formulario con: nombre completo, WhatsApp, ciudad, dirección/referencia, nota opcional.
Al costado, el resumen del carrito con subtotal + envío + total.

- Si el carrito está vacío → redirigir a `/catalogo`.
- Si algún ítem tiene `price === 0` → bloquear con un mensaje que mande a WhatsApp para ese
  producto. Son "precio a consultar".
- Validación con Zod en el cliente **y** en el servidor, con el mismo schema importado de
  `orders.schema.ts`.
- El teléfono: aceptá formatos bolivianos con o sin `+591` y normalizá a solo dígitos. No seas
  rígido, la gente lo escribe de mil formas.

### 4.2 `POST /api/pedidos`

```ts
// Request
{ items: [{ slug: string, quantity: number }], customer: {...} }

// Response 201
{ token: string, orderNumber: string }
```

Pasos exactos dentro del handler:

1. Validar el body con Zod. Body inválido → `400`.
2. Por cada `slug`, buscar el producto con `getProductBySlug()`. Si no existe o `price === 0`
   → `400` con un mensaje concreto.
3. Calcular totales con `calculateOrderTotals()` (ver §6). **Ignorar cualquier monto que venga
   en el body.**
4. Generar `order_number` y `token`.
5. Insertar `orders` + `order_items`. Si el insert de items falla, borrá la orden (o usá una
   función RPC transaccional en Postgres — preferible, pero un `delete` de compensación alcanza
   para este volumen).
6. Devolver `{ token, orderNumber }`.

`export const runtime = "nodejs"` — se necesita para `crypto` y para el PDF más adelante.

**Formato del número de pedido**: `NGL-YYMMDD-XXXX`, donde `XXXX` son 4 caracteres de un alfabeto
sin ambigüedades (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ` — sin `0`, `O`, `1`, `I`). Se dicta por
teléfono y se escribe en WhatsApp: tiene que ser legible, no un UUID.

**Token**: `crypto.randomBytes(16).toString("hex")`. Es lo que protege el comprobante — no uses
el `order_number` en la URL, es adivinable.

### 4.3 `/pedido/[token]`

Server Component. Lee la orden por token; si no existe → `notFound()`.

Contenido, en este orden:

1. Confirmación: "Pedido **NGL-260727-K4XQ** registrado" + fecha.
2. **Bloque de pago destacado** (es lo más importante de la página): el QR como imagen, los
   datos de la cuenta bancaria con botón de copiar, y el monto exacto a transferir en grande.
3. Instrucción explícita: *"Transferí o escaneá el QR por Bs X, y mandanos la captura por
   WhatsApp junto con tu número de pedido."*
4. Botón primario: **"Enviar comprobante por WhatsApp"** → `wa.me` con mensaje precargado.
5. Botón secundario: **"Descargar comprobante (PDF)"**.
6. Resumen de ítems y totales.

Metadata: `robots: { index: false, follow: false }`.

Mensaje de WhatsApp precargado:

```
Hola Nextgen Labs, hice el pedido NGL-260727-K4XQ.
Total: Bs 1.930
Comprobante: https://nextgenlabsbo.vercel.app/pedido/<token>

Ya hice la transferencia, acá va la captura 👇
```

Ese link es lo que reemplaza al panel de administración: el dueño lo abre desde el chat y ve el
pedido completo.

**Limpiar el carrito**: hacelo en `/pedido/[token]` desde un componente cliente chiquito con
`useEffect`, no en `/checkout` antes de que el POST responda. Si el POST falla, el comprador no
puede quedarse sin carrito.

### 4.4 `GET /api/pedido/[token]/comprobante`

Lee la orden + items, renderiza el PDF y lo devuelve:

```ts
return new Response(pdfBuffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Pedido-${order.order_number}.pdf"`,
    "Cache-Control": "private, no-store",
  },
});
```

Token inválido → `404`. Nunca reveles si el token existió alguna vez.

---

## 5. Diseño del comprobante PDF

**Fondo blanco.** El PDF se ve en WhatsApp y a veces se imprime; la identidad dark del sitio no
aplica acá. El azul de marca (`#3b82f6`) se usa solo en la banda del encabezado y en los títulos.

Estructura, una sola página A4:

```
┌────────────────────────────────────────────┐
│ [logo]  NEXTGEN LABS        COMPROBANTE    │  ← banda azul
│                             DE PEDIDO       │
├────────────────────────────────────────────┤
│ Pedido: NGL-260727-K4XQ    27/07/2026      │
│ Estado: Pendiente de pago                  │
│                                            │
│ Cliente: ...   WhatsApp: ...               │
│ Ciudad: ...    Dirección: ...              │
├────────────────────────────────────────────┤
│ Producto            Cant.  P.Unit.   Total │
│ Tesamorelin 10 MG      1   Bs 1.700  1.700 │
│ NAD+ 500 MG            1   Bs 1.900  1.900 │
├────────────────────────────────────────────┤
│                      Subtotal    Bs 3.600  │
│                      Descuento  −Bs   360  │  ← solo si hay (Fase 6)
│                      Envío       Bs    30  │
│                      TOTAL       Bs 3.270  │  ← grande, en negrita
├────────────────────────────────────────────┤
│ CÓMO PAGAR                                 │
│ Banco / Cuenta / Titular                   │
│ Enviá la captura por WhatsApp al +591 ...  │
├────────────────────────────────────────────┤
│ Este documento es un comprobante de pedido │
│ y NO constituye factura fiscal.            │
│ Productos para uso exclusivo de            │
│ investigación. No apto para consumo humano.│
└────────────────────────────────────────────┘
```

Detalles que importan:

- **Registrá las fuentes Inter** con `Font.register()` antes de renderar, leyendo los `.ttf` con
  `readFile` de `node:fs/promises` (mismo patrón que ya usa `src/lib/brand-og-image.tsx`). Sin
  esto los acentos y la `ñ` salen rotos.
- **El aviso de "no es factura" y el de "uso exclusivo de investigación" son obligatorios.** El
  cliente no tiene NIT; el documento no puede parecer una factura.
- Los montos se formatean con `formatPrice()` para que el PDF y la web digan exactamente lo
  mismo.
- El logo está en `public/logo.svg`. `@react-pdf/renderer` no renderiza SVG arbitrario bien;
  si da problemas, exportá un PNG a `public/logo-pdf.png` y usalo ahí.

---

## 6. `src/lib/money.ts` y `src/lib/orders.ts`

```ts
// money.ts
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
```

```ts
// orders.ts — función pura, sin I/O, 100% testeable
export type OrderLine = { slug: string; name: string; dose: string;
                          unitPrice: number; quantity: number; lineTotal: number };

export type OrderTotals = { lines: OrderLine[]; subtotal: number;
                            discount: number; shipping: number; total: number };

export function calculateOrderTotals(
  items: { slug: string; quantity: number }[],
  discount = 0,          // la Fase 6 pasa un valor acá; la Fase 5 siempre 0
): OrderTotals
```

Mantené `calculateOrderTotals` **pura y sin acceso a red ni a Supabase**. Toda la
Fase 6 se apoya en ella y es lo único que tiene que estar blindado con tests.

---

## 7. Config del cliente

```ts
// src/config/shipping.ts
export const SHIPPING = {
  // PLACEHOLDER: el cliente define el costo de envío nacional.
  nationalCost: 30,
  // PLACEHOLDER: null = nunca hay envío gratis. Un número = gratis desde ese subtotal.
  freeOver: null as number | null,
  label: "Envío nacional",
} as const;
```

```ts
// src/config/payment.ts
// PLACEHOLDER: todos estos datos los da el cliente antes de publicar.
export const PAYMENT = {
  qrImage: "/pago/qr.png",
  bank: "Banco Economico",
  accountHolder: "Castro Farrapo Ana Leticia",
  accountNumber: "3101659906",
  accountType: "Caja de ahorro",
  currency: "BOB",
} as const;
```

Estos datos son públicos por naturaleza (es la cuenta que recibe el dinero), así que van en el
repo sin problema. El QR va en `public/pago/qr.png` — pedile al cliente el PNG, no una captura
de pantalla borrosa.

---

## 8. Tests (Vitest)

En `src/lib/money.test.ts` y `src/lib/orders.test.ts`. Casos mínimos:

- `round2` con `0.1 + 0.2`, con negativos, con enteros.
- `calculateOrderTotals` con un ítem, con varios, con cantidad > 1.
- Rechaza un `slug` inexistente.
- Rechaza un producto con `price === 0`.
- El envío se suma al total.
- Con `freeOver` configurado, el envío es 0 cuando corresponde y no cuando no.
- El descuento nunca deja el total por debajo del costo de envío.
- `generateOrderNumber()` no contiene `0`, `O`, `1` ni `I`, y dos llamadas seguidas difieren.

Ojo con `beforeEach` y zustand: si tocás el store del carrito en tests, usá
`useCart.setState({...})` **sin** el segundo argumento `true`. Con `replace: true` se pierden
los métodos de acción del store — ya nos pasó y rompió 8 tests.

---

## 9. Criterios de aceptación

- [ ] `npm run build` limpio y `npm test` en verde.
- [ ] Un pedido con 2 productos distintos y cantidad > 1 se crea y aparece en Supabase con sus
      `order_items` correctos.
- [ ] Los montos del PDF coinciden **al centavo** con los de `/pedido/[token]`.
- [ ] El PDF muestra correctamente acentos y `ñ`.
- [ ] El PDF dice explícitamente que no es factura fiscal.
- [ ] Mandar un `total` falso en el body del POST no cambia el total guardado.
- [ ] Un `slug` con `price: 0` es rechazado con un mensaje claro.
- [ ] `/pedido/<token-inventado>` devuelve 404.
- [ ] `robots.txt` bloquea `/pedido/`, `/api/` y `/checkout`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en el bundle del cliente
      (`grep -r "service_role" .next/static/` no devuelve nada).
- [ ] El botón de WhatsApp del carrito **sigue funcionando** como antes.
- [ ] Verificado en el navegador en desktop y móvil (375px).
- [ ] `graphify update .` corrido y commiteado.

---

## 10. Trampas conocidas

- **Next 16 no es el que conocés.** Los `params` de las páginas son `Promise` y hay que
  `await`-earlos (mirá cómo lo hace `src/app/producto/[slug]/page.tsx`). Leé
  `node_modules/next/dist/docs/` antes de escribir Route Handlers.
- `@react-pdf/renderer` **no funciona en el runtime Edge**. Poné `export const runtime = "nodejs"`
  en la Route Handler del comprobante o vas a perder una hora larga.
- No importes `src/lib/supabase-admin.ts` desde ningún componente cliente ni desde un archivo que
  termine alcanzado por uno. Si aparece un error de "service role key is not defined" en el
  navegador, es esto.
- El carrito de zustand está en `localStorage`: si limpiás el carrito antes de que el POST
  responda y el POST falla, el comprador pierde todo.
- La herramienta de screenshots del navegador estuvo fallando en sesiones anteriores (timeout a
  los 30s). Si vuelve a pasar, verificá con `javascript_tool` (`getBoundingClientRect`, estilos
  computados) y **decilo explícitamente** en vez de afirmar que lo viste.
