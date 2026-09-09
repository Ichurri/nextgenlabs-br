# Fase 10 — El catálogo se administra desde el panel

> **Requisito**: leé `00-contexto.md` y `fase-9-recibos-desde-whatsapp.md` completos antes de empezar.
> Esta fase **saca el catálogo del código** y lo mueve a la base de datos.

---

## 0. Cómo ejecutar este plan

Escrito el 2026-07-31 para ejecutarse en una sesión nueva. **Todas las decisiones están tomadas**
—las cinco preguntas abiertas se resolvieron con el dueño el 2026-07-31, están en §2— no hay nada
que consultar. Si te encontrás con una bifurcación que este documento no resuelve, es un hueco del
plan: pará y preguntá, no elijas por tu cuenta.

**Orden**: Bloque A → B → C → D → E, en ese orden. Cada bloque termina con un checkpoint que tiene
que pasar antes de seguir. **Un commit por bloque**, mensaje en inglés, con el trailer
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Antes de cada commit**: `npm run build` limpio y `npm test` en verde. Sin excepción.

**Antes de explorar código**: `graphify query "<pregunta>"` (hay un hook que lo exige).
**Después de modificar código**: `graphify update .`

**Antes de escribir código de Next**: este proyecto usa **Next 16.2.10** y no tiene `cacheComponents`
activado. La guía que aplica es `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`
(`unstable_cache` + `revalidateTag`). **No uses `"use cache"`** — requiere un flag que este proyecto
no tiene y romperá el build.

**No toques nada de esto** — sirve a los 10 pedidos históricos y tiene que seguir funcionando igual
al final de la fase:

```
src/app/pedido/[token]/page.tsx          src/lib/orders-data.ts
src/app/api/pedido/[token]/comprobante/  src/lib/pdf/OrderReceipt.tsx
src/app/admin/page.tsx                   src/components/admin/OrderCard.tsx
src/app/api/admin/pedidos/[id]/estado/   src/lib/auth.ts   src/lib/dal.ts
src/lib/money.ts                         src/lib/discounts.ts
```

---

## 1. El cambio, en una frase

Hoy el catálogo es un array de TypeScript (`src/data/products.ts`): agregar un producto o corregir
un precio exige editar código y desplegar. Después de esta fase el catálogo vive en Supabase y el
dueño lo administra desde `/admin/productos` — **crear, editar, archivar, reordenar, cambiar
categorías y controlar stock, sin un solo deploy**.

### Por qué es más grande de lo que parece

`src/data/products.ts` lo importan **12 archivos**, y uno de ellos —`src/lib/orders.ts`— es la
fuente de verdad del dinero: `calculateOrderTotals()` recalcula cada comprobante leyendo los
precios del array, precisamente para no confiar en lo que manda el cliente. Mover el catálogo a la
base toca esa cadena entera. El Bloque B existe solo para hacer esa mudanza sin cambiar ni un píxel
de lo que ve el comprador.

---

## 2. Decisiones tomadas (2026-07-31). No las re-litigues.

1. **Los productos viven en Supabase.** El array estático se borra al final del Bloque B. No hay
   fallback ni doble fuente de verdad.
2. **Las imágenes y los COA se suben a Supabase Storage** desde el panel, a un bucket público
   `catalogo`. Las imágenes que ya están en `/public/products/*.webp` **no se migran**: la columna
   guarda la ruta tal cual, y `next/image` sirve rutas locales y URLs absolutas por igual.
3. **Las categorías son editables** (tabla propia, con nombre y orden). Deja de existir la unión
   literal `ProductCategory`.
4. **El orden del catálogo es manual**, con un `sort_order` por producto que el dueño ajusta con
   botones subir/bajar. **No se agrega ninguna librería de drag-and-drop**: no hay ninguna en
   `package.json` y arrastrar en un celular es peor que dos flechas.
5. **Archivar, no borrar.** `is_active = false` saca al producto del catálogo, del sitemap y de la
   búsqueda; `/producto/[slug]` pasa a devolver 404. La fila queda y se puede reactivar. No hay
   botón de borrado definitivo. Los pedidos históricos ya guardan snapshot de slug/nombre/dosis/
   precio en `order_items`, así que archivar no corrompe nada.
