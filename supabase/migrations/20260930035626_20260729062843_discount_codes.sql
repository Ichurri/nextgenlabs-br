-- Fase 6: códigos de descuento para influencers y allegados.

create table discount_codes (
  id          uuid primary key default gen_random_uuid(),

  code        text not null unique,        -- SIEMPRE en MAYÚSCULAS. Mín. 4 caracteres.
  type        text not null check (type in ('percent','fixed')),
  value       numeric(12,2) not null check (value > 0),

  -- Para atribución. Ej: "María Fernanda — IG @mafe" / "Tío Jorge". Nunca sale al cliente.
  owner_label text not null,

  is_active   boolean not null default true,
  starts_at   timestamptz,                 -- null = activo desde ya
  expires_at  timestamptz,                 -- null = no vence
  max_uses    integer check (max_uses is null or max_uses > 0),  -- null = ilimitado
  used_count  integer not null default 0,

  min_order_total numeric(12,2),           -- null = sin mínimo
  max_discount    numeric(12,2),           -- tope en Bs para códigos de %. null = sin tope

  created_at  timestamptz not null default now(),

  -- Barandilla: un código de 100% sería una catástrofe silenciosa.
  constraint percent_range check (type <> 'percent' or (value >= 1 and value <= 50))
);

create table discount_redemptions (
  id              uuid primary key default gen_random_uuid(),
  code_id         uuid not null references discount_codes(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  code            text not null,           -- snapshot, por si el código se borra
  discount_amount numeric(12,2) not null,
  created_at      timestamptz not null default now(),
  unique (order_id)                        -- un solo código por pedido
);

create index discount_redemptions_code_id_idx on discount_redemptions(code_id);

-- RLS activo y SIN policies: nadie entra desde afuera, todo el acceso es
-- server-side con la service_role key. Igual que orders/order_items.
alter table discount_codes enable row level security;
alter table discount_redemptions enable row level security;
