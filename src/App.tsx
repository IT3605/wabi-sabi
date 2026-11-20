import { useCallback, useEffect, useRef, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { LaunchBanner } from './components/LaunchBanner';
import { MealsSection } from './components/MealsSection';
import { OrderModal } from './components/OrderModal';
import { PhilosophySection } from './components/PhilosophySection';
import { RecipePersonaliser } from './components/RecipePersonaliser';
import { Toast } from './components/Toast';
import {
  MEALS,
  STORAGE_KEY,
  formatPrice,
  type DishId,
  type RecipeState,
} from './data/meals';
import {
  getSavedCustomerProfile,
  recallCustomerData,
  saveRememberedRecipe,
  type OrderRecord,
} from './lib/ordersRepository';

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
  const [rememberedByDish, setRememberedByDish] = useState<
    Partial<Record<DishId, RecipeState>>
  >({});
  const [isOrderOpen, setIsOrderOpen] = useState(false);
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

  useEffect(() => {
    const savedProfile = getSavedCustomerProfile();
    if (!savedProfile?.contact) return;

    let cancelled = false;
    recallCustomerData(savedProfile.contact)
      .then(({ recipesByDish }) => {
        if (cancelled || !recipesByDish) return;
        setRememberedByDish(recipesByDish);
        setRecipe((prev) => recipesByDish[prev.dishId] ?? prev);
      })
      .catch(() => {
        // Silently keep local fallback recipe if remote recall fails
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectDishState = (dishId: DishId) => {
    const remembered = rememberedByDish[dishId];
    if (remembered) {
      setRecipe(remembered);
      return;
    }

    const meal = MEALS.find((m) => m.id === dishId);
    if (!meal) return;

    setRecipe({
      dishId: meal.id,
      dishName: meal.name,
      sugar: meal.defaultSugar,
      spice: meal.defaultSpice,
      oil: meal.defaultOil,
      version: 1,
    });
  };

  const handleSelectDishFromMenu = (dishId: DishId) => {
    const meal = MEALS.find((m) => m.id === dishId);
    if (!meal) return;

    selectDishState(dishId);
    document
      .getElementById('personalise')
      ?.scrollIntoView({ behavior: 'smooth' });
    notify(`Now customising: ${meal.name}`);
  };

  const handleOrderDish = (dishId: DishId) => {
    if (dishId !== recipe.dishId) {
      selectDishState(dishId);
    }
    setIsOrderOpen(true);
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

  const handleSaveRecipe = async () => {
    const savedProfile = getSavedCustomerProfile();
    if (savedProfile?.contact) {
      try {
        const updated = await saveRememberedRecipe(savedProfile, recipe);
        setRecipe(updated);
        setRememberedByDish((prev) => ({
          ...prev,
          [updated.dishId]: updated,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        notify(
          `Saved ${updated.dishName} (Version ${updated.version}) for future orders.`
        );
        return;
      } catch {
        // Fallback to local save below
      }
    }

    const nextRecipe: RecipeState = {
      ...recipe,
      version: recipe.version + 1,
    };
    setRecipe(nextRecipe);
    setRememberedByDish((prev) => ({
      ...prev,
      [nextRecipe.dishId]: nextRecipe,
    }));

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

  const handleOrderConfirmed = (order: OrderRecord) => {
    setRecipe(order.recipe);
    setRememberedByDish((prev) => ({
      ...prev,
      [order.recipe.dishId]: order.recipe,
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order.recipe));
    } catch {
      // Ignore storage errors
    }
    notify(
      `Order saved: ${order.quantity} × ${order.recipe.dishName} (${formatPrice(order.totalCents)}).`
    );
  };

  const handleLaunchInterest = () => {
    notify(
      'Launch sign-up will open soon. Contact details are not yet configured.'
    );
  };

  return (
    <div className="min-h-screen bg-[#fbf8f0] text-[#253a30]">
      <Header onOpenOrder={() => setIsOrderOpen(true)} />

      <main>
        <Hero onOpenOrder={() => setIsOrderOpen(true)} />
        <HowItWorks />
        <MealsSection
          selectedDishId={recipe.dishId}
          onSelectDish={handleSelectDishFromMenu}
          onOrderDish={handleOrderDish}
        />
        <RecipePersonaliser
          recipe={recipe}
          onChangeDish={selectDishState}
          onUpdateField={handleUpdateField}
          onSaveRecipe={handleSaveRecipe}
          onResetRecipe={handleResetRecipe}
          onOrderRecipe={() => setIsOrderOpen(true)}
        />
        <PhilosophySection />
        <LaunchBanner onLaunchInterest={handleLaunchInterest} />
      </main>

      <Footer />

      <OrderModal
        isOpen={isOrderOpen}
        recipe={recipe}
        onClose={() => setIsOrderOpen(false)}
        onSelectDish={selectDishState}
        onRecipeRecalled={(recalled) => {
          setRecipe(recalled);
          setRememberedByDish((prev) => ({
            ...prev,
            [recalled.dishId]: recalled,
          }));
        }}
        onJumpToPersonalise={() => {
          document
            .getElementById('personalise')
            ?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOrderConfirmed={handleOrderConfirmed}
      />

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}
