-- Wabi Sabi Synthetic Dataset for Supabase
-- Run AFTER supabase/schema.sql in Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run multiple times (idempotent via ON CONFLICT / NOT EXISTS).

-- 1. Ensure authoritative menu prices exist
insert into public.menu_prices (dish_id, dish_name, subtitle, description, price_cents, currency, is_active, sort_order)
values
  ('curry-rice', 'Homestyle Curry Rice', 'Customisable · Comfort classic', 'Comforting, aromatic, and tailored to your preferred spice level.', 1050, 'SGD', true, 1),
  ('garden-bowl', 'Garden Goodness Bowl', 'Customisable · Seasonal harvest', 'Seasonal vegetables, grains, and a dressing balanced to your taste.', 950, 'SGD', true, 2),
  ('sweet-sour-noodles', 'Sweet & Sour Noodles', 'Customisable · Signature favourite', 'A familiar favourite with your ideal balance of sweetness and tang.', 890, 'SGD', true, 3)
on conflict (dish_id) do nothing;

-- 2. Synthetic Singapore customers (10 additional realistic profiles)
insert into public.customers (name, contact, display_contact, address, postal_code, created_at)
values
  ('Jia Hui Lim', 'jiahui.lim@example.sg', 'jiahui.lim@example.sg', 'Blk 204 Tampines St 21 #08-142', '520204', now() - interval '14 days'),
  ('Rohan Nair', '+6592345678', '+65 9234 5678', 'Blk 315 Jurong East St 32 #05-221', '600315', now() - interval '12 days'),
  ('Chloe Wong', 'chloe.wong@example.sg', 'chloe.wong@example.sg', '28 Orchard Turn #14-03', '238859', now() - interval '11 days'),
  ('Farhan Yusof', '+6593456789', '+65 9345 6789', 'Blk 891 Woodlands Dr 50 #04-112', '730891', now() - interval '9 days'),
  ('Priya Subramaniam', 'priya.s@example.sg', 'priya.s@example.sg', 'Blk 118 Lorong 1 Toa Payoh #09-304', '310118', now() - interval '8 days'),
  ('Marcus Koh', '+6594567890', '+65 9456 7890', 'Blk 452 Ang Mo Kio Ave 10 #07-1755', '560452', now() - interval '7 days'),
  ('Siti Nurhaliza', 'siti.n@example.sg', 'siti.n@example.sg', 'Blk 512 Clementi West St 1 #03-88', '120512', now() - interval '5 days'),
  ('Daniel Teo', '+6595678901', '+65 9567 8901', 'Blk 105 Bukit Purmei Rd #12-19', '090105', now() - interval '4 days'),
  ('Mei Zhen Ng', 'meizhen.ng@example.sg', 'meizhen.ng@example.sg', 'Blk 123 Punggol Field #10-405', '820123', now() - interval '2 days'),
  ('Arjun Menon', '+6596789012', '+65 9678 9012', 'Blk 54 Bedok South Ave 3 #06-29', '460054', now() - interval '1 day')
on conflict (contact) do nothing;

-- 3. Synthetic saved personalised recipes (covering multi-version evolution)
with seed_recipes(contact, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version) as (
  values
    ('jiahui.lim@example.sg', 'garden-bowl', 'Garden Goodness Bowl', 1.00, 0.25, 1.00, 3),
    ('jiahui.lim@example.sg', 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.00, 0.00, 1.50, 1),
    ('+6592345678', 'curry-rice', 'Homestyle Curry Rice', 1.50, 1.00, 1.00, 2),
    ('+6592345678', 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.50, 0.50, 1.50, 1),
    ('chloe.wong@example.sg', 'garden-bowl', 'Garden Goodness Bowl', 1.00, 0.00, 1.00, 2),
    ('+6593456789', 'curry-rice', 'Homestyle Curry Rice', 2.00, 1.00, 1.50, 2),
    ('priya.s@example.sg', 'curry-rice', 'Homestyle Curry Rice', 1.50, 1.00, 1.00, 3),
    ('priya.s@example.sg', 'garden-bowl', 'Garden Goodness Bowl', 1.50, 0.50, 1.00, 1),
    ('+6594567890', 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.00, 0.25, 1.00, 2),
    ('siti.n@example.sg', 'curry-rice', 'Homestyle Curry Rice', 1.50, 0.50, 1.50, 1),
    ('siti.n@example.sg', 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.50, 0.25, 1.00, 2),
    ('+6595678901', 'garden-bowl', 'Garden Goodness Bowl', 1.50, 0.25, 1.50, 1),
    ('meizhen.ng@example.sg', 'sweet-sour-noodles', 'Sweet & Sour Noodles', 1.00, 0.00, 1.00, 2),
    ('+6596789012', 'curry-rice', 'Homestyle Curry Rice', 1.50, 1.00, 1.50, 1)
)
insert into public.recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version)
select c.id, sr.dish_id, sr.dish_name, sr.sweetness_tsp, sr.spice_tsp, sr.oil_tsp, sr.version
from seed_recipes sr
join public.customers c on c.contact = sr.contact
on conflict (customer_id, dish_id) do nothing;