6. **El stock es numérico y baja solo al generar el comprobante** en `/admin/recibos/nuevo`, que es
   el único momento del servidor donde consta que hubo una venta. Cada descuento queda registrado
   en `stock_movements` con un `batch_id`, y el historial tiene un botón **deshacer** para el caso
   del comprobante emitido dos veces.
7. **El stock puede quedar negativo.** Si el dueño emite un comprobante por más unidades de las que
   el sistema cree tener, la venta ya ocurrió: se registra igual y el panel marca el producto en
   rojo con "revisá el inventario". Negarse a emitir el comprobante sería negar un hecho.
8. **`track_stock` por producto.** Los productos "precio a consultar" y cualquier otro que el dueño
   no quiera contar llevan `track_stock = false`: no se descuentan ni se muestran como agotados.
   Esto reemplaza el booleano `inStock` de hoy.

---

## 3. Esquema

Una sola migración en el Bloque A: `supabase/migrations/<timestamp>_product_catalog.sql`.

```sql
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- "Péptidos" — es lo que se ve en el filtro
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,          -- URL /producto/[slug]. Inmutable una vez creado (ver §5)
  name text not null,
  dose text not null,                 -- "10 MG"
  price numeric(12,2) not null default 0,   -- 0 = "Precio a consultar"
  purity text not null,               -- "≥99% HPLC"
  form text not null,                 -- "Liofilizado"
  category_id uuid not null references product_categories(id) on delete restrict,
  image text not null,                -- "/products/x.webp" o URL absoluta de Storage
  highlights text[] not null default '{}',
  description text,
  coa_url text,
  featured boolean not null default false,
  is_new boolean not null default false,
  track_stock boolean not null default true,
  stock_qty integer not null default 0,     -- puede ser negativo a propósito (decisión 7)
  low_stock_threshold integer not null default 3,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_sort_idx on products (is_active, sort_order);
create index products_category_idx on products (category_id);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('sale','restock','adjustment','revert')),
  qty integer not null,               -- negativo = salida
  stock_after integer not null,       -- foto del stock tras aplicar el movimiento
  reason text,                        -- texto libre del dueño en ajustes/reposiciones
  receipt_number text,                -- NGL-YYMMDD-XXXX del comprobante que lo originó
  batch_id uuid,                      -- agrupa los ítems de un mismo comprobante (para deshacer)
  reverted_at timestamptz,            -- no nulo = este movimiento ya fue deshecho
  created_at timestamptz not null default now()
);

create index stock_movements_product_idx on stock_movements (product_id, created_at desc);
create index stock_movements_batch_idx on stock_movements (batch_id);
```

**RLS**: `enable row level security` en las tres tablas y **ninguna policy**, exactamente como
`orders` y `discount_codes`. Este proyecto no tiene anon key —`grep ANON src` no devuelve nada— y
todo el acceso pasa por `supabaseAdmin` con la service key desde el servidor. Un producto es dato
público, pero se sirve renderizado por Next, no leído por el navegador.

**Storage**: bucket `catalogo`, **público** (las imágenes tienen que ser fetcheables por el
navegador), con dos prefijos: `productos/` y `coa/`. La escritura pasa solo por la service key
desde los route handlers del panel.

### RPC de stock

El descuento por venta es multi-fila y tiene que ser atómico:

```sql
create or replace function register_sale_stock(payload jsonb)
returns uuid                          -- batch_id
language plpgsql security definer set search_path = public
as $$ ... $$;
```

Recibe `{ receipt_number, items: [{ slug, quantity }] }`. Por cada ítem con `track_stock = true`:
resta `quantity` de `stock_qty` e inserta un `stock_movements` de tipo `sale` con el `batch_id`
compartido. Los ítems con `track_stock = false` se ignoran en silencio. Devuelve el `batch_id`.

Un segundo RPC `revert_stock_batch(batch_id uuid)` deshace: por cada movimiento del batch que no
tenga `reverted_at`, suma de vuelta la cantidad, inserta el movimiento espejo de tipo `revert` y
marca el original con `reverted_at = now()`. Es idempotente — deshacer dos veces no hace nada la
segunda.

