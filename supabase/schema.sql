-- Wabi Sabi Supabase Schema
-- Run this SQL in your Supabase project's SQL Editor to create tables for
-- tailored customer recipes and meal orders.

create extension if not exists pgcrypto;

-- Stores each customer's latest remembered recipe per dish so future orders
-- start from their personalised preferences and increment versions.
create table if not exists public.customer_recipes (
  id uuid primary key default gen_random_uuid(),
  customer_contact text not null,
  customer_name text not null,
  delivery_address text not null,
  postal_code text not null,
  dish_id text not null,
  dish_name text not null,
  sweetness_tsp numeric(4, 2) not null,
  spice_tsp numeric(4, 2) not null,
  oil_tsp numeric(4, 2) not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint customer_recipes_contact_dish_unique unique (customer_contact, dish_id)
);

-- Stores every submitted meal order along with the exact recipe snapshot
-- prepared for that order.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_contact text not null,
  delivery_address text not null,
  postal_code text not null,
  dish_id text not null,
  dish_name text not null,
  quantity integer not null check (quantity >= 1 and quantity <= 20),
  unit_price_cents integer not null default 950,
  total_cents integer not null,
  sweetness_tsp numeric(4, 2) not null,
  spice_tsp numeric(4, 2) not null,
  oil_tsp numeric(4, 2) not null,
  recipe_version integer not null default 1,
  delivery_slot text not null,
  delivery_notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_recipes_contact
  on public.customer_recipes (customer_contact);

create index if not exists idx_orders_contact_created
  on public.orders (customer_contact, created_at desc);

-- Enable Row Level Security
alter table public.customer_recipes enable row level security;
alter table public.orders enable row level security;

-- Public anon policies for demo / pre-auth storefront ordering & recipe recall.
-- Tighten with auth.uid() once customer accounts are enabled.
create policy "Allow public insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "Allow public read customer recipes by contact"
  on public.customer_recipes for select
  to anon, authenticated
  using (true);

create policy "Allow public insert customer recipes"
  on public.customer_recipes for insert
  to anon, authenticated
  with check (true);

create policy "Allow public update customer recipes"
  on public.customer_recipes for update
  to anon, authenticated
  using (true)
  with check (true);
