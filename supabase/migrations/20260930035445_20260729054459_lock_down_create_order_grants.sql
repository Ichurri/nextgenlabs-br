-- Fase 5.5: cierra un hueco de seguridad en `create_order`.
--
-- La migración anterior hizo `revoke all ... from public`, pero Supabase
-- otorga EXECUTE a `anon` y `authenticated` mediante default privileges al
-- crear una función nueva en `public` — un grant explícito e independiente
-- de PUBLIC, que ese revoke no tocaba. Verificado con
-- `select proacl from pg_proc where proname = 'create_order'`: `anon` y
-- `authenticated` seguían con `X` (EXECUTE) después del revoke. Sin este
-- fix, cualquiera podía llamar POST /rest/v1/rpc/create_order con la anon
-- key y crear pedidos con montos arbitrarios, saltando por completo
-- checkoutSchema y calculateOrderTotals().
revoke execute on function create_order(jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb) to service_role;
