import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, X } from 'lucide-react';
import type { DishId } from '../data/meals';
import {
  getSavedCustomerProfile,
  joinLaunchList,
  type LaunchListEntry,
} from '../lib/ordersRepository';

interface LaunchBannerProps {
  preferredDishId: DishId;
  preferredDishName: string;
  onLaunchJoined: (message: string) => void;
}

export function LaunchBanner({
  preferredDishId,
  preferredDishName,
  onLaunchJoined,
}: LaunchBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedEntry, setJoinedEntry] = useState<{
    entry: LaunchListEntry;
    alreadyRegistered: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const saved = getSavedCustomerProfile();
    if (saved) {
      setName((prev) => prev || saved.name);
      setContact((prev) => prev || saved.contact);
    }
  }, [isExpanded]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact);
    const digits = trimmedContact.replace(/\D/g, '');
    const isPhone = digits.length >= 8 && digits.length <= 15;
    if (!trimmedContact || (!isEmail && !isPhone)) {
      setError('Enter a valid email address or Singapore mobile number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await joinLaunchList({
        name: trimmedName,
        contact: trimmedContact,
        neighbourhood: neighbourhood.trim(),
        preferredDishId,
      });

      setJoinedEntry(result);
      onLaunchJoined(
        result.alreadyRegistered
          ? `Updated launch list details for ${result.entry.name} (${result.entry.contact}).`
          : `Added ${result.entry.name} to the Wabi Sabi Singapore launch list.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your launch list details right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="launch-list" className="pb-16 md:pb-22">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="rounded-[28px] bg-[#253a30] px-6 py-12 text-center text-white md:px-14 md:py-16">
          <p className="text-[13px] font-semibold tracking-wide text-[#e2b798]">
            Coming to Singapore
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,2.75rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-white [text-wrap:balance]">
            Your recipe, remembered.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-[1.7] text-[#d5e0d5]">
            Beautifully imperfect ingredients. Deliciously personal meals. More
            time for everything else.
          </p>

          {!isExpanded && !joinedEntry && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#f3e7cf] px-7 py-3 text-[15px] font-semibold text-[#253a30] transition-colors duration-150 hover:bg-[#ead9b6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e7cf]"
              >
                Join the launch list
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {isExpanded && !joinedEntry && (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-8 max-w-[680px] rounded-[20px] border border-white/15 bg-[#1d2f27] p-5 text-left md:p-6"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3.5">
                <div>
                  <p className="text-[14px] font-semibold text-[#f3e7cf]">
                    Join the Singapore launch list
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#c3d0c4]">
                    First dish preference saved: {preferredDishName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setError(null);
                  }}
                  aria-label="Close launch list form"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c3d0c4] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e7cf]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-[#d5e0d5]">
                    Your name *
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Wei Ming"
                    maxLength={100}
                    className="mt-1.5 min-h-[42px] w-full rounded-[10px] border border-white/20 bg-[#253a30] px-3 py-2 text-[14px] text-white placeholder:text-[#98aa9b] focus:border-[#f3e7cf] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-[12px] font-medium text-[#d5e0d5]">
                    Email or SG mobile *
                  </span>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. +65 9123 4567"
                    maxLength={160}
                    className="mt-1.5 min-h-[42px] w-full rounded-[10px] border border-white/20 bg-[#253a30] px-3 py-2 text-[14px] text-white placeholder:text-[#98aa9b] focus:border-[#f3e7cf] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-[12px] font-medium text-[#d5e0d5]">
                    Neighbourhood (optional)
                  </span>
                  <input
                    type="text"
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                    placeholder="e.g. Tiong Bahru"
                    maxLength={80}
                    className="mt-1.5 min-h-[42px] w-full rounded-[10px] border border-white/20 bg-[#253a30] px-3 py-2 text-[14px] text-white placeholder:text-[#98aa9b] focus:border-[#f3e7cf] focus:outline-none"
                  />
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 text-[13px] font-medium text-[#f5b192]"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-[#c3d0c4]">
                  Saved securely to the launch list table—no spam.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#f3e7cf] px-6 py-2.5 text-[14px] font-semibold text-[#253a30] transition-colors duration-150 hover:bg-[#ead9b6] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e7cf]"
                >
                  {isSubmitting ? 'Saving...' : 'Reserve early access'}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {joinedEntry && (
            <div className="mx-auto mt-8 max-w-[540px] rounded-[20px] border border-[#f3e7cf]/30 bg-[#1d2f27] px-6 py-5 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3e7cf] text-[#253a30]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#f3e7cf]">
                    {joinedEntry.alreadyRegistered
                      ? 'Your launch list details are updated'
                      : "You're on the Singapore launch list"}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.6] text-[#d5e0d5]">
                    Registered for{' '}
                    <span className="font-medium text-white">
                      {joinedEntry.entry.name}
                    </span>{' '}
                    ({joinedEntry.entry.contact})
                    {joinedEntry.entry.neighbourhood
                      ? ` · ${joinedEntry.entry.neighbourhood}`
                      : ''}
                    .
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setJoinedEntry(null);
                    setIsExpanded(true);
                  }}
                  className="text-[12px] font-medium text-[#e2b798] underline-offset-4 hover:underline"
                >
                  Update or test another entry
                </button>
              </div>
            </div>
          )}

          <p className="mt-4 text-[12px] text-[#c3d0c4]">
            We&apos;ll notify you when weekly kitchen slots open in your
            neighbourhood.
          </p>
        </div>
      </div>
    </section>
  );
}
