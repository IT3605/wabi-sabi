const STEPS = [
  {
    number: '01',
    title: 'Pick your meal',
    body: "Choose something delicious. We work with good-quality produce, including fruits and vegetables that aren't picture-perfect.",
    spanClass: 'lg:col-span-4',
  },
  {
    number: '02',
    title: 'Make it yours',
    body: 'Tell us how you like it: sweeter, spicier, less oily. We translate your preferences into specific recipe adjustments.',
    spanClass: 'lg:col-span-4',
  },
  {
    number: '03',
    title: 'Eat. Refine. Repeat.',
    body: 'Your meal arrives with its recipe. Adjust it for next time and we remember your preferred version.',
    spanClass: 'lg:col-span-4',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[#eef0e7] py-16 md:py-22">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mx-auto max-w-[660px] text-center">
          <p className="text-[13px] font-semibold tracking-wide text-[#9d5738]">
            A simpler way to eat
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.8vw,3rem)] leading-[1.16] font-semibold tracking-[-0.02em] text-[#253a30] [text-wrap:balance]">
            More living. Less meal planning.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-[#5d6c60]">
            From the first bite to your favourite version, we make everyday
            meals feel personal.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`${step.spanClass} flex flex-col justify-between rounded-[20px] border border-[#dce2d7] bg-white p-7`}
            >
              <div>
                <span className="font-serif text-[34px] leading-none font-semibold text-[#d47b52] tabular-nums">
                  {step.number}
                </span>
                <h3 className="mt-5 text-[19px] font-semibold text-[#253a30]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-[#5d6c60]">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