-- 4. Synthetic tweak history showing how recipes evolved across orders/personaliser saves
with seed_tweaks(contact, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, days_ago) as (
  values
    ('jiahui.lim@example.sg', 'garden-bowl', 1, 1.50, 0.00, 1.50, 'Started with standard light dressing', 'order', 14),
    ('jiahui.lim@example.sg', 'garden-bowl', 2, 1.00, 0.25, 1.50, 'Reduced sugar to 1 tsp and added mild chilli', 'personaliser', 10),
    ('jiahui.lim@example.sg', 'garden-bowl', 3, 1.00, 0.25, 1.00, 'Switched to light oil 1 tsp—just right', 'order', 6),
    ('jiahui.lim@example.sg', 'sweet-sour-noodles', 1, 1.00, 0.00, 1.50, 'Less sweet, no chilli for lunch', 'order', 4),
    ('+6592345678', 'curry-rice', 1, 1.50, 0.50, 1.50, 'Initial medium spice curry rice', 'order', 12),
    ('+6592345678', 'curry-rice', 2, 1.50, 1.00, 1.00, 'Stepped up to spicy 1 tsp, less oil', 'order', 5),
    ('+6592345678', 'sweet-sour-noodles', 1, 1.50, 0.50, 1.50, 'Medium kick with tangy sauce', 'personaliser', 3),
    ('chloe.wong@example.sg', 'garden-bowl', 1, 1.50, 0.00, 1.00, 'First harvest bowl trial', 'order', 11),
    ('chloe.wong@example.sg', 'garden-bowl', 2, 1.00, 0.00, 1.00, 'Less sweet dressing for weekday lunch', 'personaliser', 7),
    ('+6593456789', 'curry-rice', 1, 2.00, 0.50, 1.50, 'Comfort baseline', 'order', 9),
    ('+6593456789', 'curry-rice', 2, 2.00, 1.00, 1.50, 'Extra chilli kick for dinner', 'order', 3),
    ('priya.s@example.sg', 'curry-rice', 1, 1.50, 0.50, 1.50, 'Balanced initial version', 'order', 8),
    ('priya.s@example.sg', 'curry-rice', 2, 1.50, 1.00, 1.50, 'More chilli, keep gravy fragrant', 'personaliser', 5),
    ('priya.s@example.sg', 'curry-rice', 3, 1.50, 1.00, 1.00, 'Lighter oil 1 tsp on third reorder', 'order', 2),
    ('priya.s@example.sg', 'garden-bowl', 1, 1.50, 0.50, 1.00, 'Light oil with medium spice', 'order', 2),
    ('+6594567890', 'sweet-sour-noodles', 1, 1.50, 0.25, 1.50, 'Baseline favourite', 'order', 7),
    ('+6594567890', 'sweet-sour-noodles', 2, 1.00, 0.25, 1.00, 'Less sweet and lighter wok oil', 'order', 2),
    ('siti.n@example.sg', 'curry-rice', 1, 1.50, 0.50, 1.50, 'Initial family dinner setting', 'order', 5),
    ('siti.n@example.sg', 'sweet-sour-noodles', 1, 2.00, 0.25, 1.50, 'First order', 'order', 4),
    ('siti.n@example.sg', 'sweet-sour-noodles', 2, 1.50, 0.25, 1.00, 'Tone down sweetness slightly', 'personaliser', 1),
    ('meizhen.ng@example.sg', 'sweet-sour-noodles', 1, 1.50, 0.00, 1.50, 'Initial mild no-chilli bowl', 'order', 2),
    ('meizhen.ng@example.sg', 'sweet-sour-noodles', 2, 1.00, 0.00, 1.00, 'Cut sugar and oil for lighter dinner', 'order', 1)
)
insert into public.recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
select r.id, r.customer_id, r.dish_id, st.version, st.sweetness_tsp, st.spice_tsp, st.oil_tsp, st.tweak_note, st.source, now() - (st.days_ago || ' days')::interval
from seed_tweaks st
join public.customers c on c.contact = st.contact
join public.recipes r on r.customer_id = c.id and r.dish_id = st.dish_id
where not exists (
  select 1 from public.recipe_tweaks t
  where t.recipe_id = r.id and t.version = st.version
);

