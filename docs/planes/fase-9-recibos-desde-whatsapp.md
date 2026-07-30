# Fase 9 — El pedido vuelve a WhatsApp, el recibo lo hace el dueño

> **Requisito**: leé `00-contexto.md` completo antes de empezar.
> Esta fase **revoca la Fase 8 entera** y **retira el checkout autoservicio** de la Fase 5.

---

## 0. Cómo ejecutar este plan

Escrito el 2026-07-30 para ejecutarse en una sesión nueva. **Todas las decisiones están
tomadas** — no hay nada que consultarle al dueño. Si te encontrás con una bifurcación que este
documento no resuelve, es un hueco del plan: pará y preguntá, no elijas por tu cuenta.

**Orden**: Bloque A → B → C → D, en ese orden. Cada bloque termina con un checkpoint que tiene
que pasar antes de seguir. **Un commit por bloque**, mensaje en inglés, con el trailer
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Antes de cada commit**: `npm run build` limpio y `npm test` en verde. Sin excepción.

**Antes de explorar código**: `graphify query "<pregunta>"` (hay un hook que lo exige).
**Después de modificar código**: `graphify update .`

**Ya hecho, no lo repitas**:

- Las 2 cuentas de prueba de la Fase 8 (`ana.prueba.fase8@example.com`,
  `carla.checkout.fase8@example.com`) **ya fueron borradas** de `auth.users` el 2026-07-30.
  `auth.users` está en 0 y `customer_profiles` en 0 por el `on delete cascade`. Los 3 pedidos que
  estaban vinculados perdieron su `customer_id` por el `on delete set null` y **siguen existiendo**.
- El estado remoto de la base fue verificado con `supabase migration list`: las 12 migraciones
  locales están aplicadas.

**No toques nada de esto** — sirve a los 10 pedidos históricos y tiene que seguir funcionando
igual al final de la fase:

```
src/app/pedido/[token]/page.tsx          src/lib/orders-data.ts
src/app/api/pedido/[token]/comprobante/  src/lib/pdf/OrderReceipt.tsx (salvo el tipo, ver C3)
src/app/admin/page.tsx                   src/components/admin/OrderCard.tsx
src/app/api/admin/pedidos/[id]/estado/   src/components/PaymentInstructions.tsx
src/lib/auth.ts  src/lib/dal.ts          src/lib/money.ts  src/lib/orders.ts
```

---

## 1. El cambio, en una frase

El comprador vuelve a pedir por WhatsApp como antes de la Fase 5. **El único usuario del sistema
es el administrador**, y es él quien genera el comprobante en PDF: pega el mensaje de WhatsApp en
el panel, revisa lo que el parser entendió, y descarga el PDF.

### Decisiones tomadas (2026-07-30). No las re-litigues.

1. **No hay cuentas de comprador.** La Fase 8 se revierte completa: registro, login, recuperación
   de contraseña, `customer_profiles`, `orders.customer_id`. Todo afuera.
2. **No hay `/checkout`.** El comprador no crea su propio pedido. El carrito termina en un
   mensaje de WhatsApp, y nada más.
3. **El comprobante que genera el admin no se persiste.** Es un PDF y se acabó: no hay número de
   pedido en la base, ni token, ni estado, ni fila en `orders`.
4. **`orders` y el panel de pedidos se quedan como historial.** Los 10 pedidos que ya existen
   siguen visibles en `/admin` con sus estados y su PDF. Simplemente no entran pedidos nuevos.
5. **El código de descuento viaja en el mensaje de WhatsApp.** El comprador lo aplica en el
   carrito, el mensaje lo incluye, el admin lo ve al pegarlo y el servidor lo revalida. Al
   generar el comprobante se registra el uso, para que el reporte por influencer siga existiendo
   sin necesidad de una fila en `orders`.

### Qué NO cambia

- El servidor sigue sin confiar en un solo monto que venga de afuera (`00-contexto.md` §6). El
  `Bs 700` que aparece en el mensaje pegado **se ignora**: los precios salen de `products.ts` y
  los totales de `calculateOrderTotals()`.
- El login del panel sigue siendo contraseña única + cookie HMAC (`auth.ts` + `dal.ts`).
- El navegador sigue sin hablar con Supabase. Al sacar `@supabase/ssr` esa invariante queda otra
  vez sin ninguna excepción.
