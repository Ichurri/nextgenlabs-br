# Fase 7 — Cerrar el círculo del pedido

> **Requisito**: leé `00-contexto.md` completo antes de empezar. Este plan no repite lo que
> está ahí (decisiones del cliente, reglas del dinero, convenciones, cómo se habla con Supabase).

---

## Estado del que partís

Las Fases 5, 5.5, 5.6 y 6 están **terminadas y en `main`**. Ya existe y funciona:

- Checkout con códigos de descuento → `create_order` (RPC transaccional) → `/pedido/[token]` → PDF
- Panel `/admin` autenticado (contraseña + cookie firmada, `proxy.ts` optimista + DAL)
- `/admin/codigos` para gestionar códigos, con atribución por influencer
- Tipos generados en `src/types/database.ts`, script `npm run db:types`
- Siete migraciones aplicadas en `supabase/migrations/`

Esta fase **no agrega funcionalidad nueva**: corrige dos huecos reales y cierra el flujo donde
hoy se corta.

## El problema que resuelve

Trazando el recorrido completo:

```
Comprador:  catálogo → carrito → checkout → /pedido/[token] → paga → manda captura por WhatsApp
Dueño:      recibe el WhatsApp → verifica el banco → /admin → marca "paid" → ⟵ acá se corta
```

Después de marcar `paid` no pasa nada más. **El sistema sabe algo que el comprador necesita
saber y no hay camino entre las dos cosas.** Y como `paid ≠ entregado`, tampoco hay dónde
registrar qué se despachó.

**Checkpoint de la fase**: hacer un pedido de punta a punta, marcarlo pagado desde el panel y
que el panel te ofrezca avisarle al comprador con el mensaje ya escrito; marcarlo despachado y
que el estado quede registrado; y comprobar que un producto agotado **no** se puede pedir ni
siquiera mandando el POST a mano.

---

## Cómo está organizado

Tres bloques independientes, **un commit por bloque**. Si te quedás sin tiempo, cortá entre
bloques, nunca en el medio de uno.

| Bloque | Qué | Por qué en ese orden |
|---|---|---|
| **A** | Dos correcciones de servidor | Son bugs con consecuencia comercial. Van primero. |
| **B** | Cerrar el círculo (aviso + estado `shipped` + `paid_at`) | Es el vacío del flujo. |
| **C** | Pulido | Mejora la vida del comprador y del dueño, pero nada se rompe sin esto. |

---

# Bloque A — Correcciones

## A1. El stock no se valida en el servidor

**El bug**: `calculateOrderTotals()` en `src/lib/orders.ts` rechaza slugs inexistentes y
productos con `price === 0`, pero **nunca mira `inStock`**. La ficha de producto deshabilita el
botón "Añadir", pero eso es solo UI:

- Un producto que ya estaba en el carrito (`localStorage`) antes de marcarse agotado pasa igual
- Un `POST /api/pedidos` armado a mano lo ignora por completo

El comprador termina pagando algo que no tenés, y el dueño tiene que llamarlo y devolverle la
plata.

**El arreglo**: en el mismo lugar donde ya validás el precio, agregá la guarda de stock usando
`isInStock()` de `@/data/products` (ya existe, no escribas otra).

Es el mismo principio que ya aplicás al dinero — *el servidor jamás confía en el cliente* —
extendido a la disponibilidad.

**Y del lado del comprador**: `CheckoutForm` ya avisa sobre los productos "a consultar"
(`price === 0`) con un bloque que manda a WhatsApp. Hacé lo mismo con los agotados: que los
vea **antes** de llenar todo el formulario, no como un error al final.

**Tests** en `src/lib/orders.test.ts`: un producto con `inStock: false` es rechazado. Cuidado
con el mock de `@/data/products` que ya está en ese archivo — agregá un producto agotado al
mock en vez de tocar los que ya están, para no romper los tests existentes.

## A2. El total del checkout sale de una foto vieja

**El bug**: `CheckoutForm` calcula con `cartTotal(sellableItems)`, y esos `price` son un
snapshot que zustand guardó en `localStorage` cuando el producto se agregó al carrito. El
servidor recalcula desde `products.ts`. Si cambiás un precio, un comprador con el carrito viejo
**ve un total en `/checkout` y otro distinto en `/pedido/[token]`**.