-- 5. Synthetic orders (strictly matching unit_price_cents * quantity = total_cents)
with seed_orders(order_code, contact, dish_id, quantity, sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes, payment_provider, payment_status, days_ago) as (
  values
    ('WS-2001', 'jiahui.lim@example.sg', 'garden-bowl', 1, 1.50, 0.00, 1.50, 1, 'Tomorrow · Lunch (12:00 – 13:00)', 'Call on arrival', 'stripe_demo', 'paid', 14),
    ('WS-2002', 'jiahui.lim@example.sg', 'garden-bowl', 2, 1.00, 0.25, 1.00, 3, 'Tomorrow · Lunch (12:00 – 13:00)', 'Leave by gate', 'stripe_demo', 'paid', 6),
    ('WS-2003', 'jiahui.lim@example.sg', 'sweet-sour-noodles', 1, 1.00, 0.00, 1.50, 1, 'Today · Dinner (18:30 – 19:30)', '', 'stripe_demo', 'paid', 4),
    ('WS-2004', '+6592345678', 'curry-rice', 2, 1.50, 0.50, 1.50, 1, 'Today · Dinner (18:30 – 19:30)', 'No cutlery needed', 'stripe_demo', 'paid', 12),
    ('WS-2005', '+6592345678', 'curry-rice', 1, 1.50, 1.00, 1.00, 2, 'Today · Dinner (18:30 – 19:30)', 'No cutlery needed', 'stripe', 'paid', 5),
    ('WS-2006', 'chloe.wong@example.sg', 'garden-bowl', 1, 1.50, 0.00, 1.00, 1, 'Tomorrow · Lunch (12:00 – 13:00)', 'Lobby concierge dropoff', 'stripe_demo', 'paid', 11),
    ('WS-2007', '+6593456789', 'curry-rice', 3, 2.00, 1.00, 1.50, 2, 'Tomorrow · Dinner (18:30 – 19:30)', 'Family dinner order', 'stripe_demo', 'paid', 3),
    ('WS-2008', 'priya.s@example.sg', 'curry-rice', 1, 1.50, 0.50, 1.50, 1, 'Today · Dinner (18:30 – 19:30)', '', 'stripe_demo', 'paid', 8),
    ('WS-2009', 'priya.s@example.sg', 'curry-rice', 2, 1.50, 1.00, 1.00, 3, 'Today · Dinner (18:30 – 19:30)', 'Extra napkins', 'stripe', 'paid', 2),
    ('WS-2010', 'priya.s@example.sg', 'garden-bowl', 1, 1.50, 0.50, 1.00, 1, 'Tomorrow · Lunch (12:00 – 13:00)', '', 'stripe_demo', 'pending', 0),
    ('WS-2011', '+6594567890', 'sweet-sour-noodles', 2, 1.00, 0.25, 1.00, 2, 'Today · Dinner (18:30 – 19:30)', 'Hang on door handle', 'stripe_demo', 'paid', 2),
    ('WS-2012', 'siti.n@example.sg', 'curry-rice', 2, 1.50, 0.50, 1.50, 1, 'Tomorrow · Dinner (18:30 – 19:30)', '', 'stripe_demo', 'paid', 5),
    ('WS-2013', '+6595678901', 'garden-bowl', 1, 1.50, 0.25, 1.50, 1, 'Tomorrow · Lunch (12:00 – 13:00)', 'Cancelled before prep', 'stripe_demo', 'cancelled', 3),
    ('WS-2014', 'meizhen.ng@example.sg', 'sweet-sour-noodles', 1, 1.00, 0.00, 1.00, 2, 'Today · Dinner (18:30 – 19:30)', 'Ring bell twice', 'stripe_demo', 'paid', 1),
    ('WS-2015', '+6596789012', 'curry-rice', 2, 1.50, 1.00, 1.50, 1, 'Tomorrow · Dinner (18:30 – 19:30)', '', 'stripe_demo', 'pending', 0)
)
insert into public.orders (
  order_code, customer_id, dish_id, dish_name, quantity, unit_price_cents, total_cents,
  sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes,
  payment_provider, payment_status, created_at
)
select
  so.order_code,
  c.id,
  mp.dish_id,
  mp.dish_name,
  so.quantity,
  mp.price_cents,
  mp.price_cents * so.quantity,
  so.sweetness_tsp,
  so.spice_tsp,
  so.oil_tsp,
  so.recipe_version,
  so.delivery_slot,
  so.delivery_notes,
  so.payment_provider,
  so.payment_status,
  now() - (so.days_ago || ' days')::interval
from seed_orders so
join public.customers c on c.contact = so.contact
join public.menu_prices mp on mp.dish_id = so.dish_id
on conflict (order_code) do nothing;

-- 6. Synthetic launch list waitlist entries
insert into public.launch_list (name, contact, display_contact, neighbourhood, preferred_dish_id, created_at)
values
  ('Jia Hui Lim', 'jiahui.lim@example.sg', 'jiahui.lim@example.sg', 'Tampines', 'garden-bowl', now() - interval '10 days'),
  ('Chloe Wong', 'chloe.wong@example.sg', 'chloe.wong@example.sg', 'Orchard', 'garden-bowl', now() - interval '7 days'),
  ('Priya Subramaniam', 'priya.s@example.sg', 'priya.s@example.sg', 'Toa Payoh', 'curry-rice', now() - interval '4 days'),
  ('Mei Zhen Ng', 'meizhen.ng@example.sg', 'meizhen.ng@example.sg', 'Punggol', 'sweet-sour-noodles', now() - interval '1 day')
on conflict (contact) do nothing;

-- 7. Verification summary
select
  (select count(*) from public.menu_prices) as menu_prices_count,
  (select count(*) from public.customers) as customers_count,
  (select count(*) from public.recipes) as recipes_count,
  (select count(*) from public.recipe_tweaks) as tweaks_count,
  (select count(*) from public.orders) as orders_count,
  (select count(*) from public.launch_list) as launch_list_count;
