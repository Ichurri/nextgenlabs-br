# Contexto compartido — Fases 5 y 6

> **Leé este archivo completo antes de ejecutar cualquiera de los planes.**
> Los planes (`fase-5-*.md`, `fase-6-*.md`) asumen todo lo que está acá y no lo repiten.

---

## 1. Qué se está construyendo y por qué

El cliente (Nextgen Labs, Santa Cruz de la Sierra) quiere pasar de "el pedido es un mensaje de
WhatsApp" a "el pedido es una orden con número, comprobante en PDF e instrucciones de pago",
más **códigos de descuento para influencers y allegados**.

Estas dos cosas se construyen en dos fases separadas:

| Fase | Qué entrega |
|---|---|
| **Fase 5** | Checkout, orden persistida, página de pedido con QR/transferencia, comprobante PDF descargable |
| **Fase 6** | Códigos de descuento con límites, vencimiento y atribución por influencer |

La Fase 6 depende de la 5. El esquema de la Fase 5 ya deja las columnas de descuento previstas
para que la 6 no tenga que reescribir migraciones.

---

## 2. Decisiones cerradas con el cliente

Estas seis respuestas vinieron del dueño del negocio el 2026-07-27. **No las re-litigues**;
si algo parece incoherente, preguntá antes de cambiarlo por tu cuenta.

1. **No tiene NIT.** → No hay factura fiscal, no hay integración con el SIN, no hay CUF ni
   código de control. El PDF es un **comprobante de pedido** sin validez tributaria. Esto tiene
   que quedar escrito en el propio PDF para que nadie lo confunda con una factura.
2. **El documento es un comprobante de pedido**, no una factura.
3. **El pago es con un QR estático** (imagen fija de la cuenta del negocio) **y transferencia
   bancaria.** No hay QR dinámico, no hay pasarela, no hay webhook. El dueño verifica el
   depósito en su app bancaria.
4. **Solo QR y transferencia.** No hay tarjeta → no hay contracargos, no hay PCI, no hay
   agregador.
5. **Las confirmaciones se hacen únicamente por WhatsApp.** → No hay envío de correos ni
   notificaciones automáticas. El comprador paga, manda la captura por WhatsApp, y el dueño
   responde por ahí.

   > **Revisado el 2026-07-27.** Esta decisión originalmente también excluía el panel de
   > administración. El cliente pidió ver los pedidos en el sitio, así que **sí se construye**
   > un panel autenticado (Fase 5.6). Lo que sigue en pie es que **la confirmación del pago la
   > hace el dueño a ojo**, mirando su app bancaria: no hay pasarela, ni webhook, ni
   > verificación automática del depósito.
6. **Envío nacional con costo adicional**, monto a definir por el cliente. Va como línea propia
   en el comprobante.

### Consecuencia importante de la decisión 5

**El sistema nunca se entera solo de si una orden fue pagada.** No hay ninguna señal automática
que mueva una orden de `pending` a `paid`: siempre es el dueño el que lo marca, después de ver
el depósito en su banco. Desde la Fase 5.6 lo hace desde el panel en vez de entrar a Supabase,
pero el juicio sigue siendo humano.

Eso significa que la atribución de la Fase 6 sobre pedidos `paid` **depende de que el dueño sea
disciplinado marcándolos**. Si querés un número que no dependa de eso, contá pedidos generados
con el código (`pending` incluidos) y asumí que sobreestima. Las dos métricas son legítimas
mientras digas cuál estás mostrando.

---

## 3. Lo que NO se construye

Si alguna de estas aparece en una conversación, anotala y seguí con la fase actual:

- Pasarela de pago / QR dinámico / webhook de confirmación
- Pagos con tarjeta
- Facturación electrónica SIN
- Envío de correos (Resend o similar)
- Cuentas de usuario / login **del comprador** (el panel del dueño sí tiene login desde la
  Fase 5.6, pero es una sola credencial compartida, no un sistema de usuarios)
- Roles y permisos: el panel tiene un único nivel de acceso. Si algún día entra personal con
  permisos distintos, eso es migrar a Supabase Auth y es otra fase
- API de WhatsApp Business (por `wa.me` **no se puede adjuntar un archivo**; solo se manda el
  link al comprobante)
- Control de stock real (`inStock` sigue siendo un booleano manual en `products.ts`)

