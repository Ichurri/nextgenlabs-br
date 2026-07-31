-- Fase 10: el catálogo se muda de src/data/products.ts a la base de datos.
--
-- Tres tablas (categorías, productos, movimientos de stock) y dos RPC para el
-- descuento de stock al emitir un comprobante (Bloque E). RLS activo y SIN
-- policies en las tres — igual que orders/discount_codes: nadie entra desde
-- afuera, todo el acceso es server-side con la service_role key.

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- "Péptidos" — es lo que se ve en el filtro
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,          -- URL /producto/[slug]. Inmutable una vez creado
  name text not null,
  dose text not null,                 -- "10 MG"
  price numeric(12,2) not null default 0,   -- 0 = "Precio a consultar"
  purity text not null,               -- "≥99% HPLC"
  form text not null,                 -- "Liofilizado"
  category_id uuid not null references product_categories(id) on delete restrict,
  image text not null,                -- "/products/x.webp" o URL absoluta de Storage
  highlights text[] not null default '{}',
  description text,
  coa_url text,
  featured boolean not null default false,
  is_new boolean not null default false,
  track_stock boolean not null default true,
  stock_qty integer not null default 0,     -- puede ser negativo a propósito (venta sin stock)
  low_stock_threshold integer not null default 3,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_sort_idx on products (is_active, sort_order);
create index products_category_idx on products (category_id);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('sale','restock','adjustment','revert')),
  qty integer not null,               -- negativo = salida
  stock_after integer not null,       -- foto del stock tras aplicar el movimiento
  reason text,                        -- texto libre del dueño en ajustes/reposiciones
  receipt_number text,                -- NGL-YYMMDD-XXXX del comprobante que lo originó
  batch_id uuid,                      -- agrupa los ítems de un mismo comprobante (para deshacer)
  reverted_at timestamptz,            -- no nulo = este movimiento ya fue deshecho
  created_at timestamptz not null default now()
);

create index stock_movements_product_idx on stock_movements (product_id, created_at desc);
create index stock_movements_batch_idx on stock_movements (batch_id);

alter table product_categories enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;

