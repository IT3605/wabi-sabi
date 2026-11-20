import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  ExternalLink,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  formatPrice,
  formatTsp,
  type DishId,
  type MealOption,
  type RecipeState,
} from '../data/meals';
import {
  confirmDemoStripePayment,
  createCheckoutOrder,
  getSavedCustomerProfile,
  recallCustomerData,
  type OrderRecord,
  type RecipeTweakItem,
} from '../lib/ordersRepository';
import { MealIllustration } from './Illustrations';

interface OrderModalProps {
  isOpen: boolean;
  meals: MealOption[];
  recipe: RecipeState;
  tweakNote: string;
  initialConfirmedOrder?: OrderRecord | null;
  onChangeTweakNote: (note: string) => void;
  onClose: () => void;
  onSelectDish: (dishId: DishId) => void;
  onCustomerLoaded: (payload: {
    recipesByDish: Partial<Record<DishId, RecipeState>>;
    tweaks: RecipeTweakItem[];
    orders: OrderRecord[];
  }) => void;
  onJumpToPersonalise: () => void;
  onOrderCompleted: (payload: {
    order: OrderRecord;
    recipe: RecipeState;
    tweaks: RecipeTweakItem[];
    orders: OrderRecord[];
  }) => void;
}

const DELIVERY_SLOTS = [
  'Today · Dinner (18:30 – 19:30)',
  'Tomorrow · Lunch (12:00 – 13:00)',
  'Tomorrow · Dinner (18:30 – 19:30)',
];

type ModalStep = 'details' | 'stripe_redirect' | 'stripe_demo' | 'confirmed';

