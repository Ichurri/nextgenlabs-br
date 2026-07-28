# Fase 5.6 — Panel de pedidos del dueño (autenticado)

> **Requisito**: leé `00-contexto.md` completo antes de empezar. Ojo que la **decisión 5
> fue revisada el 2026-07-27**: antes decía que no se construía panel; ahora sí se construye.
> Este plan es esa revisión.

**Depende de**: `fase-5.5-base-de-datos.md` terminada (CLI, tipos generados, RPC transaccional).
Sin tipos generados este plan se vuelve mucho más frágil.

---

## Objetivo

Que el dueño entre a una ruta del sitio con una contraseña, vea todos los pedidos con sus
datos, y pueda marcarlos como pagados o cancelados sin entrar nunca a Supabase.

**Checkpoint de la fase**: entrar a `/admin` sin sesión y ser redirigido al login; entrar con la
contraseña correcta y ver los pedidos reales; marcar uno como pagado y verificar el cambio en la
base; cerrar sesión y comprobar que `/admin` vuelve a estar bloqueado. Y lo más importante:
**pedir `/api/admin/pedidos/<id>/estado` sin cookie devuelve 401 y no cambia nada.**

---

## 1. Lo que hace única a esta fase: es la primera con autenticación

Todo lo anterior era público o estaba protegido por un token impredecible. Acá, una ruta
mal protegida expone **nombre, WhatsApp y dirección de cada comprador**. Son personas reales
en Bolivia.

Tres reglas que no se negocian:

1. **Ninguna página ni handler bajo `/admin` o `/api/admin` responde sin verificar la sesión**,
   y esa verificación pasa siempre por el DAL (§3). No alcanza con el `proxy.ts`.
2. **`robots.txt` bloquea `/admin`** (ya bloquea `/api/`).
3. **Nunca loguees el cuerpo de un pedido ni datos del comprador.** Un `console.log(order)` en
   un handler termina en los logs de Vercel para siempre.

## 2. Diseño de la autenticación

Un solo usuario. Sin tablas nuevas, sin Supabase Auth, sin librerías de sesión.

**Contraseña**: guardada como hash **scrypt** en `ADMIN_PASSWORD_HASH`, formato `salt:hash` en
hex. `node:crypto` ya trae `scrypt` — no agregues `bcrypt` ni `argon2`, son dependencias nativas
que no hacen falta. Compará siempre con `timingSafeEqual`, nunca con `===`.

**Sesión**: una cookie firmada con HMAC-SHA256 usando `ADMIN_SESSION_SECRET`. Payload mínimo
(un timestamp de expiración), firma, y verificación con `timingSafeEqual`. Nada de JWT ni
librerías: son ~40 líneas de `node:crypto`.

La cookie va con:

| Flag | Valor | Por qué |
|---|---|---|
| `httpOnly` | `true` | Que ningún script del navegador pueda leerla |
| `secure` | `true` en producción | Solo por HTTPS |
| `sameSite` | `lax` | **Es la defensa CSRF**: el navegador no manda la cookie en un POST cross-site, así que un formulario en otro dominio no puede cambiar estados |
| `maxAge` | ~7 días | Que el dueño no tenga que loguearse cada vez |

> **Sobre fuerza bruta**: no armes rate limiting con estado en memoria — en serverless no
> persiste entre invocaciones y da falsa sensación de seguridad. La defensa real acá es que la
> contraseña sea **larga y aleatoria** (la genera el humano en su gestor de contraseñas, ver
> `docs/supabase-setup.md`), más el costo de scrypt. Con eso, adivinarla es inviable.

## 3. El patrón correcto en Next 16 — leé esto antes de escribir código

Dos cosas que **no** son como las recordás:

**a) `middleware.ts` no existe en Next 16. Se llama `proxy.ts`.**
Va en la raíz del proyecto o dentro de `src/`, al mismo nivel que `app/`. Exportá una función
`proxy` (nombrada o default) y opcionalmente un `config.matcher`.

**b) Proxy NO es la solución de autorización.**
Los docs son explícitos: *"it should not be used as a full session management or authorization
solution"*. Corre en rutas prefetcheadas y no debe ser tu única línea de defensa.

