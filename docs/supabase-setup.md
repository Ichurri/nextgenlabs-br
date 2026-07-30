# Setup de Supabase — lo que tenés que crear vos

> Este documento es para **vos**, no para un agente. Son los pasos que requieren tu
> cuenta, tu tarjeta y tus decisiones. Cuando termines esto, el agente puede seguir
> con el plan `docs/planes/fase-5.5-base-de-datos.md`.

**Tiempo estimado:** 20–30 minutos.

---

## Antes de empezar: por qué dos proyectos

Vas a crear **dos** proyectos de Supabase, no uno:

| Proyecto | Para qué |
|---|---|
| `nextgenlabs-dev` | Probar. Se rompe, se vacía, se vuelve a llenar sin consecuencias. |
| `nextgenlabs-prod` | Los pedidos reales de clientes reales. Nadie prueba acá. |

El motivo concreto: la Fase 6 (códigos de descuento) necesita probar vencimientos y
límites de uso. Cada prueba genera pedidos basura. Si tenés un solo proyecto, esa
basura queda mezclada con los pedidos que el dueño mira por WhatsApp.

El plan gratis alcanza para los dos (verificá el límite actual de proyectos activos
por organización, que Supabase ha cambiado con el tiempo).

---

## Paso 1 — Cuenta y organización

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (o iniciá sesión).
2. Si no tenés una organización, creá una. Nombre sugerido: `Nextgen Labs`.
3. Plan: **Free** por ahora. Más abajo, en "Cuándo pasar a Pro", está el criterio
   para decidir cuándo cambiarlo.

---

## Paso 2 — Crear el proyecto de desarrollo

Dentro de la organización, **New project**:

| Campo | Valor |
|---|---|
| Name | `nextgenlabs-dev` |
| Database Password | Generala con el botón de Supabase y **guardala en tu gestor de contraseñas** |
| Region | **South America (São Paulo)** — es la más cercana a Bolivia |

> **La contraseña de la base**: Supabase te la muestra una sola vez. Si la perdés se
> puede resetear, pero es un trámite. Guardala ahora, no después.

Esperá a que el proyecto termine de aprovisionarse (1–2 minutos).

---

## Paso 3 — Crear el proyecto de producción

Exactamente lo mismo, con nombre `nextgenlabs-prod`. Misma región. Contraseña
distinta, también guardada.

---

## Paso 4 — Sacar las credenciales de cada proyecto

Para **cada uno** de los dos proyectos necesitás tres datos. En el dashboard del
proyecto, buscá la sección de **Settings → API** (y **Settings → General** para el
ref).

> La interfaz de Supabase cambia seguido y están migrando el sistema de API keys.
> Buscá el **concepto**, no el texto exacto del botón.

**1. Project URL**
Algo como `https://abcdefghijklmnop.supabase.co`.

**2. Project Reference ID** (el "ref")
La cadena de ~20 letras que aparece en la URL del dashboard y en Settings → General.
Ejemplo: `abcdefghijklmnop`.

**3. La clave de servicio**
Esta es la delicada. Buscá una de estas dos, según qué te muestre tu dashboard:

- **`service_role`** (nomenclatura legacy) — un JWT largo que arranca con `eyJ...`
- **`secret`** (nomenclatura nueva) — arranca con `sb_secret_...`

Cualquiera de las dos sirve: ambas dan **acceso total a la base y saltan todas las
políticas de seguridad (RLS)**. Es exactamente lo que el servidor necesita.

> ### ⚠️ Sobre esta clave — leelo aunque tengas apuro
>
> - **Nunca la pegues en un chat**, ni conmigo ni con ningún agente. Va únicamente a
>   archivos `.env.local` (que está en `.gitignore`) y al panel de Vercel.
> - **Nunca la pongas en una variable que empiece con `NEXT_PUBLIC_`.** Ese prefijo
>   publica el valor en el JavaScript que descarga el navegador. Con esa clave
>   expuesta, cualquiera puede leer, modificar y borrar todos los pedidos.
> - La clave `anon` / `publishable` **no la vas a necesitar**. Este proyecto no habla
>   con Supabase desde el navegador, solo desde el servidor.

---

## Paso 5 — Configurar el entorno local

En la raíz del repo hay un archivo `.env.example`. Copialo:

