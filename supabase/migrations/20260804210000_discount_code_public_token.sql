-- Fase 12: cada código lleva un token opaco que da acceso a una página
-- pública de solo lectura con las ventas de ESE código. Sin login: el link es
-- la credencial, igual que /pedido/[token].
--
-- El default se evalúa en Postgres para que una fila insertada a mano desde
-- el table editor también nazca con su token. gen_random_uuid() es built-in
-- desde PG13 (no depende de pgcrypto, que no está garantizado en el
-- search_path del proyecto) y sin guiones da 32 hex chars = 122 bits de
-- azar, la misma forma que generateToken() en src/lib/orders.ts.
--
-- El default es VOLATILE, así que el ALTER reescribe la tabla y evalúa la
-- expresión por fila: cada código existente sale con un token distinto. Es lo
-- que queremos, y con este volumen de filas el rewrite es instantáneo.
alter table discount_codes
  add column public_token text not null unique
    default replace(gen_random_uuid()::text, '-', '');

-- Una fila por canje, sin un solo dato del comprador. Es la única fuente de
-- la lista de /mis-ventas/[token]: no existe customer_name, ni teléfono, ni
-- ciudad, ni los ítems. Si mañana alguien quiere mostrar más, tiene que
-- agregarlo acá a propósito — no puede filtrarse por un select("*") distraído.
--
-- sold_at: para pedidos históricos coincide con dr.created_at; para
-- comprobantes de la Fase 9 (sin order_id) el único dato disponible es
-- dr.created_at, que es cuando el dueño registró la venta.
--
-- is_paid: mismo criterio que la columna "Pagados" de
-- discount_code_attribution. El coalesce es necesario acá y no allá porque
-- un FILTER trata NULL como falso, pero una columna de select devolvería NULL.
create view discount_code_sales as
select
  dr.id,
  dr.code_id,
  coalesce(o.created_at, dr.created_at)                 as sold_at,
  coalesce(o.total, dr.receipt_total, 0)::numeric(12,2) as sale_total,
  (coalesce(o.status = 'paid', false) or dr.is_paid)    as is_paid
from discount_redemptions dr
left join orders o on o.id = dr.order_id;

-- Ninguna vista de este proyecto la consulta un cliente anónimo: todo el
-- acceso es server-side con la service_role key. Supabase otorga SELECT por
-- default a anon/authenticated sobre lo nuevo en el schema public, y una
-- vista sin security_invoker se evalúa con los permisos de su dueño — o sea
-- que el RLS de discount_redemptions/orders NO la protege. Estos revokes
-- cierran eso. Son idempotentes: si el grant no existía, no pasa nada.
revoke all on discount_code_sales       from anon, authenticated;
revoke all on discount_code_attribution from anon, authenticated;
revoke all on orders_overview           from anon, authenticated;
