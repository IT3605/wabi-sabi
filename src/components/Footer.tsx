export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#dce2d7] py-9 text-[13px] text-[#5d6c60]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6">
        <span className="font-serif text-[20px] font-bold tracking-[-0.04em] text-[#253a30]">
          wabi<span className="text-[#d47b52]"> sabi.</span>
        </span>
        <span>Beautifully Imperfect. Deliciously Personal.</span>
        <span>© {year} Wabi Sabi · Singapore · Concept preview</span>
      </div>
    </footer>
  );
}