```bash
cp .env.example .env.local
```

Abrí `.env.local` y completalo con las credenciales del proyecto **dev** (no las de
prod):

```
SUPABASE_URL=https://<ref-de-dev>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<la clave de servicio de dev>
```

`.env.local` está ignorado por git — no se va a subir nunca al repositorio.

---

## Paso 6 — Configurar Vercel (producción)

En el dashboard de Vercel, proyecto de Nextgen Labs → **Settings → Environment
Variables**. Agregá dos variables con las credenciales de **prod**:

| Name | Value | Environments |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto prod | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de prod | Production, Preview |

Después de agregarlas hay que **redeployar** para que tomen efecto — Vercel no las
inyecta en deploys ya construidos.

---

## Paso 7 — Los dos secretos del panel de pedidos

> **Nada de este paso tiene que ver con Supabase**, y **el panel todavía no existe**: lo
> construye el agente en la Fase 5.6. Lo que hacés acá es preparar los dos valores que esa
> fase va a necesitar. Si querés arrancar ya con la Fase 5.5, saltealo y volvé después.

Cuando la Fase 5.6 esté lista, el dueño va a ver sus pedidos entrando a `/admin` en el propio
sitio. Esa ruta va a pedir una contraseña, y necesitás generar dos valores para que funcione.

**1. El secreto que firma la sesión.** Corré esto y guardá la salida:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Usá uno **distinto** para dev y para prod.

**2. La contraseña con la que entra el dueño al panel.**

> **Ojo, que esto confunde:** no es una contraseña que el dueño ya tenga en algún lado.
> **Es una nueva, que estás inventando ahora**, para una pantalla de login que todavía no
> existe — la construye el agente en la Fase 5.6.

Cuando esa fase esté lista, el dueño va a entrar a `tusitio.com/admin` y se va a encontrar
con un único campo de contraseña. Lo que escriba ahí es esto que estás generando ahora.
No hay usuario, no hay email, no hay registro: **una sola contraseña para todo el panel**.

**Generala con el botón de "generar contraseña" de tu gestor**, de 20+ caracteres. No elijas
una vos de la cabeza (`nextgen2026`, `Quique123`): las que inventamos las personas siguen
patrones y se adivinan. Esta contraseña es la única barrera entre internet y el nombre,
teléfono y dirección de todos tus compradores.

Ahora, el recorrido completo. Digamos que tu gestor te da `k7$mQ2vP!xR9nZ4wL8tB`:

1. **Guardala en tu gestor**, con un nombre tipo "Panel pedidos Nextgen Labs".
2. **Pasásela al dueño** por un canal privado. Él la va a tipear cada vez que entre a `/admin`.
3. **Sacá el hash** con el script (existe recién a partir de la Fase 5.6):
   ```bash
   node scripts/hash-password.mjs
   ```
   Le pegás la contraseña y te devuelve algo como `a3f81c9e...:9d2e7b04...`
4. **Ese resultado** es lo que va a `ADMIN_PASSWORD_HASH`. La contraseña en texto plano no
   entra nunca ni al repo ni a las variables de entorno.

Entonces la contraseña vive en **dos lugares**: tu gestor y la cabeza del dueño. En el
servidor vive solo el hash.

> **Por qué un hash y no la contraseña**: el servidor guarda una huella matemática que no se
> puede revertir. Cuando el dueño escribe la contraseña, el servidor recalcula la huella y
> compara. Si alguien te roba las variables de entorno, se lleva el hash y no puede sacar la
> contraseña de ahí.

Si el script todavía no existe porque la Fase 5.6 no arrancó, **dejá estos dos valores
pendientes: no bloquean la Fase 5.5**. Podés generar la contraseña ahora y guardarla, y sacar
el hash más adelante.