El monto cobrado siempre es el correcto (el servidor manda), pero es exactamente la clase de
discrepancia que termina en un reclamo por WhatsApp.

**El arreglo, y no necesita endpoint nuevo**: `src/data/products.ts` es seguro en el cliente
—`ProductCard.tsx` es `"use client"` y ya importa `isInStock` de ahí—. Así que el cliente puede
leer la misma fuente que el servidor.

Agregá en `src/lib/cart.ts` un selector puro que resuelva los ítems del carrito contra
`products.ts`: devuelve nombre, dosis y precio **actuales**, y descarta los slugs que ya no
existen. Usalo en los tres lugares donde se muestra el carrito: `CartDrawer`, `/carrito` y
`CheckoutForm`.

De paso arregla el mismo problema con nombres y dosis viejos, y limpia solo los productos
discontinuados que quedaron en carritos de gente que no volvió hace meses.

**Tests** en `src/lib/cart.test.ts`: el selector devuelve el precio actual y no el guardado, y
descarta un slug inexistente.

> No toques el snapshot de `order_items` en la base. Ese **sí** tiene que quedar congelado: es
> lo que se cobró ese día y es lo que muestra el comprobante (§2 del plan de la Fase 5).

---

# Bloque B — Cerrar el círculo

## B1. Avisarle al comprador cuando cambia el estado