Ambos: `revoke execute ... from public, anon, authenticated` y `grant execute ... to service_role`,
igual que `create_order`.

---

## 4. Bloques

### Bloque A — Esquema, semilla y bucket

Solo base de datos. **El sitio no cambia**: sigue leyendo el array estático y tiene que seguir
compilando igual.

**Archivos**
- `supabase/migrations/<ts>_product_catalog.sql` — las tres tablas, los dos RPC, RLS, y la semilla.
- `docs/supabase-setup.md` — agregar la sección de creación del bucket `catalogo` (público), con
  los mismos pasos manuales que el resto del documento.

**La semilla va dentro de la migración**, con `on conflict (slug) do nothing` para que sea
idempotente:
- Las 4 categorías actuales, con `sort_order` 1..4 en este orden: Péptidos, Blends, Otros.
- Los **12 productos** de `src/data/products.ts` tal como están al momento de ejecutar, campo por
  campo. `inStock !== false` se traduce a `stock_qty = 10` (número arbitrario que el dueño corrige
  en el Bloque E); `inStock === false` a `stock_qty = 0`. Los productos con `price = 0` van con
  `track_stock = false`. El `sort_order` inicial es la posición en el array (10, 20, 30… para dejar
  huecos).
- `featured` e `is_new` se copian del array (undefined → false).

**Después**: `npm run db:types` para regenerar `src/types/database.ts`. Ese archivo es generado —
no lo edites a mano nunca.

**Checkpoint A**
- `supabase migration list` muestra la migración aplicada en remoto.
- `select count(*) from products` → 12; `select count(*) from product_categories` → 4.
- El bucket `catalogo` existe y es público.
- `npm run build` limpio y `npm test` verde — nada del sitio cambió todavía.

---

### Bloque B — El sitio público lee de la base

El bloque más delicado. **Criterio de éxito: el comprador no nota absolutamente nada.** Mismo
catálogo, mismos precios, mismo HTML.

#### B1. Dos archivos nuevos, separados a propósito

`src/lib/products.types.ts` — **puro, importable desde componentes cliente**:

```ts
export type Product = {
  slug: string; name: string; dose: string; price: number;
  purity: string; form: string; category: string;   // nombre de la categoría, no id
  image: string; highlights: string[]; description?: string; coaUrl?: string;
  featured: boolean; isNew: boolean;
  trackStock: boolean; stockQty: number;
};

export function isInStock(p: Product): boolean {
  return !p.trackStock || p.stockQty > 0;
}
```

`src/lib/products-data.ts` — **solo servidor**, importa `supabaseAdmin`:

- `getCatalog()`: productos activos + categorías activas, ordenados por `sort_order`. Envuelto en
  `unstable_cache(fn, ['catalog'], { tags: ['catalog'], revalidate: 3600 })`.
- `getProductBySlug(slug)`, `getFeaturedProducts()`, `getRelatedProducts(product)` — derivadas de
  `getCatalog()` en memoria, no consultas nuevas. Son 12 filas; una sola query y filtrar es más
  rápido y más simple que cuatro queries.
- `getAdminCatalog()` — **sin cache**, incluye archivados. Solo para el panel.

**El tag `'catalog'` es el contrato de esta fase**: todo route handler que muta productos o
categorías llama `revalidateTag('catalog')`. Es lo que hace que el catálogo público se actualice
sin deploy.

#### B2. Reescribir los 12 consumidores

