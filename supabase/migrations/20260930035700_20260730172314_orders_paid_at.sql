-- Fase 7 (B3): guarda cuándo se confirmó el pago de un pedido. Se llena en
-- el mismo handler que ya cambia el estado a "paid" y se limpia si el
-- pedido vuelve a "pending" — no hay trigger, la transición sigue siendo
-- explícita y la dispara el dueño desde el panel (00-contexto.md §8).
alter table orders add column paid_at timestamptz;
