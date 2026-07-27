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

## Paso 7 — Dar acceso al dueño del negocio

El acuerdo del proyecto es que **no hay panel de administración**: el dueño ve los
pedidos directamente en Supabase. Para eso necesita acceso al proyecto de **prod**
solamente.

En el dashboard: **Organization Settings → Team → Invite member**, con su correo.
Si el plan te permite elegir rol, dale el de menor privilegio que le permita leer
tablas (evitá darle owner).

> El agente va a crear una vista `orders_overview` para que lo que vea el dueño sea
> legible y no una tabla cruda llena de UUIDs y tokens.

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

- [ ] Proyecto `nextgenlabs-dev` creado, región São Paulo
- [ ] Proyecto `nextgenlabs-prod` creado, región São Paulo
- [ ] Las dos contraseñas de base de datos guardadas en el gestor de contraseñas
- [ ] `.env.local` creado con las credenciales de **dev**
- [ ] Variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` cargadas en Vercel con
      las credenciales de **prod**
- [ ] Tenés a mano el **project ref de dev** para pasárselo al agente
      (ese dato no es secreto, lo podés pegar en el chat sin problema)
- [ ] El dueño del negocio invitado al proyecto de prod

---

## Qué decirle al agente cuando termines

Algo así alcanza:

> Ya está el setup de Supabase. El project ref de dev es `<pegá-el-ref-acá>`.
> Ejecutá `docs/planes/fase-5.5-base-de-datos.md`.

El agente **no te va a pedir las claves por chat** — las lee de `.env.local`. Si algún
agente te las pide, no se las des.
