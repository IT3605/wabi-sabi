import { ArrowUpRight, RotateCcw } from 'lucide-react';
import {
  OIL_OPTIONS,
  SPICE_OPTIONS,
  SUGAR_OPTIONS,
  formatTsp,
  type DishId,
  type MealOption,
  type RecipeState,
} from '../data/meals';
import type { RecipeTweakItem } from '../lib/ordersRepository';

interface RecipePersonaliserProps {
  meals: MealOption[];
  recipe: RecipeState;
  tweakNote: string;
  tweakHistory: RecipeTweakItem[];
  onChangeTweakNote: (note: string) => void;
  onChangeDish: (dishId: DishId) => void;
  onUpdateField: (field: 'sugar' | 'spice' | 'oil', value: string) => void;
  onSaveRecipe: () => void;
  onResetRecipe: () => void;
  onOrderRecipe: () => void;
}

export function RecipePersonaliser({
  meals,
  recipe,
  tweakNote,
  tweakHistory,
  onChangeTweakNote,
  onChangeDish,
  onUpdateField,
  onSaveRecipe,
  onResetRecipe,
  onOrderRecipe,
}: RecipePersonaliserProps) {
  const dishTweaks = tweakHistory.filter((t) => t.dishId === recipe.dishId);
  const activeMeal = meals.find((m) => m.id === recipe.dishId) ?? meals[0];

  return (
    <section id="personalise" className="bg-[#eef0e7] py-16 md:py-22">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <p className="text-[13px] font-semibold tracking-wide text-[#9d5738]">
              A recipe that knows you
            </p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,3.8vw,3rem)] leading-[1.16] font-semibold tracking-[-0.02em] text-[#253a30] [text-wrap:balance]">
              Your taste isn&apos;t a one-time request.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.75] text-[#5d6c60]">
              Imagine ordering &ldquo;less sweet&rdquo; once—and knowing exactly
              what that means next time. Your personalised recipe records the
              adjustment, so every reorder starts from the version you love.
            </p>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#5d6c60]">
              Try the sample recipe card. The choices update the recipe
              instantly.
            </p>

            {/* Interactive dish switcher */}
            <div className="mt-7">
              <p className="text-[12px] font-medium text-[#5d6c60]">
                Select a dish to tailor
              </p>
              <div
                className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl border border-[#dce2d7] bg-[#fbf8f0] p-1.5"
                role="tablist"
                aria-label="Sample dishes"
              >
                {meals.map((meal) => {
                  const active = meal.id === recipe.dishId;
                  return (
                    <button
                      key={meal.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onChangeDish(meal.id)}
                      className={`min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium tabular-nums transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30] ${
                        active
                          ? 'bg-[#253a30] text-white'
                          : 'text-[#5d6c60] hover:bg-[#e7ecdf] hover:text-[#253a30]'
                      }`}
                    >
                      {meal.name} · {meal.priceLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-[24px] border border-[#dce2d7] bg-white p-7 shadow-[0_20px_50px_rgba(49,73,52,0.06)] md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-medium text-[#9d5738] tabular-nums">
                    Your personal recipe · Version {recipe.version} ·{' '}
                    {activeMeal.priceLabel}
                  </p>
                  <h3 className="mt-1.5 font-serif text-[26px] leading-tight font-semibold text-[#253a30]">
                    {recipe.dishName}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onResetRecipe}
                  aria-label="Reset recipe to standard defaults"
                  className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full border border-[#dce2d7] bg-[#fbf8f0] px-3.5 py-1.5 text-[12px] font-medium text-[#5d6c60] transition-colors duration-150 hover:bg-[#e7ecdf] hover:text-[#253a30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>

              <div className="mt-4 divide-y divide-[#dce2d7]">
                <label className="flex items-center justify-between gap-4 py-4 text-[14px] font-medium text-[#253a30]">
                  <span>Sweetness</span>
                  <select
                    value={recipe.sugar}
                    onChange={(e) => onUpdateField('sugar', e.target.value)}
                    className="min-h-[40px] min-w-[180px] rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] font-normal text-[#253a30] transition-colors focus:border-[#253a30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#253a30]/20"
                  >
                    {SUGAR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between gap-4 py-4 text-[14px] font-medium text-[#253a30]">
                  <span>Spice</span>
                  <select
                    value={recipe.spice}
                    onChange={(e) => onUpdateField('spice', e.target.value)}
                    className="min-h-[40px] min-w-[180px] rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] font-normal text-[#253a30] transition-colors focus:border-[#253a30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#253a30]/20"
                  >
                    {SPICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between gap-4 py-4 text-[14px] font-medium text-[#253a30]">
                  <span>Oil</span>
                  <select
                    value={recipe.oil}
                    onChange={(e) => onUpdateField('oil', e.target.value)}
                    className="min-h-[40px] min-w-[180px] rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] font-normal text-[#253a30] transition-colors focus:border-[#253a30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#253a30]/20"
                  >
                    {OIL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block py-4 text-[14px] font-medium text-[#253a30]">
                  <span>Tweak note for our kitchen (optional)</span>
                  <input
                    type="text"
                    value={tweakNote}
                    onChange={(e) => onChangeTweakNote(e.target.value)}
                    placeholder="e.g. Keep carrots crisp, lighter gravy"
                    className="mt-2 min-h-[40px] w-full rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-2 rounded-xl bg-[#f1f3eb] p-4">
                <p className="text-[13px] font-semibold text-[#253a30]">
                  Recipe card preview
                </p>
                <div
                  aria-live="polite"
                  className="mt-2 space-y-1 text-[13px] leading-[1.7] text-[#253a30] tabular-nums"
                >
                  <p>
                    Sugar: <strong>{formatTsp(recipe.sugar)} tsp</strong>{' '}
                    <span className="text-[#5d6c60]">(standard 2 tsp)</span>
                  </p>
                  <p>
                    Chilli: <strong>{formatTsp(recipe.spice)} tsp</strong>
                  </p>
                  <p>
                    Oil: <strong>{formatTsp(recipe.oil)} tsp</strong>{' '}
                    <span className="text-[#5d6c60]">(standard 2 tsp)</span>
                  </p>
                </div>
                <p className="mt-2.5 text-[12px] text-[#5d6c60]">
                  Illustrative quantities only; final recipes will be
                  kitchen-tested.
                </p>
              </div>

              {dishTweaks.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#dce2d7] bg-[#fbf8f0] p-4">
                  <p className="text-[12px] font-semibold text-[#253a30]">
                    Saved recipe tweak history
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-[#5d6c60] tabular-nums">
                    {dishTweaks.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold text-[#253a30]">
                          v{item.version}
                        </span>{' '}
                        · Sugar {formatTsp(item.sugar)} · Chilli{' '}
                        {formatTsp(item.spice)} · Oil {formatTsp(item.oil)} tsp
                        {item.tweakNote ? ` — "${item.tweakNote}"` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={onOrderRecipe}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white tabular-nums transition-colors duration-150 hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
                >
                  Order food · {activeMeal.priceLabel}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onSaveRecipe}
                  className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full border border-[#dce2d7] bg-[#fbf8f0] px-5 py-3 text-[14px] font-semibold text-[#253a30] transition-colors duration-150 hover:bg-[#e7ecdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
                >
                  Save tweak
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
