-- Fase 11: todo pedido nace pagado y el estado no cambia nunca más. "shipped"
-- dejó de tener sentido: el dueño despacha por WhatsApp y no lo registra acá.
-- La columna `status` se queda (la leen orders_overview y
-- discount_code_attribution), pero con un solo valor posible.
update orders set status = 'paid' where status <> 'paid';

alter table orders drop constraint orders_status_check;

alter table orders add constraint orders_status_check
  check (status = 'paid');