| Archivo | Qué cambia |
|---|---|
| `src/app/layout.tsx` | Pasa a `async`. Obtiene `getCatalog()` y lo inyecta en un `<CatalogProvider>` cliente nuevo (`src/components/CatalogProvider.tsx`) que envuelve el `<body>`. **Esto es obligatorio**: `resolveCartItems` corre en el navegador y necesita el catálogo para re-precificar el carrito. Como `getCatalog()` está cacheada, el layout sigue siendo prerenderizable. |
| `src/lib/cart.ts` | `resolveCartItems(items)` → `resolveCartItems(items, catalog)`. Función pura, sin import de datos. Los llamadores (`CartDrawer`, `/carrito`) sacan el catálogo del provider con un hook `useCatalog()`. |
| `src/app/catalogo/page.tsx` | `await getCatalog()`; pasa productos **y categorías** a `CatalogClient`. |
| `src/components/CatalogClient.tsx` | Recibe `categories: string[]` por props en vez de importarlas. |
| `src/app/producto/[slug]/page.tsx` | `generateStaticParams` pasa a `async`. `dynamicParams` queda en su default (`true`) para que un producto creado después del build se renderice on-demand. |
| `src/app/page.tsx` | `await getFeaturedProducts()`. |
| `src/app/sitemap.ts` | Pasa a `async`. |
| `src/components/ProductCard.tsx`, `AddToCartControls.tsx` | Solo repuntar el import a `@/lib/products.types`. |
| `src/lib/whatsapp-parse.ts` | `parseOrderMessage(text)` → `parseOrderMessage(text, products)`. `buildProductIndex` recibe la lista. Deja de importar datos. |
| `src/lib/orders.ts` | `calculateOrderTotals(items, discount)` → `calculateOrderTotals(items, catalog, discount)`. **Sigue siendo pura y síncrona** — no la vuelvas `async` ni le metas Supabase adentro: es la función que decide el dinero y tiene que quedar testeable sin red. |
| `src/app/api/admin/recibos/route.ts` | `await getCatalog()` antes de calcular; se lo pasa a `calculateOrderTotals`. |
| `src/app/api/descuentos/validar/route.ts` | Igual. |
| `src/app/admin/recibos/nuevo/page.tsx` | `await getAdminCatalog()` y lo pasa a `ReceiptBuilderForm`. |
| `src/components/admin/ReceiptItemsEditor.tsx` | Recibe `products` por props. Deja de importar datos. |

#### B3. Tests

`cart.test.ts`, `whatsapp-parse.test.ts` y `orders.test.ts` hoy dependen del contenido real del
catálogo. Ahora reciben el catálogo por parámetro: creá un fixture chico en
`src/lib/__fixtures__/catalog.ts` (3 productos: uno normal, uno agotado, uno a consultar) y usalo en
los tres. **Los tests quedan mejor que antes**: dejan de romperse cuando el dueño cambia un precio.

#### B4. Config

`next.config.ts` — agregar `images.remotePatterns` con el host de `SUPABASE_URL` para que
`next/image` acepte las imágenes de Storage. Derivá el hostname con `new URL(...)` y **guardá contra
`undefined`**: si la variable falta, `remotePatterns` queda vacío y el build no explota.

#### B5. Borrar

`src/data/products.ts` se elimina. Si `grep -rn "@/data/products" src` devuelve algo, el bloque no
está terminado.

**Checkpoint B**
- `/catalogo`, `/producto/[cualquier-slug]`, `/` y `/sitemap.xml` renderizan **idénticos** a antes
  del bloque. Compará el HTML de al menos una ficha de producto contra `git stash`.
- Agregar al carrito, abrir el drawer y el total siguen funcionando.
- Generar un comprobante en `/admin/recibos/nuevo` con un código de descuento da el mismo PDF y el
  mismo total que antes.
- `npm run build` limpio, `npm test` verde, `grep -rn "@/data/products" src` vacío.

---

### Bloque C — CRUD de productos en el panel

Sigue el molde de códigos de descuento, archivo por archivo. No inventes un patrón nuevo.

**Archivos**
```
src/app/admin/productos/page.tsx           lista (activos y archivados)
src/app/admin/productos/nuevo/page.tsx
src/app/admin/productos/[id]/editar/page.tsx
src/app/api/admin/productos/route.ts       POST crear
src/app/api/admin/productos/[id]/route.ts  PATCH editar, PATCH ?accion=archivar
src/app/api/admin/productos/subir/route.ts POST multipart → Storage
src/components/admin/ProductForm.tsx
src/components/admin/ProductArchiveToggle.tsx
src/components/admin/ImageUploadField.tsx
src/lib/product.schema.ts                  Zod compartido POST/PATCH
```

**Reglas**
- Todo route handler abre con `requireApiSession()` y cierra con `revalidateTag('catalog')` +
  `revalidatePath('/admin/productos')`. `export const runtime = "nodejs"`.
