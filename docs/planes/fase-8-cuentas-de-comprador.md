# Fase 8 — Cuentas de comprador

> **Requisito**: leé `00-contexto.md` completo antes de empezar. Este plan no repite lo que
> está ahí (decisiones del cliente, reglas del dinero, convenciones, cómo se habla con Supabase).

---

## Cambio de alcance respecto de 00-contexto.md

`00-contexto.md` §3 lista **"cuentas de usuario / login del comprador"** como fuera de alcance.
Esa decisión **queda revocada por esta fase**, junto con la parte de §3 que excluye el envío de
correos: sin correo no hay recuperación de contraseña autoservicio, y sin eso las cuentas
generan más trabajo manual del que ahorran.

Lo que **sigue en pie** de §3, sin cambios:

- No hay pasarela de pago, ni QR dinámico, ni webhook de confirmación. **El pago lo sigue
  verificando el dueño a ojo**, mirando su app bancaria.
- No hay API de WhatsApp Business.
- No hay roles ni usuarios múltiples **en el panel del dueño**.
- No hay control de stock real.

Actualizá §3 de `00-contexto.md` en el commit del Bloque A para que el documento no siga
contradiciendo al código.

---

## Estado del que partís

Fases 5, 5.5, 5.6, 6 y 7 terminadas y en `main`:

- Checkout → `create_order` (RPC transaccional) → `/pedido/[token]` → PDF
- Estados `pending | paid | shipped | cancelled`, con `paid_at`
- Panel `/admin` autenticado con contraseña única + cookie HMAC (`auth.ts` + `dal.ts` + `proxy.ts`)
- `src/lib/recent-orders.ts`: rastro de pedidos en `localStorage`, el único "mis pedidos" que hay
- Nueve migraciones aplicadas, tipos generados con `npm run db:types`

## El problema que resuelve

Hoy **el token es la única llave del comprador a su pedido**, y vive en un solo navegador.
Otro dispositivo, historial borrado o modo incógnito y el pedido desaparece para esa persona.
`recent-orders.ts` (Fase 7 C1) es un parche del mismo problema, con el mismo techo.

Además, el circuito de verificación del pago sigue cortado en dos medios distintos: el comprador
manda la captura por WhatsApp, el dueño la mira en el celular y la marca en el panel. No queda
adjunta a nada, y si el dueño borra el chat, no hay registro de qué le mandaron.

**Checkpoint de la fase**: registrarse, pedir, subir el comprobante desde la cuenta, ver que el
dueño lo revisa desde el panel y marca el pedido como pagado, y que el comprador ve ese cambio
en `/cuenta/pedidos` desde otro dispositivo, sin ningún link guardado.

---

## Decisiones tomadas para esta fase

Vienen de la conversación de arranque. **No las re-litigues.**

1. **La cuenta es obligatoria para hacer un pedido.** No hay checkout como invitado.
2. **La identidad es email + contraseña**, con SMTP propio en Supabase para la recuperación.
3. **El comprador sube la captura del pago** desde su cuenta (Bloque E). WhatsApp sigue siendo
   el canal de conversación, pero deja de ser el único lugar donde vive el comprobante.

### Consecuencia de la decisión 1, y cómo se mitiga

Obligar a registrarse antes de comprar agrega fricción en el peor momento posible. La mitigación
es de diseño, no de código: **el registro va inline dentro de `/checkout`, no como un muro
previo.** El comprador llega con el carrito armado, ve el formulario de siempre, y los campos de
email y contraseña son dos campos más del mismo paso. Nada de "iniciá sesión para continuar" con
el carrito en otra pantalla.

Los datos que hoy pide `customerSchema` (nombre, WhatsApp, ciudad, dirección) pasan a crear el
perfil en el mismo submit. Para el que ya tiene cuenta, esos campos vienen prellenados y solo
confirma.

### Consecuencia de la decisión 2

**La confirmación de email queda DESACTIVADA** en Supabase Auth. Si estuviera activa, `signUp()`
no devuelve sesión y el comprador no puede terminar el pedido hasta abrir su correo — un email en
spam es una venta perdida. El correo existe para recuperar la contraseña, no para validar a la
persona.

