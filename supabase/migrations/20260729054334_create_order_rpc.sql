-- Fase 5.5: creación de pedidos transaccional.
--
-- Reemplaza el patrón insert-orders + insert-order_items + delete-de-
-- compensación del Route Handler por una sola función de Postgres. El
-- cliente nunca manda montos: el Route Handler recalcula con
-- calculateOrderTotals() y pasa acá los montos ya calculados.
--
-- Diseñada para que la Fase 6 le agregue el reclamo atómico de un código de
-- descuento (un `update discount_codes set uses = uses + 1 where ...
-- returning ...` antes del insert de la orden) sin reescribir la firma: el
-- payload es jsonb, así que un campo `discount_code` nuevo entra sin tocar
-- los llamadores existentes.
create or replace function create_order(payload jsonb)
returns table (token text, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_token text := payload->>'token';
  v_order_number text := payload->>'order_number';
begin
  insert into orders (
    order_number, token,
    customer_name, customer_phone, customer_city, customer_address, customer_note,
    subtotal, discount, shipping, total
  )
  values (
    v_order_number, v_token,
    payload->>'customer_name', payload->>'customer_phone', payload->>'customer_city',
    payload->>'customer_address', payload->>'customer_note',
    (payload->>'subtotal')::numeric(12,2), (payload->>'discount')::numeric(12,2),
    (payload->>'shipping')::numeric(12,2), (payload->>'total')::numeric(12,2)
  )
  returning id into v_order_id;

  insert into order_items (order_id, slug, name, dose, unit_price, quantity, line_total)
  select
    v_order_id,
    item->>'slug',
    item->>'name',
    item->>'dose',
    (item->>'unit_price')::numeric(12,2),
    (item->>'quantity')::integer,
    (item->>'line_total')::numeric(12,2)
  from jsonb_array_elements(payload->'items') as item;

  return query select v_token, v_order_number;
end;
$$;

-- Postgres otorga EXECUTE a PUBLIC por defecto en funciones nuevas, y en
-- Supabase eso incluye a `anon`/`authenticated` — expondría la función en
-- /rest/v1/rpc/create_order al navegador y rompería la invariante de
-- 00-contexto.md (nadie entra desde afuera, solo el servidor con la
-- service_role key). Se revoca explícito y se deja solo al service_role.
revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to service_role;
