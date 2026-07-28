# Fase 6 — Códigos de descuento para influencers y allegados

> **Requisitos**: leé `00-contexto.md` y ejecutá primero `fase-5-pedidos-y-comprobante.md`.
> Esta fase se apoya en `calculateOrderTotals()`, en la tabla `orders` y en
> `POST /api/pedidos`, que ya deben existir.

---

## Objetivo

Que el dueño pueda darle un código a una influencer ("MAFE10", 10% de descuento) o a un allegado
("FAMILIA", Bs 150 fijos), con límite de usos y vencimiento, **y saber cuántos pedidos trajo cada
uno** — todo sin pedirle un deploy al desarrollador.

**Checkpoint de la fase**: crear tres códigos con reglas distintas desde el panel de Supabase,
usarlos en pedidos reales, y correr la consulta de atribución para ver el conteo por persona.

---

## 1. Por qué esto vive en el servidor

Es la única razón por la que este proyecto necesita backend, así que vale la pena tenerlo claro:

- Un código validado en el cliente **viaja en el bundle de JavaScript**. Cualquiera abre las
  devtools y se lleva la lista completa, incluido el más generoso.
- `max_uses` necesita estado compartido entre requests. En el cliente no existe.
- La atribución por influencer requiere persistir cada canje.

**Regla que no se rompe: el navegador manda únicamente el string del código. Nunca el monto del
descuento.** El servidor revalida y recalcula siempre, incluso si ya validó ese mismo código
treinta segundos antes en el endpoint de validación.

### Modelo de amenaza real (para no sobre-construir)

El descuento solo se materializa cuando se crea un pedido, y **todo pedido lo confirma el dueño a
mano por WhatsApp viendo el depósito en su banco**. Nadie puede extraer dinero adivinando códigos:
lo peor que pasa es que alguien consiga un descuento que no le correspondía. Es un problema de
negocio, no de seguridad. Dimensioná las defensas a eso: límites y vencimientos sí, infraestructura
de rate limiting elaborada no.

---

## 2. Esquema de base de datos

Guardar en `supabase/migrations/0002_discount_codes.sql`.

```sql
create table discount_codes (
  id          uuid primary key default gen_random_uuid(),

  code        text not null unique,        -- SIEMPRE en MAYÚSCULAS. Mín. 4 caracteres.
  type        text not null check (type in ('percent','fixed')),
  value       numeric(12,2) not null check (value > 0),

  -- Para atribución. Ej: "María Fernanda — IG @mafe" / "Tío Jorge"
  owner_label text not null,

  is_active   boolean not null default true,
  starts_at   timestamptz,                 -- null = activo desde ya
  expires_at  timestamptz,                 -- null = no vence
  max_uses    integer check (max_uses is null or max_uses > 0),  -- null = ilimitado
  used_count  integer not null default 0,

  min_order_total numeric(12,2),           -- null = sin mínimo
  max_discount    numeric(12,2),           -- tope en Bs para códigos de %. null = sin tope

  created_at  timestamptz not null default now(),

  -- Barandilla: un código de 100% sería una catástrofe silenciosa.
  constraint percent_range check (type <> 'percent' or (value >= 1 and value <= 50))
);

create table discount_redemptions (
  id              uuid primary key default gen_random_uuid(),
  code_id         uuid not null references discount_codes(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  code            text not null,           -- snapshot, por si el código se borra
  discount_amount numeric(12,2) not null,
  created_at      timestamptz not null default now(),
  unique (order_id)                        -- un solo código por pedido
);

create index discount_redemptions_code_id_idx on discount_redemptions(code_id);

alter table discount_codes enable row level security;
alter table discount_redemptions enable row level security;
-- Sin policies: solo el servidor con service_role key.
```

Notas de diseño:

- **`orders.discount_code` es texto plano, no una FK.** Si el dueño borra un código, los pedidos
  viejos tienen que seguir mostrando qué código usaron. La FK vive en `discount_redemptions`,
  que es para contar.
- **`unique (order_id)` en redemptions**: un código por pedido. No hay códigos acumulables y no
  los agregues sin que el cliente los pida — multiplican los casos borde por diez.
- **`percent_range` topa los porcentajes en 50%.** Si el cliente alguna vez quiere más, que sea
  una decisión consciente que toque cambiar el constraint, no un typo en el panel.

---

## 3. La función de validación

Toda la lógica va en **una función pura**, sin I/O, en `src/lib/discounts.ts`. Es lo más
testeable del proyecto y lo que más caro sale si está mal.

