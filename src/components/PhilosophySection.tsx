import { PhilosophyProduceIllustration } from './Illustrations';

export function PhilosophySection() {
  return (
    <section id="story" className="py-16 md:py-22">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-[#dce2d7] bg-[#e2e8d8] p-8 md:min-h-[340px]">
              <PhilosophyProduceIllustration />
            </div>
          </div>

          <div className="lg:col-span-6">
            <p className="text-[13px] font-semibold tracking-wide text-[#9d5738]">
              The Wabi Sabi philosophy
            </p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,3.8vw,3rem)] leading-[1.16] font-semibold tracking-[-0.02em] text-[#253a30] [text-wrap:balance]">
              Goodness comes in every shape.
            </h2>

            <div className="mt-6 space-y-4 text-[16px] leading-[1.8] text-[#5d6c60]">
              <p>
                Wabi-sabi finds beauty in the imperfect. We believe a slightly
                crooked carrot or a funny-shaped tomato can still be part of
                something wonderful.
              </p>
              <p>
                By making thoughtful use of cosmetically imperfect produce where
                suitable, we aim to reduce unnecessary waste—without
                compromising food safety or the care that goes into each meal.
              </p>
              <p className="font-medium text-[#253a30]">
                It&apos;s better food thinking, made personal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
