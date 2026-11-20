import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  CUSTOMER_RECIPES_STORAGE_KEY,
  MEAL_PRICE_CENTS,
  ORDERS_STORAGE_KEY,
  type DishId,
  type RecipeState,
} from '../data/meals';
import { getSupabaseClient } from './supabase';

export interface CustomerProfile {
  name: string;
  contact: string;
  address: string;
  postalCode: string;
}

export interface SubmitOrderInput {
  customer: CustomerProfile;
  recipe: RecipeState;
  quantity: number;
  deliverySlot: string;
  deliveryNotes: string;
}

export interface OrderRecord {
  id: string;
  customer: CustomerProfile;
  recipe: RecipeState;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  deliverySlot: string;
  deliveryNotes: string;
  createdAt: string;
}

interface StoredCustomerRecipeRow {
  customer_contact: string;
  customer_name: string;
  delivery_address: string;
  postal_code: string;
  dish_id: DishId;
  dish_name: string;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  version: number;
  updated_at: string;
}

export function normalizeContact(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return trimmed.replace(/[\s\-()]/g, '');
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

export function getSavedCustomerProfile(): CustomerProfile | null {
  return readLocalJson<CustomerProfile | null>(
    CUSTOMER_PROFILE_STORAGE_KEY,
    null
  );
}

export async function recallCustomerData(contactRaw: string): Promise<{
  profile: CustomerProfile | null;
  recipesByDish: Partial<Record<DishId, RecipeState>>;
}> {
  const normalizedContact = normalizeContact(contactRaw);
  if (!normalizedContact) {
    return { profile: null, recipesByDish: {} };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('customer_recipes')
      .select(
        'customer_contact, customer_name, delivery_address, postal_code, dish_id, dish_name, sweetness_tsp, spice_tsp, oil_tsp, version, updated_at'
      )
      .eq('customer_contact', normalizedContact)
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const rows = data as StoredCustomerRecipeRow[];
      const latest = rows[0];
      const profile: CustomerProfile = {
        name: latest.customer_name,
        contact: contactRaw.trim(),
        address: latest.delivery_address,
        postalCode: latest.postal_code,
      };
      const recipesByDish: Partial<Record<DishId, RecipeState>> = {};
      for (const row of rows) {
        recipesByDish[row.dish_id] = {
          dishId: row.dish_id,
          dishName: row.dish_name,
          sugar: String(Number(row.sweetness_tsp)),
          spice: String(Number(row.spice_tsp)),
          oil: String(Number(row.oil_tsp)),
          version: row.version,
        };
      }
      return { profile, recipesByDish };
    }
  }

  const localMap = readLocalJson<
    Record<
      string,
      {
        profile: CustomerProfile;
        recipesByDish: Partial<Record<DishId, RecipeState>>;
      }
    >
  >(CUSTOMER_RECIPES_STORAGE_KEY, {});

  const entry = localMap[normalizedContact];
  if (!entry) {
    return { profile: null, recipesByDish: {} };
  }
  return entry;
}

export async function saveRememberedRecipe(
  customer: CustomerProfile,
  recipe: RecipeState
): Promise<RecipeState> {
  const normalizedContact = normalizeContact(customer.contact);
  const existing = await recallCustomerData(normalizedContact);
  const priorDish = existing.recipesByDish[recipe.dishId];

  const isModifiedFromPrior =
    !priorDish ||
    priorDish.sugar !== recipe.sugar ||
    priorDish.spice !== recipe.spice ||
    priorDish.oil !== recipe.oil;

  const nextVersion = priorDish
    ? isModifiedFromPrior
      ? priorDish.version + 1
      : priorDish.version
    : Math.max(1, recipe.version);

  const updatedRecipe: RecipeState = {
    ...recipe,
    version: nextVersion,
  };

  const supabase = getSupabaseClient();
  if (supabase && normalizedContact) {
    const { error } = await supabase.from('customer_recipes').upsert(
      {
        customer_contact: normalizedContact,
        customer_name: customer.name.trim(),
        delivery_address: customer.address.trim(),
        postal_code: customer.postalCode.trim(),
        dish_id: updatedRecipe.dishId,
        dish_name: updatedRecipe.dishName,
        sweetness_tsp: Number(updatedRecipe.sugar),
        spice_tsp: Number(updatedRecipe.spice),
        oil_tsp: Number(updatedRecipe.oil),
        version: updatedRecipe.version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_contact,dish_id' }
    );

    if (error) {
      throw new Error('Could not save your tailored recipe right now.');
    }
  }

  if (normalizedContact) {
    const localMap = readLocalJson<
      Record<
        string,
        {
          profile: CustomerProfile;
          recipesByDish: Partial<Record<DishId, RecipeState>>;
        }
      >
    >(CUSTOMER_RECIPES_STORAGE_KEY, {});

    const currentEntry = localMap[normalizedContact] ?? {
      profile: customer,
      recipesByDish: {},
    };

    localMap[normalizedContact] = {
      profile: customer,
      recipesByDish: {
        ...currentEntry.recipesByDish,
        [updatedRecipe.dishId]: updatedRecipe,
      },
    };
    writeLocalJson(CUSTOMER_RECIPES_STORAGE_KEY, localMap);
  }

  writeLocalJson(CUSTOMER_PROFILE_STORAGE_KEY, customer);
  return updatedRecipe;
}

export async function submitMealOrder(
  input: SubmitOrderInput
): Promise<OrderRecord> {
  const rememberedRecipe = await saveRememberedRecipe(
    input.customer,
    input.recipe
  );
  const normalizedContact = normalizeContact(input.customer.contact);
  const totalCents = MEAL_PRICE_CENTS * input.quantity;
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseClient();
  let orderId = `WS-${Date.now().toString().slice(-5)}`;

  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: input.customer.name.trim(),
        customer_contact: normalizedContact,
        delivery_address: input.customer.address.trim(),
        postal_code: input.customer.postalCode.trim(),
        dish_id: rememberedRecipe.dishId,
        dish_name: rememberedRecipe.dishName,
        quantity: input.quantity,
        unit_price_cents: MEAL_PRICE_CENTS,
        total_cents: totalCents,
        sweetness_tsp: Number(rememberedRecipe.sugar),
        spice_tsp: Number(rememberedRecipe.spice),
        oil_tsp: Number(rememberedRecipe.oil),
        recipe_version: rememberedRecipe.version,
        delivery_slot: input.deliverySlot,
        delivery_notes: input.deliveryNotes.trim(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error('Could not place your order. Please try again.');
    }

    if (data?.id) {
      orderId = String(data.id).slice(0, 8).toUpperCase();
    }
  }

  const record: OrderRecord = {
    id: orderId,
    customer: input.customer,
    recipe: rememberedRecipe,
    quantity: input.quantity,
    unitPriceCents: MEAL_PRICE_CENTS,
    totalCents,
    deliverySlot: input.deliverySlot,
    deliveryNotes: input.deliveryNotes.trim(),
    createdAt: nowIso,
  };

  const existingOrders = readLocalJson<OrderRecord[]>(ORDERS_STORAGE_KEY, []);
  writeLocalJson(ORDERS_STORAGE_KEY, [record, ...existingOrders].slice(0, 20));

  return record;
}