Quien valida a la persona es el WhatsApp, que ya se pide y ya es el canal real de contacto. Un
email tipeado mal significa que esa cuenta no se puede recuperar sola; el dueño la resuelve por
WhatsApp. Es un costo aceptable y es explícitamente la decisión tomada.

---

## La invariante que NO se rompe

De `00-contexto.md` §5: **RLS activo en todas las tablas, sin ninguna policy para `anon` ni
`authenticated`. El navegador nunca toca Supabase. Todo el acceso es server-side con la
`service_role key`.**

Esta fase la mantiene **intacta**, y esa es la decisión de arquitectura central del plan.

La forma habitual de meter Supabase Auth en Next.js pone un cliente de Supabase en el navegador
con la anon key y mueve la autorización a policies de RLS. Acá **no** se hace eso. En su lugar:

- El formulario de login/registro postea a un **Route Handler**, igual que `/api/admin/login`.
- El Route Handler llama a `supabase.auth.signInWithPassword()` / `signUp()` **desde el
  servidor**, con `@supabase/ssr` y la anon key **sin prefijo `NEXT_PUBLIC_`**.
- `@supabase/ssr` escribe las cookies de sesión (`sb-<ref>-auth-token`, posiblemente partidas en
  `.0` / `.1`); el navegador las lleva pero nunca las usa para hablar con Supabase.
- **Toda** lectura y escritura de pedidos sigue yendo por el servidor con la service key, como
  hoy. No se escribe ni una policy nueva.

Lo que se gana de Supabase Auth es lo caro y lo peligroso de hacer a mano: hash de contraseñas,
tokens de recuperación de un solo uso, expiración y refresh de sesión, rate limiting. Lo que se
evita es la segunda superficie de autorización.

> **No extiendas `src/lib/auth.ts` a los compradores.** Para un solo admin, scrypt + HMAC está
> bien. Para clientes reales necesitás recuperación, revocación y throttling, y ahí es donde se
> hacen los agujeros.

### El panel del dueño no se migra

`/admin` se queda exactamente como está: contraseña única, cookie firmada, `dal.ts`, `proxy.ts`.
Migrarlo a Supabase Auth en la misma fase duplica el riesgo sin beneficio para una sola persona.
Dos sistemas de auth conviviendo es aceptable acá y es reversible. Si algún día entra personal
con permisos distintos, esa es otra fase.

---

## Cómo está organizado

Cinco bloques, **un commit por bloque**. A, B y C son secuenciales; D y E dependen de C pero son
independientes entre sí. Si te quedás sin tiempo, cortá entre bloques, nunca en el medio de uno.

| Bloque | Qué | Se puede cortar acá |
|---|---|---|
| **A** | Identidad: Supabase Auth server-side, registro, ingreso, recuperación | Sí — el sitio sigue funcionando sin cuentas |
| **B** | Vincular pedidos a cuentas, checkout con registro inline | No — acá el checkout pasa a exigir cuenta |
| **C** | `/cuenta/pedidos`: el historial real | Sí |
| **D** | Línea de tiempo del pedido y coordinación de entrega | Sí |
| **E** | Subida del comprobante de pago | Sí |

---

# Bloque A — Identidad

## A1. Infraestructura de Auth

**Dependencia nueva**: `@supabase/ssr`.

**Variables de entorno** (`.env.local`, `.env.example` y Vercel). Ninguna lleva `NEXT_PUBLIC_`:

