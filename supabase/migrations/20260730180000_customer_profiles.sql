-- Fase 8 A3: perfil del comprador. auth.users no se extiende, se acompaña.
--
-- RLS habilitado y SIN ninguna policy para anon/authenticated, igual que
-- orders y order_items (00-contexto.md §5): toda lectura y escritura sigue
-- yendo por el servidor con la service_role key. Supabase Auth se usa solo
-- para identidad (hash de contraseña, tokens de recuperación, sesión), no
-- para mover autorización a policies de RLS.
create table customer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  phone      text not null,
  city       text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;
