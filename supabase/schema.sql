-- Wabi Sabi Supabase Schema, Security (RLS) & Initial Seed Data
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Tables with strict integrity & anti-tampering CHECK constraints
-- ---------------------------------------------------------------------------

create table if not exists public.menu_prices (
  dish_id text primary key check (char_length(dish_id) between 2 and 64),
  dish_name text not null check (char_length(dish_name) between 2 and 120),
  subtitle text not null check (char_length(subtitle) <= 160),
  description text not null check (char_length(description) <= 400),
  price_cents integer not null check (price_cents > 0 and price_cents <= 100000),
  currency text not null default 'SGD' check (currency in ('SGD')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 100),
  contact text not null unique check (char_length(trim(contact)) between 5 and 160),
  display_contact text not null check (char_length(trim(display_contact)) between 5 and 160),
  address text not null check (char_length(address) <= 240),
  postal_code text not null check (char_length(postal_code) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  dish_id text not null references public.menu_prices(dish_id),
  dish_name text not null check (char_length(dish_name) between 2 and 120),
  sweetness_tsp numeric(4, 2) not null check (sweetness_tsp >= 0 and sweetness_tsp <= 5),
  spice_tsp numeric(4, 2) not null check (spice_tsp >= 0 and spice_tsp <= 5),
  oil_tsp numeric(4, 2) not null check (oil_tsp >= 0 and oil_tsp <= 5),
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now(),
  unique (customer_id, dish_id)
);

create table if not exists public.recipe_tweaks (
  id bigint generated always as identity primary key,
  recipe_id bigint not null references public.recipes(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  dish_id text not null references public.menu_prices(dish_id),
  version integer not null check (version >= 1),
  sweetness_tsp numeric(4, 2) not null check (sweetness_tsp >= 0 and sweetness_tsp <= 5),
  spice_tsp numeric(4, 2) not null check (spice_tsp >= 0 and spice_tsp <= 5),
  oil_tsp numeric(4, 2) not null check (oil_tsp >= 0 and oil_tsp <= 5),
  tweak_note text not null default '' check (char_length(tweak_note) <= 300),
  source text not null default 'order' check (source in ('personaliser', 'order', 'seed')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_code text not null unique check (order_code ~ '^WS-[A-Z0-9]{4,12}$'),
  customer_id bigint not null references public.customers(id) on delete cascade,
  dish_id text not null references public.menu_prices(dish_id),
  dish_name text not null check (char_length(dish_name) between 2 and 120),
  quantity integer not null check (quantity >= 1 and quantity <= 20),
  unit_price_cents integer not null check (unit_price_cents > 0),
  total_cents integer not null check (total_cents = quantity * unit_price_cents),
  sweetness_tsp numeric(4, 2) not null check (sweetness_tsp >= 0 and sweetness_tsp <= 5),
  spice_tsp numeric(4, 2) not null check (spice_tsp >= 0 and spice_tsp <= 5),
  oil_tsp numeric(4, 2) not null check (oil_tsp >= 0 and oil_tsp <= 5),
  recipe_version integer not null check (recipe_version >= 1),
  delivery_slot text not null check (char_length(delivery_slot) between 3 and 120),
  delivery_notes text not null default '' check (char_length(delivery_notes) <= 300),
  payment_provider text not null default 'stripe_demo' check (payment_provider in ('stripe', 'stripe_demo')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_contact on public.customers(contact);
create index if not exists idx_recipes_customer on public.recipes(customer_id, dish_id);
create index if not exists idx_tweaks_customer on public.recipe_tweaks(customer_id, dish_id, id desc);
create index if not exists idx_orders_customer on public.orders(customer_id, id desc);
create index if not exists idx_orders_code on public.orders(order_code);

-- ---------------------------------------------------------------------------
-- 2. Database Security: Row-Level Security (RLS) & Least Privilege Grants
--    - Blocks direct browser/anon API access to PII (customers, recipes, orders)
--    - Only server-side Hono backend using SUPABASE_SECRET_KEY can read/write PII
-- ---------------------------------------------------------------------------

alter table public.menu_prices enable row level security;
alter table public.customers enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_tweaks enable row level security;
alter table public.orders enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.recipes from anon, authenticated;
revoke all on table public.recipe_tweaks from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke insert, update, delete on table public.menu_prices from anon, authenticated;
grant select on table public.menu_prices to anon, authenticated;

drop policy if exists "Public can read active menu prices" on public.menu_prices;
create policy "Public can read active menu prices"
  on public.menu_prices
  for select
  to anon, authenticated
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- 3. Initial Seed Data (Menu Prices + Sample Customers, Recipes, Tweaks & Orders)
-- ---------------------------------------------------------------------------

insert into public.menu_prices (dish_id, dish_name, subtitle, description, price_cents, currency, is_active, sort_order)
values
  ('curry-rice', 'Homestyle Curry Rice', 'Customisable · Comfort classic', 'Comforting, aromatic, and tailored to your preferred spice level.', 1050, 'SGD', true, 1),
  ('garden-bowl', 'Garden Goodness Bowl', 'Customisable · Seasonal harvest', 'Seasonal vegetables, grains, and a dressing balanced to your taste.', 950, 'SGD', true, 2),
  ('sweet-sour-noodles', 'Sweet & Sour Noodles', 'Customisable · Signature favourite', 'A familiar favourite with your ideal balance of sweetness and tang.', 890, 'SGD', true, 3)
on conflict (dish_id) do update set
  dish_name = excluded.dish_name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Sample customers (Singapore)
insert into public.customers (name, contact, display_contact, address, postal_code)
values
  ('Wei Ming Tan', 'weiming@example.sg', 'weiming@example.sg', 'Blk 412 Tiong Bahru Rd #06-118', '160412'),
  ('Aisyah Rahman', '+6591234567', '+65 9123 4567', 'Blk 18 Marine Parade Rd #11-04', '440018')
on conflict (contact) do update set
  name = excluded.name,
  display_contact = excluded.display_contact,
  address = excluded.address,
  postal_code = excluded.postal_code,
  updated_at = now();

-- Sample saved tailored recipes
insert into public.recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version)
select c.id, 'curry-rice', 'Homestyle Curry Rice', 1.50, 1.00, 1.00, 2
from public.customers c where c.contact = 'weiming@example.sg'
on conflict (customer_id, dish_id) do nothing;

insert into public.recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version)
select c.id, 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.00, 0.25, 1.50, 1
from public.customers c where c.contact = 'weiming@example.sg'
on conflict (customer_id, dish_id) do nothing;

insert into public.recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version)
select c.id, 'garden-bowl', 'Garden Goodness Bowl', 1.00, 0.00, 1.00, 1
from public.customers c where c.contact = '+6591234567'
on conflict (customer_id, dish_id) do nothing;

-- Sample tweak history (only inserts if no tweaks exist yet for that recipe)
insert into public.recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source)
select r.id, r.customer_id, r.dish_id, 1, 1.50, 0.50, 1.50, 'Initial baseline order', 'seed'
from public.recipes r
join public.customers c on c.id = r.customer_id
where c.contact = 'weiming@example.sg' and r.dish_id = 'curry-rice'
  and not exists (select 1 from public.recipe_tweaks t where t.recipe_id = r.id and t.version = 1);

insert into public.recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source)
select r.id, r.customer_id, r.dish_id, 2, 1.50, 1.00, 1.00, 'More chilli and lighter oil after first tasting', 'seed'
from public.recipes r
join public.customers c on c.id = r.customer_id
where c.contact = 'weiming@example.sg' and r.dish_id = 'curry-rice'
  and not exists (select 1 from public.recipe_tweaks t where t.recipe_id = r.id and t.version = 2);

