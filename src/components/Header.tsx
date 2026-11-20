import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#meals', label: 'Our meals' },
  { href: '#personalise', label: 'Your recipe' },
  { href: '#story', label: 'Our philosophy' },
];

interface HeaderProps {
  onOpenOrder: () => void;
}

export function Header({ onOpenOrder }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#dce2d7] bg-[#fbf8f0]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="whitespace-nowrap shrink-0 font-serif text-[25px] font-bold tracking-[-0.04em] text-[#253a30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#253a30]"
        >
          wabi<span className="text-[#d47b52]"> sabi.</span>
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-sm font-medium text-[#5d6c60] md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 underline-offset-4 transition-colors duration-150 hover:text-[#253a30] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#253a30]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single primary action on desktop, menu toggle on mobile */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenOrder}
            className="hidden min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-full bg-[#253a30] px-5 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#3a594a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30] sm:inline-flex"
          >
            Order food · $9.50
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dce2d7] bg-white text-[#253a30] transition-colors duration-150 hover:bg-[#e7ecdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253a30] md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {menuOpen && (
        <nav
          aria-label="Mobile"
          className="border-t border-[#dce2d7] bg-[#fbf8f0] px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="min-h-[44px] flex items-center text-[15px] font-medium text-[#253a30] transition-colors hover:text-[#d47b52]"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenOrder();
              }}
              className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#253a30] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3a594a]"
            >
              Order food · $9.50
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