Hoy existe un paliativo: en `OrderCard.tsx` el teléfono es un link de WhatsApp con
`buildCustomerWhatsAppUrl()`. Pero el mensaje es genérico (*"Hola, te escribo por tu pedido
NGL-XXX"*), está escondido como link del número, y **no está atado al cambio de estado**.

Qué hacer:

1. **Mové `buildCustomerWhatsAppUrl()` a `src/lib/whatsapp.ts`.** Hoy vive dentro de
   `OrderCard.tsx`. Ahí ya están los constructores de mensajes en la dirección
   comprador → negocio; este es negocio → comprador. Que convivan, con un comentario que
   distinga las dos direcciones (el archivo ya tiene uno, mantené ese criterio).
2. **Que el mensaje dependa del estado.** Algo así, ajustá el tono al español boliviano del
   resto del sitio:
   - `paid` → *"Confirmamos tu pago del pedido NGL-XXX. Ya lo estamos preparando."*
   - `shipped` → *"Tu pedido NGL-XXX ya fue despachado."*
   - `pending` / `cancelled` → el genérico actual. **No autogeneres un mensaje de cancelación**:
     esa conversación la tiene que escribir el dueño con sus palabras.
3. **Que aparezca después de cambiar el estado.** Cuando `OrderStatusControl` confirma el
   cambio, mostrá un botón visible **"Avisar al comprador"** con el mensaje ya cargado. El link
   del teléfono puede quedarse como está.

**No mandes nada automáticamente.** `wa.me` abre WhatsApp con el texto escrito; el que aprieta
"enviar" es el dueño. Eso es deliberado: el dueño lee el mensaje antes de que salga, y no
necesitamos la API de WhatsApp Business (§3 del contexto).

**Tests** en `src/lib/whatsapp.test.ts`: el mensaje incluye el número de pedido, cambia según el
estado, y el teléfono queda correctamente escapado en la URL.

## B2. Estado `shipped`

> **Confirmá esto con el humano antes de correr la migración.** El supuesto es que cobran envío
> nacional (`SHIPPING.nationalCost`), o sea que hay un despacho real con días de por medio y el
> dueño necesita distinguir lo pagado de lo enviado. Si en realidad entregan en el acto, saltá
> B2 entero y no toques el constraint.

Hoy los estados son `pending → paid → cancelled`. Falta registrar el despacho: con seis pedidos
pagados, el dueño no distingue los que ya mandó y termina usando la memoria.

Cuatro valores siguen siendo un `check` constraint, no una máquina de estados. Mantené las
transiciones libres y reversibles, como dice §8 del contexto.

**La migración** (`npx supabase migration new add_shipped_status`):

> El constraint se creó **inline y sin nombre** en `20260727000000_orders.sql`, así que Postgres
> le puso uno automático. **Buscá el nombre real** antes de escribir el `drop constraint` — no
> lo adivines. Se ve en `information_schema.table_constraints` o en el dashboard.

**Lo fácil de olvidar.** Agregar el valor a la base no alcanza; hay que tocar cada lugar que
enumera los estados. Buscalos todos antes de dar por cerrado:

- `ORDER_STATUSES` en `src/lib/orders-data.ts` (la guarda `parseOrderStatus()` **tira** con un
  valor desconocido: si te olvidás de este, el panel explota en runtime al leer un pedido
  despachado)
- El schema Zod de `POST /api/admin/pedidos/[id]/estado`
- `STATUS_LABEL` en `src/lib/pdf/OrderReceipt.tsx`
- El filtro por estado del panel
- La vista `orders_overview`, si menciona estados
- `npm run db:types` después de la migración

## B3. `paid_at`

Una columna `timestamptz` que se llena cuando el pedido pasa a `paid` (y se limpia si vuelve a
`pending`). Cuesta casi nada y da dos cosas: saber **cuándo** se confirmó cada pago, y una base
honesta para los reportes de atribución de la Fase 6, que hoy solo pueden contar pedidos.

Setealo en el handler que ya cambia el estado. Acordate de `npm run db:types`.

---

# Bloque C — Pulido

## C1. El comprador puede perder su pedido para siempre

No hay cuenta ni correo: **el token es la única llave**. Si el comprador cierra la pestaña antes
de tocar el botón de WhatsApp, no hay forma de volver a su pedido. Caso real: hace el pedido,
dice "después pago", cierra, y al día siguiente no tiene ni el link ni el número.

Dos arreglos, los dos baratos:

1. Guardar `{ token, orderNumber, fecha }` de cada pedido en `localStorage` (mismo patrón de
   `persist` que ya usa el carrito) y mostrar un **"Mis pedidos"** discreto — en `/carrito` o en
   el footer. Sin datos personales ahí: solo número, fecha y el link.
2. Un aviso en `/pedido/[token]`: **"Guardá este link, es la única forma de volver a ver tu
   pedido."** Esto solo ya evita la mitad de los casos.

## C2. Los `pending` viejos se acumulan indistinguibles

Un pedido que nadie pagó queda `pending` para siempre. En tres meses el panel no diferencia
"recién hecho, esperando el depósito" de "abandonado hace un mes".

Mostrá la antigüedad de forma legible en `OrderCard` (*"hace 3 días"*) y destacá visualmente los
`pending` de más de unos días.

**No borres nada automáticamente, ni sugieras hacerlo.** Un pedido viejo sigue siendo el
registro de que alguien intentó comprar, y no hay backups en el plan gratis.

---

## Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `supabase/migrations/<ts>_add_shipped_status.sql` | Bloque B2 |
| `supabase/migrations/<ts>_orders_paid_at.sql` | Bloque B3 |
| `src/lib/recent-orders.ts` | Bloque C1: store de pedidos recientes en `localStorage` |

### Modificados

| Archivo | Bloque |
|---|---|
| `src/lib/orders.ts` | A1 — guarda de stock |
| `src/lib/orders.test.ts` | A1 |
| `src/lib/cart.ts` | A2 — selector que resuelve contra `products.ts` |
| `src/lib/cart.test.ts` | A2 |
| `src/components/CheckoutForm.tsx` | A1 (aviso de agotados) + A2 |
| `src/components/CartDrawer.tsx`, `src/app/carrito/page.tsx` | A2 |
| `src/lib/whatsapp.ts` + `.test.ts` | B1 |
| `src/components/admin/OrderCard.tsx` | B1, C2 |
| `src/components/admin/OrderStatusControl.tsx` | B1 |
| `src/app/api/admin/pedidos/[id]/estado/route.ts` | B2, B3 |
| `src/lib/orders-data.ts` | B2 (`ORDER_STATUSES`) |
| `src/lib/pdf/OrderReceipt.tsx` | B2 (`STATUS_LABEL`) |
| `src/app/admin/page.tsx` | B2 (filtro) |
| `src/types/database.ts` | Regenerado con `npm run db:types` |
| `src/app/pedido/[token]/page.tsx` | C1 (aviso de guardar el link) |

---

## Criterios de aceptación

**Bloque A**
- [ ] `POST /api/pedidos` con un slug marcado `inStock: false` → 400 con mensaje claro.
- [ ] Un producto agotado que quedó en el carrito se avisa en `/checkout` **antes** de enviar.
- [ ] Cambiar un precio en `products.ts` con un carrito ya guardado: `/carrito`, `/checkout` y
      `/pedido/[token]` muestran **el mismo** total.
- [ ] Un slug borrado de `products.ts` desaparece del carrito sin romper la página.
- [ ] Mandar un `total` falso en el body sigue sin cambiar el total guardado (no lo rompiste).

**Bloque B**
- [ ] Marcar un pedido como pagado ofrece el botón de avisar, con el número de pedido en el texto.
- [ ] El mensaje cambia según el estado, y `cancelled` no autogenera texto.
- [ ] Un pedido `shipped` se lee sin que `parseOrderStatus()` tire, se ve en el panel, se filtra
      y sale bien en el PDF.
- [ ] `paid_at` se llena al pasar a `paid` y se limpia al volver a `pending`.
- [ ] `npm run db:types` corrido y `src/types/database.ts` commiteado.

**Bloque C**
- [ ] Después de un pedido, "Mis pedidos" lo muestra y el link funciona.
- [ ] `/pedido/[token]` avisa que hay que guardar el link.
- [ ] `OrderCard` muestra la antigüedad y destaca los `pending` viejos.

**Siempre**
- [ ] `npm test`, `npx tsc --noEmit` y `npm run build` limpios.
- [ ] Verificado en el navegador, desktop y móvil (375px).
- [ ] `/admin` sigue pidiendo login; `curl` sin cookie al endpoint de estado sigue dando 401.
- [ ] `graphify update .` corrido.
- [ ] **Un commit por bloque**, mensaje en inglés, con el trailer `Co-Authored-By:`.

---

## Trampas conocidas

- **`middleware.ts` no existe en Next 16 — es `proxy.ts`.** Ya hay uno en el repo; no lo dupliques.
- **Los `params` son `Promise`** en páginas y Route Handlers.
- **Toda migración va por `npx supabase migration new`**, nunca por el editor web de Supabase, y
  **después de cada una corré `npm run db:types`**. Si el tipo generado y la base se
  desincronizan, TypeScript te miente.
- **`gen types` no lee CHECK constraints**: la columna `status` sale como `string` genérico. Por
  eso existe `parseOrderStatus()` y por eso hay que actualizar `ORDER_STATUSES` a mano. Es la
  trampa número uno del bloque B2.
- **El constraint de `status` no tiene nombre explícito** en la migración original. Buscá el
  nombre real que le puso Postgres antes de escribir el `drop constraint`.
- **`npm run build` local necesita las variables de entorno presentes** porque `supabaseAdmin` se
  construye a nivel de módulo. Con `.env.local` configurado no lo vas a notar.
- **No importes `supabase-admin.ts`, `auth.ts` ni `dal.ts` desde un componente cliente.**
  `OrderStatusControl` es `"use client"`: habla con el servidor por `fetch`.
- **El PDF no se puede testear bajo `vitest` con `environment: "jsdom"`** (los streams de las
  imágenes salen corruptos). Si agregás un test de PDF, `// @vitest-environment node`.
- **Zustand en tests**: `useCart.setState({...})` **sin** el segundo argumento `true`. Con
  `replace: true` se pierden los métodos de acción del store.
- **El lint tiene errores preexistentes** (`react-hooks/set-state-in-effect` en varios
  componentes, `no-require-imports` en scripts de `.claude/skills/`). No son tuyos, no los
  arregles acá. Compará contra el baseline antes de asumir que rompiste algo.
- **La herramienta de screenshots del navegador viene fallando** (timeout, "Browser pane is not
  displayed"). Si pasa, verificá con `javascript_tool` (`getBoundingClientRect`, estilos
  computados) y **decilo explícitamente** en vez de afirmar que lo viste.

---

## Fuera de alcance

No amplíes a esto sin preguntar:

- Notificaciones automáticas (correo, API de WhatsApp Business) — §3 del contexto
- Control de stock real con cantidades: `inStock` sigue siendo un booleano manual en
  `products.ts`. A1 solo lo **respeta**, no lo reemplaza
- Roles o usuarios múltiples en el panel
- Borrado o archivado automático de pedidos viejos
