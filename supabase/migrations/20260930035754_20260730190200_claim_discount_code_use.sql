-- Fase 9 §C4: /api/admin/recibos necesita reclamar un uso de código de
-- descuento sin insertar una fila en `orders` (create_order no aplica, no
-- persiste pedido). Mismo update atómico que usa create_order internamente
-- — a prueba de carreras — expuesto como su propia función para que el
-- Route Handler lo llame antes de renderizar el PDF.
create or replace function claim_discount_code_use(p_code_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed_uses integer;
begin
  update discount_codes
     set used_count = used_count + 1
   where id = p_code_id
     and is_active
     and (max_uses is null or used_count < max_uses)
  returning used_count into v_claimed_uses;

  if v_claimed_uses is null then
    raise exception 'discount_code_exhausted' using errcode = 'NGL01';
  end if;

  return v_claimed_uses;
end;
$$;

revoke execute on function claim_discount_code_use(uuid) from public, anon, authenticated;
grant execute on function claim_discount_code_use(uuid) to service_role;
