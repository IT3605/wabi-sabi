import 'dotenv/config';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import {
  attachStripeSessionToOrder,
  createOrderRecord,
  getActiveMenuPrices,
  getCustomerBundleByContact,
  getMenuPriceByDishId,
  getOrderByCode,
  markOrderPaid,
  normalizeContact,
  saveRecipeWithTweak,
  testDatabaseConnection,
  upsertCustomer,
  upsertLaunchListEntry,
} from './src/server/db.ts';
import {
  checkoutPayloadSchema,
  contactSchema,
  createRateLimiter,
  isTrustedHost,
  issueCustomerSessionCookie,
  launchListPayloadSchema,
  orderCodeSchema,
  readVerifiedCustomerContact,
  requireJsonContentType,
  saveRecipePayloadSchema,
  stripeVerifyQuerySchema,
  verifySameOriginWrite,
} from './src/server/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || key === 'MY_STRIPE_SECRET_KEY') {
    return null;
  }
  return new Stripe(key);
}

function resolveBaseUrl(headers: Headers): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl.replace(/\/$/, '');
  }

  const candidateHost =
    headers.get('x-forwarded-host') || headers.get('host') || '';
  if (candidateHost && isTrustedHost(candidateHost)) {
    const proto =
      headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${proto}://${candidateHost}`;
  }

  return `http://localhost:${PORT}`;
}

function isAllowedCorsOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return isTrustedHost(parsed.host);
  } catch {
    return false;
  }
}

function applyHtmlSecurityHeaders(res: http.ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  if (IS_PRODUCTION) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self' https://api.stripe.com",
        "form-action 'self' https://checkout.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; ')
    );
  }
}

