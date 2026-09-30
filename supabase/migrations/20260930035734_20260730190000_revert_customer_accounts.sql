-- Fase 9: se revierte la Fase 8. No hay cuentas de comprador.
--
-- Las tres migraciones de la Fase 8 ya estaban aplicadas en remoto, así que
-- esto las compensa en vez de editarlas. Cuando se corre, customer_profiles
-- ya está vacía y auth.users en 0: las dos cuentas de prueba se borraron a
-- mano el 2026-07-30 y el cascade limpió los perfiles.

drop index if exists orders_customer_id_idx;
alter table orders drop column if exists customer_id;
alter table orders drop column if exists customer_email;

drop table if exists customer_profiles;

-- create_order vuelve al cuerpo previo a la Fase 8 (20260729062932). Queda
-- SIN NINGÚN LLAMADOR: /checkout se va en el Bloque B y el comprobante del
-- admin no persiste nada. Se restaura en vez de dropearse porque cuesta 20
-- líneas y deja la puerta abierta si algún día se vuelve a persistir.
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
    v_order_id, item->>'slug', item->>'name', item->>'dose',
    (item->>'unit_price')::numeric(12,2), (item->>'quantity')::integer,
    (item->>'line_total')::numeric(12,2)
  from jsonb_array_elements(payload->'items') as item;

  if v_discount_code_id is not null then
    insert into discount_redemptions (code_id, order_id, code, discount_amount)
    values (v_discount_code_id, v_order_id, payload->>'discount_code',
            (payload->>'discount')::numeric(12,2));
  end if;

  return query select v_token, v_order_number;
end;
$$;

revoke execute on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
