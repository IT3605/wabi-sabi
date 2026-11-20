import { ArrowUpRight } from 'lucide-react';

interface LaunchBannerProps {
  onLaunchInterest: () => void;
}

export function LaunchBanner({ onLaunchInterest }: LaunchBannerProps) {
  return (
    <section className="pb-16 md:pb-22">
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

          <div className="mt-8">
            <button
              type="button"
              onClick={onLaunchInterest}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#f3e7cf] px-7 py-3 text-[15px] font-semibold text-[#253a30] transition-colors duration-150 hover:bg-[#ead9b6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e7cf]"
            >
              Join the launch list
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-4 text-[12px] text-[#c3d0c4]">
            Launch registration is a preview; no information is collected yet.
          </p>
        </div>
      </div>
    </section>
  );
}