```ts
export type DiscountCode = { /* espejo de la fila de discount_codes */ };

export type DiscountResult =
  | { valid: true; amount: number; code: string; label: string }
  | { valid: false; reason: DiscountError; message: string };

export type DiscountError =
  | "not_found" | "inactive" | "not_started" | "expired"
  | "exhausted" | "below_minimum";

/** Normaliza lo que escribió el usuario: "  mafe10 " → "MAFE10" */
export function normalizeCode(input: string): string;

/** Pura. `now` se inyecta para poder testear vencimientos sin mockear el reloj. */
export function evaluateDiscount(
  code: DiscountCode | null,
  subtotal: number,
  now: Date,
): DiscountResult;
```

### Reglas, en orden de evaluación

1. `code === null` → `not_found`
2. `!is_active` → `inactive`
3. `starts_at != null && now < starts_at` → `not_started`
4. `expires_at != null && now > expires_at` → `expired`
5. `max_uses != null && used_count >= max_uses` → `exhausted`
6. `min_order_total != null && subtotal < min_order_total` → `below_minimum`
   (el mensaje **sí** debe decir cuánto falta: "Este código aplica desde Bs 500")
7. Cálculo:
   - `percent` → `amount = round2(subtotal × value / 100)`, luego `amount = min(amount, max_discount)` si hay tope
   - `fixed` → `amount = min(value, subtotal)`
8. **Siempre**: `amount = min(amount, subtotal)`. El descuento no puede superar el subtotal.
9. **El descuento nunca toca el envío.** Solo el subtotal de productos.

### Sobre los mensajes de error

Decí la verdad ("este código venció", "este código ya alcanzó su límite de usos"). Es mucho mejor
UX que un "código inválido" genérico, y dado el modelo de amenaza de §1 no vale la pena
esconderlo. El único genérico es `not_found`: *"No encontramos ese código. Revisá que esté bien
escrito."*

---

## 4. Endpoints

### `POST /api/descuentos/validar`

Solo para mostrarle el descuento al comprador antes de confirmar. **No es autoritativo.**

```ts
// Request
{ code: string, items: [{ slug, quantity }] }

// Response 200
{ valid: true, amount: 360, code: "MAFE10", label: "10% de descuento" }
{ valid: false, reason: "expired", message: "Este código venció el 30/06." }
```

Fijate que recibe los `items`, no el subtotal: el servidor lo recalcula. Nunca aceptes un
subtotal del cliente ni siquiera para "solo mostrar" — se convierte en el camino de menor
resistencia y alguien lo va a reusar en el lugar equivocado.

El `label` que se le muestra al comprador es el descriptivo del descuento ("10% de descuento"),
**no** `owner_label`. `owner_label` es información interna del negocio y no sale del servidor.

### `POST /api/pedidos` (modificado)

El body acepta ahora un `discountCode?: string` opcional. Dentro del handler:

1. Calcular el subtotal (como en la Fase 5).
2. Si vino un código: buscarlo y evaluarlo con `evaluateDiscount()`. Si es inválido → `409`
   con el motivo. **No crees la orden silenciosamente sin el descuento**: el comprador vio un
   total y tiene que ver el mismo o entender por qué cambió.
3. **Incrementar el uso de forma atómica** (ver §5). Si el incremento falla porque se agotó
   → `409` con `reason: "exhausted"`.
4. Crear la orden con `discount`, `discount_code` y `discount_code_label` poblados.
5. Insertar la fila en `discount_redemptions`.

En el cliente, ante un `409`: mostrar el mensaje, quitar el descuento del resumen y pedir
confirmación explícita antes de reintentar con el total nuevo. Nunca cobrar más de lo que la
persona vio sin que lo confirme.

---

## 5. La condición de carrera de `max_uses`

Dos personas canjeando el último uso al mismo tiempo. Un `select` seguido de un `update` deja
pasar a las dos. La forma correcta es un update condicional atómico:

```sql
update discount_codes
   set used_count = used_count + 1
 where id = $1
   and is_active
   and (max_uses is null or used_count < max_uses)
returning used_count, max_uses;
```

**Si devuelve 0 filas, el código se agotó** — abortá el pedido con `409`. Si devuelve una fila,
el uso ya quedó reservado.

Y si después falla la creación de la orden, **devolvé el uso** (`used_count = used_count - 1`)
o vas a "quemar" usos de códigos por pedidos que nunca existieron.

