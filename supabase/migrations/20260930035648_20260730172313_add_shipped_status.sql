-- Fase 7 (B2): agrega el estado "shipped" para distinguir un pedido pagado
-- de uno ya despachado (envío nacional real, con días de por medio). Sigue
-- siendo un CHECK constraint, no una máquina de estados: las cuatro
-- transiciones quedan libres y reversibles entre sí (00-contexto.md §8).
--
-- El constraint original se creó inline y sin nombre en 20260727000000_orders.sql;
-- Postgres le puso el nombre por defecto "orders_status_check" (confirmado
-- contra la base con pg_get_constraintdef antes de escribir este drop).
alter table orders drop constraint orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'cancelled'));
