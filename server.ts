import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Ephemeral fallback HMAC secret for PayHere Sandbox Demo token verification when env secret is unset
const EPHEMERAL_DEMO_KEY = crypto.randomBytes(32).toString('hex');

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '';
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || '';
const HAS_LIVE_PAYHERE = Boolean(PAYHERE_MERCHANT_ID && PAYHERE_MERCHANT_SECRET);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Simple per-IP rate limiter for sensitive payment endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function paymentRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (entry.count >= 30) {
    res.status(429).json({ error: 'Too many payment requests. Please wait a minute and try again.' });
    return;
  }
  entry.count += 1;
  next();
}

function signDemoPayload(payload: string): string {
  const key = PAYHERE_MERCHANT_SECRET || EPHEMERAL_DEMO_KEY;
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'MYSERVICE', timestamp: new Date().toISOString() });
});

app.get('/api/payments/config', (_req, res) => {
  res.json({
    gatewayMode: HAS_LIVE_PAYHERE ? 'payhere_live' : 'payhere_sandbox_demo',
    payhereConfigured: HAS_LIVE_PAYHERE,
    currency: 'LKR',
    merchantIdPreview: HAS_LIVE_PAYHERE ? `${PAYHERE_MERCHANT_ID.slice(0, 4)}****` : null,
    activationRequirements: [
      'Register a PayHere Sri Lanka merchant account and complete business verification',
      'Add PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET to server environment secrets',
      'Configure your production domain and notify_url webhook in the PayHere Merchant Portal',
    ],
  });
});

app.post('/api/payments/create-checkout', paymentRateLimit, (req, res) => {
  const { uid, paymentType, referenceId, amountLkr, itemTitle } = req.body || {};

  if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) {
    res.status(400).json({ error: 'Valid authenticated user ID is required.' });
    return;
  }
  if (!['booking', 'subscription', 'featured_listing'].includes(paymentType)) {
    res.status(400).json({ error: 'Invalid payment type.' });
    return;
  }
  if (typeof referenceId !== 'string' || referenceId.length < 1 || referenceId.length > 128) {
    res.status(400).json({ error: 'Invalid reference ID.' });
    return;
  }
  const numericAmount = Number(amountLkr);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 50_000_000) {
    res.status(400).json({ error: 'Payment amount must be a positive LKR value.' });
    return;
  }
  const cleanTitle = typeof itemTitle === 'string' ? itemTitle.trim().slice(0, 140) : 'MYSERVICE Payment';
  const orderId = `MY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const transactionRef = `PHDEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const expiresAt = Date.now() + 15 * 60_000;
  const canonical = `${orderId}|${transactionRef}|${uid}|${paymentType}|${referenceId}|${numericAmount.toFixed(2)}|LKR|${expiresAt}`;
  const signatureToken = signDemoPayload(canonical);

  res.json({
    orderId,
    transactionRef,
    amountLkr: Number(numericAmount.toFixed(2)),
    currency: 'LKR',
    itemTitle: cleanTitle,
    gatewayMode: HAS_LIVE_PAYHERE ? 'payhere_live' : 'payhere_sandbox_demo',
    expiresAt,
    signatureToken,
  });
});

app.post('/api/payments/verify-sandbox-demo', paymentRateLimit, (req, res) => {
  const { uid, orderId, transactionRef, paymentType, referenceId, amountLkr, expiresAt, signatureToken, outcome } = req.body || {};

  if (typeof uid !== 'string' || typeof orderId !== 'string' || typeof transactionRef !== 'string' || typeof signatureToken !== 'string') {
    res.status(400).json({ error: 'Incomplete verification payload.' });
    return;
  }
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    res.status(400).json({ error: 'Checkout session expired. Please initiate checkout again.' });
    return;
  }
  const numericAmount = Number(amountLkr);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount.' });
    return;
  }

  const canonical = `${orderId}|${transactionRef}|${uid}|${paymentType}|${referenceId}|${numericAmount.toFixed(2)}|LKR|${exp}`;
  const expectedSig = signDemoPayload(canonical);

  if (!safeEqualHex(signatureToken, expectedSig)) {
    res.status(403).json({ error: 'Invalid payment signature. Client-side tampering is rejected.' });
    return;
  }

  if (outcome === 'failed') {
    res.json({
      verified: false,
      status: 'failed',
      gatewayMode: 'payhere_sandbox_demo',
      transactionRef,
      message: 'Sandbox Demo simulated a declined transaction. No charges or active status granted.',
    });
    return;
  }

  res.json({
    verified: true,
    status: 'demo_verified',
    gatewayMode: 'payhere_sandbox_demo',
    transactionRef,
    orderId,
    amountLkr: Number(numericAmount.toFixed(2)),
    currency: 'LKR',
    verifiedAt: new Date().toISOString(),
  });
});

// PayHere Live Notify Webhook Handler (requires PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET)
app.post('/api/payments/payhere-notify', paymentRateLimit, (req, res) => {
  if (!HAS_LIVE_PAYHERE) {
    res.status(501).json({
      error: 'Live PayHere webhook is inactive. Configure PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET on the server.',
    });
    return;
  }

  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body || {};
  if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
    res.status(400).json({ error: 'Missing required PayHere notification parameters.' });
    return;
  }

  const secretHash = crypto.createHash('md5').update(PAYHERE_MERCHANT_SECRET).digest('hex').toUpperCase();
  const localMd5Sig = crypto
    .createHash('md5')
    .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`)
    .digest('hex')
    .toUpperCase();

  if (localMd5Sig !== String(md5sig).toUpperCase() || merchant_id !== PAYHERE_MERCHANT_ID) {
    res.status(403).json({ error: 'Invalid PayHere md5sig signature.' });
    return;
  }

  res.status(200).json({ received: true, orderId: order_id, statusCode: status_code });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MYSERVICE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
