import { ArrowUpRight } from 'lucide-react';
import { MEALS, type DishId } from '../data/meals';
import { MealIllustration } from './Illustrations';

interface MealsSectionProps {
  selectedDishId: DishId;
  onSelectDish: (dishId: DishId) => void;
}

export function MealsSection({
  selectedDishId,
  onSelectDish,
}: MealsSectionProps) {
  return (
    <section id="meals" className="py-16 md:py-22">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mx-auto max-w-[660px] text-center">
          <p className="text-[13px] font-semibold tracking-wide text-[#9d5738]">
            Comfort in every bite
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.8vw,3rem)] leading-[1.16] font-semibold tracking-[-0.02em] text-[#253a30] [text-wrap:balance]">
            Everyday favourites, your way.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-[#5d6c60]">
            A sample menu to show how Wabi Sabi could work. Actual dishes and
            prices will be announced at launch.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {MEALS.map((meal) => {
            const isActive = meal.id === selectedDishId;
            return (
              <article
                key={meal.id}
                className="flex flex-col overflow-hidden rounded-[22px] border border-[#dce2d7] bg-white"
              >
                <div
                  className={`flex h-[210px] items-center justify-center bg-gradient-to-br ${meal.surfaceGradient} px-6`}
                >
                  <MealIllustration dishId={meal.id} />
                </div>

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <p className="text-[12px] font-medium text-[#5d6c60]">
                      {meal.subtitle}
                    </p>
                    <h3 className="mt-2 text-[20px] font-semibold text-[#253a30]">
                      {meal.name}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.65] text-[#5d6c60]">
                      {meal.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#dce2d7] pt-4">
                    <span className="text-[12px] font-medium text-[#5d6c60]">
                      {isActive ? 'Currently in recipe card' : 'Ready to tailor'}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectDish(meal.id)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-full bg-[#253a30] px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
                    >
                      Personalise
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
