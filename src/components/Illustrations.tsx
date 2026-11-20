import type { DishId } from '../data/meals';

export function HeroMealIllustration() {
  return (
    <svg
      viewBox="0 0 420 420"
      className="h-full w-full max-w-[360px] select-none drop-shadow-[0_24px_32px_rgba(37,58,48,0.2)]"
      role="img"
      aria-label="Handcrafted stoneware bowl with warm rice, roasted carrots, greens, and wooden chopsticks"
    >
      <defs>
        <radialGradient id="stonewarePlate" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fdf9ef" />
          <stop offset="72%" stopColor="#efe7d4" />
          <stop offset="100%" stopColor="#d8ccb4" />
        </radialGradient>
        <radialGradient id="ceramicBowl" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#355244" />
          <stop offset="100%" stopColor="#1e3128" />
        </radialGradient>
        <linearGradient id="brothWarm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8a771" />
          <stop offset="100%" stopColor="#c76e43" />
        </linearGradient>
      </defs>

      {/* Hand-thrown stoneware underplate with organic imperfect contour */}
      <path
        d="M212,48 C306,46 376,118 373,214 C370,304 298,376 206,374 C114,372 44,300 47,208 C50,118 120,50 212,48 Z"
        fill="url(#stonewarePlate)"
        stroke="#cbbfa6"
        strokeWidth="2"
      />
      <path
        d="M210,74 C289,73 349,134 347,212 C345,288 283,347 207,346 C131,345 72,285 74,209 C76,133 134,75 210,74 Z"
        fill="none"
        stroke="#dfd5c0"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />

      {/* Deep ceramic bowl */}
      <ellipse cx="210" cy="214" rx="118" ry="114" fill="url(#ceramicBowl)" />
      <ellipse
        cx="210"
        cy="210"
        rx="105"
        ry="101"
        fill="#f7eedb"
        stroke="#466656"
        strokeWidth="3"
      />

      {/* Warm golden curry/broth crescent */}
      <path
        d="M116,204 C122,265 170,304 226,300 C276,296 308,255 304,202 C272,226 168,236 116,204 Z"
        fill="url(#brothWarm)"
        opacity="0.92"
      />

      {/* Steamed rice mound with subtle grain texture */}
      <path
        d="M132,196 C136,142 178,118 228,124 C274,130 296,166 290,204 C252,224 168,224 132,196 Z"
        fill="#fffdf8"
      />
      <g fill="#dfd6c3">
        <circle cx="182" cy="155" r="2" />
        <circle cx="212" cy="146" r="1.8" />
        <circle cx="240" cy="162" r="2" />
        <circle cx="196" cy="178" r="1.8" />
        <circle cx="226" cy="184" r="2" />
      </g>

      {/* Crooked heirloom carrot medallions */}
      <ellipse
        cx="164"
        cy="242"
        rx="18"
        ry="14"
        transform="rotate(-18 164 242)"
        fill="#d47b52"
      />
      <ellipse
        cx="164"
        cy="242"
        rx="8"
        ry="6"
        transform="rotate(-18 164 242)"
        fill="#e79c73"
      />
      <ellipse
        cx="196"
        cy="264"
        rx="16"
        ry="12"
        transform="rotate(14 196 264)"
        fill="#c8683e"
      />

      {/* Seasonal greens / bok choy leaves */}
      <path
        d="M236,222 C256,198 286,204 288,228 C290,248 264,264 240,254 C228,248 228,232 236,222 Z"
        fill="#5f8669"
      />
      <path
        d="M245,230 C258,218 274,222 274,234"
        fill="none"
        stroke="#a7c4ab"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M214,242 C226,226 248,230 250,248 C252,262 232,274 216,264 C208,258 208,250 214,242 Z"
        fill="#789f81"
      />

      {/* Soft-set egg / tofu cube */}
      <rect
        x="150"
        y="188"
        width="34"
        height="30"
        rx="9"
        transform="rotate(-12 150 188)"
        fill="#f9e6b3"
        stroke="#e6c882"
        strokeWidth="1.5"
      />

      {/* Sesame & scallion garnish */}
      <g fill="#253a30">
        <ellipse cx="206" cy="164" rx="2.5" ry="1.3" transform="rotate(28 206 164)" />
        <ellipse cx="218" cy="171" rx="2.5" ry="1.3" transform="rotate(-15 218 171)" />
        <ellipse cx="193" cy="169" rx="2.5" ry="1.3" transform="rotate(42 193 169)" />
      </g>
      <circle cx="254" cy="248" r="5" fill="#d95d43" />
      <circle cx="241" cy="264" r="4" fill="#d95d43" />

      {/* Warm cedar chopsticks resting beside the rim */}
      <g transform="rotate(-24 315 170)">
        <rect x="282" y="54" width="7" height="255" rx="3.5" fill="#7c5338" />
        <rect x="296" y="58" width="6.5" height="252" rx="3.2" fill="#926344" />
      </g>
    </svg>
  );
}

