-- Los recibos ahora nacen siempre pagados (/api/admin/recibos) y el estado
-- ya no se cambia a mano desde el panel (se sacó OrderStatusControl y el
-- endpoint /api/admin/pedidos/[id]/estado). "pending" y "cancelled" dejan de
-- ser estados válidos: solo quedan "paid" y "shipped".
--
-- Coerciona antes de agregar el constraint más estricto: no hay filas así en
-- prod, pero puede haber datos de prueba viejos en dev con esos estados.
update orders set status = 'paid' where status not in ('paid', 'shipped');

alter table orders drop constraint orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('paid', 'shipped'));

alter table orders alter column status set default 'paid';