Te quedan entonces cuatro variables, en `.env.local` (valores de dev) y en Vercel (valores
de prod):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD_HASH=...          # sale del script, formato "salt:hash"
ADMIN_SESSION_SECRET=...         # los 32 bytes aleatorios de arriba
```

---

## Paso 8 — ¿Invitar al dueño a Supabase?

Con el panel dentro del sitio, **ya no le hace falta entrar a Supabase**: ve los pedidos y
les cambia el estado desde `/admin`.

Mi sugerencia: **no lo invites por ahora.** Menos gente con acceso directo a la base es
menos superficie de error — un click equivocado en un table editor borra una fila sin
preguntar y sin backup en el plan gratis.

Si igual querés que tenga un respaldo para cuando el sitio esté caído:
**Organization Settings → Team → Invite member**, con el rol de menor privilegio que le
permita leer tablas (nunca owner).

---

## Lo que NO tenés que hacer

- **No corras SQL a mano en el editor web.** Todo el esquema vive en
  `supabase/migrations/` dentro del repo y se aplica desde ahí. Si tocás la base a
  mano, el repo y la realidad se desincronizan y nadie sabe qué hay realmente.
- **No crees tablas desde la interfaz gráfica**, por el mismo motivo.
- **No borres el proyecto `dev` "para limpiar"** — perdés el enlace y hay que
  reconfigurar todo.

---

## Datos que faltan del cliente

Esto no bloquea el desarrollo, pero **sí bloquea salir a producción**. Están marcados
como `PLACEHOLDER` en el código:

| Dato | Dónde va | Estado |
|---|---|---|
| Imagen del QR de pago | `public/pago/qr.png` | Placeholder generado, hay que reemplazarlo |
| Banco, tipo de cuenta, titular, nº de cuenta | `src/config/payment.ts` | Datos falsos |
| Costo del envío nacional | `src/config/shipping.ts` | Puesto en Bs 30, a confirmar |

> Para el QR: pedile al cliente el **PNG original** que le da su banco, no una captura
> de pantalla. Una captura borrosa no escanea bien y el comprador no puede pagar.

---

## Cuándo pasar a Pro (USD ~25/mes)

Dos razones concretas, ninguna urgente hoy:

1. **Los proyectos gratis se pausan por inactividad** (alrededor de una semana sin
   recibir requests). Si la tienda pasa una semana sin pedidos, el proyecto se pausa
   y el siguiente comprador se encuentra con un error. Mitigación barata mientras
   tanto: un cron semanal que haga un ping.
2. **Backups.** En el plan gratis no hay recuperación a un punto en el tiempo. Acá
   los pedidos *son* el registro del negocio: no hay factura, no hay otro sistema
   donde estén anotados. En cuanto entren pedidos con plata real, esto deja de ser
   opcional.

Criterio simple: **cuando entre el primer pedido real de un cliente que no seas vos,
pasá prod a Pro.**

---

## Checklist final

Cuando puedas marcar todo esto, el agente puede arrancar:

**Bloquean el arranque de la Fase 5.5:**

- [ ] Proyecto `nextgenlabs-dev` creado, región São Paulo
- [ ] Proyecto `nextgenlabs-prod` creado, región São Paulo
- [ ] Las dos contraseñas de base de datos guardadas en el gestor de contraseñas
- [ ] `.env.local` creado con las credenciales de **dev**
- [ ] Variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` cargadas en Vercel con
      las credenciales de **prod**
- [ ] Tenés a mano el **project ref de dev** para pasárselo al agente
      (ese dato no es secreto, lo podés pegar en el chat sin problema)

**Bloquean la Fase 5.6 (el panel), pero no la 5.5:**

- [ ] `ADMIN_SESSION_SECRET` generado, uno distinto para dev y para prod
- [ ] Inventaste la contraseña con la que el dueño va a entrar a `/admin`
      (generada con el gestor, 20+ caracteres) y la guardaste ahí
- [ ] Se la pasaste al dueño por un canal privado
- [ ] `ADMIN_PASSWORD_HASH` generado con `scripts/hash-password.mjs`
      (ese script lo crea el agente en la Fase 5.6 — hasta entonces queda pendiente)

---

## Qué decirle al agente cuando termines

Para la base de datos:

> Ya está el setup de Supabase. El project ref de dev es `<pegá-el-ref-acá>`.
> Ejecutá `docs/planes/fase-5.5-base-de-datos.md`.

Y después, para el panel del dueño:

> Ejecutá `docs/planes/fase-5.6-panel-pedidos.md`.

Las dos se pueden correr en la misma sesión, una después de la otra.

> **Ningún agente te va a pedir secretos por chat** — los lee de `.env.local`. Si alguno te
> pide la service key, la contraseña del panel o el session secret, **no se los des**: es
> señal de que algo está mal.
