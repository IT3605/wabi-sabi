import crypto from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

// Strip ASCII control characters and angle brackets to prevent stored XSS / header injection
export function sanitizePlainText(value: string, maxLength = 300): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const isValidPhone = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
};

export const ALLOWED_DELIVERY_SLOTS = [
  'Today · Dinner (18:30 – 19:30)',
  'Tomorrow · Lunch (12:00 – 13:00)',
  'Tomorrow · Dinner (18:30 – 19:30)',
] as const;

export const contactSchema = z
  .string()
  .transform((val) => sanitizePlainText(val, 160))
  .refine((val) => isValidEmail(val) || isValidPhone(val), {
    message: 'Enter a valid Singapore mobile number or email.',
  });

export const dishIdSchema = z.enum([
  'curry-rice',
  'garden-bowl',
  'sweet-sour-noodles',
]);

export const tspValueSchema = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((n) => Number.isFinite(n) && n >= 0 && n <= 5, {
    message: 'Measurement must be between 0 and 5 tsp.',
  });

export const orderCodeSchema = z
  .string()
  .trim()
  .regex(/^WS-[A-Z0-9]{4,12}$/, 'Invalid order reference format.');

export const saveRecipePayloadSchema = z.object({
  customer: z.object({
    name: z
      .string()
      .transform((v) => sanitizePlainText(v, 100))
      .refine((v) => v.length >= 1, 'Customer name is required.'),
    contact: contactSchema,
    address: z
      .string()
      .optional()
      .default('')
      .transform((v) => sanitizePlainText(v, 240)),
    postalCode: z
      .string()
      .optional()
      .default('')
      .transform((v) => sanitizePlainText(v, 12)),
  }),
  dishId: dishIdSchema,
  dishName: z
    .string()
    .transform((v) => sanitizePlainText(v, 120))
    .refine((v) => v.length >= 2, 'Dish name is required.'),
  sugar: tspValueSchema,
  spice: tspValueSchema,
  oil: tspValueSchema,
  tweakNote: z
    .string()
    .optional()
    .default('')
    .transform((v) => sanitizePlainText(v, 300)),
});

export const checkoutPayloadSchema = z.object({
  customer: z.object({
    name: z
      .string()
      .transform((v) => sanitizePlainText(v, 100))
      .refine((v) => v.length >= 1, 'Please enter your name.'),
    contact: contactSchema,
    address: z
      .string()
      .transform((v) => sanitizePlainText(v, 240))
      .refine((v) => v.length >= 3, 'Please enter your street and unit address.'),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter a valid 6-digit Singapore postal code.'),
  }),
  recipe: z.object({
    dishId: dishIdSchema,
    sugar: tspValueSchema,
    spice: tspValueSchema,
    oil: tspValueSchema,
  }),
  quantity: z.coerce.number().int().min(1).max(20),
  deliverySlot: z.enum(ALLOWED_DELIVERY_SLOTS).default(ALLOWED_DELIVERY_SLOTS[0]),
  deliveryNotes: z
    .string()
    .optional()
    .default('')
    .transform((v) => sanitizePlainText(v, 300)),
  tweakNote: z
    .string()
    .optional()
    .default('')
    .transform((v) => sanitizePlainText(v, 300)),
});

export const stripeVerifyQuerySchema = z.object({
  session_id: z
    .string()
    .trim()
    .min(10)
    .max(200)
    .regex(/^[A-Za-z0-9_]+$/, 'Invalid Stripe session ID.'),
  order_code: orderCodeSchema,
});

// ---------------------------------------------------------------------------
// Signed HttpOnly Session Cookie (protects customer PII from enumeration)
// ---------------------------------------------------------------------------

const SESSION_COOKIE_NAME = 'ws_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32);

