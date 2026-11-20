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
  type MealOption,
  type RecipeState,
} from './data/meals';
import {
  fetchMenuPrices,
  getSavedCustomerProfile,
  recallCustomerData,
  saveRecipeTweak,
  verifyStripeSession,
  type OrderRecord,
  type RecipeTweakItem,
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
  const [meals, setMeals] = useState<MealOption[]>(MEALS);
  const [recipe, setRecipe] = useState<RecipeState>(getInitialRecipe);
  const [tweakNote, setTweakNote] = useState('');
  const [rememberedByDish, setRememberedByDish] = useState<
    Partial<Record<DishId, RecipeState>>
  >({});
  const [tweakHistory, setTweakHistory] = useState<RecipeTweakItem[]>([]);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<OrderRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activeMeal = meals.find((m) => m.id === recipe.dishId) ?? meals[0];

  const notify = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Hydrate dish prices from SQLite menu_prices table via Hono /api/menu
  useEffect(() => {
    let cancelled = false;
    fetchMenuPrices()
      .then((serverMeals) => {
        if (!cancelled && serverMeals.length > 0) {
          setMeals(serverMeals);
        }
      })
      .catch(() => {
        // Fallback to static meal catalog if offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load saved customer data from SQLite if returning
  useEffect(() => {
    const savedProfile = getSavedCustomerProfile();
    if (!savedProfile?.contact) return;

    let cancelled = false;
    recallCustomerData(savedProfile.contact)
      .then(({ recipesByDish, tweaks }) => {
        if (cancelled) return;
        setRememberedByDish(recipesByDish);
        setTweakHistory(tweaks);
        setRecipe((prev) => recipesByDish[prev.dishId] ?? prev);
      })
      .catch(() => {
        // Keep default local recipe if server lookup fails
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle return from live Stripe Checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    const orderCode = params.get('order_code');

    if (payment === 'success' && sessionId && orderCode) {
      verifyStripeSession(sessionId, orderCode)
        .then(({ paid, order }) => {
          if (paid && order) {
            setVerifiedOrder(order);
            setIsOrderOpen(true);
            notify(
              `Stripe payment confirmed for ${order.orderCode} (${formatPrice(order.totalCents)}).`
            );
          }
        })
        .catch(() => {
          notify('Payment received; verifying order details.');
        })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    } else if (payment === 'cancelled') {
      notify('Stripe payment was cancelled. Your recipe draft is still ready.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [notify]);

  const selectDishState = (dishId: DishId) => {
    const remembered = rememberedByDish[dishId];
    if (remembered) {
      setRecipe(remembered);
      return;
    }

    const meal = meals.find((m) => m.id === dishId);
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
    const meal = meals.find((m) => m.id === dishId);
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
    setVerifiedOrder(null);
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
    if (savedProfile?.contact && savedProfile?.name) {
      try {
        const result = await saveRecipeTweak({
          customer: savedProfile,
          recipe,
          tweakNote,
        });
        setRecipe(result.recipe);
        setRememberedByDish((prev) => ({
          ...prev,
          [result.recipe.dishId]: result.recipe,
        }));
        setTweakHistory(result.tweaks);
        setTweakNote('');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.recipe));
        notify(
          `Saved ${result.recipe.dishName} tweak (Version ${result.recipe.version}) to database.`
        );
        return;
      } catch {
        // Fallback to local draft below if server error
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
        `Drafted ${nextRecipe.dishName} (Version ${nextRecipe.version}). Enter your contact when ordering to store tweaks to your profile.`
      );
    } catch {
      notify('Recipe preview ready.');
    }
  };

  const handleResetRecipe = () => {
    const meal = meals.find((m) => m.id === recipe.dishId) ?? DEFAULT_MEAL;
    const resetState: RecipeState = {
      dishId: meal.id,
      dishName: meal.name,
      sugar: '2',
      spice: meal.defaultSpice,
      oil: '2',
      version: 1,
    };
    setRecipe(resetState);
    setTweakNote('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
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
      <Header
        orderPriceLabel={activeMeal.priceLabel}
        onOpenOrder={() => {
          setVerifiedOrder(null);
          setIsOrderOpen(true);
        }}
      />

      <main>
        <Hero
          orderPriceLabel={activeMeal.priceLabel}
          onOpenOrder={() => {
            setVerifiedOrder(null);
            setIsOrderOpen(true);
          }}
        />
        <HowItWorks />
        <MealsSection
          meals={meals}
          selectedDishId={recipe.dishId}
          onSelectDish={handleSelectDishFromMenu}
          onOrderDish={handleOrderDish}
        />
        <RecipePersonaliser
          meals={meals}
          recipe={recipe}
          tweakNote={tweakNote}
          tweakHistory={tweakHistory}
          onChangeTweakNote={setTweakNote}
          onChangeDish={selectDishState}
          onUpdateField={handleUpdateField}
          onSaveRecipe={handleSaveRecipe}
          onResetRecipe={handleResetRecipe}
          onOrderRecipe={() => {
            setVerifiedOrder(null);
            setIsOrderOpen(true);
          }}
        />
        <PhilosophySection />
        <LaunchBanner onLaunchInterest={handleLaunchInterest} />
      </main>

      <Footer />

      <OrderModal
        isOpen={isOrderOpen}
        meals={meals}
        recipe={recipe}
        tweakNote={tweakNote}
        initialConfirmedOrder={verifiedOrder}
        onChangeTweakNote={setTweakNote}
        onClose={() => {
          setVerifiedOrder(null);
          setIsOrderOpen(false);
        }}
        onSelectDish={selectDishState}
        onCustomerLoaded={({ recipesByDish, tweaks }) => {
          setRememberedByDish(recipesByDish);
          setTweakHistory(tweaks);
          const match = recipesByDish[recipe.dishId];
          if (match) {
            setRecipe(match);
          }
        }}
        onJumpToPersonalise={() => {
          document
            .getElementById('personalise')
            ?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOrderCompleted={({ order, recipe: savedRecipe, tweaks }) => {
          setRecipe(savedRecipe);
          setRememberedByDish((prev) => ({
            ...prev,
            [savedRecipe.dishId]: savedRecipe,
          }));
          if (tweaks.length > 0) {
            setTweakHistory(tweaks);
          }
          setTweakNote('');
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRecipe));
          } catch {
            // Ignore storage errors
          }
          if (order.paymentStatus === 'paid') {
            notify(
              `Order ${order.orderCode} paid (${formatPrice(order.totalCents)}). Recipe v${savedRecipe.version} saved.`
            );
          }
        }}
      />

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}