- El PDF sigue sin validez tributaria y tiene que seguir diciéndolo.

---

## 2. Estado del que partís (verificado el 2026-07-30)

**Migraciones**: las 12 locales están aplicadas en remoto, incluidas las tres de la Fase 8
(`20260730180000`, `180100`, `180200`).

**Datos**: `orders` = 10, `order_items` = 14, `discount_redemptions` = 2, `discount_codes` = 6
(casi todos de prueba), `customer_profiles` = 0, `auth.users` = 0.

**Fase 8 Bloque A** está commiteado en `63ecaa4`. **Bloque B** está sin commitear en el working
tree. **Bloque C (`/cuenta/pedidos`) nunca se construyó**, así que el link "Mi cuenta" del Header
y "Mis pedidos" del Footer apuntan hoy a un 404 — revertir lo arregla de paso.

---

## 3. Bloque A — Descartar la Fase 8

### A1. Tirar el Bloque B sin commitear

```bash
git checkout -- src/app/api/pedidos/route.ts src/app/checkout/page.tsx \
  "src/app/pedido/[token]/page.tsx" src/components/CheckoutForm.tsx \
  src/lib/orders-data.ts src/lib/orders.schema.ts src/types/database.ts
rm -rf "src/app/api/pedido/[token]/vincular" src/components/cuenta/LinkOrderButton.tsx \
  supabase/migrations/20260730180100_orders_customer_link.sql \
  supabase/migrations/20260730180200_extend_create_order_for_customer.sql
```

Sí, `checkout/page.tsx` y `CheckoutForm.tsx` se restauran acá y se borran en B1. Es a propósito:
así el Bloque A es un revert limpio de la Fase 8 y el checkpoint de A corre con el sitio en su
estado de Fase 7, compilando y con los tests en verde. Sacar el checkout es un cambio de producto
distinto y merece su propio commit.

Los dos archivos SQL se borran del repo **pero su efecto ya está en la base** — eso lo deshace
A3. Es la única forma correcta: una migración aplicada no se edita ni se borra, se compensa con
otra nueva.

### A2. Revertir el Bloque A

`git revert --no-commit 63ecaa4` y revisar. Eso deshace de una sola vez:

| Se borra | Qué era |
|---|---|
| `src/app/cuenta/**` | 4 páginas: ingresar, registro, recuperar, nueva-contrasena |
| `src/app/api/cuenta/**` | 6 Route Handlers de identidad |
| `src/components/cuenta/**` | LoginForm, RegisterForm, RecoverForm, NewPasswordForm |
| `src/lib/customer-dal.ts` + `.test.ts` | `getCustomer`, `requireCustomer`, `createCustomerAccount` |
| `src/lib/customer.schema.ts` | `emailSchema`, `passwordSchema`, `registerSchema`… |
| `src/lib/supabase-auth.ts` | cliente `@supabase/ssr` |
| `supabase/migrations/20260730180000_customer_profiles.sql` | ídem A1: el archivo se va, el efecto lo deshace A3 |

| Vuelve a su estado anterior | Qué se saca |
|---|---|
| `src/app/layout.tsx` | el `await getCustomer()` que corría en **cada request** del sitio |
| `src/components/Header.tsx` | botón Ingresar / Mi cuenta (desktop y mobile) |
| `src/components/Footer.tsx` | link "Mis pedidos" → `/cuenta/pedidos` (que nunca existió) |
| `src/proxy.ts` | `handleCuenta`, `PUBLIC_CUENTA_PATHS`, `/cuenta/:path*` del matcher |
| `src/types/database.ts` | tipos de `customer_profiles` |
| `.env.example` | `SUPABASE_ANON_KEY` |
| `package.json` / `package-lock.json` | dependencia `@supabase/ssr` |
| `docs/supabase-setup.md` | sección de SMTP y Auth |
| `docs/planes/00-contexto.md` | la nota "Revocado por la Fase 8" de §3 vuelve sola |

Después: `npm install` para limpiar `node_modules`.

