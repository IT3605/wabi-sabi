import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface MenuPriceRow {
  dish_id: string;
  dish_name: string;
  subtitle: string;
  description: string;
  price_cents: number;
  currency: string;
  is_active: number | boolean;
  sort_order: number;
  updated_at: string;
}

export interface CustomerRow {
  id: number;
  name: string;
  contact: string;
  display_contact: string;
  address: string;
  postal_code: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeRow {
  id: number;
  customer_id: number;
  dish_id: string;
  dish_name: string;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  version: number;
  updated_at: string;
}

export interface RecipeTweakRow {
  id: number;
  recipe_id: number;
  customer_id: number;
  dish_id: string;
  version: number;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  tweak_note: string;
  source: string;
  created_at: string;
}

export interface OrderRow {
  id: number;
  order_code: string;
  customer_id: number;
  dish_id: string;
  dish_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  recipe_version: number;
  delivery_slot: string;
  delivery_notes: string;
  payment_provider: string;
  payment_status: string;
  stripe_session_id: string | null;
  created_at: string;
}

export interface DatabaseHealthReport {
  engine: 'supabase' | 'sqlite';
  connected: boolean;
  counts: {
    menu_prices: number;
    customers: number;
    recipes: number;
    recipe_tweaks: number;
    orders: number;
  };
}

// ---------------------------------------------------------------------------
// Supabase Server Client (used automatically when SUPABASE_URL + secret key set)
// ---------------------------------------------------------------------------

let cachedSupabase: SupabaseClient | null | undefined;

function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedSupabase !== undefined) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim();

  if (
    !url ||
    !key ||
    url.includes('your-project-ref') ||
    key === 'MY_SUPABASE_SECRET_KEY'
  ) {
    cachedSupabase = null;
    return null;
  }

  cachedSupabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedSupabase;
}

export function getActiveDatabaseEngine(): 'supabase' | 'sqlite' {
  return getSupabaseAdmin() ? 'supabase' : 'sqlite';
}

// ---------------------------------------------------------------------------
// Local SQLite Database (built-in fallback when Supabase env vars are omitted)
// ---------------------------------------------------------------------------

let sqliteDb: DatabaseSync | null = null;

const DEFAULT_MENU_PRICES: Array<
  Omit<MenuPriceRow, 'is_active' | 'updated_at'>
> = [
  {
    dish_id: 'curry-rice',
    dish_name: 'Homestyle Curry Rice',
    subtitle: 'Customisable · Comfort classic',
    description:
      'Comforting, aromatic, and tailored to your preferred spice level.',
    price_cents: 1050,
    currency: 'SGD',
    sort_order: 1,
  },
  {
    dish_id: 'garden-bowl',
    dish_name: 'Garden Goodness Bowl',
    subtitle: 'Customisable · Seasonal harvest',
    description:
      'Seasonal vegetables, grains, and a dressing balanced to your taste.',
    price_cents: 950,
    currency: 'SGD',
    sort_order: 2,
  },
  {
    dish_id: 'sweet-sour-noodles',
    dish_name: 'Sweet & Sour Noodles',
    subtitle: 'Customisable · Signature favourite',
    description:
      'A familiar favourite with your ideal balance of sweetness and tang.',
    price_cents: 890,
    currency: 'SGD',
    sort_order: 3,
  },
];