Lo ideal es meter todo en una función RPC de Postgres (`create_order_with_discount`) para que
sea una sola transacción. Si eso complica demasiado, la compensación manual alcanza para este
volumen — pero dejá el comentario explicando la decisión.

---

## 6. UI en el checkout

En `src/components/CheckoutForm.tsx`, dentro del resumen del pedido:

- Campo de texto + botón "Aplicar". Uppercase automático mientras se escribe.
- Estados: vacío / validando / aplicado / error. El error va debajo del campo, en `text-danger`.
- Aplicado: se reemplaza el campo por un chip `MAFE10· −Bs 360` con una ✕ para quitarlo.
- El resumen pasa a mostrar cuatro líneas: Subtotal / Descuento (en verde, con signo menos) /
  Envío / Total.
- Accesibilidad: el resultado de la validación va en un `role="status"` `aria-live="polite"`
  para que un lector de pantalla lo anuncie. Ya usamos ese patrón en
  `src/components/CartToast.tsx` — copialo, incluido el truco del `key` para re-anunciar.

### Link con código pre-aplicado (recomendado)

Es lo que hace que un influencer realmente lo use: en vez de "poné MAFE10 al pagar", comparte
`nextgenlabsbo.vercel.app/catalogo?codigo=MAFE10` y el descuento aparece solo.

Implementación mínima: un componente cliente lee el search param, lo guarda en el store del
carrito (`pendingCode`), y el checkout precarga el campo y lo valida al montar. Si el código es
inválido, no muestres un error agresivo al entrar al catálogo — simplemente no lo apliques.

---

## 7. Cómo el cliente agrega un código (esto va en el handoff)

No se construye CRUD propio en esta fase. El dueño usa el editor de tablas de Supabase.
Escribile estas instrucciones en un documento aparte, en lenguaje llano:

> **Nota agregada el 2026-07-27.** Este plan se escribió antes de que existiera el panel del
> dueño (`fase-5.6-panel-pedidos.md`). Ahora hay una tensión a resolver: `docs/supabase-setup.md`
> le recomienda al dueño **no** entrar a Supabase, y esta sección lo manda al table editor.
> Las dos salidas son razonables — dejarlo así (los códigos se tocan poco) o agregar una
> pantalla de códigos al panel, que ya tiene login. **Preguntale al humano cuál prefiere antes
> de ejecutar esta sección**; no lo decidas por tu cuenta ni amplíes el alcance en silencio.

1. Entrar a supabase.com → el proyecto → **Table Editor** → tabla `discount_codes`
2. **Insert row** y llenar:
   - `code`: en MAYÚSCULAS, sin espacios. Ej: `MAFE10`
   - `type`: `percent` para un porcentaje, `fixed` para un monto en Bs
   - `value`: `10` = 10% (si es percent) · `150` = Bs 150 (si es fixed)
   - `owner_label`: de quién es. Ej: `María Fernanda — IG @mafe`
   - `max_uses`: cuántas veces se puede usar en total. Vacío = ilimitado
   - `expires_at`: fecha de vencimiento. Vacío = no vence
   - `min_order_total`: compra mínima en Bs. Vacío = sin mínimo
3. Para **desactivar** un código: poner `is_active` en `false`. **No lo borres** — si lo borrás,
   perdés el historial de cuántas ventas trajo.

Tres ejemplos para arrancar:

| code | type | value | max_uses | expires_at | Para quién |
|---|---|---|---|---|---|
| `MAFE10` | percent | 10 | 100 | 2026-12-31 | Influencer, campaña acotada |
| `FAMILIA` | fixed | 150 | *(vacío)* | *(vacío)* | Allegados, permanente |
| `LANZAMIENTO` | percent | 15 | 50 | 2026-08-31 | Promo por tiempo limitado |

---

## 8. Atribución: cómo lee el cliente los resultados

SQL para pegar en el **SQL Editor** de Supabase:

```sql
-- Pedidos y monto descontado por cada código
select
  dc.code,
  dc.owner_label,
  count(dr.id)                       as pedidos,
  sum(dr.discount_amount)            as descuento_total,
  sum(o.total)                       as facturado,
  dc.used_count,
  dc.max_uses
from discount_codes dc
left join discount_redemptions dr on dr.code_id = dc.id
left join orders o                on o.id = dr.order_id
group by dc.id
order by pedidos desc;
```