function createApiApp(): Hono {
  const app = new Hono();

  // Global HTTP security headers
  app.use(
    '*',
    secureHeaders({
      xFrameOptions: false,
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    })
  );

  // Prevent caching of sensitive API responses (PII, orders, payment state)
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store, max-age=0');
    c.header('Pragma', 'no-cache');
  });

  // Strict CORS on API routes
  app.use(
    '/api/*',
    cors({
      origin: (origin) => (isAllowedCorsOrigin(origin) ? origin : ''),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      credentials: true,
      maxAge: 600,
    })
  );

  // Cap request body size at 16 KB (64 KB for Stripe webhook payloads)
  app.use('/api/*', async (c, next) => {
    const maxSize = c.req.path === '/api/stripe/webhook' ? 64 * 1024 : 16 * 1024;
    const limiter = bodyLimit({
      maxSize,
      onError: (ctx) => ctx.json({ error: 'Request payload is too large.' }, 413),
    });
    return limiter(c, next);
  });

  // Same-origin CSRF check for all mutating API calls
  app.use('/api/*', verifySameOriginWrite);

  // General API rate limit + stricter rate limits on write/recall endpoints
  app.use(
    '/api/*',
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 120,
      keyPrefix: 'api-general',
    })
  );
  app.use(
    '/api/orders/*',
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 25,
      keyPrefix: 'api-orders',
    })
  );
  app.use(
    '/api/recipes/*',
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 25,
      keyPrefix: 'api-recipes',
    })
  );
  app.use(
    '/api/customers/*',
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 12,
      keyPrefix: 'api-customers',
    })
  );
  app.use(
    '/api/launch-list',
    createRateLimiter({
      windowMs: 60_000,
      maxRequests: 15,
      keyPrefix: 'api-launch-list',
    })
  );

  // Database connectivity & row-count check (returns no secrets or PII)
  app.get('/api/health/db', async (c) => {
    const report = await testDatabaseConnection();
    return c.json(report);
  });

  // Authoritative price table endpoint
  app.get('/api/menu', async (c) => {
    const items = await getActiveMenuPrices();
    return c.json({ items });
  });

  // Singapore Launch List sign-up
  app.post('/api/launch-list', requireJsonContentType, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON request body.' }, 400);
    }

    const parsed = launchListPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Please provide your name and a valid Singapore mobile or email.',
        },
        400
      );
    }

    const data = parsed.data;
    const { entry, alreadyRegistered } = await upsertLaunchListEntry({
      name: data.name,
      contact: data.contact,
      neighbourhood: data.neighbourhood,
      preferredDishId: data.preferredDishId,
    });

    return c.json({
      joined: true,
      alreadyRegistered,
      entry: {
        id: entry.id,
        name: entry.name,
        contact: entry.display_contact,
        neighbourhood: entry.neighbourhood,
        preferredDishId: entry.preferred_dish_id,
        createdAt: entry.created_at,
      },
    });
  });

  // Recall customer profile & recipes (masks PII unless caller holds verified HttpOnly session cookie)
  app.get('/api/customers/recall', async (c) => {
    const rawContact = c.req.query('contact') ?? '';
    if (!rawContact.trim()) {
      return c.json({
        customer: null,
        recipes: [],
        tweaks: [],
        orders: [],
        masked: false,
      });
    }

    const parsed = contactSchema.safeParse(rawContact);
    if (!parsed.success) {
      return c.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Enter a valid Singapore mobile number or email.',
        },
        400
      );
    }

    const normalizedQuery = normalizeContact(parsed.data);
    const verifiedContact = readVerifiedCustomerContact(c);
    const bundle = await getCustomerBundleByContact(parsed.data);

    if (!bundle.customer) {
      return c.json({
        customer: null,
        recipes: [],
        tweaks: [],
        orders: [],
        masked: false,
      });
    }

    // Only return full PII (name, street address, postal code, order history)
    // when the request includes a valid signed HttpOnly session cookie for this contact.
    if (verifiedContact !== normalizedQuery) {
      return c.json({
        customer: null,
        recipes: bundle.recipes.map((r) => ({
          dish_id: r.dish_id,
          dish_name: r.dish_name,
          sweetness_tsp: r.sweetness_tsp,
          spice_tsp: r.spice_tsp,
          oil_tsp: r.oil_tsp,
          version: r.version,
        })),
        tweaks: [],
        orders: [],
        masked: true,
      });
    }

    return c.json({
      ...bundle,
      masked: false,
    });
  });

  // Save a recipe tweak directly from the Recipe Personaliser
  app.post('/api/recipes/save', requireJsonContentType, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON request body.' }, 400);
    }

    const parsed = saveRecipePayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Customer name, contact, and dish details are required.',
        },
        400
      );
    }

    const data = parsed.data;
    const menuPrice = await getMenuPriceByDishId(data.dishId);
    if (!menuPrice) {
      return c.json({ error: 'Selected dish was not found in menu.' }, 404);
    }

    const savedCustomer = await upsertCustomer({
      name: data.customer.name,
      contact: data.customer.contact,
      address: data.customer.address,
      postalCode: data.customer.postalCode,
    });

    const { recipe, tweak } = await saveRecipeWithTweak({
      customerId: savedCustomer.id,
      dishId: menuPrice.dish_id,
      dishName: menuPrice.dish_name,
      sweetnessTsp: data.sugar,
      spiceTsp: data.spice,
      oilTsp: data.oil,
      tweakNote: data.tweakNote,
      source: 'personaliser',
    });

    issueCustomerSessionCookie(c, savedCustomer.contact);

    const bundle = await getCustomerBundleByContact(
      savedCustomer.display_contact
    );
    return c.json({
      customer: savedCustomer,
      recipe,
      tweak,
      tweaks: bundle.tweaks,
    });
  });

  // Create order using authoritative server-side menu_prices & start Stripe checkout
  app.post('/api/orders/checkout', requireJsonContentType, async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON request body.' }, 400);
    }

    const parsed = checkoutPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Please provide complete customer, delivery, and meal details.',
        },
        400
      );
    }

    const data = parsed.data;
    const menuPrice = await getMenuPriceByDishId(data.recipe.dishId);
    if (!menuPrice) {
      return c.json({ error: 'Selected dish was not found in menu.' }, 404);
    }

    const savedCustomer = await upsertCustomer({
      name: data.customer.name,
      contact: data.customer.contact,
      address: data.customer.address,
      postalCode: data.customer.postalCode,
    });

    const { recipe: savedRecipe } = await saveRecipeWithTweak({
      customerId: savedCustomer.id,
      dishId: menuPrice.dish_id,
      dishName: menuPrice.dish_name,
      sweetnessTsp: data.recipe.sugar,
      spiceTsp: data.recipe.spice,
      oilTsp: data.recipe.oil,
      tweakNote: data.tweakNote,
      source: 'order',
    });

    const stripe = getStripeClient();
    const order = await createOrderRecord({
      customerId: savedCustomer.id,
      dishId: savedRecipe.dish_id,
      dishName: savedRecipe.dish_name,
      quantity: data.quantity,
      unitPriceCents: menuPrice.price_cents,
      sweetnessTsp: Number(savedRecipe.sweetness_tsp),
      spiceTsp: Number(savedRecipe.spice_tsp),
      oilTsp: Number(savedRecipe.oil_tsp),
      recipeVersion: savedRecipe.version,
      deliverySlot: data.deliverySlot,
      deliveryNotes: data.deliveryNotes,
      paymentProvider: stripe ? 'stripe' : 'stripe_demo',
      paymentStatus: 'pending',
    });

    issueCustomerSessionCookie(c, savedCustomer.contact);

    const bundle = await getCustomerBundleByContact(
      savedCustomer.display_contact
    );

    if (stripe) {
      const baseUrl = resolveBaseUrl(c.req.raw.headers);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: savedCustomer.display_contact.includes('@')
          ? savedCustomer.display_contact
          : undefined,
        line_items: [
          {
            price_data: {
              currency: menuPrice.currency.toLowerCase(),
              unit_amount: menuPrice.price_cents,
              product_data: {
                name: `${savedRecipe.dish_name} (Recipe v${savedRecipe.version})`,
                description: `Sugar ${savedRecipe.sweetness_tsp} tsp · Chilli ${savedRecipe.spice_tsp} tsp · Oil ${savedRecipe.oil_tsp} tsp`,
              },
            },
            quantity: data.quantity,
          },
        ],
        metadata: {
          order_code: order.order_code,
          customer_id: String(savedCustomer.id),
          recipe_version: String(savedRecipe.version),
        },
        success_url: `${baseUrl}/?payment=success&order_code=${encodeURIComponent(order.order_code)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?payment=cancelled&order_code=${encodeURIComponent(order.order_code)}`,
      });

      await attachStripeSessionToOrder(order.order_code, session.id);

      return c.json({
        mode: 'stripe',
        checkoutUrl: session.url,
        order,
        customer: savedCustomer,
        recipe: savedRecipe,
        tweaks: bundle.tweaks,
        orders: bundle.orders,
      });
    }

    return c.json({
      mode: 'stripe_demo',
      order,
      customer: savedCustomer,
      recipe: savedRecipe,
      tweaks: bundle.tweaks,
      orders: bundle.orders,
    });
  });

  // Confirm local test-card Stripe simulation ONLY when live Stripe is not active
  app.post('/api/orders/:orderCode/confirm-demo-payment', async (c) => {
    if (getStripeClient()) {
      return c.json(
        { error: 'Demo payment confirmation is disabled in live Stripe mode.' },
        403
      );
    }

    const parsedCode = orderCodeSchema.safeParse(c.req.param('orderCode'));
    if (!parsedCode.success) {
      return c.json({ error: 'Invalid order reference.' }, 400);
    }

    const existingOrder = await getOrderByCode(parsedCode.data);
    if (!existingOrder) {
      return c.json({ error: 'Order not found.' }, 404);
    }
    if (existingOrder.payment_provider !== 'stripe_demo') {
      return c.json(
        { error: 'This order requires Stripe Checkout verification.' },
        403
      );
    }

    const verifiedContact = readVerifiedCustomerContact(c);
    if (
      verifiedContact &&
      normalizeContact(existingOrder.customer_contact) !== verifiedContact
    ) {
      return c.json({ error: 'Order does not belong to this session.' }, 403);
    }

    if (existingOrder.payment_status === 'paid') {
      return c.json({ error: 'Order is already paid.' }, 409);
    }

    const updated = await markOrderPaid(parsedCode.data);
    if (!updated) {
      return c.json({ error: 'Order not found.' }, 404);
    }

    const fullOrder = await getOrderByCode(parsedCode.data);
    return c.json({ order: fullOrder ?? updated });
  });

  // Verify live Stripe Checkout Session & bind session metadata + DB session_id to order_code
  app.get('/api/stripe/verify', async (c) => {
    const parsedQuery = stripeVerifyQuerySchema.safeParse({
      session_id: c.req.query('session_id') ?? '',
      order_code: c.req.query('order_code') ?? '',
    });

    if (!parsedQuery.success) {
      return c.json({ error: 'Invalid session_id or order_code.' }, 400);
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return c.json({ error: 'Stripe is not configured.' }, 400);
    }

    const { session_id: sessionId, order_code: orderCode } = parsedQuery.data;
    const existingOrder = await getOrderByCode(orderCode);
    if (!existingOrder) {
      return c.json({ error: 'Order not found.' }, 404);
    }
    if (
      existingOrder.stripe_session_id &&
      existingOrder.stripe_session_id !== sessionId
    ) {
      return c.json(
        { error: 'Payment session does not match stored order session.' },
        403
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Prevent session-swap attack: session metadata must match order_code
    if (session.metadata?.order_code !== orderCode) {
      return c.json(
        { error: 'Payment session does not match this order.' },
        403
      );
    }

    if (session.payment_status === 'paid') {
      await markOrderPaid(orderCode, session.id);
    }

    const fullOrder = await getOrderByCode(orderCode);
    return c.json({
      paid: session.payment_status === 'paid',
      order: fullOrder,
    });
  });

  // Verified Stripe Webhook endpoint (used when STRIPE_WEBHOOK_SECRET is configured)
  app.post('/api/stripe/webhook', async (c) => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (
      !stripe ||
      !webhookSecret ||
      webhookSecret === 'MY_STRIPE_WEBHOOK_SECRET'
    ) {
      return c.json({ error: 'Stripe webhook is not configured.' }, 400);
    }

    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'Missing Stripe signature header.' }, 400);
    }

    const rawBody = await c.req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      return c.json({ error: 'Invalid Stripe webhook signature.' }, 400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderCode = session.metadata?.order_code;
      if (orderCode && session.payment_status === 'paid') {
        await markOrderPaid(orderCode, session.id);
      }
    }

    return c.json({ received: true });
  });

  app.notFound((c) => c.json({ error: 'API endpoint not found.' }, 404));

  app.onError((err, c) => {
    console.error('Unhandled API error:', err);
    return c.json({ error: 'Unable to process request right now.' }, 500);
  });

  return app;
}