El patrón que mandan los docs, y el que hay que seguir:

```
proxy.ts        → chequeo OPTIMISTA: ¿existe la cookie? Si no, redirect a /admin/login.
                  Solo mejora la UX. No verifica la firma contra la base ni decide permisos.

src/lib/dal.ts  → verifySession(): la verificación REAL de la firma HMAC y la expiración.
                  Envuelta en cache() de React para no recalcular por render.
                  La invoca CADA página y CADA route handler de admin.
```

Si alguien borra el `proxy.ts`, el panel tiene que seguir siendo seguro. Ese es el test mental.

Antes de escribir nada, leé:
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (secciones "Optimistic checks
  with Proxy" y "Creating a Data Access Layer")

## 4. Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/lib/auth.ts` | `hashPassword()`, `verifyPassword()`, `signSession()`, `verifySession()`. Puro `node:crypto`, sin I/O. **Testeable.** |
| `src/lib/dal.ts` | `requireSession()`: lee la cookie, verifica, y si falla redirige (páginas) o devuelve 401 (handlers). Envuelto en `cache()`. |
| `proxy.ts` | Chequeo optimista de presencia de cookie en `/admin/:path*`. |
| `src/app/admin/login/page.tsx` | Formulario de contraseña. |
| `src/app/admin/page.tsx` | Server Component: lista paginada de pedidos. |
| `src/app/api/admin/login/route.ts` | `POST` → valida contraseña, setea cookie. |
| `src/app/api/admin/logout/route.ts` | `POST` → borra la cookie. |
| `src/app/api/admin/pedidos/[id]/estado/route.ts` | `POST` → cambia `status`. Zod + sesión. |
| `src/components/admin/OrderStatusControl.tsx` | `"use client"`: los botones de estado. |
| `src/lib/auth.test.ts` | Tests. |
| `scripts/hash-password.mjs` | Utilidad para que el humano genere su `ADMIN_PASSWORD_HASH`. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/app/robots.ts` | Agregar `/admin` al `disallow` |
| `.env.example` | Agregar `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET` |
| `src/app/privacidad/page.tsx` | Mencionar qué datos del comprador se guardan y por cuánto |

## 5. La pantalla

Server Component que lee con `supabaseAdmin` (la misma service key de siempre — el navegador
sigue sin tocar Supabase).

Por cada pedido: número, fecha, estado, cliente, WhatsApp, ciudad, dirección, productos,
total, y link al comprobante PDF.

Detalles que importan:

- **Paginación desde el primer día.** No traigas todos los pedidos con un `select("*")` sin
  límite: funciona con 10 y se cae con 3.000. Página de ~25 con `range()`, ordenado por
  `created_at desc`.
- **Filtro por estado** (`pending` / `paid` / `cancelled` / todos). El dueño va a vivir en
  "pending", que son los que tiene que revisar.
- **El WhatsApp del comprador, clickeable** con un `wa.me` que lleve el número de pedido
  precargado. Es el gesto que le ahorra más tiempo al dueño: ve el pedido, toca, y ya está
  escribiéndole a esa persona.
- Reusá los tokens y componentes que ya existen (`bg-surface`, `text-muted`, `focus-ring`,
  `formatPrice()`). El panel es parte del mismo sitio, no una app aparte.
- Mobile de verdad: el dueño va a mirar esto desde el celular, con una mano, atendiendo. La
  tabla de escritorio se convierte en tarjetas en 375px.

## 6. El cambio de estado

`POST /api/admin/pedidos/[id]/estado` con body `{ status: "pending" | "paid" | "cancelled" }`.

1. `requireSession()` → si falla, **401 y cortá ahí**.
2. Validar el body con Zod contra los tres valores exactos. Cualquier otra cosa → 400.
3. `update` sobre `orders`. El `check` constraint de Postgres es la última red.
4. Revalidar la ruta para que la lista refleje el cambio.

Las tres transiciones son libres y reversibles: si el dueño marca `paid` por error tiene que
poder volver a `pending` solo. No armes una máquina de estados.

> Recordá `export const runtime = "nodejs"` en todo handler que use `node:crypto`.

## 7. Tests

En `src/lib/auth.test.ts`. Casos mínimos:

- `verifyPassword()` acepta la contraseña correcta y rechaza una incorrecta.
- Un hash con salt distinto para la misma contraseña no colisiona.
- `signSession()` / `verifySession()`: una sesión recién firmada verifica.
- Una sesión **expirada** es rechazada.
- Una sesión con la **firma alterada** (cambiale un carácter) es rechazada.
- Una sesión firmada con **otro secreto** es rechazada.

Esos tres últimos son el corazón de la fase: si alguno pasa cuando no debe, cualquiera entra
al panel.

> Ojo con zustand en tests: `useCart.setState({...})` **sin** el segundo argumento `true`.

## 8. Criterios de aceptación

- [ ] `/admin` sin cookie → redirige a `/admin/login`.
- [ ] Contraseña incorrecta → error claro, sin cookie, sin filtrar si el usuario "existe".
- [ ] Contraseña correcta → cookie `httpOnly` + `sameSite=lax`, y se ven los pedidos reales.
- [ ] **`curl -X POST /api/admin/pedidos/<id>/estado` sin cookie → 401 y el estado no cambia.**
- [ ] **Borrar `proxy.ts` y comprobar que `/admin` sigue sin devolver datos sin sesión.**
      Restauralo después. Este es el test que prueba que el DAL hace el trabajo real.
- [ ] Una cookie con la firma manipulada a mano → rechazada.
- [ ] Marcar un pedido como pagado se refleja en la lista y en la base.
- [ ] La lista pagina y filtra por estado.
- [ ] `robots.txt` bloquea `/admin`, `/api/`, `/pedido/` y `/checkout`.
- [ ] `grep -r "ADMIN_SESSION_SECRET\|ADMIN_PASSWORD_HASH" .next/static/` no devuelve nada.
- [ ] Verificado en desktop y en móvil (375px).
- [ ] `npm run build` y `npm test` en verde, `tsc --noEmit` limpio, `graphify update .` corrido.
- [ ] Un commit, mensaje en inglés, con el trailer `Co-Authored-By:`.

## 9. Trampas conocidas

- **`middleware.ts` no existe en Next 16 — es `proxy.ts`.** Ya está dicho arriba pero es la
  trampa número uno: tu memoria dice `middleware.ts` y está desactualizada.
- **Los `params` son `Promise`** en páginas y handlers; hay que `await`-earlos.
- **`npm run build` local necesita las variables de entorno presentes**, porque `supabaseAdmin`
  se construye a nivel de módulo. Con `.env.local` configurado no lo vas a notar.
- **No importes `src/lib/supabase-admin.ts` ni `src/lib/auth.ts` desde un componente cliente.**
  `OrderStatusControl.tsx` es `"use client"`: habla con el servidor por `fetch`, nunca importa
  el secreto.
- **El PDF no se puede testear bajo `vitest` con `environment: "jsdom"`** (los streams de las
  imágenes salen corruptos). Si tocás algo de PDF, `// @vitest-environment node`.
- **El lint tiene errores preexistentes** (`react-hooks/set-state-in-effect` en varios
  componentes, `no-require-imports` en scripts de `.claude/skills/`). No son tuyos, no los
  arregles acá. Compará contra el baseline antes de asumir que rompiste algo.
- **La herramienta de screenshots del navegador viene fallando** (timeout, "Browser pane is not
  displayed"). Si pasa, verificá con `javascript_tool` (`getBoundingClientRect`, estilos
  computados) y **decilo explícitamente** en vez de afirmar que lo viste.

## 10. Lo que sigue

La Fase 6 (`fase-6-codigos-de-descuento.md`) ahora tiene dónde mostrar la atribución por
influencer: una sección más del panel. Al leer ese plan, tené presente que fue escrito **antes**
de que existiera el panel — donde diga que el dueño gestiona códigos desde el editor de tablas
de Supabase, evaluá si conviene una pantalla, pero **no lo amplíes por tu cuenta sin preguntar**.
