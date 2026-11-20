export type DishId = 'curry-rice' | 'garden-bowl' | 'sweet-sour-noodles';

export const MEAL_PRICE_CENTS = 950;

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface MealOption {
  id: DishId;
  name: string;
  subtitle: string;
  description: string;
  priceCents: number;
  priceLabel: string;
  defaultSugar: string;
  defaultSpice: string;
  defaultOil: string;
  surfaceGradient: string;
  imageSrc: string;
  imageAlt: string;
}

export interface AdjustmentChoice {
  value: string;
  label: string;
  shortLabel: string;
}

export interface RecipeState {
  dishId: DishId;
  dishName: string;
  sugar: string;
  spice: string;
  oil: string;
  version: number;
}

export const MEALS: MealOption[] = [
  {
    id: 'curry-rice',
    name: 'Homestyle Curry Rice',
    subtitle: 'Customisable · Comfort classic',
    description:
      'Comforting, aromatic, and tailored to your preferred spice level.',
    priceCents: MEAL_PRICE_CENTS,
    priceLabel: formatPrice(MEAL_PRICE_CENTS),
    defaultSugar: '1.5',
    defaultSpice: '0.5',
    defaultOil: '1.5',
    surfaceGradient: 'from-[#ebe0c8] to-[#f7f0df]',
    imageSrc: '/src/assets/images/meal_curry_rice_1795162139662.jpg',
    imageAlt:
      'Homestyle Japanese-Singaporean curry rice with tender root vegetables and steamed rice in an off-white stoneware plate',
  },
  {
    id: 'garden-bowl',
    name: 'Garden Goodness Bowl',
    subtitle: 'Customisable · Seasonal harvest',
    description:
      'Seasonal vegetables, grains, and a dressing balanced to your taste.',
    priceCents: MEAL_PRICE_CENTS,
    priceLabel: formatPrice(MEAL_PRICE_CENTS),
    defaultSugar: '1.5',
    defaultSpice: '0',
    defaultOil: '1',
    surfaceGradient: 'from-[#d7e3d1] to-[#f4ead2]',
    imageSrc: '/src/assets/images/meal_garden_bowl_1795162139204.jpg',
    imageAlt:
      'Garden Goodness harvest bowl with grains, charred greens, roasted sweet potato, sliced avocado, and heirloom cherry tomatoes',
  },
  {
    id: 'sweet-sour-noodles',
    name: 'Sweet & Sour Noodles',
    subtitle: 'Customisable · Signature favourite',
    description:
      'A familiar favourite with your ideal balance of sweetness and tang.',
    priceCents: MEAL_PRICE_CENTS,
    priceLabel: formatPrice(MEAL_PRICE_CENTS),
    defaultSugar: '1.5',
    defaultSpice: '0.25',
    defaultOil: '1.5',
    surfaceGradient: 'from-[#f0d9c2] to-[#eceee0]',
    imageSrc: '/src/assets/images/meal_sweet_sour_noodles_1795162139183.jpg',
    imageAlt:
      'Homestyle sweet and sour stir-fried noodles with bell peppers, pineapple chunks, and scallions in a dark stoneware bowl',
  },
];

export const SUGAR_OPTIONS: AdjustmentChoice[] = [
  { value: '2', label: 'Standard · 2 tsp', shortLabel: 'Standard' },
  { value: '1.5', label: 'Less sweet · 1½ tsp', shortLabel: 'Less sweet' },
  { value: '1', label: 'Much less · 1 tsp', shortLabel: 'Much less' },
];

export const SPICE_OPTIONS: AdjustmentChoice[] = [
  { value: '0', label: 'No chilli · 0 tsp', shortLabel: 'No chilli' },
  { value: '0.25', label: 'Mild · ¼ tsp', shortLabel: 'Mild' },
  { value: '0.5', label: 'Medium · ½ tsp', shortLabel: 'Medium' },
  { value: '1', label: 'Spicy · 1 tsp', shortLabel: 'Spicy' },
];

export const OIL_OPTIONS: AdjustmentChoice[] = [
  { value: '2', label: 'Standard · 2 tsp', shortLabel: 'Standard' },
  { value: '1.5', label: 'Less oil · 1½ tsp', shortLabel: 'Less oil' },
  { value: '1', label: 'Light · 1 tsp', shortLabel: 'Light' },
];

export function formatTsp(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (num === 0.25) return '¼';
  if (num === 0.5) return '½';
  if (num === 1.5) return '1½';
  return num.toLocaleString('en-SG', { maximumFractionDigits: 2 });
}

export const STORAGE_KEY = 'wabisabi-demo-recipe';
export const CUSTOMER_PROFILE_STORAGE_KEY = 'wabisabi-customer-profile';
export const CUSTOMER_RECIPES_STORAGE_KEY = 'wabisabi-customer-recipes';
export const ORDERS_STORAGE_KEY = 'wabisabi-orders';