---

## 4. Estado del código hoy (verificado el 2026-07-27)

- **Next.js 16.2.10, App Router.** Ojo: es una versión más nueva que la que conocés de memoria.
  `AGENTS.md` manda leer `node_modules/next/dist/docs/` antes de escribir código. Hacelo.
- **No hay ni un solo Route Handler.** `src/app/` tiene únicamente páginas.
- **No hay base de datos.** Nada persiste fuera del navegador.
- **No hay `output: "export"`** en `next.config.ts` → las Route Handlers funcionan en Vercel sin
  cambiar nada del deploy. Confirmado.
- **Carrito**: `src/lib/cart.ts`, zustand + `persist` (localStorage). `cartCount()` y
  `cartTotal()` son helpers puros exportados desde ahí.
- **Precios**: `src/data/products.ts`, array estático. `price` en Bs como número entero.
  `price: 0` significa "Precio a consultar" (esos productos **no pueden entrar al checkout**).
- **Pedido actual**: `src/lib/whatsapp.ts` arma un texto y abre `wa.me`. Esto **sigue existiendo**
  después de la Fase 5 — no lo borres, es el fallback y el canal de confirmación.
- **Formato de dinero**: `formatPrice()` en `src/lib/format.ts`, usa `Intl.NumberFormat("es-BO")`
  y el prefijo `Bs` de `siteConfig.currency`.
- **Config**: `src/config/site.ts` (WhatsApp, contacto, URL, marca). Usa el comentario
  `PLACEHOLDER` para marcar lo que el cliente debe reemplazar — seguí esa convención.
- **Tipografía para PDF/OG**: ya existe `src/assets/fonts/Inter-Bold.ttf` (se bajó una vez con
  curl para no depender de la red en build). Para el PDF vas a necesitar también
  `Inter-Regular.ttf` — bajala igual y commiteala.
- **Tests**: Vitest + jsdom, `vitest.config.ts` con alias `@ → ./src`. Hoy hay 18 tests en
  `src/lib/cart.test.ts` y `src/lib/whatsapp.test.ts`. Corren con `npm test`.

---

## 5. Arquitectura elegida

```
Navegador                      Vercel (Next Route Handlers)          Supabase
─────────                      ────────────────────────────          ────────
carrito (zustand)
   │
   ├── POST /api/descuentos/validar ──► valida código ──────────────► discount_codes
   │   ◄── { valid, discount, label }
   │
   └── POST /api/pedidos ────────────► Zod + recalcula TODO ────────► orders
       ◄── { token, orderNumber }      desde products.ts             order_items
                                                                     discount_redemptions
   ▼
/pedido/[token]  ──── GET /api/pedido/[token]/comprobante ─────────► lee orden → PDF
   │                                                                  (@react-pdf/renderer)
   └── botón WhatsApp con nº de pedido + link al comprobante

Panel del dueño (Fase 5.6, autenticado)
   │
   ├── POST /admin/login ────────────► verifica contraseña ─────────► (sin DB: env var)
   │   ◄── cookie de sesión firmada
   │
   ├── /admin ───────────────────────► lista paginada ──────────────► orders + order_items
   │
   └── POST /api/admin/pedidos/[id]/estado ──► pending|paid|cancelled ──► orders.status
```

**Stack añadido**: Supabase (Postgres), `@react-pdf/renderer`, `zod`.

### Por qué Supabase y no "sin base de datos"

Se consideró una versión sin DB: códigos en un módulo solo-servidor y el PDF generado y
devuelto en la misma request, sin persistir nada. Se descartó porque pierde las tres cosas que
justifican el pedido del cliente: **contar usos** (`max_uses` necesita estado compartido entre
requests), **atribuir ventas por influencer**, y **que el dueño agregue un código sin un deploy**.
Con Supabase el dueño agrega una fila desde el editor de tablas y listo.

Alcance real: 3 tablas, plan gratis de sobra.

### Cómo se habla con Supabase

**Solo desde el servidor (Route Handlers y Server Components), con la `service_role key`.
El navegador nunca toca Supabase.**

Eso permite la política de seguridad más simple y más segura que hay: **RLS activo en las tres
tablas, sin ninguna policy para `anon` ni `authenticated`.** Nadie puede leer ni escribir desde
afuera; solo el servidor, que salta RLS con la service key.

