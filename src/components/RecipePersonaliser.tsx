import { ArrowUpRight, RotateCcw } from 'lucide-react';
import {
  MEALS,
  OIL_OPTIONS,
  SPICE_OPTIONS,
  SUGAR_OPTIONS,
  formatTsp,
  type DishId,
  type RecipeState,
} from '../data/meals';

interface RecipePersonaliserProps {
  recipe: RecipeState;
  onChangeDish: (dishId: DishId) => void;
  onUpdateField: (field: 'sugar' | 'spice' | 'oil', value: string) => void;
  onSaveRecipe: () => void;
  onResetRecipe: () => void;
}

export function RecipePersonaliser({
  recipe,
  onChangeDish,
  onUpdateField,
  onSaveRecipe,
  onResetRecipe,
}: RecipePersonaliserProps) {
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
                Select a sample dish to tailor
              </p>
              <div
                className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl border border-[#dce2d7] bg-[#fbf8f0] p-1.5"
                role="tablist"
                aria-label="Sample dishes"
              >
                {MEALS.map((meal) => {
                  const active = meal.id === recipe.dishId;
                  return (
                    <button
                      key={meal.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onChangeDish(meal.id)}
                      className={`min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30] ${
                        active
                          ? 'bg-[#253a30] text-white'
                          : 'text-[#5d6c60] hover:bg-[#e7ecdf] hover:text-[#253a30]'
                      }`}
                    >
                      {meal.name}
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
                  <p className="text-[12px] font-medium text-[#9d5738]">
                    Your personal recipe · Demo · Version{' '}
                    <span className="tabular-nums">{recipe.version}</span>
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
              </div>

              <div className="mt-4 rounded-xl bg-[#f1f3eb] p-4">
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

              <button
                type="button"
                onClick={onSaveRecipe}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
              >
                Save my recipe
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="mt-3 text-[12px] text-[#5d6c60]">
                Demo only: saving stores this sample in your browser, not a
                customer account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