**`docs/planes/fase-8-cuentas-de-comprador.md` NO se borra.** Se le agrega arriba, después del
título, un aviso de descartado — este repo documenta las revocaciones en vez de borrarlas
(mirá las notas de §2 y §3 de `00-contexto.md`), y el plan sigue siendo el registro de por qué se
intentó:

```markdown
> **DESCARTADA el 2026-07-30, sin llegar a producción.** El dueño decidió que el comprador no
> tenga cuenta: el único usuario del sistema es el administrador. El Bloque A alcanzó a
> commitearse (`63ecaa4`) y fue revertido; el Bloque B nunca se commiteó. Reemplazada por
> `fase-9-recibos-desde-whatsapp.md`. Este documento queda como registro de la decisión.
```

### A3. Migración de revert en Postgres

`supabase/migrations/20260730190000_revert_customer_accounts.sql`:

```sql
-- Fase 9: se revierte la Fase 8. No hay cuentas de comprador.
--
-- Las tres migraciones de la Fase 8 ya estaban aplicadas en remoto, así que
-- esto las compensa en vez de editarlas. Cuando se corre, customer_profiles
-- ya está vacía y auth.users en 0: las dos cuentas de prueba se borraron a
-- mano el 2026-07-30 y el cascade limpió los perfiles.

drop index if exists orders_customer_id_idx;
alter table orders drop column if exists customer_id;
alter table orders drop column if exists customer_email;

drop table if exists customer_profiles;

-- create_order vuelve al cuerpo previo a la Fase 8 (20260729062932). Queda
-- SIN NINGÚN LLAMADOR: /checkout se va en el Bloque B y el comprobante del
-- admin no persiste nada. Se restaura en vez de dropearse porque cuesta 20
-- líneas y deja la puerta abierta si algún día se vuelve a persistir.
create or replace function create_order(payload jsonb)
returns table (token text, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_token text := payload->>'token';
  v_order_number text := payload->>'order_number';
  v_discount_code_id uuid := nullif(payload->>'discount_code_id', '')::uuid;
  v_claimed_uses integer;
begin
  if v_discount_code_id is not null then
    update discount_codes
       set used_count = used_count + 1
     where id = v_discount_code_id
       and is_active
       and (max_uses is null or used_count < max_uses)
    returning used_count into v_claimed_uses;

    if v_claimed_uses is null then
      raise exception 'discount_code_exhausted' using errcode = 'NGL01';
    end if;
  end if;

  insert into orders (
    order_number, token,
    customer_name, customer_phone, customer_city, customer_address, customer_note,
    subtotal, discount, shipping, total,
    discount_code, discount_code_label
  )
  values (
    v_order_number, v_token,
    payload->>'customer_name', payload->>'customer_phone', payload->>'customer_city',
    payload->>'customer_address', payload->>'customer_note',
    (payload->>'subtotal')::numeric(12,2), (payload->>'discount')::numeric(12,2),
    (payload->>'shipping')::numeric(12,2), (payload->>'total')::numeric(12,2),
    payload->>'discount_code', payload->>'discount_code_label'
  )
  returning id into v_order_id;

  insert into order_items (order_id, slug, name, dose, unit_price, quantity, line_total)
  select
    v_order_id, item->>'slug', item->>'name', item->>'dose',
    (item->>'unit_price')::numeric(12,2), (item->>'quantity')::integer,
    (item->>'line_total')::numeric(12,2)
  from jsonb_array_elements(payload->'items') as item;

  if v_discount_code_id is not null then
    insert into discount_redemptions (code_id, order_id, code, discount_amount)
    values (v_discount_code_id, v_order_id, payload->>'discount_code',
            (payload->>'discount')::numeric(12,2));
  end if;

  return query select v_token, v_order_number;
end;
$$;

revoke execute on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
```

Aplicar con `npx supabase db push`, después `npm run db:types` y commitear
`src/types/database.ts` regenerado.

### Checkpoint del Bloque A

- `npm run build` limpio, `npm test` en verde
- `grep -rn "cuenta\|customer-dal\|supabase-auth\|SUPABASE_ANON_KEY" src .env.example` sin
  resultados vivos
- `grep -n "@supabase/ssr" package.json` sin resultado
- `/` carga y el Header no tiene botón de cuenta
- `/pedido/<token de uno de los 10>` sigue mostrando el pedido y su PDF
- `/admin` sigue listando los 10 pedidos