function serveProductionDist(
  distDir: string,
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  const urlPath = (req.url ?? '/').split('?')[0] || '/';
  let decodedPath = '/';
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  const relativePath = decodedPath.replace(/^\/+/, '');
  const resolvedDist = path.resolve(distDir);
  const candidatePath = path.resolve(resolvedDist, relativePath || 'index.html');

  // Prevent directory traversal outside dist/
  if (
    candidatePath !== resolvedDist &&
    !candidatePath.startsWith(resolvedDist + path.sep)
  ) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  let fileToServe = candidatePath;
  if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
    fileToServe = path.join(resolvedDist, 'index.html');
  }

  const ext = path.extname(fileToServe).toLowerCase();
  res.setHeader(
    'Content-Type',
    MIME_TYPES[ext] ?? 'application/octet-stream'
  );
  applyHtmlSecurityHeaders(res);
  fs.createReadStream(fileToServe).pipe(res);
}

async function startServer() {
  const apiApp = createApiApp();
  const honoListener = getRequestListener(apiApp.fetch);
  let viteMiddlewares:
    | ((
        req: http.IncomingMessage,
        res: http.ServerResponse,
        next: (err?: unknown) => void
      ) => void)
    | null = null;
  const distDir = path.resolve(__dirname, 'dist');

  const httpServer = http.createServer((req, res) => {
    const pathname = (req.url ?? '/').split('?')[0];
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return void honoListener(req, res);
    }

    if (viteMiddlewares) {
      applyHtmlSecurityHeaders(res);
      return viteMiddlewares(req, res, (err) => {
        if (err) {
          console.error('Vite middleware error:', err);
          res.statusCode = 500;
          res.end('Internal server error');
          return;
        }
        res.statusCode = 404;
        res.end('Not found');
      });
    }

    serveProductionDist(distDir, req, res);
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: {
        middlewareMode: { server: httpServer },
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    viteMiddlewares = vite.middlewares;
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Wabi Sabi Hono server listening on http://localhost:${PORT}`);
  });
}

startServer();