function getSqlite(): DatabaseSync {
  if (sqliteDb) {
    return sqliteDb;
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  }

  const dbPath = path.join(dataDir, 'wabisabi.db');
  const db = new DatabaseSync(dbPath);
  try {
    fs.chmodSync(dataDir, 0o700);
    if (fs.existsSync(dbPath)) {
      fs.chmodSync(dbPath, 0o600);
    }
  } catch {
    // Ignore chmod errors on read-only or unsupported filesystems
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS menu_prices (
      dish_id TEXT PRIMARY KEY,
      dish_name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'SGD',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL UNIQUE,
      display_contact TEXT NOT NULL,
      address TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      dish_id TEXT NOT NULL,
      dish_name TEXT NOT NULL,
      sweetness_tsp REAL NOT NULL,
      spice_tsp REAL NOT NULL,
      oil_tsp REAL NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      UNIQUE(customer_id, dish_id)
    );

    CREATE TABLE IF NOT EXISTS recipe_tweaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      dish_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      sweetness_tsp REAL NOT NULL,
      spice_tsp REAL NOT NULL,
      oil_tsp REAL NOT NULL,
      tweak_note TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'order',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      dish_id TEXT NOT NULL,
      dish_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      sweetness_tsp REAL NOT NULL,
      spice_tsp REAL NOT NULL,
      oil_tsp REAL NOT NULL,
      recipe_version INTEGER NOT NULL,
      delivery_slot TEXT NOT NULL,
      delivery_notes TEXT NOT NULL DEFAULT '',
      payment_provider TEXT NOT NULL DEFAULT 'stripe_demo',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_contact ON customers(contact);
    CREATE INDEX IF NOT EXISTS idx_recipes_customer ON recipes(customer_id, dish_id);
    CREATE INDEX IF NOT EXISTS idx_tweaks_customer ON recipe_tweaks(customer_id, dish_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, id DESC);
  `);

  const now = new Date().toISOString();
  const menuStmt = db.prepare(`
    INSERT OR IGNORE INTO menu_prices (
      dish_id, dish_name, subtitle, description, price_cents, currency, is_active, sort_order, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const item of DEFAULT_MENU_PRICES) {
    menuStmt.run(
      item.dish_id,
      item.dish_name,
      item.subtitle,
      item.description,
      item.price_cents,
      item.currency,
      item.sort_order,
      now
    );
  }

  // Seed initial sample customers, recipes, tweaks, and orders if customers table is empty
  const customerCount = (
    db.prepare('SELECT COUNT(*) AS cnt FROM customers').get() as { cnt: number }
  ).cnt;

  if (customerCount === 0) {
    const c1 = db
      .prepare(
        `INSERT INTO customers (name, contact, display_contact, address, postal_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'Wei Ming Tan',
        'weiming@example.sg',
        'weiming@example.sg',
        'Blk 412 Tiong Bahru Rd #06-118',
        '160412',
        now,
        now
      );
    const c1Id = Number(c1.lastInsertRowid);

    const c2 = db
      .prepare(
        `INSERT INTO customers (name, contact, display_contact, address, postal_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'Aisyah Rahman',
        '+6591234567',
        '+65 9123 4567',
        'Blk 18 Marine Parade Rd #11-04',
        '440018',
        now,
        now
      );
    const c2Id = Number(c2.lastInsertRowid);

    const r1 = db
      .prepare(
        `INSERT INTO recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version, updated_at)
         VALUES (?, 'curry-rice', 'Homestyle Curry Rice', 1.5, 1.0, 1.0, 2, ?)`
      )
      .run(c1Id, now);
    const r1Id = Number(r1.lastInsertRowid);

    const r2 = db
      .prepare(
        `INSERT INTO recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version, updated_at)
         VALUES (?, 'garden-bowl', 'Garden Goodness Bowl', 1.0, 0.0, 1.0, 1, ?)`
      )
      .run(c2Id, now);
    const r2Id = Number(r2.lastInsertRowid);

    db.prepare(
      `INSERT INTO recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
       VALUES (?, ?, 'curry-rice', 1, 1.5, 0.5, 1.5, 'Initial baseline order', 'seed', ?)`
    ).run(r1Id, c1Id, now);
    db.prepare(
      `INSERT INTO recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
       VALUES (?, ?, 'curry-rice', 2, 1.5, 1.0, 1.0, 'More chilli and lighter oil after first tasting', 'seed', ?)`
    ).run(r1Id, c1Id, now);
    db.prepare(
      `INSERT INTO recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
       VALUES (?, ?, 'garden-bowl', 1, 1.0, 0.0, 1.0, 'Lighter dressing, no chilli', 'seed', ?)`
    ).run(r2Id, c2Id, now);

    db.prepare(
      `INSERT OR IGNORE INTO orders (
        order_code, customer_id, dish_id, dish_name, quantity, unit_price_cents, total_cents,
        sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes,
        payment_provider, payment_status, created_at
      ) VALUES
        ('WS-1042', ?, 'curry-rice', 'Homestyle Curry Rice', 2, 1050, 2100, 1.5, 1.0, 1.0, 2, 'Today · Dinner (18:30 – 19:30)', 'Leave at shoe rack', 'stripe_demo', 'paid', ?),
        ('WS-1043', ?, 'garden-bowl', 'Garden Goodness Bowl', 1, 950, 950, 1.0, 0.0, 1.0, 1, 'Tomorrow · Lunch (12:00 – 13:00)', 'Ring doorbell once', 'stripe_demo', 'paid', ?)`
    ).run(c1Id, now, c2Id, now);
  }

  sqliteDb = db;
  return db;
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

export function normalizeContact(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return trimmed.replace(/[\s\-()]/g, '');
}

function generateOrderCode(): string {
  // Cryptographically strong 6-character alphanumeric order code (unpredictable)
  return `WS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizeRecipeRow(row: RecipeRow): RecipeRow {
  return {
    ...row,
    sweetness_tsp: Number(row.sweetness_tsp),
    spice_tsp: Number(row.spice_tsp),
    oil_tsp: Number(row.oil_tsp),
  };
}

function normalizeTweakRow(row: RecipeTweakRow): RecipeTweakRow {
  return {
    ...row,
    sweetness_tsp: Number(row.sweetness_tsp),
    spice_tsp: Number(row.spice_tsp),
    oil_tsp: Number(row.oil_tsp),
  };
}

function normalizeOrderRow(row: OrderRow): OrderRow {
  return {
    ...row,
    sweetness_tsp: Number(row.sweetness_tsp),
    spice_tsp: Number(row.spice_tsp),
    oil_tsp: Number(row.oil_tsp),
  };
}

// ---------------------------------------------------------------------------
// Public Repository Operations (Supabase when configured, SQLite fallback)
// ---------------------------------------------------------------------------

export async function getActiveMenuPrices(): Promise<MenuPriceRow[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('menu_prices')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('dish_name', { ascending: true });
    if (error) {
      throw new Error(`Supabase menu_prices error: ${error.message}`);
    }
    return (data ?? []) as MenuPriceRow[];
  }

  const db = getSqlite();
  return db
    .prepare(
      'SELECT * FROM menu_prices WHERE is_active = 1 ORDER BY sort_order ASC, dish_name ASC'
    )
    .all() as unknown as MenuPriceRow[];
}

export async function getMenuPriceByDishId(
  dishId: string
): Promise<MenuPriceRow | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('menu_prices')
      .select('*')
      .eq('dish_id', dishId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase menu_prices lookup failed: ${error.message}`);
    }
    return (data as MenuPriceRow | null) ?? null;
  }

  const db = getSqlite();
  const row = db
    .prepare('SELECT * FROM menu_prices WHERE dish_id = ? AND is_active = 1')
    .get(dishId) as MenuPriceRow | undefined;
  return row ?? null;
}

