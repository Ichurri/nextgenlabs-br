-- Fase 6 §8: atribución por código, para el panel (no SQL a mano en
-- Supabase — el dueño eligió gestionar códigos desde /admin/codigos).
--
-- No es security definer: al consultarla se evalúa RLS de discount_codes/
-- discount_redemptions/orders con el rol de quien pregunta, igual que
-- orders_overview — protegida sin necesidad de revokes adicionales.
--
-- Separa "generados" (todo pedido creado con el código) de "pagados"
-- (status = 'paid'). El primero sobreestima porque nadie marca solo el
-- sistema cuándo se cobra un pedido — está documentado en 00-contexto.md
-- §2. Mostrar los dos números en vez de uno solo evita que el dueño le
-- pague comisión a alguien sobre pedidos que nunca se cobraron.
create or replace view discount_code_attribution as
select
  dc.*,
  count(dr.id)::integer as redemption_count,
  coalesce(sum(dr.discount_amount), 0)::numeric(12,2) as discount_total,
  coalesce(sum(o.total), 0)::numeric(12,2) as revenue_total,
  count(dr.id) filter (where o.status = 'paid')::integer as paid_redemption_count,
  coalesce(sum(o.total) filter (where o.status = 'paid'), 0)::numeric(12,2) as paid_revenue_total
from discount_codes dc
left join discount_redemptions dr on dr.code_id = dc.id
left join orders o on o.id = dr.order_id
group by dc.id
order by dc.created_at desc;