function getSessionSecret(): Buffer {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured !== 'MY_SESSION_SECRET' && configured.length >= 16) {
    return crypto.createHash('sha256').update(configured).digest();
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function issueCustomerSessionCookie(
  c: Context,
  normalizedContact: string
): void {
  const payload = Buffer.from(
    JSON.stringify({
      sub: normalizedContact,
      exp: Date.now() + SESSION_TTL_MS,
    }),
    'utf8'
  ).toString('base64url');
  const signature = signPayload(payload);
  const token = `${payload}.${signature}`;

  const proto = c.req.header('x-forwarded-proto') || 'http';
  const isHttps = proto === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  c.header('Set-Cookie', parts.join('; '));
}

export function readVerifiedCustomerContact(c: Context): string | null {
  const cookieHeader = c.req.header('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  let rawToken = '';
  for (const part of cookies) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      rawToken = rest.join('=');
      break;
    }
  }
  if (!rawToken) return null;

  const dotIdx = rawToken.indexOf('.');
  if (dotIdx <= 0) return null;

  const encodedPayload = rawToken.slice(0, dotIdx);
  const providedSig = rawToken.slice(dotIdx + 1);
  const expectedSig = signPayload(encodedPayload);

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as { sub?: unknown; exp?: unknown };
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed.sub;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sliding-Window In-Memory Rate Limiter
// ---------------------------------------------------------------------------

interface RateBucket {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}): MiddlewareHandler {
  const buckets = new Map<string, RateBucket>();

  return async (c, next) => {
    const now = Date.now();
    const forwarded = c.req.header('x-forwarded-for');
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip')?.trim() ||
      'local';
    const key = `${options.keyPrefix}:${ip}`;

    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter(
      (ts) => now - ts < options.windowMs
    );

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((options.windowMs - (now - oldest)) / 1000)
      );
      c.header('Retry-After', String(retryAfterSec));
      return c.json(
        {
          error:
            'Too many requests from this connection. Please wait a moment and try again.',
        },
        429
      );
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    if (buckets.size > 2000) {
      for (const [entryKey, entryBucket] of buckets.entries()) {
        if (
          entryBucket.timestamps.length === 0 ||
          now - entryBucket.timestamps[entryBucket.timestamps.length - 1] >
            options.windowMs
        ) {
          buckets.delete(entryKey);
        }
      }
    }

    await next();
  };
}

// ---------------------------------------------------------------------------
// Strict Content-Type & Same-Origin CSRF Defense
// ---------------------------------------------------------------------------

export const requireJsonContentType: MiddlewareHandler = async (c, next) => {
  if (c.req.method.toUpperCase() === 'POST') {
    const contentType = c.req.header('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) {
      return c.json(
        { error: 'Content-Type must be application/json.' },
        415
      );
    }
  }
  await next();
};

export const verifySameOriginWrite: MiddlewareHandler = async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    await next();
    return;
  }

  // Stripe webhooks are signed with Stripe-Signature and posted by Stripe servers
  if (c.req.path === '/api/stripe/webhook') {
    await next();
    return;
  }

  const secFetchSite = c.req.header('sec-fetch-site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return c.json({ error: 'Cross-site write request blocked.' }, 403);
  }

  const origin = c.req.header('origin');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return c.json({ error: 'Invalid request origin.' }, 403);
    }

    const expectedHosts = new Set<string>();
    const hostHeader = c.req.header('host')?.toLowerCase();
    const forwardedHost = c.req.header('x-forwarded-host')?.toLowerCase();
    if (hostHeader) expectedHosts.add(hostHeader);
    if (forwardedHost) expectedHosts.add(forwardedHost);

    const appUrl = process.env.APP_URL?.trim();
    if (appUrl && appUrl !== 'MY_APP_URL') {
      try {
        expectedHosts.add(new URL(appUrl).host.toLowerCase());
      } catch {
        // Ignore malformed APP_URL
      }
    }

    if (expectedHosts.size > 0 && !expectedHosts.has(originHost)) {
      return c.json({ error: 'Origin mismatch blocked.' }, 403);
    }
  }

  await next();
};

export function isTrustedHost(host: string): boolean {
  const cleanHost = host.split(':')[0].toLowerCase();
  if (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.endsWith('.run.app')
  ) {
    return true;
  }
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && appUrl !== 'MY_APP_URL') {
    try {
      return new URL(appUrl).hostname.toLowerCase() === cleanHost;
    } catch {
      return false;
    }
  }
  return false;
}
