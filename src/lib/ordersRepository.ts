import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  MEALS,
  formatPrice,
  type DishId,
  type MealOption,
  type RecipeState,
} from '../data/meals';

export interface CustomerProfile {
  name: string;
  contact: string;
  address: string;
  postalCode: string;
}

export interface RecipeTweakItem {
  id: number;
  dishId: DishId;
  version: number;
  sugar: string;
  spice: string;
  oil: string;
  tweakNote: string;
  source: string;
  createdAt: string;
}

export interface OrderRecord {
  orderCode: string;
  customer: CustomerProfile;
  recipe: RecipeState;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  deliverySlot: string;
  deliveryNotes: string;
  paymentProvider: string;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

interface ApiMenuPriceRow {
  dish_id: DishId;
  dish_name: string;
  subtitle: string;
  description: string;
  price_cents: number;
}

interface ApiCustomerRow {
  id: number;
  name: string;
  contact: string;
  display_contact: string;
  address: string;
  postal_code: string;
}

interface ApiRecipeRow {
  dish_id: DishId;
  dish_name: string;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  version: number;
}

interface ApiTweakRow {
  id: number;
  dish_id: DishId;
  version: number;
  sweetness_tsp: number;
  spice_tsp: number;
  oil_tsp: number;
  tweak_note: string;
  source: string;
  created_at: string;
}

interface ApiOrderRow {
  order_code: string;
  dish_id: DishId;
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
  payment_status: 'pending' | 'paid';
  created_at: string;
  customer_name?: string;
  customer_contact?: string;
  delivery_address?: string;
  postal_code?: string;
}

function mapRecipe(row: ApiRecipeRow): RecipeState {
  return {
    dishId: row.dish_id,
    dishName: row.dish_name,
    sugar: String(Number(row.sweetness_tsp)),
    spice: String(Number(row.spice_tsp)),
    oil: String(Number(row.oil_tsp)),
    version: row.version,
  };
}

function mapTweak(row: ApiTweakRow): RecipeTweakItem {
  return {
    id: row.id,
    dishId: row.dish_id,
    version: row.version,
    sugar: String(Number(row.sweetness_tsp)),
    spice: String(Number(row.spice_tsp)),
    oil: String(Number(row.oil_tsp)),
    tweakNote: row.tweak_note,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapOrder(
  row: ApiOrderRow,
  fallbackCustomer: CustomerProfile
): OrderRecord {
  return {
    orderCode: row.order_code,
    customer: {
      name: row.customer_name ?? fallbackCustomer.name,
      contact: row.customer_contact ?? fallbackCustomer.contact,
      address: row.delivery_address ?? fallbackCustomer.address,
      postalCode: row.postal_code ?? fallbackCustomer.postalCode,
    },
    recipe: {
      dishId: row.dish_id,
      dishName: row.dish_name,
      sugar: String(Number(row.sweetness_tsp)),
      spice: String(Number(row.spice_tsp)),
      oil: String(Number(row.oil_tsp)),
      version: row.recipe_version,
    },
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalCents: row.total_cents,
    deliverySlot: row.delivery_slot,
    deliveryNotes: row.delivery_notes,
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

export async function fetchMenuPrices(): Promise<MealOption[]> {
  const response = await fetch('/api/menu');
  if (!response.ok) {
    return MEALS;
  }

  const data = (await response.json()) as { items?: ApiMenuPriceRow[] };
  if (!data.items || data.items.length === 0) {
    return MEALS;
  }

  return data.items.map((row) => {
    const base = MEALS.find((m) => m.id === row.dish_id) ?? MEALS[0];
    return {
      ...base,
      id: row.dish_id,
      name: row.dish_name,
      subtitle: row.subtitle,
      description: row.description,
      priceCents: row.price_cents,
      priceLabel: formatPrice(row.price_cents),
    };
  });
}

export function getSavedCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerProfile;
  } catch {
    return null;
  }
}

export function saveCustomerProfileLocally(profile: CustomerProfile): void {
  try {
    // Only persist non-sensitive display identifiers in localStorage;
    // delivery address and postal code are protected by the HttpOnly ws_session cookie.
    localStorage.setItem(
      CUSTOMER_PROFILE_STORAGE_KEY,
      JSON.stringify({
        name: profile.name,
        contact: profile.contact,
        address: '',
        postalCode: '',
      })
    );
  } catch {
    // Ignore storage errors
  }
}

export async function recallCustomerData(contactRaw: string): Promise<{
  profile: CustomerProfile | null;
  recipesByDish: Partial<Record<DishId, RecipeState>>;
  tweaks: RecipeTweakItem[];
  orders: OrderRecord[];
  masked: boolean;
}> {
  const response = await fetch(
    `/api/customers/recall?contact=${encodeURIComponent(contactRaw.trim())}`,
    { credentials: 'same-origin' }
  );
  if (!response.ok) {
    throw new Error('Could not recall saved customer details.');
  }

  const data = (await response.json()) as {
    customer: ApiCustomerRow | null;
    recipes: ApiRecipeRow[];
    tweaks: ApiTweakRow[];
    orders: ApiOrderRow[];
    masked?: boolean;
  };

  const recipesByDish: Partial<Record<DishId, RecipeState>> = {};
  for (const r of data.recipes ?? []) {
    recipesByDish[r.dish_id] = mapRecipe(r);
  }

  if (!data.customer) {
    return {
      profile: null,
      recipesByDish,
      tweaks: [],
      orders: [],
      masked: Boolean(data.masked),
    };
  }

  const profile: CustomerProfile = {
    name: data.customer.name,
    contact: data.customer.display_contact,
    address: data.customer.address,
    postalCode: data.customer.postal_code,
  };

  return {
    profile,
    recipesByDish,
    tweaks: data.tweaks.map(mapTweak),
    orders: data.orders.map((o) => mapOrder(o, profile)),
    masked: Boolean(data.masked),
  };
}

export async function saveRecipeTweak(input: {
  customer: CustomerProfile;
  recipe: RecipeState;
  tweakNote: string;
}): Promise<{ recipe: RecipeState; tweaks: RecipeTweakItem[] }> {
  const response = await fetch('/api/recipes/save', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: input.customer,
      dishId: input.recipe.dishId,
      dishName: input.recipe.dishName,
      sugar: input.recipe.sugar,
      spice: input.recipe.spice,
      oil: input.recipe.oil,
      tweakNote: input.tweakNote,
    }),
  });

