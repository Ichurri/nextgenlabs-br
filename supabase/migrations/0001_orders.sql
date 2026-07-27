-- Fase 5: pedidos y comprobante.
-- Ejecutar en el SQL editor de Supabase. Se guarda en el repo como
-- documentación viva del esquema (no se usa el CLI de Supabase).

create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique,          -- NGL-260727-K4XQ (visible, se dicta por WhatsApp)
  token         text not null unique,          -- 32 hex, va en la URL del comprobante

  customer_name  text not null,
  customer_phone text not null,                -- WhatsApp del comprador
  customer_city  text not null,
  customer_address text,
  customer_note  text,

  subtotal      numeric(12,2) not null,
  discount      numeric(12,2) not null default 0,
  shipping      numeric(12,2) not null default 0,
  total         numeric(12,2) not null,

  -- Previsto para la Fase 6. En la Fase 5 quedan siempre en null.
  discount_code       text,
  discount_code_label text,

  status        text not null default 'pending'
                check (status in ('pending','paid','cancelled')),
  created_at    timestamptz not null default now()
);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  slug        text not null,
  name        text not null,      -- snapshot: el producto puede cambiar de nombre después
  dose        text not null,      -- snapshot
  unit_price  numeric(12,2) not null,
  quantity    integer not null check (quantity > 0),
  line_total  numeric(12,2) not null
);

create index order_items_order_id_idx on order_items(order_id);
create index orders_created_at_idx on orders(created_at desc);

-- RLS activo y SIN policies: nadie entra desde afuera.
-- Todo el acceso es server-side con la service_role key, que salta RLS.
alter table orders enable row level security;
alter table order_items enable row level security;