- El schema Zod valida: `slug` en minúsculas con guiones (`/^[a-z0-9]+(-[a-z0-9]+)*$/`), `price >= 0`,
  `highlights` entre 1 y 6 ítems, `name`/`dose`/`purity`/`form` no vacíos.
- **El slug es inmutable al editar.** Es la URL indexada por Google y el `slug` guardado en los
  `order_items` históricos. El formulario de edición lo muestra deshabilitado con la nota "el slug
  no se puede cambiar: es la dirección pública del producto".
- Slug duplicado → error `23505` → 409 con "Ya existe un producto con ese slug", igual que códigos.
- Archivar es un `PATCH` que setea `is_active = false`, con confirmación en el cliente que diga qué
  implica: "desaparece del catálogo y su página pasa a dar 404. Podés reactivarlo cuando quieras".
- La lista muestra activos primero y una sección plegable de archivados con botón "Reactivar".

**Subida a Storage** (`/api/admin/productos/subir`)
- Body multipart con `file` y `kind` (`"imagen"` | `"coa"`).
- `imagen`: acepta `image/webp`, `image/jpeg`, `image/png`; máximo 2 MB. Destino
  `productos/<slug>-<8 hex>.<ext>`.
- `coa`: acepta solo `application/pdf`; máximo 10 MB. Destino `coa/<slug>-<8 hex>.pdf`.
- Validá el mime **por el contenido declarado y por la extensión**, y rechazá con 400 y un mensaje
  concreto. Devuelve `{ url }` con la URL pública; el formulario la guarda en el campo.
- `ImageUploadField` muestra preview de la imagen actual y permite pegar una ruta a mano —los 12
  productos existentes apuntan a `/public` y tienen que poder seguir así.

**Checkpoint C**
- Crear un producto nuevo desde el panel, con imagen subida, y verlo aparecer en `/catalogo` y en su
  ficha **sin redesplegar**.
- Editarle el precio y ver el precio nuevo en el catálogo tras recargar.
- Archivarlo: desaparece del catálogo, del sitemap, y `/producto/<slug>` da 404.
- Reactivarlo: vuelve.
- Intentar crear otro con el mismo slug da 409 con mensaje claro.

---

### Bloque D — Categorías y orden

**Archivos**
```
src/app/admin/categorias/page.tsx          lista + crear + renombrar + reordenar
src/app/api/admin/categorias/route.ts      POST
src/app/api/admin/categorias/[id]/route.ts PATCH (nombre, orden, archivar)
src/components/admin/CategoryList.tsx
src/components/admin/SortControls.tsx      flechas ↑ ↓ reutilizables
```

**Reglas**
- Renombrar una categoría cambia la etiqueta en el filtro del catálogo. No rompe nada: los
  productos apuntan por `id`.
- **No se puede archivar una categoría que tenga productos activos.** El `on delete restrict` cubre
  el borrado, pero el archivado hay que validarlo en el handler: contá productos activos y devolvé
  409 con "Esta categoría tiene N productos activos. Movelos o archivalos primero."
- Reordenar: `SortControls` manda un PATCH que intercambia el `sort_order` con el vecino. Con 4
  categorías y 12 productos, dos flechas alcanzan y sobran.
- La misma `SortControls` se usa en la lista de productos del Bloque C para el orden del catálogo.
  El orden del catálogo es **global**, no por categoría: `CatalogClient` filtra sobre una lista ya
  ordenada.

**Checkpoint D**
- Crear una categoría, asignarle un producto, verla aparecer en el filtro de `/catalogo`.
- Renombrarla y ver el nombre nuevo en el filtro.
- Subir un producto dos posiciones y ver el orden reflejado en el catálogo.
- Intentar archivar una categoría con productos da 409 con el mensaje correcto.

---

### Bloque E — Stock

**Archivos**
```
src/app/admin/productos/[id]/stock/page.tsx    historial + ajuste manual
src/app/api/admin/productos/[id]/stock/route.ts POST ajuste/reposición
src/app/api/admin/stock/[batchId]/route.ts      DELETE → revert_stock_batch
src/components/admin/StockAdjustForm.tsx
src/components/admin/StockMovementList.tsx
```