  const data = (await response.json()) as {
    error?: string;
    recipe?: ApiRecipeRow;
    tweaks?: ApiTweakRow[];
  };

  if (!response.ok || !data.recipe) {
    throw new Error(data.error ?? 'Could not save your recipe tweak.');
  }

  return {
    recipe: mapRecipe(data.recipe),
    tweaks: (data.tweaks ?? []).map(mapTweak),
  };
}

export async function createCheckoutOrder(input: {
  customer: CustomerProfile;
  recipe: RecipeState;
  quantity: number;
  deliverySlot: string;
  deliveryNotes: string;
  tweakNote: string;
}): Promise<{
  mode: 'stripe' | 'stripe_demo';
  checkoutUrl?: string;
  order: OrderRecord;
  recipe: RecipeState;
  tweaks: RecipeTweakItem[];
  orders: OrderRecord[];
}> {
  const response = await fetch('/api/orders/checkout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as {
    error?: string;
    mode: 'stripe' | 'stripe_demo';
    checkoutUrl?: string;
    order: ApiOrderRow;
    recipe: ApiRecipeRow;
    tweaks: ApiTweakRow[];
    orders: ApiOrderRow[];
  };

  if (!response.ok || !data.order) {
    throw new Error(data.error ?? 'Could not start Stripe checkout.');
  }

  saveCustomerProfileLocally(input.customer);

  return {
    mode: data.mode,
    checkoutUrl: data.checkoutUrl,
    order: mapOrder(data.order, input.customer),
    recipe: mapRecipe(data.recipe),
    tweaks: (data.tweaks ?? []).map(mapTweak),
    orders: (data.orders ?? []).map((o) => mapOrder(o, input.customer)),
  };
}

export async function confirmDemoStripePayment(
  orderCode: string,
  fallbackCustomer: CustomerProfile
): Promise<OrderRecord> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderCode)}/confirm-demo-payment`,
    { method: 'POST', credentials: 'same-origin' }
  );

  const data = (await response.json()) as {
    error?: string;
    order?: ApiOrderRow;
  };

  if (!response.ok || !data.order) {
    throw new Error(data.error ?? 'Could not confirm payment.');
  }

  return mapOrder(data.order, fallbackCustomer);
}

export async function verifyStripeSession(
  sessionId: string,
  orderCode: string
): Promise<{ paid: boolean; order: OrderRecord | null }> {
  const response = await fetch(
    `/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}&order_code=${encodeURIComponent(orderCode)}`,
    { credentials: 'same-origin' }
  );

  const data = (await response.json()) as {
    paid?: boolean;
    order?: ApiOrderRow | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Unable to verify Stripe payment.');
  }

  const fallback: CustomerProfile = {
    name: data.order?.customer_name ?? '',
    contact: data.order?.customer_contact ?? '',
    address: data.order?.delivery_address ?? '',
    postalCode: data.order?.postal_code ?? '',
  };

  return {
    paid: Boolean(data.paid),
    order: data.order ? mapOrder(data.order, fallback) : null,
  };
}
