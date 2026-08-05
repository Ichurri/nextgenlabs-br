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

## Pasarle a la persona su link de ventas

Cada código tiene un **link privado** donde la persona ve, ella sola, cuántas ventas trajo su
código y por cuánto. No necesita contraseña ni cuenta: el link es la llave.

En `/admin/codigos`, en la tarjeta del código, copiá **Link privado de ventas** y mandáselo por
WhatsApp. Ahí la persona ve:

- cuántas ventas trajo su código y el monto total,
- la lista de esas ventas con fecha y monto,
- su link para compartir, listo para copiar.

**Lo que no ve**: nombres, teléfonos ni direcciones de compradores, qué producto se vendió, ni
nada de los demás códigos. Tampoco ve el nombre que vos le pusiste en "De quién es".

Si el link se le escapa a alguien más, tocá **Generar link nuevo** en esa misma tarjeta: el
anterior deja de funcionar en el acto y le pasás el nuevo.

## El comprador ya no paga en el sitio

Desde que el pedido se coordina por WhatsApp, el código que aplica el comprador en el carrito es
**informativo**: viaja en el mensaje que te manda, pero el que vale es el que vos pegás al
generar el comprobante en **+ Nuevo comprobante**. Ahí es donde el sistema revalida el código de
nuevo y descuenta un uso de verdad.

## Leer los números de cada código

Cada código en la lista, y en el **Reporte** (`/admin/codigos/reporte`), muestra cuatro números.
Desde que el comprobante lo generás vos en vez de que el pedido se cree solo, "generado" y
"pagado" suman tanto pedidos históricos como comprobantes nuevos:

- **Pedidos generados** / **Descuento (generado)**: todo pedido creado con ese código. Incluye
  pedidos históricos que quedaron sin cobrar, así que puede sobreestimar.
- **Pedidos pagados** / **Facturado (pagado)**: las ventas cobradas. Desde que el comprobante lo
  generás vos, todo lo que registrás nace pagado, así que este número y el de arriba solo se
  separan por pedidos viejos.

**Si le vas a pagar una comisión a alguien, usá siempre "Pagados".** Es el mismo número que ve la
persona en su link de ventas.

## Tres ejemplos para arrancar

| code | tipo | valor | usos máximos | vence | para quién |
|---|---|---|---|---|---|
| `MAFE10` | Porcentaje | 10 | 100 | 31/12/2026 | Influencer, campaña acotada |
| `FAMILIA` | Monto fijo | 150 | *(vacío)* | *(vacío)* | Allegados, permanente |
| `LANZAMIENTO` | Porcentaje | 15 | 50 | 31/08/2026 | Promo por tiempo limitado |