```
SUPABASE_ANON_KEY=...        # NO NEXT_PUBLIC_. Se usa solo desde Route Handlers.
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen y no cambian.

**Archivo nuevo** `src/lib/supabase-auth.ts`: crea el cliente de `@supabase/ssr` con el adaptador
de cookies de `next/headers`. Mismo patrón de módulo que `supabase-admin.ts` — con un comentario
arriba explicando por qué la anon key vive server-side y no en el bundle.

## A2. SMTP propio

En el dashboard de Supabase → Authentication → SMTP Settings, configurar Resend (tier gratis,
3000 correos/mes, suficiente de sobra).

- **Confirm email: OFF** (ver "Consecuencia de la decisión 2" arriba).
- Traducir al español las plantillas de recuperación de contraseña. El remitente y el tono tienen
  que sonar a Nextgen Labs, no a Supabase.
- El dominio del remitente necesita SPF/DKIM verificados en Resend, o los correos van a spam.
  **Esto es configuración de dominio, no de código**: si el dueño no tiene acceso al DNS, frená y
  preguntá antes de seguir.

Documentalo en `docs/supabase-setup.md`, que ya existe.

## A3. Perfil del comprador

```sql
-- auth.users no se extiende: se acompaña.
create table customer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  phone      text not null,
  city       text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;
-- Sin policies, igual que orders y order_items.
```

## A4. Rutas y DAL

- `src/lib/customer-dal.ts` (nuevo): `getCustomer()` memoizada con `cache()`, `requireCustomer()`
  que redirige a `/cuenta/ingresar?next=<ruta>`. Mismo criterio que `dal.ts`, archivo aparte
  porque son dos sistemas de auth distintos y mezclarlos invita a confundirlos.
- `/cuenta/ingresar`, `/cuenta/registro`, `/cuenta/recuperar`, `/cuenta/nueva-contrasena`
- `POST /api/cuenta/ingresar`, `/registro`, `/recuperar`, `/salir`
- `proxy.ts`: agregar `/cuenta/:path*` y `/checkout` al matcher, con el mismo chequeo
  **optimista** que ya usa `/admin` — mirar si la cookie existe, nunca verificarla ahí.

**Trampa**: la cookie de Supabase se llama `sb-<project-ref>-auth-token` y **se parte en
`sb-<ref>-auth-token.0` / `.1`** cuando el JWT es grande. Un `cookies.has()` con el nombre exacto
falla en ese caso. Buscá por prefijo.

**Tests** en `src/lib/customer-dal.test.ts`: sin cookie no hay comprador; con cookie inválida
tampoco.

---

# Bloque B — Vincular pedidos a cuentas

## B1. Migración

```sql
-- on delete set null: si se borra la cuenta, el pedido NO se pierde.
-- Es el registro de una venta real y no hay backups en el plan gratis.
alter table orders add column customer_id uuid references auth.users(id) on delete set null;
alter table orders add column customer_email text;

