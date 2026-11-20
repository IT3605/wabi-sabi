-- Wabi Sabi Verification & Seed Query
-- Run after supabase/schema.sql in Supabase Dashboard -> SQL Editor

select 'menu_prices' as table_name, count(*) as row_count from public.menu_prices
union all
select 'customers', count(*) from public.customers
union all
select 'recipes', count(*) from public.recipes
union all
select 'recipe_tweaks', count(*) from public.recipe_tweaks
union all
select 'orders', count(*) from public.orders;

-- Preview joined customer orders & recipes
select
  o.order_code,
  c.name as customer_name,
  c.display_contact,
  o.dish_name,
  o.quantity,
  round(o.total_cents / 100.0, 2) as total_sgd,
  o.recipe_version,
  o.payment_status,
  o.created_at
from public.orders o
join public.customers c on c.id = o.customer_id
order by o.created_at desc;
