import { useCallback, useEffect, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { LaunchBanner } from './components/LaunchBanner';
import { MealsSection } from './components/MealsSection';
import { PhilosophySection } from './components/PhilosophySection';
import { RecipePersonaliser } from './components/RecipePersonaliser';
import { Toast } from './components/Toast';
import {
  MEALS,
  STORAGE_KEY,
  type DishId,
  type RecipeState,
} from './data/meals';

const DEFAULT_MEAL = MEALS[2]; // Sweet & Sour Noodles

function getInitialRecipe(): RecipeState {
  const fallback: RecipeState = {
    dishId: DEFAULT_MEAL.id,
    dishName: DEFAULT_MEAL.name,
    sugar: DEFAULT_MEAL.defaultSugar,
    spice: DEFAULT_MEAL.defaultSpice,
    oil: DEFAULT_MEAL.defaultOil,
    version: 1,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<RecipeState> & { dish?: string };
    const matchedMeal =
      MEALS.find((m) => m.id === parsed.dishId) ??
      MEALS.find((m) => m.name === (parsed.dishName ?? parsed.dish));

    if (!matchedMeal) return fallback;

    return {
      dishId: matchedMeal.id,
      dishName: matchedMeal.name,
      sugar: parsed.sugar ?? matchedMeal.defaultSugar,
      spice: parsed.spice ?? matchedMeal.defaultSpice,
      oil: parsed.oil ?? matchedMeal.defaultOil,
      version:
        typeof parsed.version === 'number' && parsed.version >= 1
          ? parsed.version
          : 1,
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [recipe, setRecipe] = useState<RecipeState>(getInitialRecipe);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSelectDishFromMenu = (dishId: DishId) => {
    const meal = MEALS.find((m) => m.id === dishId);
    if (!meal) return;

    setRecipe((prev) => ({
      ...prev,
      dishId: meal.id,
      dishName: meal.name,
      sugar: meal.defaultSugar,
      spice: meal.defaultSpice,
      oil: meal.defaultOil,
    }));

    document
      .getElementById('personalise')
      ?.scrollIntoView({ behavior: 'smooth' });
    notify(`Now customising: ${meal.name}`);
  };

  const handleChangeDishTab = (dishId: DishId) => {
    const meal = MEALS.find((m) => m.id === dishId);
    if (!meal) return;

    setRecipe((prev) => ({
      ...prev,
      dishId: meal.id,
      dishName: meal.name,
      sugar: meal.defaultSugar,
      spice: meal.defaultSpice,
      oil: meal.defaultOil,
    }));
  };

  const handleUpdateField = (
    field: 'sugar' | 'spice' | 'oil',
    value: string
  ) => {
    setRecipe((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveRecipe = () => {
    const nextRecipe: RecipeState = {
      ...recipe,
      version: recipe.version + 1,
    };
    setRecipe(nextRecipe);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecipe));
      notify(
        `Saved ${nextRecipe.dishName} (Version ${nextRecipe.version}) in this browser.`
      );
    } catch {
      notify('Recipe preview ready. Browser storage is unavailable.');
    }
  };

  const handleResetRecipe = () => {
    const meal = MEALS.find((m) => m.id === recipe.dishId) ?? DEFAULT_MEAL;
    const resetState: RecipeState = {
      dishId: meal.id,
      dishName: meal.name,
      sugar: '2',
      spice: meal.defaultSpice,
      oil: '2',
      version: 1,
    };
    setRecipe(resetState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors when unavailable
    }
    notify(`Reset ${meal.name} to standard recipe quantities.`);
  };

  const handleLaunchInterest = () => {
    notify(
      'Launch sign-up will open soon. Contact details are not yet configured.'
    );
  };

  return (
    <div className="min-h-screen bg-[#fbf8f0] text-[#253a30]">
      <Header />

      <main>
        <Hero />
        <HowItWorks />
        <MealsSection
          selectedDishId={recipe.dishId}
          onSelectDish={handleSelectDishFromMenu}
        />
        <RecipePersonaliser
          recipe={recipe}
          onChangeDish={handleChangeDishTab}
          onUpdateField={handleUpdateField}
          onSaveRecipe={handleSaveRecipe}
          onResetRecipe={handleResetRecipe}
        />
        <PhilosophySection />
        <LaunchBanner onLaunchInterest={handleLaunchInterest} />
      </main>

      <Footer />

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}
