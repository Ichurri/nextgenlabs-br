-- Fase 9: el comprobante que genera el admin no crea un pedido, pero el uso
-- del código sí tiene que quedar registrado — es lo único que sostiene el
-- reporte por influencer y el límite de max_uses.
alter table discount_redemptions
  alter column order_id drop not null,
  add column receipt_number text,
  add column receipt_total  numeric(12,2),
  add column customer_name  text,
  add column is_paid        boolean not null default false,
  add constraint redemption_has_source
    check (order_id is not null or receipt_number is not null);

-- La vista mantiene los mismos nombres y tipos de columna (requisito de
-- create or replace); solo cambian las expresiones, para contar las dos
-- fuentes: pedidos históricos y comprobantes sueltos.
create or replace view discount_code_attribution as
select
  dc.*,
  count(dr.id)::integer as redemption_count,
  coalesce(sum(dr.discount_amount), 0)::numeric(12,2) as discount_total,
  coalesce(sum(coalesce(o.total, dr.receipt_total)), 0)::numeric(12,2) as revenue_total,
  count(dr.id) filter (where o.status = 'paid' or dr.is_paid)::integer
    as paid_redemption_count,
  coalesce(sum(coalesce(o.total, dr.receipt_total))
    filter (where o.status = 'paid' or dr.is_paid), 0)::numeric(12,2) as paid_revenue_total
from discount_codes dc
left join discount_redemptions dr on dr.code_id = dc.id
left join orders o on o.id = dr.order_id
group by dc.id
order by dc.created_at desc;
