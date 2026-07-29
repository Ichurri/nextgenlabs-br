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
| Código | En MAYÚSCULAS, sin espacios. Ej: `MAFE10`. Es lo que la persona escribe al pagar. |
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

En vez de decirle a alguien "poné MAFE10 al pagar", pasale este link y el descuento se aplica
solo apenas entra:

```
tusitio.com/catalogo?codigo=MAFE10
```

## Leer los números de cada código

Cada código en la lista muestra cuatro números:

- **Pedidos generados** / **Descuento (generado)**: todo pedido que se creó con ese código,
  aunque nunca se haya cobrado. Este número **sobreestima** — nadie marca solo el sistema
  cuándo entra la plata, eso lo hacés vos a mano viendo tu banco.
- **Pedidos pagados** / **Facturado (pagado)**: solo los pedidos que vos marcaste como
  **Pagado** en la pantalla de **Pedidos**. Este es el número real.

**Si le vas a pagar una comisión a alguien por los pedidos que trajo, usá siempre "Pagados",
nunca "Generados".**

## Tres ejemplos para arrancar

| code | tipo | valor | usos máximos | vence | para quién |
|---|---|---|---|---|---|
| `MAFE10` | Porcentaje | 10 | 100 | 31/12/2026 | Influencer, campaña acotada |
| `FAMILIA` | Monto fijo | 150 | *(vacío)* | *(vacío)* | Allegados, permanente |
| `LANZAMIENTO` | Porcentaje | 15 | 50 | 31/08/2026 | Promo por tiempo limitado |
