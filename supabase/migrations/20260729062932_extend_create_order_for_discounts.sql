-- Fase 6: extiende create_order (Fase 5.5) con el reclamo atómico de un
-- código de descuento, en la misma transacción que crea la orden — tal
-- como quedó previsto en el comentario de la migración original.
--
-- La única validación que se repite acá es `max_uses`, porque es la única
-- sujeta a condición de carrera (dos compradores canjeando el último uso al
-- mismo tiempo). expires_at/starts_at/min_order_total ya los evaluó
-- evaluateDiscount() en el Route Handler antes de llamar a esta función; no
-- son sensibles a concurrencia, así que repetirlos acá sería redundante.
--
-- Si el update condicional devuelve 0 filas, se aborta con una excepción de
-- SQLSTATE propio ('NGL01') — Postgres revierte toda la transacción,
-- incluida cualquier cosa que se haya hecho antes en esta misma llamada, así
-- que no hace falta "devolver" el uso a mano: nunca se llegó a confirmar.
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
  v_discount_code_id uuid := nullif(payload->>'discount_code_id', '')::uuid;
  v_claimed_uses integer;
begin
  if v_discount_code_id is not null then
    update discount_codes
       set used_count = used_count + 1
     where id = v_discount_code_id
       and is_active
       and (max_uses is null or used_count < max_uses)
    returning used_count into v_claimed_uses;

    if v_claimed_uses is null then
      raise exception 'discount_code_exhausted' using errcode = 'NGL01';
    end if;
  end if;

  insert into orders (
    order_number, token,
    customer_name, customer_phone, customer_city, customer_address, customer_note,
    subtotal, discount, shipping, total,
    discount_code, discount_code_label
  )
  values (
    v_order_number, v_token,
    payload->>'customer_name', payload->>'customer_phone', payload->>'customer_city',
    payload->>'customer_address', payload->>'customer_note',
    (payload->>'subtotal')::numeric(12,2), (payload->>'discount')::numeric(12,2),
    (payload->>'shipping')::numeric(12,2), (payload->>'total')::numeric(12,2),
    payload->>'discount_code', payload->>'discount_code_label'
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

  if v_discount_code_id is not null then
    insert into discount_redemptions (code_id, order_id, code, discount_amount)
    values (v_discount_code_id, v_order_id, payload->>'discount_code', (payload->>'discount')::numeric(12,2));
  end if;

  return query select v_token, v_order_number;
end;
$$;

-- create or replace conserva los grants existentes, pero se repiten acá
-- explícitos: barato, y documenta la invariante en el lugar donde alguien
-- va a mirar primero si algo se rompe.
revoke execute on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