> El panel del dueño (Fase 5.6) **no cambia esto**: es un Server Component que lee con la
> misma service key. Por eso el login es una contraseña propia y no Supabase Auth — meter
> Supabase Auth obligaría a poner un cliente de Supabase en el navegador y rompería la
> invariante de arriba.

Variables de entorno (`.env.local`, y en Vercel):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...     # NUNCA con prefijo NEXT_PUBLIC_

# Panel del dueño (Fase 5.6)
ADMIN_PASSWORD_HASH=...           # scrypt, formato "salt:hash" en hex
ADMIN_SESSION_SECRET=...          # 32 bytes aleatorios, firma la cookie de sesión
```

**Ninguna de las cuatro lleva `NEXT_PUBLIC_`.** Si en algún momento ves
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (o cualquiera de las otras con ese prefijo), es un bug
de seguridad grave: ese prefijo publica la variable en el bundle del navegador. La service key
salta todo RLS y el `ADMIN_SESSION_SECRET` expuesto permite forjar una sesión de administrador.

---

## 6. Reglas invariantes del dinero

Estas cinco reglas no se negocian y hay que testearlas:

1. **El servidor jamás confía en montos que manda el cliente.** El request de checkout manda
   únicamente `[{ slug, quantity }]` y el código de descuento. Precio unitario, subtotal,
   descuento, envío y total se calculan **de nuevo** en el servidor leyendo `products.ts`.
   Si el cliente manda un `total`, se ignora.
2. **El descuento nunca supera el subtotal** y **nunca se aplica al envío.** Solo al subtotal de
   productos.
3. **Todo cálculo de dinero pasa por un helper único** `round2()` en `src/lib/money.ts`, aplicado
   en *cada* operación. Nada de encadenar floats.
4. **Los productos con `price: 0` no pueden entrar al checkout.** Son "precio a consultar" → van
   por WhatsApp. Rechazalos con un error claro.
5. **El total nunca puede ser negativo ni menor al costo de envío.**

Orden de cálculo canónico:

```
subtotal   = Σ round2(unitPrice × quantity)
discount   = min(calcDiscount(code, subtotal), subtotal)
shipping   = SHIPPING.nationalCost   // 0 si (subtotal - discount) ≥ freeOver, cuando freeOver ≠ null
total      = round2(subtotal - discount + shipping)
```

El umbral de envío gratis se evalúa **después** del descuento (más conservador para el negocio).

---

## 7. Convenciones del repo

- **Comentarios en español, código en inglés.** Sin excepción.
- **Un archivo, una responsabilidad.** Si un componente pasa de ~150 líneas, se parte.
- Nunca hardcodear colores en JSX: solo tokens de Tailwind sobre las variables de
  `src/app/globals.css` (`bg-surface`, `text-muted`, `border-border`, `text-accent-light`,
  `bg-success`, `bg-danger`...).
- Todo elemento interactivo lleva la clase `focus-ring` (definida en `globals.css`).
- Reusá los componentes que ya existen antes de crear nuevos: `WhatsAppCtaButton`,
  `QtyStepper` (exportado desde `CartDrawer.tsx`), el patrón de botones de
  descargar/abrir-en-pestaña de `ProductCoaViewer.tsx`.
- Lo que el cliente debe completar se marca con un comentario `PLACEHOLDER:`.
- **Antes de cada commit**: `npm run build` limpio y `npm test` en verde.
- **Después de modificar código**: `graphify update .`
- **Antes de explorar código**: `graphify query "<pregunta>"` (hay un hook que lo exige).
- Un commit por fase, mensaje en inglés, con el trailer
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## 8. Estados de una orden

```
pending    ── se crea acá y se queda acá hasta que el dueño intervenga
paid       ── el dueño la marca desde el panel, después de ver el depósito en su banco
cancelled  ── el dueño la marca desde el panel
```

No hay transiciones automáticas: ninguna señal del sistema mueve una orden sola. Cualquier
transición **la dispara el dueño desde el panel** (Fase 5.6), o a mano en Supabase como
respaldo.

No construyas una máquina de estados elaborada para tres valores; el `check` constraint en
Postgres alcanza. Las tres transiciones son libres y reversibles entre sí — si el dueño marca
`paid` por error, tiene que poder volver a `pending` sin pedirle nada a nadie.
