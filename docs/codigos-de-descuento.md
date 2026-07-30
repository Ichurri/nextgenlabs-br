# Códigos de descuento — cómo usarlos

> Esto es para el dueño del negocio, no para el desarrollador. Todo se hace desde el sitio,
> en `tusitio.com/admin/codigos` — nunca hace falta entrar a Supabase.

---

## Crear un código nuevo

1. Entrá a `/admin` y logueate con tu contraseña del panel.
2. Arriba a la derecha, tocá **Códigos de descuento**.
3. Tocá **+ Nuevo código** y completá:

| Campo | Qué poner |
|---|---|
| Código | En MAYÚSCULAS, sin espacios. Ej: `MAFE10`. Es lo que la persona escribe en el carrito — queda incluido en el mensaje de WhatsApp que te manda, y es lo que vos pegás al generar el comprobante. |
| Tipo | **Porcentaje** (ej. 10%) o **Monto fijo** (ej. Bs 150). |
| Valor | El número: `10` para 10%, o `150` para Bs 150. Los porcentajes no pueden pasar de 50%. |
| De quién es | Para vos, nunca lo ve el comprador. Ej: `María Fernanda — IG @mafe`. |
| Usos máximos | Cuántas veces se puede usar en total. Vacío = ilimitado. |
| Vence el | Última fecha en que funciona. Vacío = no vence. |
| Compra mínima | El pedido tiene que llegar a este monto para que el código aplique. Vacío = sin mínimo. |
| Tope del descuento | Solo para porcentajes: un techo en Bs para que un pedido grande no descuente demasiado. Vacío = sin techo. |

4. Tocá **Crear código**. Ya está activo.

## Desactivar un código

**Nunca lo borres.** Si lo borrás, perdés el historial de cuántas ventas trajo.

En la lista de códigos, tocá **Editar** → destildá **Activo** → **Guardar cambios**. Podés
reactivarlo cuando quieras de la misma forma.

## Compartir un link con el código ya cargado

En vez de decirle a alguien "poné MAFE10 en el carrito", pasale este link y el descuento se
aplica solo apenas entra:

```
tusitio.com/catalogo?codigo=MAFE10
```

## El comprador ya no paga en el sitio

Desde que el pedido se coordina por WhatsApp, el código que aplica el comprador en el carrito es
**informativo**: viaja en el mensaje que te manda, pero el que vale es el que vos pegás al
generar el comprobante en **+ Nuevo comprobante**. Ahí es donde el sistema revalida el código de
nuevo y descuenta un uso de verdad.

## Leer los números de cada código

Cada código en la lista, y en el **Reporte** (`/admin/codigos/reporte`), muestra cuatro números.
Desde que el comprobante lo generás vos en vez de que el pedido se cree solo, "generado" y
"pagado" suman tanto pedidos históricos como comprobantes nuevos:

- **Pedidos generados** / **Descuento (generado)**: todo pedido o comprobante que se creó con
  ese código, aunque nunca se haya cobrado. Este número **sobreestima** — nadie marca solo el
  sistema cuándo entra la plata, eso lo hacés vos a mano viendo tu banco.
- **Pedidos pagados** / **Facturado (pagado)**: solo lo que marcaste como **Pagado** — en la
  pantalla de **Pedidos** para pedidos históricos, o con el check **"ya está pagado"** al generar
  el comprobante. Este es el número real.

**Si le vas a pagar una comisión a alguien por los pedidos que trajo, usá siempre "Pagados",
nunca "Generados".**

## Tres ejemplos para arrancar

| code | tipo | valor | usos máximos | vence | para quién |
|---|---|---|---|---|---|
| `MAFE10` | Porcentaje | 10 | 100 | 31/12/2026 | Influencer, campaña acotada |
| `FAMILIA` | Monto fijo | 150 | *(vacío)* | *(vacío)* | Allegados, permanente |
| `LANZAMIENTO` | Porcentaje | 15 | 50 | 31/08/2026 | Promo por tiempo limitado |
