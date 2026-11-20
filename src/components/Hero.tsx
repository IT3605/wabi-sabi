import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HeroMealIllustration } from './Illustrations';

const HERO_IMAGE_SRC = '/src/assets/images/hero_wabi_sabi_meal_1795162138881.jpg';

export function Hero() {
  const [imageError, setImageError] = useState(false);

  return (
    <section className="mx-auto max-w-[1180px] px-6 pt-12 pb-16 md:pt-18 md:pb-22">
      <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-[13px] font-semibold tracking-wide text-[#9d5738]">
            Thoughtful meals · Singapore
          </p>

          <h1 className="mt-5 font-serif text-[clamp(2.75rem,5vw,4.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-[#253a30] [text-wrap:balance]">
            Beautifully{' '}
            <em className="font-medium italic text-[#d47b52]">Imperfect.</em>
            <br />
            Deliciously Personal.
          </h1>

          <p className="mt-6 max-w-[480px] text-[17px] leading-[1.75] text-[#5d6c60]">
            Good food, made your way. No grocery runs. No cooking. Just
            thoughtfully prepared meals delivered with a recipe that&apos;s
            uniquely yours.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#meals"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-full bg-[#253a30] px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
            >
              Explore the meals
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <a
              href="#how"
              className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap shrink-0 rounded-full border border-[#dce2d7] bg-white px-6 py-3 text-[15px] font-semibold text-[#253a30] transition-colors duration-150 hover:bg-[#e7ecdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30]"
            >
              How it works
            </a>
          </div>

          <p className="mt-5 text-[13px] text-[#5d6c60]">
            Made for busy Singapore days. Inspired by the beauty of
            imperfection.
          </p>
        </div>

        <div className="lg:col-span-6">
          <div className="relative flex min-h-[400px] h-full items-center justify-center overflow-hidden rounded-t-[220px] rounded-b-[28px] border border-[#dce2d7] bg-[radial-gradient(circle_at_52%_42%,#f6e7cb_0_30%,#dfd9bf_31%_44%,transparent_45%),linear-gradient(140deg,#a4b99b_0%,#6f8e7d_100%)] lg:min-h-[520px]">
            {!imageError ? (
              <>
                <img
                  src={HERO_IMAGE_SRC}
                  alt="Steaming homestyle meal with jasmine rice, roasted carrots, bok choy, and soft-boiled egg in a dark green stoneware bowl on natural linen"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
                />
              </>
            ) : (
              <div className="px-8 pt-10 pb-24">
                <HeroMealIllustration />
              </div>
            )}

            <div className="absolute bottom-6 left-6 max-w-[255px] rounded-2xl border border-[#dce2d7] bg-[#fffdf5]/95 px-5 py-4 shadow-[0_14px_32px_rgba(29,51,43,0.18)] backdrop-blur-sm">
              <p className="text-sm font-semibold text-[#253a30]">
                Your recipe, remembered.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5d6c60]">
                Less sweet? More spicy? Next time, we&apos;ll know.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
