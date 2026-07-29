-- Fase 5.5 §6: vista de respaldo para leer pedidos desde el table editor de
-- Supabase mientras se desarrolla (el camino principal es el panel de la
-- Fase 5.6). No es security definer: al consultarla se evalúa RLS de
-- `orders`/`order_items` con el rol de quien pregunta, así que queda tan
-- protegida como las tablas base sin necesidad de revokes adicionales.
--
-- No expone `token` — es lo que protege el comprobante.
create or replace view orders_overview as
select
  o.id,
  o.order_number,
  o.created_at,
  o.customer_name,
  o.customer_phone,
  o.customer_city,
  o.status,
  o.subtotal,
  o.discount,
  o.shipping,
  o.total,
  string_agg(oi.name || ' x' || oi.quantity, ', ' order by oi.id) as products
from orders o
join order_items oi on oi.order_id = o.id
group by o.id
order by o.created_at desc;
