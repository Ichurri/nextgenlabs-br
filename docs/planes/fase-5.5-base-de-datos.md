# Fase 5.5 — Base de datos operativa: CLI, tipos y RPC transaccional

> **Requisito**: leé `00-contexto.md` completo antes de empezar. Este plan no repite lo que
> está ahí (decisiones del cliente, reglas del dinero, convenciones, cómo se habla con Supabase).

---

## Estado del que partís

La **Fase 5 ya está mergeada en `main`** (commit `d9ae9e1`, merge `5862b52`). Existe y
funciona:

- `/checkout` → `POST /api/pedidos` → `/pedido/[token]` → `GET /api/pedido/[token]/comprobante` (PDF)
- `src/lib/orders.ts` (cálculo puro), `src/lib/money.ts`, `src/lib/orders.schema.ts`
- `src/lib/supabase-admin.ts` (cliente con service key), `src/lib/orders-data.ts` (lecturas)
- `supabase/migrations/0001_orders.sql` — el esquema, **escrito pero nunca aplicado a una base real**
- 68 tests en verde, `npm run build` y `tsc --noEmit` limpios

Lo que **no** existe todavía: proyecto de Supabase real, CLI, tipos generados, y la
creación de pedidos es no-transaccional.

## Prerrequisitos — verificá esto antes de tocar nada

El humano tiene que haber completado `docs/supabase-setup.md`. Comprobá:

1. Existe `.env.local` en la raíz con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` con
   valores reales (no vacíos, no `placeholder`).
2. Tenés el **project ref de dev** — te lo pasa el humano en el prompt.

Si falta cualquiera de las dos, **pará y pedilo**. No inventes credenciales, no crees
el proyecto vos, y **nunca le pidas al humano que pegue la service key en el chat** —
esa clave se lee de `.env.local` y de ningún otro lado.

---

## Objetivo

Dejar la base de datos operativa, tipada y con la creación de pedidos en una sola
transacción, para que la Fase 6 (códigos de descuento) se pueda construir encima sin
condiciones de carrera.

**Checkpoint de la fase**: crear un pedido real desde `/checkout` contra el Supabase de
dev, verlo en la tabla `orders` con sus `order_items` correctos, descargar el
comprobante PDF, y que `tsc --noEmit` falle si renombrás una columna en el esquema.

---

## 1. CLI de Supabase, sin Docker

```bash
npm i -D supabase
npx supabase login
npx supabase link --project-ref <ref-que-te-pasó-el-humano>
```

> **No instales Docker ni corras `supabase start`.** El stack local completo no hace
> falta: `db push` y `gen types` trabajan contra el proyecto remoto enlazado. Meter
> Docker acá es peso muerto.

`supabase link` te va a pedir la contraseña de la base. Esa la tiene el humano guardada
— pedísela cuando llegues a este punto, o dejá que la ingrese él si el CLI abre un
prompt interactivo.

Agregá al `.gitignore` lo que el CLI genera y no debe versionarse (`supabase/.temp/`,
`.branches/`), pero **`supabase/migrations/` sí se versiona**.

## 2. Renombrar la migración al formato del CLI

El CLI espera migraciones con timestamp, no `0001_`. Hacelo con `git mv` para no perder
el historial:

```bash
git mv supabase/migrations/0001_orders.sql supabase/migrations/20260727000000_orders.sql
```

Este renombre hay que hacerlo **ahora**, antes de que exista una segunda migración.

De acá en adelante, toda migración nueva se crea con `npx supabase migration new <nombre>`
y **ningún cambio de esquema se hace desde el editor web**.

## 3. Aplicar el esquema

```bash
npx supabase db push
```

Verificá que las dos tablas quedaron con RLS activo y **sin políticas** — es la decisión
de seguridad del proyecto (§5 de `00-contexto.md`): nadie entra desde afuera, todo el
acceso es server-side con la service key.

## 4. Tipos generados — la mejora más grande de esta fase

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Agregá el script a `package.json`:

```json
"db:types": "supabase gen types typescript --linked > src/types/database.ts"
```

Y tipá el cliente en `src/lib/supabase-admin.ts`:

```ts
createClient<Database>(url, key, { auth: { persistSession: false } })
```

**Por qué importa**: hoy `src/lib/orders-data.ts` mapea `snake_case` → `camelCase` a mano
sobre datos sin tipar. Si mañana cambia una columna, TypeScript no dice nada y el error
aparece en producción como un `undefined` en el comprobante PDF de un cliente.

Después de tipar, `orders-data.ts` probablemente necesite ajustes — el tipo generado va a
exponer los `null` reales de las columnas nullable. **Arreglalos de verdad, no los tapes
con `as any` ni con `!`.** Si aparece un `null` que el código no contemplaba, eso *es* el
bug que los tipos vinieron a encontrar.

## 5. RPC transaccional `create_order` — lo importante

Hoy `src/app/api/pedidos/route.ts` hace: insert de `orders` → insert de `order_items` →
si falla, `delete` de compensación. Funciona para el volumen actual, pero **la Fase 6 lo
rompe**.

El problema concreto que viene: contar usos de un código con `max_uses` no se puede hacer
leyendo-y-después-escribiendo. Dos compradores que usan el último uso disponible al mismo
tiempo pasan los dos.

Migrá la creación del pedido a una función de Postgres `create_order(payload jsonb)` con
`security definer`, en una migración nueva. Requisitos:

- Inserta `orders` + `order_items` en **una sola transacción**. Sin deletes de compensación.
- Devuelve `{ token, order_number }`.
- **El cliente sigue sin mandar montos.** El Route Handler recalcula con
  `calculateOrderTotals()` y le pasa los montos ya calculados a la función. Mantené
  `calculateOrderTotals` como está: pura, sin I/O, con sus tests. Es la única fuente de
  verdad del dinero y toda la Fase 6 se apoya en ella.

Dejá la función preparada para que la Fase 6 le agregue el reclamo atómico del descuento.
El patrón correcto para eso (**no lo implementes ahora**, es Fase 6 — pero diseñá la
función para que entre sin reescribirla):

```sql
update discount_codes
   set uses = uses + 1
 where code = p_code
   and is_active
   and (expires_at is null or expires_at > now())
   and (max_uses is null or uses < max_uses)