---

## 4. Bloque B — La compra vuelve a WhatsApp

### B1. Sacar el checkout

Se borran:

- `src/app/checkout/page.tsx`
- `src/components/CheckoutForm.tsx`
- `src/app/api/pedidos/route.ts`
- `src/lib/recent-orders.ts`, `src/components/RecentOrdersList.tsx`,
  `src/components/SaveRecentOrderOnMount.tsx` — existían para que el comprador no perdiera su
  token. Sin pedidos autoservicio no hay token que perder. Sacar `<RecentOrdersList />` del
  Footer y `<SaveRecentOrderOnMount />` de `pedido/[token]/page.tsx`.
- `/checkout` del matcher de `proxy.ts` (queda solo `/admin/:path*`) y el comentario de la Fase 8
  que explica por qué estaba ahí

Se saca también el CTA "Continuar al pedido" de `/carrito` ([carrito/page.tsx:112](../../src/app/carrito/page.tsx)) y
de `CartDrawer`: **queda un solo CTA, el de WhatsApp**, que pasa a ser primario (`bg-accent`, no
`variant="compact"`). Ajustar el copy de arriba, que hoy promete "recibís un número de pedido y
las instrucciones para pagar" — eso ya no pasa solo.

`orders.schema.ts` **se conserva**: `phoneSchema`, `customerSchema` y `orderItemInputSchema` los
reusa el Bloque C. Sacarle nada más el campo `account` si quedó algo del Bloque B.

### B2. El código de descuento se mueve al carrito

Hoy el input del código vive en `CheckoutForm`, que se borra. Pasa a `CartDrawer` y a `/carrito`,
reusando lo que ya existe:

- `POST /api/descuentos/validar` — **sin cambios**. Ya recibe items y recalcula el subtotal en el
  servidor.
- `pendingCode` de `cart.ts` + `ApplyCodeFromUrl` — el `?codigo=MAFE10` de un link de influencer
  ya funciona; solo cambia dónde se autoaplica.
- El código aplicado se guarda en el store del carrito (`appliedCode`, persistido igual que los
  items) para que `buildOrderMessage()` lo lea.

La lógica de validar/aplicar/limpiar el código sale de `CheckoutForm` a un hook propio
(`src/lib/use-discount-field.ts` o similar) porque ahora la usan dos componentes. No la
dupliques.

Nota honesta a poner en la UI, cerca del descuento aplicado: el monto que ve el comprador acá es
**informativo**; el que vale es el que el admin confirma al generar el comprobante.

### B3. El mensaje de WhatsApp

`buildOrderMessage()` en `src/lib/whatsapp.ts` pasa a incluir el código y a pedir la dirección:

```
Hola Nextgen Labs, quiero hacer un pedido:

• Tesamorelin 10 MG x2 — Bs 700
• NAD+ 500 MG x1 — Bs 450

Total: Bs 1150

Código de descuento: MAFE10

Mis datos:
Nombre:
Ciudad:
Dirección:
```

La línea del código **solo aparece si hay uno aplicado**. Los precios y el total **se quedan** (el
comprador quiere saber cuánto va a pagar) pero **el parser los ignora**: el formato es para
humanos y el cliente puede editar el texto entero antes de enviarlo. Lo único que el parser
necesita reconocer es `• nombre dosis xN`, la línea del código y las tres de datos.

Actualizar los tests de `whatsapp.test.ts` que asertan el formato actual, y agregar los casos con
y sin código.

### Checkpoint del Bloque B

- Agregar al carrito → aplicar `MAFE10` → el mensaje de WhatsApp que se abre trae los ítems, el
  total y el código
- `/checkout` devuelve 404
- `/carrito` y el drawer tienen un solo CTA
- `npm test` en verde con los tests nuevos de `buildOrderMessage()`

---

## 5. Bloque C — El comprobante lo genera el admin

### C1. El parser

`src/lib/whatsapp-parse.ts`, puro y sin red:

```ts
export type ParsedOrderMessage = {
  items: { slug: string; quantity: number }[];
  unmatched: string[];   // líneas "•" que no matchearon ningún producto
  code: string | null;
  name: string | null;
  city: string | null;
  address: string | null;
};

export function parseOrderMessage(text: string): ParsedOrderMessage;
```