export async function upsertCustomer(input: {
  name: string;
  contact: string;
  address: string;
  postalCode: string;
}): Promise<CustomerRow> {
  const normalized = normalizeContact(input.contact);
  const now = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('customers')
      .upsert(
        {
          name: input.name.trim(),
          contact: normalized,
          display_contact: input.contact.trim(),
          address: input.address.trim(),
          postal_code: input.postalCode.trim(),
          updated_at: now,
        },
        { onConflict: 'contact' }
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        `Supabase upsertCustomer error: ${error?.message ?? 'no row returned'}`
      );
    }
    return data as CustomerRow;
  }

  const db = getSqlite();
  const existing = db
    .prepare('SELECT * FROM customers WHERE contact = ?')
    .get(normalized) as CustomerRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE customers
       SET name = ?, display_contact = ?, address = ?, postal_code = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.name.trim(),
      input.contact.trim(),
      input.address.trim(),
      input.postalCode.trim(),
      now,
      existing.id
    );
    return db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(existing.id) as unknown as CustomerRow;
  }

  const info = db
    .prepare(
      `INSERT INTO customers (name, contact, display_contact, address, postal_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name.trim(),
      normalized,
      input.contact.trim(),
      input.address.trim(),
      input.postalCode.trim(),
      now,
      now
    );

  return db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as unknown as CustomerRow;
}

export async function saveRecipeWithTweak(input: {
  customerId: number;
  dishId: string;
  dishName: string;
  sweetnessTsp: number;
  spiceTsp: number;
  oilTsp: number;
  tweakNote?: string;
  source: 'personaliser' | 'order';
}): Promise<{ recipe: RecipeRow; tweak: RecipeTweakRow | null }> {
  const now = new Date().toISOString();
  const note = (input.tweakNote ?? '').trim();

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: existingData, error: findErr } = await supabase
      .from('recipes')
      .select('*')
      .eq('customer_id', input.customerId)
      .eq('dish_id', input.dishId)
      .maybeSingle();

    if (findErr) {
      throw new Error(`Supabase recipe lookup error: ${findErr.message}`);
    }

    const existing = existingData
      ? normalizeRecipeRow(existingData as RecipeRow)
      : null;

    if (!existing) {
      const { data: insertedRecipe, error: insErr } = await supabase
        .from('recipes')
        .insert({
          customer_id: input.customerId,
          dish_id: input.dishId,
          dish_name: input.dishName,
          sweetness_tsp: input.sweetnessTsp,
          spice_tsp: input.spiceTsp,
          oil_tsp: input.oilTsp,
          version: 1,
          updated_at: now,
        })
        .select('*')
        .single();

      if (insErr || !insertedRecipe) {
        throw new Error(
          `Supabase recipe insert error: ${insErr?.message ?? 'missing'}`
        );
      }

      const { data: insertedTweak, error: tweakErr } = await supabase
        .from('recipe_tweaks')
        .insert({
          recipe_id: insertedRecipe.id,
          customer_id: input.customerId,
          dish_id: input.dishId,
          version: 1,
          sweetness_tsp: input.sweetnessTsp,
          spice_tsp: input.spiceTsp,
          oil_tsp: input.oilTsp,
          tweak_note: note || 'Initial tailored recipe',
          source: input.source,
          created_at: now,
        })
        .select('*')
        .single();

      if (tweakErr) {
        throw new Error(`Supabase tweak insert error: ${tweakErr.message}`);
      }

      return {
        recipe: normalizeRecipeRow(insertedRecipe as RecipeRow),
        tweak: insertedTweak
          ? normalizeTweakRow(insertedTweak as RecipeTweakRow)
          : null,
      };
    }

    const hasChanged =
      existing.sweetness_tsp !== input.sweetnessTsp ||
      existing.spice_tsp !== input.spiceTsp ||
      existing.oil_tsp !== input.oilTsp ||
      Boolean(note);

    if (!hasChanged) {
      return { recipe: existing, tweak: null };
    }

    const nextVersion = existing.version + 1;
    const { data: updatedRecipe, error: updErr } = await supabase
      .from('recipes')
      .update({
        dish_name: input.dishName,
        sweetness_tsp: input.sweetnessTsp,
        spice_tsp: input.spiceTsp,
        oil_tsp: input.oilTsp,
        version: nextVersion,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updErr || !updatedRecipe) {
      throw new Error(
        `Supabase recipe update error: ${updErr?.message ?? 'missing'}`
      );
    }

    const { data: insertedTweak, error: tweakErr } = await supabase
      .from('recipe_tweaks')
      .insert({
        recipe_id: existing.id,
        customer_id: input.customerId,
        dish_id: input.dishId,
        version: nextVersion,
        sweetness_tsp: input.sweetnessTsp,
        spice_tsp: input.spiceTsp,
        oil_tsp: input.oilTsp,
        tweak_note: note || `Refined from Version ${existing.version}`,
        source: input.source,
        created_at: now,
      })
      .select('*')
      .single();

    if (tweakErr) {
      throw new Error(`Supabase tweak insert error: ${tweakErr.message}`);
    }

    return {
      recipe: normalizeRecipeRow(updatedRecipe as RecipeRow),
      tweak: insertedTweak
        ? normalizeTweakRow(insertedTweak as RecipeTweakRow)
        : null,
    };
  }

  const db = getSqlite();
  const existing = db
    .prepare('SELECT * FROM recipes WHERE customer_id = ? AND dish_id = ?')
    .get(input.customerId, input.dishId) as RecipeRow | undefined;

  if (!existing) {
    const insertInfo = db
      .prepare(
        `INSERT INTO recipes (customer_id, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(
        input.customerId,
        input.dishId,
        input.dishName,
        input.sweetnessTsp,
        input.spiceTsp,
        input.oilTsp,
        now
      );

    const recipeId = Number(insertInfo.lastInsertRowid);
    const tweakInfo = db
      .prepare(
        `INSERT INTO recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        recipeId,
        input.customerId,
        input.dishId,
        input.sweetnessTsp,
        input.spiceTsp,
        input.oilTsp,
        note || 'Initial tailored recipe',
        input.source,
        now
      );

    return {
      recipe: db
        .prepare('SELECT * FROM recipes WHERE id = ?')
        .get(recipeId) as unknown as RecipeRow,
      tweak: db
        .prepare('SELECT * FROM recipe_tweaks WHERE id = ?')
        .get(Number(tweakInfo.lastInsertRowid)) as unknown as RecipeTweakRow,
    };
  }

  const hasChanged =
    Number(existing.sweetness_tsp) !== input.sweetnessTsp ||
    Number(existing.spice_tsp) !== input.spiceTsp ||
    Number(existing.oil_tsp) !== input.oilTsp ||
    Boolean(note);

  if (!hasChanged) {
    return { recipe: existing, tweak: null };
  }

  const nextVersion = existing.version + 1;
  db.prepare(
    `UPDATE recipes
     SET dish_name = ?, sweetness_tsp = ?, spice_tsp = ?, oil_tsp = ?, version = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.dishName,
    input.sweetnessTsp,
    input.spiceTsp,
    input.oilTsp,
    nextVersion,
    now,
    existing.id
  );

  const tweakInfo = db
    .prepare(
      `INSERT INTO recipe_tweaks (recipe_id, customer_id, dish_id, version, sweetness_tsp, spice_tsp, oil_tsp, tweak_note, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      existing.id,
      input.customerId,
      input.dishId,
      nextVersion,
      input.sweetnessTsp,
      input.spiceTsp,
      input.oilTsp,
      note || `Refined from Version ${existing.version}`,
      input.source,
      now
    );

  return {
    recipe: db
      .prepare('SELECT * FROM recipes WHERE id = ?')
      .get(existing.id) as unknown as RecipeRow,
    tweak: db
      .prepare('SELECT * FROM recipe_tweaks WHERE id = ?')
      .get(Number(tweakInfo.lastInsertRowid)) as unknown as RecipeTweakRow,
  };
}

export async function createOrderRecord(input: {
  customerId: number;
  dishId: string;
  dishName: string;
  quantity: number;
  unitPriceCents: number;
  sweetnessTsp: number;
  spiceTsp: number;
  oilTsp: number;
  recipeVersion: number;
  deliverySlot: string;
  deliveryNotes: string;
  paymentProvider: 'stripe' | 'stripe_demo';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
}): Promise<OrderRow> {
  const now = new Date().toISOString();
  const totalCents = input.unitPriceCents * input.quantity;
  const orderCode = generateOrderCode();

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: input.customerId,
        dish_id: input.dishId,
        dish_name: input.dishName,
        quantity: input.quantity,
        unit_price_cents: input.unitPriceCents,
        total_cents: totalCents,
        sweetness_tsp: input.sweetnessTsp,
        spice_tsp: input.spiceTsp,
        oil_tsp: input.oilTsp,
        recipe_version: input.recipeVersion,
        delivery_slot: input.deliverySlot,
        delivery_notes: input.deliveryNotes.trim(),
        payment_provider: input.paymentProvider,
        payment_status: input.paymentStatus,
        created_at: now,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        `Supabase order insert error: ${error?.message ?? 'missing'}`
      );
    }
    return normalizeOrderRow(data as OrderRow);
  }

  const db = getSqlite();
  const info = db
    .prepare(
      `INSERT INTO orders (
        order_code, customer_id, dish_id, dish_name, quantity, unit_price_cents, total_cents,
        sweetness_tsp, spice_tsp, oil_tsp, recipe_version, delivery_slot, delivery_notes,
        payment_provider, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      orderCode,
      input.customerId,
      input.dishId,
      input.dishName,
      input.quantity,
      input.unitPriceCents,
      totalCents,
      input.sweetnessTsp,
      input.spiceTsp,
      input.oilTsp,
      input.recipeVersion,
      input.deliverySlot,
      input.deliveryNotes.trim(),
      input.paymentProvider,
      input.paymentStatus,
      now
    );

  return db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as unknown as OrderRow;
}

export async function attachStripeSessionToOrder(
  orderCode: string,
  sessionId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase
      .from('orders')
      .update({ stripe_session_id: sessionId, payment_provider: 'stripe' })
      .eq('order_code', orderCode);
    if (error) {
      throw new Error(`Supabase attachStripeSession error: ${error.message}`);
    }
    return;
  }

  const db = getSqlite();
  db.prepare(
    `UPDATE orders SET stripe_session_id = ?, payment_provider = 'stripe' WHERE order_code = ?`
  ).run(sessionId, orderCode);
}

export async function markOrderPaid(
  orderCode: string,
  sessionId?: string
): Promise<OrderRow | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: existing, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(`Supabase order fetch error: ${fetchErr.message}`);
    }
    if (!existing) {
      return null;
    }

    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        stripe_session_id: existing.stripe_session_id ?? sessionId ?? null,
      })
      .eq('order_code', orderCode)
      .select('*')
      .single();

    if (updErr) {
      throw new Error(`Supabase markOrderPaid error: ${updErr.message}`);
    }
    return updated ? normalizeOrderRow(updated as OrderRow) : null;
  }

  const db = getSqlite();
  if (sessionId) {
    db.prepare(
      `UPDATE orders SET payment_status = 'paid', stripe_session_id = COALESCE(stripe_session_id, ?) WHERE order_code = ?`
    ).run(sessionId, orderCode);
  } else {
    db.prepare(`UPDATE orders SET payment_status = 'paid' WHERE order_code = ?`).run(
      orderCode
    );
  }

  const row = db
    .prepare('SELECT * FROM orders WHERE order_code = ?')
    .get(orderCode) as OrderRow | undefined;
  return row ?? null;
}