**Cambios en lo que ya existe**
- `src/app/api/admin/recibos/route.ts`: **después** de generar el PDF con éxito, llama
  `register_sale_stock` con el `order_number` y los ítems, y `revalidateTag('catalog')`. Si el RPC
  falla, el PDF ya se generó — logueá el error y **devolvé el PDF igual**, con una cabecera
  `X-Stock-Warning` que el formulario muestra como aviso. Perder el descuento de stock es molesto;
  perder el comprobante de una venta real es peor.
- `src/components/admin/ReceiptBuilderForm.tsx`: tras descargar el PDF, muestra el `batch_id` y un
  enlace "¿lo generaste dos veces? deshacer el descuento de stock".
- `src/components/ProductCard.tsx` y la ficha: `isInStock()` ya cubre el caso nuevo desde el Bloque
  B; no hace falta tocar nada más del lado público.

**Panel**
- La lista de productos muestra el stock con semáforo: rojo si `stock_qty <= 0`, ámbar si
  `<= low_stock_threshold`, normal si no. Los productos con `track_stock = false` muestran "—".
- Un `stock_qty` negativo se muestra en rojo con la leyenda "revisá el inventario" (decisión 7).
- El ajuste manual pide **cantidad y motivo**, el motivo es obligatorio. Tipo `restock` si suma,
  `adjustment` si resta.
- El historial lista los movimientos con fecha, tipo, cantidad, stock resultante y número de
  comprobante. Los de tipo `sale` con `batch_id` y sin `reverted_at` traen el botón deshacer.

**Checkpoint E**
- Generar un comprobante de 2 unidades de un producto con stock 10 → el panel muestra 8, y el
  historial un movimiento `sale` con el número de comprobante.
- Deshacer ese batch → vuelve a 10, aparece el movimiento `revert`, el botón deshacer desaparece.
- Deshacer dos veces no hace nada la segunda (idempotente).
- Bajar el stock a 0 → el producto se muestra "Agotado" en `/catalogo` y su botón de agregar al
  carrito queda deshabilitado.
- Un producto con `track_stock = false` no se descuenta ni se muestra agotado nunca.

---

## 5. Trampas conocidas

1. **No importes `products-data.ts` desde un componente cliente.** Arrastra `supabaseAdmin` y con él
   la service key al bundle del navegador. Por eso los tipos viven aparte en `products.types.ts`. Si
   ves "service role key is not defined" en la consola del navegador, es esto.
2. **El layout asíncrono puede volver todo el sitio dinámico.** Solo se sostiene porque
   `getCatalog()` está envuelta en `unstable_cache`. Si en algún momento la llamás sin cachear desde
   el layout, cada página del sitio pasa a renderizarse por request. Verificá en la salida de
   `npm run build` que `/catalogo` y `/producto/[slug]` sigan marcadas como estáticas/ISR.
3. **`revalidateTag('catalog')` es fácil de olvidar.** Cada handler que muta productos o categorías
   tiene que llamarlo. Sin eso el panel muestra el cambio y el sitio público no, hasta que venza la
   hora de `revalidate`.
4. **El slug es un identificador con historia.** Está en las URLs indexadas y en `order_items` de
   los 10 pedidos viejos. Por eso es inmutable.
5. **La semilla del Bloque A no puede quedar a medias.** Si la migración se aplica con 11 de 12
   productos, el Bloque B hace desaparecer uno del catálogo. Contá 12 antes de seguir.
6. **`next/image` y las URLs de Storage**: si te olvidás de `remotePatterns`, las imágenes subidas
   desde el panel dan error 400 en producción pero funcionan en dev con ciertas configuraciones. No
   confíes en dev para esto.

---

## 6. Fuera de alcance

No entra en esta fase, y si aparece se anota acá y se sigue:

- Variantes de un mismo producto (distintas dosis como filas hermanas).
- Historial de precios / precios programados.
- Importar o exportar el catálogo en CSV.
- Reserva de stock al agregar al carrito — no hay checkout, no hay nada que reservar.
- Múltiples imágenes por producto (galería).
- Buscador de productos en el sitio público más allá del filtro por categoría que ya existe.