create index orders_customer_id_idx on orders(customer_id);
```

Ambas **nullable**: los pedidos hechos antes de esta fase no tienen cuenta y tienen que seguir
leyéndose. De acá en adelante, todo pedido nuevo llega con las dos llenas.

`create_order(payload jsonb)` acepta los dos campos nuevos. La firma es `jsonb`, así que entran
sin tocar nada más — es exactamente para lo que se diseñó así (ver el comentario de
`20260729054334_create_order_rpc.sql`).

`npm run db:types` después.

## B2. El checkout exige cuenta

`POST /api/pedidos` pasa a devolver **401 sin sesión de comprador**, y toma `customer_id` y
`customer_email` **de la sesión, nunca del body**. Es el mismo principio que ya aplicás al dinero:
el servidor no confía en lo que manda el cliente. Si el body trae un `customer_id`, se ignora.

En `CheckoutForm`:

- Con sesión: los campos de `customerSchema` vienen prellenados desde `customer_profiles`. El
  comprador confirma o corrige. Si corrige, se actualiza el perfil en el mismo submit.
- Sin sesión: los mismos campos + email + contraseña, en el mismo paso. Un solo botón. El Route
  Handler crea la cuenta, crea el perfil y crea el pedido; si algo falla, **no queda una cuenta a
  medias con un pedido perdido** — decidí el orden y escribí qué pasa en cada fallo.
- Link discreto "ya tengo cuenta" que lleva a `/cuenta/ingresar?next=/checkout` conservando el
  carrito (el carrito vive en `localStorage`, así que sobrevive solo — verificalo).

Los datos del comprador **se siguen guardando en la fila del pedido**, no solo en el perfil. Es un
snapshot, igual que `order_items`: la dirección de entrega de ese pedido es la que era ese día.

## B3. Reclamar pedidos anteriores

Alguien que ya pidió antes de esta fase tiene pedidos con `customer_id` nulo. Para vincularlos:

**En `/pedido/[token]`, si hay sesión y el pedido no tiene dueño, un botón "Vincular este pedido a
mi cuenta".** El token es la prueba de propiedad — son 32 hex, no se adivinan, y solo lo tiene
quien hizo el pedido o quien recibió el link del dueño.

> **No vincules automáticamente por teléfono o email coincidente.** Cualquiera que sepa el
> WhatsApp de otra persona podría reclamar sus pedidos, y los teléfonos se comparten y se reciclan.
> El token es la única prueba que tenemos y es suficiente.

`/pedido/[token]` **sigue siendo público**, sin login. El dueño manda ese link por WhatsApp y
tiene que abrirse de una. No lo protejas.

---

# Bloque C — El historial real

`/cuenta/pedidos` — Server Component, lee con la service key filtrando por `customer_id` de la
sesión. Lista con número de pedido, fecha, total, estado y link al comprobante.

`/cuenta/perfil` — editar nombre, WhatsApp, ciudad, dirección.

**`recent-orders.ts` no se borra.** Con cuentas obligatorias deja de ser el camino principal, pero
sigue siendo el único rastro que tiene alguien que pidió antes de esta fase y todavía no vinculó
nada. Dejalo como fallback para invitados en el footer / `/carrito`, con un empujón hacia
`/cuenta/registro`. Cuando pase un tiempo razonable y nadie lo use, se saca en otra fase.

---

# Bloque D — Coordinación de la entrega

## D1. Línea de tiempo visible para el comprador

En `/cuenta/pedidos/[id]` (y en `/pedido/[token]`, que ya existe), mostrar el recorrido:

```
Pedido creado        27 jul, 14:32
Pago confirmado      28 jul, 09:15     ← paid_at
Despachado           29 jul, 11:40     ← shipped_at (nuevo)
```

`shipped_at timestamptz` es el gemelo de `paid_at`: se llena en el mismo handler que ya cambia el
estado, y se limpia si el pedido vuelve atrás. Migración de una línea.

Los estados siguen siendo cuatro y siguen siendo un `check` constraint. **No construyas una
máquina de estados** — `00-contexto.md` §8 sigue vigente, las transiciones son libres y
reversibles.

## D2. Coordinación

- En la vista del pedido del comprador, botón de WhatsApp al negocio con el número de pedido ya
  cargado. Reusá los constructores de `src/lib/whatsapp.ts` (dirección comprador → negocio).
- En el panel, `OrderCard` muestra si el pedido tiene cuenta asociada y desde cuándo es cliente.
- Un campo `delivery_note text` en `orders` que el dueño escribe desde el panel y el comprador ve
  ("sale mañana por Trans Copacabana, guía 4471"). Texto libre, no hay integración con couriers.

**Nada se manda automáticamente.** `wa.me` abre WhatsApp con el texto escrito; el que aprieta
enviar es el dueño (§3 del contexto, sigue vigente).

---

# Bloque E — Comprobante de pago

## E1. Modelo

```sql
create table order_payment_proofs (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  mime_type   text not null,
  size_bytes  integer not null,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create index order_payment_proofs_order_id_idx on order_payment_proofs(order_id);
alter table order_payment_proofs enable row level security;
```

Tabla aparte y no una columna en `orders`: un comprador puede subir una captura equivocada y
mandar otra, y quedan las dos.

**Subir un comprobante NO es un estado.** El estado del pedido sigue siendo uno de los cuatro; lo
que cambia el pedido a `paid` es el dueño, mirando su banco, como siempre. Una captura es una
foto que cualquiera puede editar: no es verificación de pago y no la trates como tal.

## E2. Storage

Bucket **privado** `payment-proofs`, sin policies para `anon` ni `authenticated`.

- **Subida**: `POST /api/cuenta/pedidos/[id]/comprobante`. Recibe multipart, verifica que el
  pedido sea del comprador logueado, valida tipo (`image/jpeg`, `image/png`, `image/webp`,
  `application/pdf`) y tamaño (máx. 5 MB), y sube **con la service key**. El navegador nunca habla
  con Storage.
- **Lectura**: URL firmada generada en el servidor, TTL corto (5 min). Nunca una URL pública.
- Validá el tipo real por los magic bytes del archivo, no por el `Content-Type` que manda el
  navegador ni por la extensión.

## E3. Panel

En `OrderCard`, badge cuando hay un comprobante sin revisar, con la imagen y los botones de marcar
pagado / rechazar con nota. Es una razón más para que el dueño entre al panel en vez de resolver
todo en el chat.

---

## Archivos

### Nuevos

| Archivo | Bloque |
|---|---|
| `supabase/migrations/<ts>_customer_profiles.sql` | A3 |
| `supabase/migrations/<ts>_orders_customer_link.sql` | B1 |
| `supabase/migrations/<ts>_extend_create_order_for_customer.sql` | B1 |
| `supabase/migrations/<ts>_orders_shipped_at_delivery_note.sql` | D1, D2 |
| `supabase/migrations/<ts>_order_payment_proofs.sql` | E1 |
| `src/lib/supabase-auth.ts` | A1 |
| `src/lib/customer-dal.ts` + `.test.ts` | A4 |
| `src/lib/customer.schema.ts` | A4 |
| `src/app/cuenta/ingresar/page.tsx`, `registro/`, `recuperar/`, `nueva-contrasena/` | A4 |
| `src/app/api/cuenta/{ingresar,registro,recuperar,salir}/route.ts` | A4 |
| `src/app/cuenta/pedidos/page.tsx`, `pedidos/[id]/page.tsx`, `perfil/page.tsx` | C |
| `src/app/api/cuenta/pedidos/[id]/comprobante/route.ts` | E2 |
| `src/components/cuenta/*` | A4, C, D, E |

### Modificados

| Archivo | Bloque |
|---|---|
| `docs/planes/00-contexto.md` | A — §3 y §5 |
| `docs/supabase-setup.md` | A2 |
| `.env.example` | A1 |
| `src/proxy.ts` | A4 — matcher y prefijo de cookie |
| `src/components/CheckoutForm.tsx` | B2 — registro inline |
| `src/app/api/pedidos/route.ts` | B2 — 401 sin sesión, `customer_id` de la sesión |
| `src/lib/orders.schema.ts` | B2 |
| `src/lib/orders-data.ts` | B1, D1 |
| `src/app/pedido/[token]/page.tsx` | B3 — vincular; D1 — línea de tiempo |
| `src/app/api/admin/pedidos/[id]/estado/route.ts` | D1 — `shipped_at` |
| `src/components/admin/OrderCard.tsx` | D2, E3 |
| `src/components/Header.tsx`, `Footer.tsx` | A4 — entrada a la cuenta |
| `src/types/database.ts` | Regenerado tras **cada** migración |

---

## Criterios de aceptación

**Bloque A**
- [ ] Registro, ingreso, salida y recuperación de contraseña funcionan de punta a punta.
- [ ] El correo de recuperación llega a Gmail **sin caer en spam**, en español.
- [ ] `grep -r "NEXT_PUBLIC" src/` no devuelve ninguna clave de Supabase.
- [ ] En el navegador, `window` no tiene ningún cliente de Supabase y la anon key no aparece en
      ningún archivo del bundle (buscala en las Sources de DevTools).
- [ ] `/cuenta/pedidos` sin sesión redirige a `/cuenta/ingresar`.

**Bloque B**
- [ ] `curl -X POST /api/pedidos` sin cookie de comprador → **401**.
- [ ] Un `customer_id` falso en el body se ignora; el pedido queda con el de la sesión.
- [ ] Comprador nuevo: registro y pedido en un solo submit, sin salir de `/checkout`.
- [ ] Comprador existente: los campos vienen prellenados.
- [ ] El carrito sobrevive al ir a `/cuenta/ingresar` y volver.
- [ ] Un pedido anterior a esta fase se abre por token y se vincula con el botón.
- [ ] `/pedido/[token]` **sigue abriéndose sin login**.

**Bloque C**
- [ ] Los pedidos aparecen en `/cuenta/pedidos` desde un dispositivo distinto, sin link guardado.
- [ ] Un comprador **no** ve los pedidos de otro (probalo con dos cuentas, no lo asumas).

**Bloque D**
- [ ] `shipped_at` se llena al despachar y se limpia al volver atrás, igual que `paid_at`.
- [ ] La línea de tiempo se ve en la cuenta y en `/pedido/[token]`.

**Bloque E**
- [ ] Subir una imagen de 8 MB → rechazada con mensaje claro.
- [ ] Subir un `.exe` renombrado a `.jpg` → rechazado (magic bytes, no extensión).
- [ ] Subir un comprobante al pedido de **otra** cuenta → 403.
- [ ] La URL del comprobante es firmada y expira; pegada en incógnito después del TTL, falla.
- [ ] El panel muestra el badge de comprobante sin revisar.

**Siempre**
- [ ] `npm test`, `npx tsc --noEmit` y `npm run build` limpios.
- [ ] Verificado en navegador, desktop y móvil (375px).
- [ ] `/admin` sigue pidiendo su propia contraseña y **no** lo abre una sesión de comprador.
- [ ] `npm run db:types` corrido tras cada migración, `src/types/database.ts` commiteado.
- [ ] `graphify update .` corrido.
- [ ] **Un commit por bloque**, mensaje en inglés, con el trailer `Co-Authored-By:`.

---

## Trampas conocidas

- **La cookie de Supabase se parte en `.0` / `.1`.** Un `cookies.has("sb-<ref>-auth-token")` en
  `proxy.ts` falla cuando el JWT es grande. Buscá por prefijo.
- **`middleware.ts` no existe en Next 16 — es `proxy.ts`.** Ya hay uno; no lo dupliques,
  extendé su matcher.
- **Los `params` son `Promise`** en páginas y Route Handlers.
- **`@supabase/ssr` asume anon key en el navegador** en toda su documentación y ejemplos. Acá se
  usa **solo desde el servidor**. Si un ejemplo te pide `createBrowserClient`, estás yendo por el
  camino equivocado — releé la sección "La invariante que NO se rompe".
- **`getSession()` de Supabase no valida el JWT**, solo lee la cookie. Para autorizar usá
  **`getUser()`**, que lo verifica contra el servidor de Auth. Es la confusión más común de toda
  esta librería y acá significa la diferencia entre pedir con una cookie forjada o no.
- **No importes `supabase-admin.ts`, `auth.ts`, `dal.ts` ni `customer-dal.ts` desde un componente
  cliente.** Los formularios hablan con el servidor por `fetch`.
- **Dos sistemas de auth conviven**: `admin_session` (HMAC propio) y las cookies de Supabase. Son
  independientes a propósito. Una sesión de comprador **no** abre `/admin` — testealo.
- **`npm run build` local necesita las variables de entorno presentes** porque los clientes se
  construyen a nivel de módulo.
- **`gen types` no lee CHECK constraints**: `status` sigue saliendo como `string`. `ORDER_STATUSES`
  y `parseOrderStatus()` se siguen manteniendo a mano.
- **El lint tiene errores preexistentes** (`react-hooks/set-state-in-effect`, `no-require-imports`
  en `.claude/skills/`). No son tuyos, no los arregles acá.
- **La herramienta de screenshots del navegador viene fallando.** Si pasa, verificá con
  `javascript_tool` y **decilo explícitamente** en vez de afirmar que lo viste.

---

## Fuera de alcance

No amplíes a esto sin preguntar:

- Login social (Google, Apple)
- Migrar el panel del dueño a Supabase Auth, o roles y usuarios múltiples en `/admin`
- Verificación automática del pago: pasarela, QR dinámico, webhook, OCR de la captura
- Notificaciones automáticas por correo de cambios de estado. El correo de esta fase es
  **solo** para recuperar la contraseña
- API de WhatsApp Business
- Borrado de cuenta autoservicio (si el dueño lo pide, es una fase con su propia conversación
  sobre qué pasa con los pedidos)
- Control de stock real con cantidades