returning id, kind, value;
-- cero filas devueltas = código inválido, vencido o agotado
```

## 6. Vista `orders_overview` para el dueño

No hay panel de administración (decisión 5 del contexto): el dueño mira los pedidos en el
table editor de Supabase. Una tabla cruda llena de UUIDs y tokens es hostil para alguien
no técnico.

Creá una vista, en la misma migración o en una nueva, que aplane orden + ítems con las
columnas que le importan al dueño: número de pedido, fecha, cliente, WhatsApp, ciudad,
productos, total, estado. Ordenada por fecha descendente.

**No expongas el `token` en esa vista** — es lo que protege el comprobante.

---

## 7. Verificación — no la saltes

Estas cuatro son obligatorias antes de dar la fase por terminada:

```bash
npm test
npx tsc --noEmit
npm run build
graphify update .
```

Y la verificación funcional real, en el navegador contra el Supabase de dev:

1. Agregá dos productos al carrito con cantidad > 1.
2. Completá `/checkout` y confirmá.
3. Verificá en Supabase que la fila de `orders` y sus `order_items` son correctas.
4. Abrí `/pedido/[token]` y comprobá que los montos coinciden **al centavo** con la base.
5. Descargá el PDF y comprobá que coincide con la pantalla.

---

## 8. Criterios de aceptación

- [ ] `npx supabase db push` aplicado; las dos tablas existen con RLS activo y sin policies.
- [ ] `src/types/database.ts` generado y el cliente tipado con `createClient<Database>`.
- [ ] Renombrar una columna en una migración hace fallar `tsc --noEmit` (probalo y revertilo).
- [ ] La creación de pedidos pasa por la RPC transaccional; no queda ningún `delete` de compensación.
- [ ] Un pedido real creado desde el navegador aparece completo y correcto en Supabase.
- [ ] Los montos del PDF, de `/pedido/[token]` y de la base coinciden al centavo.
- [ ] La vista `orders_overview` existe y **no** expone el `token`.
- [ ] `grep -r "service_role" .next/static/` no devuelve nada.
- [ ] `npm run build` y `npm test` en verde, `graphify update .` corrido.
- [ ] Un commit, mensaje en inglés, con el trailer `Co-Authored-By:`.

---

## 9. Trampas conocidas

Estas costaron tiempo en sesiones anteriores. Leelas.

- **Next 16 no es el que conocés.** Los `params` de páginas y Route Handlers son
  `Promise` y hay que `await`-earlos. Leé `node_modules/next/dist/docs/` antes de
  escribir Route Handlers, como manda `AGENTS.md`.
- **`npm run build` local necesita las variables de entorno presentes.** `supabaseAdmin`
  se construye a nivel de módulo, así que un build sin `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` falla al recolectar datos de página. Con `.env.local`
  configurado no vas a notarlo; si buildeás en un entorno limpio, pasale valores
  placeholder.
- **El PDF no se puede testear bajo `vitest` con `environment: "jsdom"`.** Los streams
  FlateDecode de las imágenes salen corruptos ahí (verificado con `pypdf` y `poppler`;
  el mismo render corrido directo con Node 20 y Node 24 sale perfecto, y la Route
  Handler real también). Si agregás un test de PDF, poné `// @vitest-environment node`
  en ese archivo. Hay un comentario al respecto en `src/lib/pdf/OrderReceipt.tsx`.
- **`@react-pdf/renderer` no corre en Edge.** `export const runtime = "nodejs"` en toda
  Route Handler que lo toque.
- **No importes `src/lib/supabase-admin.ts` desde un componente cliente** ni desde un
  archivo que termine alcanzado por uno.
- **Zustand en tests**: usá `useCart.setState({...})` **sin** el segundo argumento `true`.
  Con `replace: true` se pierden los métodos de acción del store.
- **El lint tiene errores preexistentes** (`react-hooks/set-state-in-effect` en `AgeGate`,
  `CartToast`, `ProductCard`, `ProductCoaViewer`, `CheckoutForm`, y `no-require-imports`
  en scripts de `.claude/skills/`). **No son tuyos y no los arregles en esta fase** — son
  el patrón de hidratación aceptado del repo. Compará contra el baseline antes de asumir
  que rompiste algo.
- **La herramienta de screenshots del navegador viene fallando** (timeout, "Browser pane
  is not displayed"). Si vuelve a pasar, verificá con `javascript_tool`
  (`getBoundingClientRect`, estilos computados) y **decilo explícitamente** en vez de
  afirmar que lo viste.

---

## 10. Lo que sigue

Con esto cerrado, la Fase 6 (`fase-6-codigos-de-descuento.md`) se apoya en:
`calculateOrderTotals()` ya blindada con tests, la RPC transaccional lista para el
reclamo atómico del código, y las columnas `discount_code` / `discount_code_label` que la
Fase 5 ya dejó previstas en `orders`.