export function MealIllustration({ dishId }: { dishId: DishId }) {
  if (dishId === 'curry-rice') {
    return (
      <svg
        viewBox="0 0 260 180"
        className="h-40 w-full max-w-[230px]"
        role="img"
        aria-label="Illustration of Homestyle Curry Rice in a ceramic plate"
      >
        <ellipse cx="130" cy="96" rx="84" ry="66" fill="#fffdf7" stroke="#d5cab4" strokeWidth="2.5" />
        <path
          d="M66,95 C68,132 100,150 144,146 C182,142 198,118 196,90 C166,104 106,108 66,95 Z"
          fill="#d7874b"
        />
        <path
          d="M78,86 C86,52 128,44 162,56 C184,64 192,82 184,96 C150,108 100,104 78,86 Z"
          fill="#fbf8f0"
        />
        <circle cx="106" cy="118" r="11" fill="#e2a868" />
        <circle cx="136" cy="126" r="9" fill="#c7663e" />
        <path d="M156,112 C168,104 182,110 178,122 C174,132 158,128 156,112 Z" fill="#698b6f" />
        <circle cx="130" cy="74" r="2" fill="#253a30" />
        <circle cx="142" cy="80" r="2" fill="#253a30" />
        <circle cx="120" cy="82" r="2" fill="#253a30" />
      </svg>
    );
  }

  if (dishId === 'garden-bowl') {
    return (
      <svg
        viewBox="0 0 260 180"
        className="h-40 w-full max-w-[230px]"
        role="img"
        aria-label="Illustration of Garden Goodness Bowl with seasonal greens and grains"
      >
        <circle cx="130" cy="92" r="68" fill="#2f4a3c" />
        <circle cx="130" cy="90" r="60" fill="#fbf8f0" />
        {/* Grains */}
        <path d="M84,96 C90,126 122,138 152,130 C166,126 174,112 172,96 Z" fill="#e5d4b1" />
        {/* Avocado & Greens */}
        <path d="M86,84 C94,54 128,46 154,60 C164,66 168,82 156,92 C132,102 98,98 86,84 Z" fill="#6d9575" />
        <path d="M114,76 C126,64 148,68 148,84 C148,96 126,102 114,90 Z" fill="#98ba8f" />
        {/* Cherry tomatoes */}
        <circle cx="158" cy="102" r="10" fill="#d46848" />
        <circle cx="144" cy="116" r="8" fill="#de7f5b" />
        {/* Roasted root veg */}
        <rect x="92" y="102" width="22" height="14" rx="6" transform="rotate(-15 92 102)" fill="#d4894f" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 260 180"
      className="h-40 w-full max-w-[230px]"
      role="img"
      aria-label="Illustration of Sweet and Sour Noodles in a warm glaze"
    >
      <circle cx="130" cy="92" r="68" fill="#3a4c42" />
      <circle cx="130" cy="90" r="60" fill="#f9f2e4" />
      {/* Noodles swirl */}
      <g fill="none" stroke="#e3b768" strokeWidth="6" strokeLinecap="round">
        <path d="M88,88 C100,60 156,58 170,88" />
        <path d="M84,98 C104,74 158,76 174,100" />
        <path d="M90,110 C112,92 154,94 168,112" />
        <path d="M100,122 C118,110 146,110 158,122" />
      </g>
      {/* Sweet & sour glaze accents, peppers, pineapple/tomato */}
      <circle cx="110" cy="84" r="8" fill="#d46444" />
      <circle cx="148" cy="92" r="7" fill="#d46444" />
      <rect x="122" y="102" width="16" height="14" rx="4" transform="rotate(18 122 102)" fill="#efc45c" />
      <path d="M132,72 C140,66 150,70 146,78" fill="none" stroke="#5e8767" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function PhilosophyProduceIllustration() {
  return (
    <svg
      viewBox="0 0 360 280"
      className="h-full w-full max-w-[320px]"
      role="img"
      aria-label="Illustration of a curved heirloom carrot and an asymmetric ripe tomato resting on linen"
    >
      {/* Linen cloth fold */}
      <rect x="34" y="48" width="292" height="184" rx="22" fill="#f3efe3" stroke="#d4dacb" strokeWidth="1.5" />
      <path d="M60,204 C130,192 220,214 300,196" fill="none" stroke="#dde2d4" strokeWidth="2" />

      {/* Crooked heirloom carrot */}
      <g transform="translate(52, 24)">
        {/* Leafy tops */}
        <path d="M62,92 C44,68 38,54 48,44" fill="none" stroke="#4f7859" strokeWidth="4" strokeLinecap="round" />
        <path d="M68,90 C62,62 66,44 78,38" fill="none" stroke="#5f8b6a" strokeWidth="4" strokeLinecap="round" />
        <path d="M74,94 C82,70 96,58 106,56" fill="none" stroke="#456b4f" strokeWidth="3.5" strokeLinecap="round" />
        {/* Curved carrot body */}
        <path
          d="M54,96 C66,84 86,88 92,102 C102,126 98,154 114,174 C126,188 144,196 154,206 C158,210 152,216 144,212 C122,202 92,190 74,162 C60,140 42,110 54,96 Z"
          fill="#d47b52"
        />
        <path d="M66,118 L78,114 M76,140 L90,136 M94,164 L106,158" stroke="#b45c36" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Funny-shaped heirloom tomato */}
      <g transform="translate(185, 92)">
        <path
          d="M58,28 C84,22 108,38 112,64 C116,88 98,110 74,114 C58,116 44,108 32,110 C14,112 2,94 4,70 C6,42 30,34 58,28 Z"
          fill="#cf6244"
        />
        {/* Highlight */}
        <path
          d="M26,56 C32,44 48,40 60,42"
          fill="none"
          stroke="#ea967c"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Calyx stem */}
        <path d="M56,28 L46,16 M56,28 L68,14 M56,28 L56,8 M56,28 L40,28 M56,28 L72,28" stroke="#486e51" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