export async function getCustomerBundleByContact(contactRaw: string): Promise<{
  customer: CustomerRow | null;
  recipes: RecipeRow[];
  tweaks: RecipeTweakRow[];
  orders: OrderRow[];
}> {
  const normalized = normalizeContact(contactRaw);
  if (!normalized) {
    return { customer: null, recipes: [], tweaks: [], orders: [] };
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('contact', normalized)
      .maybeSingle();

    if (custErr) {
      throw new Error(`Supabase customer recall error: ${custErr.message}`);
    }
    if (!customer) {
      return { customer: null, recipes: [], tweaks: [], orders: [] };
    }

    const [recipesRes, tweaksRes, ordersRes] = await Promise.all([
      supabase
        .from('recipes')
        .select('*')
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('recipe_tweaks')
        .select('*')
        .eq('customer_id', customer.id)
        .order('id', { ascending: false })
        .limit(25),
      supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('id', { ascending: false })
        .limit(20),
    ]);

    if (recipesRes.error) {
      throw new Error(`Supabase recipes error: ${recipesRes.error.message}`);
    }
    if (tweaksRes.error) {
      throw new Error(`Supabase tweaks error: ${tweaksRes.error.message}`);
    }
    if (ordersRes.error) {
      throw new Error(`Supabase orders error: ${ordersRes.error.message}`);
    }

    return {
      customer: customer as CustomerRow,
      recipes: (recipesRes.data ?? []).map((r) =>
        normalizeRecipeRow(r as RecipeRow)
      ),
      tweaks: (tweaksRes.data ?? []).map((t) =>
        normalizeTweakRow(t as RecipeTweakRow)
      ),
      orders: (ordersRes.data ?? []).map((o) =>
        normalizeOrderRow(o as OrderRow)
      ),
    };
  }

  const db = getSqlite();
  const customer = db
    .prepare('SELECT * FROM customers WHERE contact = ?')
    .get(normalized) as CustomerRow | undefined;

  if (!customer) {
    return { customer: null, recipes: [], tweaks: [], orders: [] };
  }

  const recipes = db
    .prepare('SELECT * FROM recipes WHERE customer_id = ? ORDER BY updated_at DESC')
    .all(customer.id) as unknown as RecipeRow[];

  const tweaks = db
    .prepare(
      'SELECT * FROM recipe_tweaks WHERE customer_id = ? ORDER BY id DESC LIMIT 25'
    )
    .all(customer.id) as unknown as RecipeTweakRow[];

  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 20')
    .all(customer.id) as unknown as OrderRow[];

  return { customer, recipes, tweaks, orders };
}