insert into public.recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source)
select r.id, r.customer_id, r.dish_id, 1, 1.00, 0.00, 1.00, 'Lighter dressing, no chilli', 'seed'
from public.recipes r
join public.customers c on c.id = r.customer_id
where c.contact = '+6591234567' and r.dish_id = 'garden-bowl'
  and not exists (select 1 from public.recipe_tweaks t where t.recipe_id = r.id and t.version = 1);

-- Sample orders
insert into public.orders (
  order_code, customer_id, dish_id, dish_name, quantity, unit_price_cents, total_cents,
  sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes,
  payment_provider, payment_status
)
select
  'WS-1042', c.id, 'curry-rice', 'Homestyle Curry Rice', 2, 1050, 2100,
  1.50, 1.00, 1.00, 2, 'Today · Dinner (18:30 – 19:30)', 'Leave at shoe rack',
  'stripe_demo', 'paid'
from public.customers c where c.contact = 'weiming@example.sg'
on conflict (order_code) do nothing;

insert into public.orders (
  order_code, customer_id, dish_id, dish_name, quantity, unit_price_cents, total_cents,
  sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes,
  payment_provider, payment_status
)
select
  'WS-1043', c.id, 'garden-bowl', 'Garden Goodness Bowl', 1, 950, 950,
  1.00, 0.00, 1.00, 1, 'Tomorrow · Lunch (12:00 – 13:00)', 'Ring doorbell once',
  'stripe_demo', 'paid'
from public.customers c where c.contact = '+6591234567'
on conflict (order_code) do nothing;