Cada línea que empieza con `•` (o `-`, o `*`, porque el cliente reescribe) se normaliza —
minúsculas, sin acentos, sin espacios dobles — y se busca contra `name + dose` de `products.ts`.
Lo que no matchea va a `unmatched` y el formulario lo muestra en amarillo: **el parser nunca
adivina un producto**, se lo pasa al admin para que lo resuelva a mano.

Tests obligatorios en `src/lib/whatsapp-parse.test.ts`: mensaje intacto, mensaje con los datos
completados, sin código, con producto reescrito a mano, con `x2` pegado sin espacio, con dosis
omitida, con `•` cambiado por `-`, y texto que no es un pedido.

### C2. La pantalla

`src/app/admin/recibos/nuevo/page.tsx` (Server Component, `await requireSession()`) +
`src/components/admin/ReceiptBuilderForm.tsx` (client; si pasa de ~150 líneas se parte):

1. Textarea "Pegá el mensaje de WhatsApp" → botón "Leer mensaje".
2. Formulario editable con lo que el parser entendió: ítems con `QtyStepper` (el exportado desde
   `CartDrawer.tsx`), buscador para agregar productos que faltaron, nombre, WhatsApp, ciudad,
   dirección, nota, código de descuento, y un check **"ya está pagado"**.
3. "Generar comprobante" → descarga el PDF.

El WhatsApp del comprador **no viene en el mensaje** (lo sabe el admin por el chat): es un campo
obligatorio del formulario, validado con el `phoneSchema` que ya existe.

Agregar el link a `/admin/recibos/nuevo` en la barra de `/admin`, al lado de "Códigos de
descuento".

### C3. El endpoint

`POST /api/admin/recibos/route.ts` — `export const runtime = "nodejs"` (`@react-pdf/renderer` no
corre en Edge), `await requireApiSession()` primero:

1. Zod sobre el body, reusando `orderItemInputSchema` y `customerSchema` de `orders.schema.ts`.
2. `calculateOrderTotals(items)` desde `products.ts`. **Ningún monto del body se usa.**
3. Si hay código: `evaluateDiscount()` contra `discount_codes`, igual que hacía el checkout.
4. Arma un `ReceiptData` en memoria con `generateOrderNumber()` (de `orders.ts`),
   `createdAt = new Date().toISOString()` y `status = "paid" | "pending"` según el check del admin.
5. `renderOrderReceiptPdf()` y devuelve el PDF con
   `Content-Disposition: attachment; filename="Comprobante-<numero>.pdf"`.

`OrderReceipt.tsx` **no cambia su render**. Solo se angosta su parámetro: hoy pide un
`OrderRecord` completo pero usa nueve campos y ni `id` ni `token`. Definir en `orders-data.ts`:

```ts
export type ReceiptData = Pick<
  OrderRecord,
  "orderNumber" | "createdAt" | "status" | "customerName" | "customerPhone"
  | "customerCity" | "customerAddress" | "subtotal" | "discount"
  | "discountCodeLabel" | "shipping" | "total" | "items"
>;
```

`OrderRecord` la satisface, así que `/api/pedido/[token]/comprobante` sigue funcionando sin
tocarlo.

### C4. El reporte de códigos

`discount_redemptions.order_id` es hoy `not null references orders(id)`. Sin fila en `orders` no
hay dónde registrar el uso del código — y sin eso no hay reporte por influencer ni `max_uses` que
sirva. `supabase/migrations/20260730190100_redemptions_without_orders.sql`:

```sql
-- Fase 9: el comprobante que genera el admin no crea un pedido, pero el uso
-- del código sí tiene que quedar registrado — es lo único que sostiene el
-- reporte por influencer y el límite de max_uses.
alter table discount_redemptions
  alter column order_id drop not null,
  add column receipt_number text,
  add column receipt_total  numeric(12,2),
  add column customer_name  text,
  add column is_paid        boolean not null default false,
  add constraint redemption_has_source
    check (order_id is not null or receipt_number is not null);

-- La vista mantiene los mismos nombres y tipos de columna (requisito de
-- create or replace); solo cambian las expresiones, para contar las dos
-- fuentes: pedidos históricos y comprobantes sueltos.
create or replace view discount_code_attribution as
select
  dc.*,
  count(dr.id)::integer as redemption_count,
  coalesce(sum(dr.discount_amount), 0)::numeric(12,2) as discount_total,
  coalesce(sum(coalesce(o.total, dr.receipt_total)), 0)::numeric(12,2) as revenue_total,
  count(dr.id) filter (where o.status = 'paid' or dr.is_paid)::integer
    as paid_redemption_count,
  coalesce(sum(coalesce(o.total, dr.receipt_total))
    filter (where o.status = 'paid' or dr.is_paid), 0)::numeric(12,2) as paid_revenue_total
from discount_codes dc
left join discount_redemptions dr on dr.code_id = dc.id
left join orders o on o.id = dr.order_id
group by dc.id
order by dc.created_at desc;
```

`unique (order_id)` sigue valiendo: Postgres no considera dos NULL como duplicados.

Al generar un comprobante con código, el endpoint de C3, **antes de renderizar el PDF**:

1. Incrementa `used_count` con el mismo
   `update … where is_active and (max_uses is null or used_count < max_uses) returning used_count`
   que usa `create_order` — así `max_uses` sigue siendo a prueba de carreras.
2. Inserta la redención con `code_id`, `code`, `discount_amount`, `receipt_number`,
   `receipt_total`, `customer_name`, `is_paid`.

Si el incremento no agarra (código agotado), **el PDF no se genera** y el admin ve el error.

Y una pantalla: `src/app/admin/codigos/reporte/page.tsx`, tabla desde
`discount_code_attribution` con código, `owner_label`, usos, descuento total y facturado,
separando generados de pagados como ya hace la vista. Link desde `/admin/codigos`.

### Checkpoint del Bloque C

- Pegar un mensaje real de WhatsApp con `FAMILIA` aplicado, generar el PDF, y verificar: los
  montos coinciden con la suma a mano desde `products.ts`, el descuento es el que corresponde,
  `used_count` de `FAMILIA` subió uno, y `/admin/codigos/reporte` lo muestra
- Pegar un mensaje con un producto reescrito a mano: aparece en amarillo y no rompe nada
- Un código agotado no genera PDF y muestra el error
- `/api/pedido/<token viejo>/comprobante` sigue devolviendo el PDF de siempre
- `POST /api/admin/recibos` sin cookie de admin devuelve 401

---

## 6. Bloque D — Cerrar la fase

Actualizar `docs/planes/00-contexto.md`, que después de A2 vuelve a su texto de Fase 7 y queda
contradiciendo al código:

- **§3 (lo que NO se construye)**: agregar que el checkout autoservicio salió y que el
  comprobante lo genera el dueño desde el panel. La exclusión de "cuentas de comprador" vuelve
  sola con el revert y ahora es correcta — sacar cualquier nota que diga "revocado por la Fase 8".
- **§4 (estado del código)**: `whatsapp.ts` deja de ser "el fallback" y pasa a ser **el** canal de
  pedido.
- **§5 (diagrama de arquitectura)**: rehacerlo. `POST /api/pedidos` ya no existe; aparece
  `POST /api/admin/recibos`; `orders` queda marcada como historial de solo lectura.
- **§8 (estados de una orden)**: aclarar que aplica solo a los pedidos históricos.

Y `docs/codigos-de-descuento.md`, si documenta el flujo del checkout.

Después: `graphify update .`, `npm run build`, `npm test`.

---

## 7. Lo que esta fase deja muerto a propósito

Queda escrito para que nadie lo "arregle" por error más adelante:

- **`create_order` no tiene llamadores.** A propósito (§A3).
- **`orders` no recibe filas nuevas.** El panel de pedidos, los estados y el aviso por WhatsApp
  de la Fase 7 sirven solo a los 10 pedidos históricos.
- **`/pedido/[token]` solo responde a tokens viejos.** No se genera ninguno nuevo.
- **`orders_overview`** (vista de `20260729054654`) queda igual de congelada que `orders`.
- **`discount_redemptions.order_id` queda NULL para siempre** en las filas nuevas. Las 2 viejas lo
  tienen; la vista maneja los dos casos.