export async function getOrderByCode(orderCode: string): Promise<
  | (OrderRow & {
      customer_name: string;
      customer_contact: string;
      delivery_address: string;
      postal_code: string;
    })
  | null
> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (ordErr) {
      throw new Error(`Supabase getOrderByCode error: ${ordErr.message}`);
    }
    if (!order) {
      return null;
    }

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('name, display_contact, address, postal_code')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (custErr) {
      throw new Error(`Supabase order customer lookup error: ${custErr.message}`);
    }

    return {
      ...normalizeOrderRow(order as OrderRow),
      customer_name: customer?.name ?? '',
      customer_contact: customer?.display_contact ?? '',
      delivery_address: customer?.address ?? '',
      postal_code: customer?.postal_code ?? '',
    };
  }

  const db = getSqlite();
  const row = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.display_contact AS customer_contact, c.address AS delivery_address, c.postal_code AS postal_code
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.order_code = ?`
    )
    .get(orderCode) as
    | (OrderRow & {
        customer_name: string;
        customer_contact: string;
        delivery_address: string;
        postal_code: string;
      })
    | undefined;

  return row ?? null;
}

export async function testDatabaseConnection(): Promise<DatabaseHealthReport> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const [menuRes, custRes, recRes, tweakRes, ordRes] = await Promise.all([
      supabase
        .from('menu_prices')
        .select('dish_id', { count: 'exact', head: true }),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true }),
      supabase.from('recipes').select('id', { count: 'exact', head: true }),
      supabase
        .from('recipe_tweaks')
        .select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
    ]);

    const firstError =
      menuRes.error ||
      custRes.error ||
      recRes.error ||
      tweakRes.error ||
      ordRes.error;
    if (firstError) {
      throw new Error(`Supabase health check failed: ${firstError.message}`);
    }

    return {
      engine: 'supabase',
      connected: true,
      counts: {
        menu_prices: menuRes.count ?? 0,
        customers: custRes.count ?? 0,
        recipes: recRes.count ?? 0,
        recipe_tweaks: tweakRes.count ?? 0,
        orders: ordRes.count ?? 0,
      },
    };
  }

  const db = getSqlite();
  const countOf = (table: string) =>
    (
      db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get() as {
        cnt: number;
      }
    ).cnt;

  return {
    engine: 'sqlite',
    connected: true,
    counts: {
      menu_prices: countOf('menu_prices'),
      customers: countOf('customers'),
      recipes: countOf('recipes'),
      recipe_tweaks: countOf('recipe_tweaks'),
      orders: countOf('orders'),
    },
  };
}
