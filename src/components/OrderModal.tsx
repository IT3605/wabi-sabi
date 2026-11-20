import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  MEALS,
  MEAL_PRICE_CENTS,
  formatPrice,
  formatTsp,
  type DishId,
  type RecipeState,
} from '../data/meals';
import {
  getSavedCustomerProfile,
  recallCustomerData,
  submitMealOrder,
  type OrderRecord,
} from '../lib/ordersRepository';
import { MealIllustration } from './Illustrations';

interface OrderModalProps {
  isOpen: boolean;
  recipe: RecipeState;
  onClose: () => void;
  onSelectDish: (dishId: DishId) => void;
  onRecipeRecalled: (recipe: RecipeState) => void;
  onJumpToPersonalise: () => void;
  onOrderConfirmed: (order: OrderRecord) => void;
}

const DELIVERY_SLOTS = [
  'Today · Dinner (18:30 – 19:30)',
  'Tomorrow · Lunch (12:00 – 13:00)',
  'Tomorrow · Dinner (18:30 – 19:30)',
];

export function OrderModal({
  isOpen,
  recipe,
  onClose,
  onSelectDish,
  onRecipeRecalled,
  onJumpToPersonalise,
  onOrderConfirmed,
}: OrderModalProps) {
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
    submit?: string;
  }>({});
  const [recallFeedback, setRecallFeedback] = useState<string | null>(null);
  const [isRecalling, setIsRecalling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(
    null
  );
  const [imageError, setImageError] = useState(false);

  const selectedMeal = MEALS.find((m) => m.id === recipe.dishId) ?? MEALS[0];
  const totalCents = MEAL_PRICE_CENTS * quantity;

  useEffect(() => {
    setImageError(false);
  }, [selectedMeal.id]);

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
    setSubmittedOrder(null);
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

      const dishRecipe = result.recipesByDish[selectedMeal.id];
      if (dishRecipe) {
        onRecipeRecalled(dishRecipe);
        setRecallFeedback(
          `Loaded your saved ${selectedMeal.name} recipe (Version ${dishRecipe.version}).`
        );
      } else if (result.profile) {
        setRecallFeedback(
          `Loaded delivery details for ${result.profile.name}. Customise ${selectedMeal.name} below or adjust before ordering.`
        );
      } else {
        setRecallFeedback(
          'No previous recipe found for this contact yet. Your current customisation will be saved with this order.'
        );
      }
    } catch {
      setRecallFeedback('Could not check saved recipes right now.');
    } finally {
      setIsRecalling(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
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
      const order = await submitMealOrder({
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
      });

      setSubmittedOrder(order);
      onOrderConfirmed(order);
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : 'Unable to submit your order right now.',
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
              {submittedOrder ? 'Order & recipe saved' : 'Order your meal'}
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

        {submittedOrder ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[#dce2d7] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7ecdf] text-[#253a30]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-[#253a30]">
                      {submittedOrder.quantity} × {submittedOrder.recipe.dishName}
                    </p>
                    <p className="text-[13px] text-[#5d6c60]">
                      {submittedOrder.deliverySlot}
                    </p>
                  </div>
                </div>

                <span className="text-[15px] font-semibold text-[#253a30] tabular-nums">
                  {formatPrice(submittedOrder.totalCents)}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-[#dce2d7] pt-4 text-[13px] text-[#5d6c60]">
                <p>
                  <span className="font-semibold text-[#253a30]">
                    Deliver to:
                  </span>{' '}
                  {submittedOrder.customer.name} ({submittedOrder.customer.contact})
                </p>
                <p>
                  {submittedOrder.customer.address}, Singapore{' '}
                  {submittedOrder.customer.postalCode}
                </p>
              </div>

              <div className="mt-4 border-t border-[#dce2d7] pt-4 text-[13px] text-[#5d6c60] tabular-nums">
                <p className="font-semibold text-[#253a30]">
                  Saved recipe for future orders · Version{' '}
                  {submittedOrder.recipe.version}
                </p>
                <p className="mt-1">
                  Sugar: {formatTsp(submittedOrder.recipe.sugar)} tsp · Chilli:{' '}
                  {formatTsp(submittedOrder.recipe.spice)} tsp · Oil:{' '}
                  {formatTsp(submittedOrder.recipe.oil)} tsp
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-[#5d6c60]">
              Your tailored recipe has been saved under{' '}
              <span className="font-medium text-[#253a30]">
                {submittedOrder.customer.contact}
              </span>{' '}
              so future orders can start from Version{' '}
              {submittedOrder.recipe.version} and refine from there.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
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
                    {MEALS.map((meal) => (
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

            <label className="block text-[13px] font-medium text-[#253a30]">
              Delivery note (optional)
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Leave at door, no utensils needed, etc."
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#dce2d7] bg-white px-3.5 py-2 text-[14px] font-normal text-[#253a30] placeholder:text-[#5d6c60]/60 focus:border-[#253a30] focus:outline-none"
              />
            </label>

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
                  ? 'Saving order & recipe...'
                  : `Place order · ${formatPrice(totalCents)}`}
              </button>
              <p className="mt-2.5 text-center text-[12px] text-[#5d6c60]">
                Your tailored recipe is saved with your contact for future
                reorders and refinements.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