export function OrderModal({
  isOpen,
  meals,
  recipe,
  tweakNote,
  initialConfirmedOrder,
  onChangeTweakNote,
  onClose,
  onSelectDish,
  onCustomerLoaded,
  onJumpToPersonalise,
  onOrderCompleted,
}: OrderModalProps) {
  const [step, setStep] = useState<ModalStep>('details');
  const [quantity, setQuantity] = useState(1);
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    contact?: string;
    address?: string;
    postal?: string;
    card?: string;
    submit?: string;
  }>({});
  const [recallFeedback, setRecallFeedback] = useState<string | null>(null);
  const [isRecalling, setIsRecalling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stripe state
  const [pendingOrder, setPendingOrder] = useState<OrderRecord | null>(null);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(
    null
  );
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('424');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(
    null
  );
  const [pastOrders, setPastOrders] = useState<OrderRecord[]>([]);
  const [imageError, setImageError] = useState(false);

  const selectedMeal = meals.find((m) => m.id === recipe.dishId) ?? meals[0];
  const totalCents = selectedMeal.priceCents * quantity;

  useEffect(() => {
    setImageError(false);
  }, [selectedMeal.id]);

  useEffect(() => {
    if (initialConfirmedOrder) {
      setConfirmedOrder(initialConfirmedOrder);
      setStep('confirmed');
    }
  }, [initialConfirmedOrder]);

  useEffect(() => {
    if (!isOpen) return;
    const savedProfile = getSavedCustomerProfile();
    if (savedProfile) {
      setCustomerName((prev) => prev || savedProfile.name);
      setCustomerContact((prev) => prev || savedProfile.contact);
      setDeliveryAddress((prev) => prev || savedProfile.address);
      setPostalCode((prev) => prev || savedProfile.postalCode);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('details');
    setPendingOrder(null);
    setStripeCheckoutUrl(null);
    setConfirmedOrder(null);
    setErrors({});
    setRecallFeedback(null);
    onClose();
  };

  const handleRecallRecipe = async () => {
    const trimmed = customerContact.trim();
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        contact: 'Enter your mobile number or email to recall your recipe.',
      }));
      return;
    }

    setIsRecalling(true);
    setRecallFeedback(null);
    setErrors((prev) => ({ ...prev, contact: undefined }));

    try {
      const result = await recallCustomerData(trimmed);
      if (result.profile) {
        setCustomerName(result.profile.name);
        setDeliveryAddress(result.profile.address);
        setPostalCode(result.profile.postalCode);
      }

      setPastOrders(result.orders);
      onCustomerLoaded({
        recipesByDish: result.recipesByDish,
        tweaks: result.tweaks,
        orders: result.orders,
      });

      const dishRecipe = result.recipesByDish[selectedMeal.id];
      if (result.masked && dishRecipe) {
        setRecallFeedback(
          `Loaded saved ${selectedMeal.name} seasoning ratios (Version ${dishRecipe.version}). Delivery address is protected on new devices—please enter your address to order.`
        );
      } else if (result.masked) {
        setRecallFeedback(
          'Found saved recipe preferences for this contact. Delivery address is protected on new devices—please enter your address to order.'
        );
      } else if (dishRecipe) {
        setRecallFeedback(
          `Loaded ${result.profile?.name ?? 'your'} saved ${selectedMeal.name} recipe (Version ${dishRecipe.version}) and ${result.orders.length} past order(s).`
        );
      } else if (result.profile) {
        setRecallFeedback(
          `Loaded delivery details for ${result.profile.name}. Customise ${selectedMeal.name} and your tweak will be saved with this order.`
        );
      } else {
        setRecallFeedback(
          'No previous orders found for this contact yet. Your details and recipe will be saved when you order.'
        );
      }
    } catch {
      setRecallFeedback('Could not check saved recipes right now.');
    } finally {
      setIsRecalling(false);
    }
  };

  const handleCheckoutSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};

    if (!customerName.trim()) {
      nextErrors.name = 'Please enter your name.';
    }

    const contactVal = customerContact.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);
    const digitsOnly = contactVal.replace(/\D/g, '');
    const isValidPhone = digitsOnly.length >= 8 && digitsOnly.length <= 15;
    if (!contactVal || (!isValidEmail && !isValidPhone)) {
      nextErrors.contact = 'Enter a valid Singapore mobile number or email.';
    }

    if (!deliveryAddress.trim()) {
      nextErrors.address = 'Please enter your street and unit address.';
    }

    if (!/^\d{6}$/.test(postalCode.trim())) {
      nextErrors.postal = 'Enter a valid 6-digit Singapore postal code.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await createCheckoutOrder({
        customer: {
          name: customerName.trim(),
          contact: contactVal,
          address: deliveryAddress.trim(),
          postalCode: postalCode.trim(),
        },
        recipe,
        quantity,
        deliverySlot,
        deliveryNotes: notes.trim(),
        tweakNote: tweakNote.trim(),
      });

      setPendingOrder(result.order);
      setPastOrders(result.orders);
      onOrderCompleted({
        order: result.order,
        recipe: result.recipe,
        tweaks: result.tweaks,
        orders: result.orders,
      });

      if (result.mode === 'stripe' && result.checkoutUrl) {
        setStripeCheckoutUrl(result.checkoutUrl);
        if (window.top === window.self) {
          window.location.assign(result.checkoutUrl);
          return;
        }
        setStep('stripe_redirect');
      } else {
        setStep('stripe_demo');
      }
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : 'Unable to initiate checkout right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDemoPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingOrder) return;

    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 13 || !/^\d+$/.test(cleanCard)) {
      setErrors({ card: 'Enter a valid test card number (e.g. 4242 4242 4242 4242).' });
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim()) || cardCvc.trim().length < 3) {
      setErrors({ card: 'Enter valid expiry (MM/YY) and 3-digit CVC.' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const paidOrder = await confirmDemoStripePayment(
        pendingOrder.orderCode,
        pendingOrder.customer
      );
      setConfirmedOrder(paidOrder);
      setStep('confirmed');
      onOrderCompleted({
        order: paidOrder,
        recipe: paidOrder.recipe,
        tweaks: [],
        orders: pastOrders.map((o) =>
          o.orderCode === paidOrder.orderCode ? paidOrder : o
        ),
      });
    } catch (err) {
      setErrors({
        card:
          err instanceof Error ? err.message : 'Unable to process payment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#182720]/55 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto rounded-[24px] border border-[#dce2d7] bg-[#fbf8f0] p-6 shadow-[0_24px_60px_rgba(24,39,32,0.28)] md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-[#9d5738]">
              Order meal · {selectedMeal.priceLabel} each
            </p>
            <h2
              id="order-modal-title"
              className="mt-1 font-serif text-[28px] leading-tight font-semibold text-[#253a30]"
            >
              {step === 'confirmed'
                ? 'Payment confirmed'
                : step === 'stripe_demo' || step === 'stripe_redirect'
                  ? 'Pay with Stripe'
                  : 'Order your meal'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close order dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce2d7] bg-white text-[#253a30] transition-colors hover:bg-[#e7ecdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {step === 'confirmed' && confirmedOrder ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[#dce2d7] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7ecdf] text-[#253a30]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-[#253a30]">
                      {confirmedOrder.quantity} × {confirmedOrder.recipe.dishName}
                    </p>
                    <p className="text-[13px] text-[#5d6c60]">
                      Order {confirmedOrder.orderCode} · Paid via Stripe ·{' '}
                      {confirmedOrder.deliverySlot}
                    </p>
                  </div>
                </div>

                <span className="text-[15px] font-semibold text-[#253a30] tabular-nums">
                  {formatPrice(confirmedOrder.totalCents)}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-[#dce2d7] pt-4 text-[13px] text-[#5d6c60]">
                <p>
                  <span className="font-semibold text-[#253a30]">
                    Deliver to:
                  </span>{' '}
                  {confirmedOrder.customer.name} (
                  {confirmedOrder.customer.contact})
                </p>
                <p>
                  {confirmedOrder.customer.address}, Singapore{' '}
                  {confirmedOrder.customer.postalCode}
                </p>
              </div>

              <div className="mt-4 border-t border-[#dce2d7] pt-4 text-[13px] text-[#5d6c60] tabular-nums">
                <p className="font-semibold text-[#253a30]">
                  Saved recipe · Version {confirmedOrder.recipe.version}
                </p>
                <p className="mt-1">
                  Sugar: {formatTsp(confirmedOrder.recipe.sugar)} tsp · Chilli:{' '}
                  {formatTsp(confirmedOrder.recipe.spice)} tsp · Oil:{' '}
                  {formatTsp(confirmedOrder.recipe.oil)} tsp
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-[#5d6c60]">
              Your customer record, order, and recipe version have been saved
              in the database under{' '}
              <span className="font-medium text-[#253a30]">
                {confirmedOrder.customer.contact}
              </span>{' '}
              so future reorders start from Version{' '}
              {confirmedOrder.recipe.version}.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
            >
              Done
            </button>
          </div>
        ) : step === 'stripe_redirect' && stripeCheckoutUrl && pendingOrder ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[#dce2d7] bg-white p-5">
              <p className="text-[14px] font-semibold text-[#253a30]">
                Order {pendingOrder.orderCode} saved ·{' '}
                {formatPrice(pendingOrder.totalCents)} SGD
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#5d6c60]">
                Your customer details and recipe (Version{' '}
                {pendingOrder.recipe.version}) are saved. Continue to Stripe
                Checkout to complete your card payment.
              </p>
            </div>

            <a
              href={stripeCheckoutUrl}
              target="_top"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white tabular-nums transition-colors hover:bg-[#3a594a]"
            >
              Continue to Stripe Checkout ·{' '}
              {formatPrice(pendingOrder.totalCents)}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : step === 'stripe_demo' && pendingOrder ? (
          <form
            onSubmit={handleConfirmDemoPayment}
            noValidate
            className="mt-6 space-y-5"
          >
            <div className="rounded-2xl border border-[#dce2d7] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#253a30]">
                    {pendingOrder.quantity} × {pendingOrder.recipe.dishName}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#5d6c60]">
                    Order {pendingOrder.orderCode} · Recipe v
                    {pendingOrder.recipe.version}
                  </p>
                </div>
                <span className="text-[18px] font-semibold text-[#253a30] tabular-nums">
                  {formatPrice(pendingOrder.totalCents)}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-t border-[#dce2d7] pt-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#253a30]">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  <span>Stripe card checkout (Test mode)</span>
                </div>

                <label className="block text-[12px] font-medium text-[#5d6c60]">
                  Card number
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#253a30] tabular-nums focus:border-[#253a30] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px] font-medium text-[#5d6c60]">
                    Expiry (MM/YY)
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#253a30] tabular-nums focus:border-[#253a30] focus:outline-none"
                    />
                  </label>

                  <label className="block text-[12px] font-medium text-[#5d6c60]">
                    CVC
                    <input
                      type="text"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#253a30] tabular-nums focus:border-[#253a30] focus:outline-none"
                    />
                  </label>
                </div>

                {errors.card && (
                  <p className="text-[12px] font-medium text-[#9d5738]">
                    {errors.card}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#dce2d7] bg-white px-5 py-3 text-[14px] font-semibold text-[#253a30] transition-colors hover:bg-[#e7ecdf]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white tabular-nums transition-colors hover:bg-[#3a594a] disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Confirming payment...'
                  : `Pay ${formatPrice(pendingOrder.totalCents)} with Stripe`}
              </button>
            </div>

            <p className="text-center text-[12px] text-[#5d6c60]">
              Running in Stripe test-card preview mode. Add `STRIPE_SECRET_KEY`
              in your server environment for live Stripe Checkout Sessions.
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleCheckoutSubmit}
            noValidate
            className="mt-5 space-y-4"
          >
            {/* Dish summary & selector */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[#dce2d7] bg-white p-4 sm:flex-row sm:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#eef0e7] sm:w-32">
                {!imageError ? (
                  <img
                    src={selectedMeal.imageSrc}
                    alt={selectedMeal.imageAlt}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2">
                    <MealIllustration dishId={selectedMeal.id} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-[12px] font-medium text-[#5d6c60]">
                  Dish · {selectedMeal.priceLabel}
                  <select
                    value={selectedMeal.id}
                    onChange={(e) => onSelectDish(e.target.value as DishId)}
                    className="mt-1 min-h-[40px] w-full rounded-[10px] border border-[#dce2d7] bg-[#fbfaf6] px-3 py-2 text-[14px] font-semibold text-[#253a30] focus:border-[#253a30] focus:outline-none"
                  >
                    {meals.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.name} ({meal.priceLabel})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#5d6c60] tabular-nums">
                  <span>
                    v{recipe.version} · Sugar {formatTsp(recipe.sugar)} tsp ·
                    Chilli {formatTsp(recipe.spice)} tsp · Oil{' '}
                    {formatTsp(recipe.oil)} tsp
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onJumpToPersonalise();
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-[#9d5738] underline-offset-2 hover:underline"
                  >
                    <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                    Adjust recipe
                  </button>
                </div>
              </div>
            </div>

            {/* Contact lookup + Customer Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label className="block text-[13px] font-medium text-[#253a30]">
                  Full name
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Mei Lin Tan"
                    aria-invalid={Boolean(errors.name)}
                    className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                  />
                </label>
                {errors.name && (
                  <p className="mt-1 text-[12px] font-medium text-[#9d5738]">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-6">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="order-contact"
                    className="text-[13px] font-medium text-[#253a30]"
                  >
                    Contact (mobile or email)
                  </label>
                  <button
                    type="button"
                    onClick={handleRecallRecipe}
                    disabled={isRecalling}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#9d5738] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    {isRecalling ? 'Checking...' : 'Recall recipe'}
                  </button>
                </div>
                <input
                  id="order-contact"
                  type="text"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="e.g. 9123 4567"
                  aria-invalid={Boolean(errors.contact)}
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                />
                {errors.contact && (
                  <p className="mt-1 text-[12px] font-medium text-[#9d5738]">
                    {errors.contact}
                  </p>
                )}
              </div>
            </div>

            {recallFeedback && (
              <p className="rounded-xl border border-[#dce2d7] bg-[#eef0e7] px-3.5 py-2.5 text-[12px] text-[#253a30]">
                {recallFeedback}
              </p>
            )}

            {/* Delivery address & Postal code */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="block text-[13px] font-medium text-[#253a30]">
                  Delivery address
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Blk 42 Tiong Bahru Rd, #06-112"
                    aria-invalid={Boolean(errors.address)}
                    className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                  />
                </label>
                {errors.address && (
                  <p className="mt-1 text-[12px] font-medium text-[#9d5738]">
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[13px] font-medium text-[#253a30]">
                  Postal code
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 168732"
                    aria-invalid={Boolean(errors.postal)}
                    className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] tabular-nums placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                  />
                </label>
                {errors.postal && (
                  <p className="mt-1 text-[12px] font-medium text-[#9d5738]">
                    {errors.postal}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity & Delivery slot */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <span className="block text-[13px] font-medium text-[#253a30]">
                  Portions ({selectedMeal.priceLabel} each)
                </span>
                <div className="mt-1.5 flex min-h-[44px] items-center justify-between rounded-[12px] border border-[#dce2d7] bg-white px-2">
                  <button
                    type="button"
                    aria-label="Decrease portion quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#253a30] transition-colors hover:bg-[#e7ecdf]"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="text-[15px] font-semibold text-[#253a30] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase portion quantity"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#253a30] transition-colors hover:bg-[#e7ecdf]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <label className="block text-[13px] font-medium text-[#253a30] sm:col-span-7">
                Delivery window
                <select
                  value={deliverySlot}
                  onChange={(e) => setDeliverySlot(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3 py-2 text-[14px] font-normal text-[#253a30] focus:border-[#253a30] focus:outline-none"
                >
                  {DELIVERY_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-[#253a30]">
                Recipe tweak note (optional)
                <input
                  type="text"
                  value={tweakNote}
                  onChange={(e) => onChangeTweakNote(e.target.value)}
                  placeholder="e.g. Lighter gravy next time"
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                />
              </label>

              <label className="block text-[13px] font-medium text-[#253a30]">
                Delivery note (optional)
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Leave at door, no utensils"
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
                />
              </label>
            </div>

            {errors.submit && (
              <p className="rounded-xl border border-[#d47b52] bg-[#d47b52]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#9d5738]">
                {errors.submit}
              </p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white tabular-nums transition-colors duration-150 hover:bg-[#3a594a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
              >
                {isSubmitting
                  ? 'Saving order...'
                  : `Continue to Stripe · ${formatPrice(totalCents)}`}
              </button>
              <p className="mt-2.5 text-center text-[12px] text-[#5d6c60]">
                Saves your contact, order, and tailored recipe tweaks for future
                reorders.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