**Recordá el sesgo** (está explicado en `00-contexto.md` §2): como las confirmaciones son por
WhatsApp y nadie marca las órdenes como pagadas, esto cuenta **pedidos generados**, no ventas
cobradas. Sobreestima. Si el cliente va a pagarle comisión a alguien con este número, decíselo
explícitamente y sugerile marcar `status = 'paid'` a mano en los pedidos que sí cobró — con eso,
agregando `where o.status = 'paid'`, el número pasa a ser real.

---

## 9. Tests

Esta fase es casi todo lógica pura: apuntá a cobertura alta en `src/lib/discounts.test.ts`.

**`normalizeCode`**
- `"  mafe10 "` → `"MAFE10"`
- `"Mafe 10"` → `"MAFE10"` (espacios internos fuera)

**`evaluateDiscount`**
- `null` → `not_found`
- `is_active: false` → `inactive`
- `starts_at` en el futuro → `not_started`
- `expires_at` en el pasado → `expired`
- `used_count === max_uses` → `exhausted`
- `max_uses: null` con `used_count: 9999` → válido
- `subtotal < min_order_total` → `below_minimum`
- percent 10% sobre 3600 → 360
- percent con `max_discount: 200` sobre 3600 → 200 (aplica el tope)
- fixed 150 sobre 3600 → 150
- **fixed 5000 sobre un subtotal de 3600 → 3600, nunca 5000** (no supera el subtotal)
- el descuento **no** cambia el costo de envío
- redondeo: percent 7% sobre 1725 → `round2`, sin colas de float

**Integración con `calculateOrderTotals`**
- El total con descuento = `subtotal − discount + shipping`
- Con `freeOver` configurado, el umbral se evalúa **después** del descuento
- El total nunca queda por debajo del costo de envío

**Guardarraíl**
- Un código `percent` con `value: 100` no puede existir (lo bloquea el constraint de la DB) —
  testeá que `evaluateDiscount` igual topa el resultado al subtotal por si alguien lo mete
  saltándose el constraint.

---

## 10. Criterios de aceptación

- [ ] `npm run build` limpio y `npm test` en verde.
- [ ] Los tres códigos de ejemplo de §7 funcionan con sus reglas.
- [ ] Un código vencido, uno agotado y uno bajo el mínimo dan cada uno su mensaje correcto.
- [ ] **Mandar `discount: 9999` en el body de `POST /api/pedidos` no cambia el descuento
      guardado.** (El servidor solo acepta el string del código.)
- [ ] `grep -ri "MAFE10\|FAMILIA" .next/static/` no devuelve nada — ningún código viaja al cliente.
- [ ] Un código con `max_uses: 1` usado dos veces en paralelo solo se canjea una vez
      (probalo con dos requests simultáneas).
- [ ] Si el pedido falla después de reservar el uso, `used_count` vuelve atrás.
- [ ] El descuento aparece como línea propia en el PDF, con el código.
- [ ] `owner_label` **no** aparece en ninguna respuesta HTTP ni en el PDF.
- [ ] La consulta de atribución de §8 devuelve los conteos correctos.
- [ ] El link `?codigo=MAFE10` pre-aplica el descuento (si implementaste §6).
- [ ] Verificado en el navegador en desktop y móvil (375px).
- [ ] `graphify update .` corrido y commiteado.
- [ ] Instrucciones para el cliente (§7) entregadas en un documento aparte, sin jerga.

---

## 11. Trampas conocidas

- **Nunca confíes en el resultado de `/api/descuentos/validar` al crear el pedido.** Es solo para
  pintar la pantalla. Revalidá siempre. Es el error clásico y el más caro.
- Comparar códigos sin normalizar: `"mafe10" !== "MAFE10"` y el comprador jura que le diste un
  código roto.
- Aplicar el descuento sobre `subtotal + shipping` en vez de solo sobre `subtotal`. Revisá el
  orden de operaciones de `00-contexto.md` §6.
- Floats: `3600 * 0.1` da `360.00000000000006`. Todo pasa por `round2()`.
- Fechas: `expires_at` es `timestamptz`. Si el cliente pone `2026-12-31`, vence a las 00:00 UTC
  de ese día, o sea el 30 a las 20:00 en Bolivia (UTC−4). Cuando muestres la fecha de
  vencimiento, formateala en horario boliviano o vas a tener una discusión rara.
- Borrar un código en vez de desactivarlo destruye el historial de atribución. Está dicho en las
  instrucciones al cliente, pero considerá bloquearlo con un trigger si te sobra tiempo.