-- Descuenta stock por cada ítem de un comprobante, de forma atómica. Ítems
-- con track_stock = false se ignoran en silencio. Devuelve el batch_id que
-- agrupa los movimientos, para poder deshacerlos juntos.
create or replace function register_sale_stock(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_receipt_number text := payload->>'receipt_number';
  v_item jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_new_stock integer;
begin
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    select * into v_product from products where slug = v_item->>'slug';
    if not found or not v_product.track_stock then
      continue;
    end if;

    v_qty := (v_item->>'quantity')::integer;
    v_new_stock := v_product.stock_qty - v_qty;

    update products set stock_qty = v_new_stock, updated_at = now()
    where id = v_product.id;

    insert into stock_movements (product_id, type, qty, stock_after, receipt_number, batch_id)
    values (v_product.id, 'sale', -v_qty, v_new_stock, v_receipt_number, v_batch_id);
  end loop;

  return v_batch_id;
end;
$$;

-- Deshace todos los movimientos de un batch que no hayan sido deshechos ya.
-- Idempotente: una segunda llamada no encuentra movimientos pendientes y no
-- hace nada.
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
    where batch_id = p_batch_id and reverted_at is null
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

-- Igual que create_order: revocar de PUBLIC no alcanza, Supabase otorga
-- EXECUTE a anon/authenticated por default privileges al crear la función.
revoke execute on function register_sale_stock(jsonb) from public, anon, authenticated;
grant execute on function register_sale_stock(jsonb) to service_role;
revoke execute on function revert_stock_batch(uuid) from public, anon, authenticated;
grant execute on function revert_stock_batch(uuid) to service_role;

-- Semilla: las 4 categorías actuales y los 10 productos que hoy viven en
-- src/data/products.ts (el plan original asumía 12; el archivo real tiene 10
-- — confirmado contra public/products/*.webp y public/coa/*.pdf). Idempotente
-- con "on conflict ... do nothing" para poder re-aplicarse sin duplicar.

insert into product_categories (name, sort_order) values
  ('Péptidos', 1),
  ('Blends', 2),
  ('SARMs', 3),
  ('Otros', 4)
on conflict (name) do nothing;

insert into products (
  slug, name, dose, price, purity, form, category_id, image, highlights,
  coa_url, featured, is_new, track_stock, stock_qty, sort_order, is_active
) values
  (
    'cjc-1295-no-dac-ipamorelin', 'CJC 1295 No DAC + Ipamorelin', '10 MG', 1700,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Blends'),
    '/products/cjc.webp',
    ARRAY[
      'Sinergia potente para maximizar la masa muscular limpia.',
      'Aceleración drástica de la recuperación física y del tejido muscular.',
      'Mejora la calidad del sueño profundo y la densidad ósea.'
    ],
    '/coa/cjc_coa.pdf', false, false, true, 10, 10, true
  ),
  (
    'ghk-cu', 'GHK-Cu', '100 MG', 1200,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Péptidos'),
    '/products/ghk-cu.webp',
    ARRAY[
      'El péptido de cobre para la regeneración dérmica avanzada.',
      'Elasticidad infinita.',
      'Revierte el envejecimiento celular.',
      'Cicatrización acelerada y reparación de la barrera cutánea.',
      'Remodelación del tejido y potente efecto antioxidante.'
    ],
    '/coa/ghk_coa.pdf', true, false, true, 10, 20, true
  ),
  (
    'glow', 'GLOW', '70 MG', 2300,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Blends'),
    '/products/glow.webp',
    ARRAY[
      'Mejora la calidad de la piel proporcionando luminosidad desde el interior.',
      'Mayor hidratación y disminución de líneas de expresión.',
      'Recuperación física: acelera la reparación de músculos y articulaciones tras el ejercicio, disminuyendo el malestar general.',
      'Vitalidad celular: apoya la regeneración y el rejuvenecimiento biológico del organismo.'
    ],
    '/coa/glow_coa.pdf', true, false, true, 10, 30, true
  ),
  (
    'glp-3-rt', 'GLP-3 RT (Retatrutide)', '30 MG', 3300,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Péptidos'),
    '/products/glp.webp',
    ARRAY[
      'El avance de triple acción en la pérdida de peso.',
      'Poderosa saciedad duradera (regulación del apetito a nivel central).',
      'Control glucémico total y optimización metabólica.',
      'Quema calórica acelerada dirigida a la grasa persistente.'
    ],
    '/coa/glp3_coa.pdf', true, false, true, 10, 40, true
  ),
  (
    'klow', 'KLOW', '80 MG', 2500,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Blends'),
    '/products/klow.webp',
    ARRAY[
      'Mayor producción de colágeno.',
      'Recuperación optimizada.',
      'Apoyo para tejidos y tendones.',
      'Favorece una respuesta antiinflamatoria equilibrada.'
    ],
    '/coa/klow_coa.pdf', true, false, true, 10, 50, true
  ),
  (
    'nad-plus', 'NAD+', '500 MG', 1900,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Otros'),
    '/products/nadplus.webp',
    ARRAY[
      'Energía celular pura: reactiva tus mitocondrias para eliminar el cansancio desde la raíz.',
      'Reparación de ADN: activa las sirtuinas para frenar el envejecimiento celular.',
      'Claridad mental: protege tus neuronas y elimina la "niebla mental", mejorando el enfoque.',
      'Máximo rendimiento: acelera la recuperación física y optimiza el metabolismo.'
    ],
    '/coa/nadq_coa.pdf', true, false, true, 10, 60, true
  ),
  (
    'selank', 'Selank', '5 MG', 900,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Péptidos'),
    '/products/selank.webp',
    ARRAY[
      'Calma, serenidad y control mental.',
      'Reduce el estrés y la ansiedad sin causar somnolencia.',
      'Mantiene un estado de "alerta relajado" ideal para el día a día.',
      'Estabilidad emocional y mejora el estado de ánimo.'
    ],
    '/coa/selank_coa.pdf', false, false, true, 10, 70, true
  ),
  (
    'semax', 'Semax', '5 MG', 900,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Péptidos'),
    '/products/semax.webp',
    ARRAY[
      'Enfoque mental y neuroprotección.',
      'Claridad cognitiva inmediata y memoria mejorada.',
      'Aumento de la productividad bajo condiciones de estrés mental.',
      'Protección y regeneración de las neuronas (soporte nootrópico).'
    ],
    '/coa/semax_coa.pdf', true, false, true, 10, 80, true
  ),
  (
    'tesamorelin', 'Tesamorelin', '10 MG', 1700,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Péptidos'),
    '/products/tesamorelin.webp',
    ARRAY[
      'Reducción de grasa visceral y armonía hormonal.',
      'Estimula la producción natural de la hormona de crecimiento (GH).',
      'Ataque directo a la grasa abdominal persistente (grasa visceral).',
      'Promueve una composición corporal limpia y mejora la recuperación.'
    ],
    '/coa/tesamorelin_coa.pdf', true, false, true, 10, 90, true
  ),
  (
    'wolverine', 'WOLVERINE (BPC-157 + TB-500)', '10 MG', 1750,
    '≥99% HPLC', 'Liofilizado', (select id from product_categories where name = 'Blends'),
    '/products/wolverine.webp',
    ARRAY[
      'El factor de curación y regeneración total acelerada.',
      'Sanación ultrarrápida de tendones, ligamentos, articulaciones y músculos.',
      'Potente acción antiinflamatoria y reparación del tejido dañado.',
      'El combo definitivo para atletas de alto rendimiento y biohackers.'
    ],
    '/coa/wolverine_coa.pdf', true, false, true, 10, 100, true
  )
on conflict (slug) do nothing;
