-- Fase 10 Bloque E: revert_stock_batch no era idempotente.
--
-- El WHERE original (`batch_id = p_batch_id and reverted_at is null`)
-- también matcheaba la propia fila `type = 'revert'` que la función inserta
-- (nunca se le pone reverted_at a esa fila) — así que una segunda llamada al
-- mismo batch_id encontraba el `revert` anterior como "sin deshacer" y lo
-- procesaba de nuevo, restando stock en vez de no hacer nada. Verificado
-- contra la base de dev: sale (-2, stock 8) -> revert (+2, stock 10) ->
-- segundo llamado -> stock volvía a 8. Se agrega `and type = 'sale'` para
-- que solo las ventas originales sean candidatas a deshacer.
create or replace function revert_stock_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement stock_movements%rowtype;
  v_new_stock integer;
begin
  for v_movement in
    select * from stock_movements
    where batch_id = p_batch_id and type = 'sale' and reverted_at is null
  loop
    select stock_qty into v_new_stock from products where id = v_movement.product_id;
    v_new_stock := v_new_stock - v_movement.qty; -- qty negativo en una venta: resta un negativo = suma

    update products set stock_qty = v_new_stock, updated_at = now()
    where id = v_movement.product_id;

    insert into stock_movements (product_id, type, qty, stock_after, receipt_number, batch_id)
    values (v_movement.product_id, 'revert', -v_movement.qty, v_new_stock, v_movement.receipt_number, p_batch_id);

    update stock_movements set reverted_at = now() where id = v_movement.id;
  end loop;
end;
$$;

revoke execute on function revert_stock_batch(uuid) from public, anon, authenticated;
grant execute on function revert_stock_batch(uuid) to service_role;
