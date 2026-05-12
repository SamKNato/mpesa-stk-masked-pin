/**
 * M-Pesa STK Push — Masked PIN Proposal
 * Production Backend — Daraja 3.0 Integration
 *
 * This server implements the proposed `ConfirmationMode` parameter on every
 * STK Push request. Currently, Safaricom's API silently ignores it.
 * Once Safaricom adds server-side support, no merchant code changes are needed —
 * the improved masked-PIN UI will appear on customers' devices automatically.
 *
 * @author  SamKNato
 * @see     https://github.com/SamKNato/mpesa-stk-masked-pin
 * @see     https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios, { type AxiosError } from 'axios';
import { Buffer } from 'node:buffer';

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * PROPOSED: The three confirmation modes this proposal introduces.
 *
 * "standard"  → Current behaviour. PIN digits are visible as typed.
 *               Maintained for backward compatibility.
 *
 * "masked"    → RECOMMENDED. Each PIN digit is immediately replaced with ●
 *               on the customer's device. Eliminates shoulder-surfing.
 *
 * "biometric" → Forward-looking. Triggers fingerprint/face-ID authentication
 *               on supported devices. Falls back to masked PIN when
 *               BiometricFallback is true.
 */
type ConfirmationMode = 'standard' | 'masked' | 'biometric';

interface DarajaTokenResponse {
  access_token: string;
  expires_in: string;
}

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

/**
 * The complete STK Push payload sent to Daraja.
 * Fields marked PROPOSED are new and will be silently ignored by Safaricom
 * until they ship support — which is the entire point of this repository.
 */
interface STKPushPayload {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
  // ── PROPOSED NEW PARAMETERS ──────────────────────────────────────────────────
  // These are the fields at the heart of this proposal.
  // Safaricom: please read docs/SAFARICOM-INTEGRATION-GUIDE.md
  ConfirmationMode?: ConfirmationMode;
  BiometricFallback?: boolean;
  // ─────────────────────────────────────────────────────────────────────────────
}

interface STKPushRequest {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  confirmationMode?: ConfirmationMode;
  biometricFallback?: boolean;
}

interface STKQueryRequest {
  checkoutRequestId: string;
}

interface CallbackItem {
  Name: string;
  Value: string | number;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const config = {
  consumerKey:    process.env.MPESA_CONSUMER_KEY    ?? '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? '',
  shortCode:      process.env.MPESA_SHORTCODE        ?? '174379',
  passkey:        process.env.MPESA_PASSKEY          ?? '',
  callbackUrl:    process.env.MPESA_CALLBACK_URL     ?? '',
  environment:   (process.env.MPESA_ENVIRONMENT      ?? 'sandbox') as 'sandbox' | 'production',
  port:           parseInt(process.env.PORT           ?? '3001', 10),
} as const;

const DARAJA_BASE =
  config.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

// Validate critical config at startup
function validateConfig(): void {
  const required: Array<keyof typeof config> = [
    'consumerKey',
    'consumerSecret',
    'passkey',
    'callbackUrl',
  ];
  const missing = required.filter((k) => !config[k]);
  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
      `   Copy .env.example → .env and fill in your Daraja credentials.`
    );
  }
}

// ─── Token Management ─────────────────────────────────────────────────────────

let tokenCache: TokenCache | null = null;

/**
 * Fetch or return a cached Daraja OAuth token.
 * Tokens are cached until 60 seconds before expiry to avoid race conditions.
 */
async function getDarajaToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString('base64');

  const response = await axios.get<DarajaTokenResponse>(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      timeout: 10_000,
    }
  );

  const { access_token, expires_in } = response.data;
  tokenCache = {
    token: access_token,
    expiresAt: Date.now() + parseInt(expires_in, 10) * 1_000,
  };

  console.log(`[Token] Refreshed. Expires in ${expires_in}s`);
  return access_token;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the current timestamp in the Daraja-required format: YYYYMMDDHHmmss */
function generateTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
}

/** Generates the base64-encoded password required by Daraja. */
function generatePassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

/**
 * Normalises a Kenyan phone number to the 254XXXXXXXXX format required by Daraja.
 * Accepts: 0712345678, +254712345678, 254712345678
 */
function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return digits;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Express Application ──────────────────────────────────────────────────────

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Structured request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Liveness probe. Returns server status and configuration summary.
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: config.environment,
    shortCode: config.shortCode,
    timestamp: new Date().toISOString(),
    proposal: {
      name: 'STK Push Masked PIN',
      author: 'SamKNato',
      repo: 'https://github.com/SamKNato/mpesa-stk-masked-pin',
      parameters: ['ConfirmationMode', 'BiometricFallback'],
    },
  });
});

/**
 * POST /api/stkpush
 *
 * Initiates an STK Push transaction with the proposed `ConfirmationMode` parameter.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * PROPOSAL NOTE FOR SAFARICOM ENGINEERS:
 *
 * This endpoint sends `ConfirmationMode` and `BiometricFallback` in every
 * request payload. Your API currently ignores them (returns 0/Success as usual).
 *
 * To implement support:
 *   1. Read `ConfirmationMode` from the request body
 *   2. Pass the value to the device-side STK dialog renderer
 *   3. "masked" → render PIN field as password input (immediate ● masking)
 *   4. "biometric" → trigger fingerprint/face-ID; fall back to masked if
 *      BiometricFallback is true and the device doesn't support biometrics
 *
 * Full integration guide: docs/SAFARICOM-INTEGRATION-GUIDE.md
 * ════════════════════════════════════════════════════════════════════════════
 */
app.post('/api/stkpush', async (req: Request<object, object, STKPushRequest>, res: Response) => {
  try {
    const {
      amount,
      phoneNumber,
      accountReference,
      transactionDesc,
      confirmationMode = 'masked',   // Default to masked — the secure choice
      biometricFallback = true,
    } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }
    if (!accountReference) {
      return res.status(400).json({ error: 'accountReference is required' });
    }
    if (!transactionDesc) {
      return res.status(400).json({ error: 'transactionDesc is required' });
    }
    if (!['standard', 'masked', 'biometric'].includes(confirmationMode)) {
      return res.status(400).json({
        error: 'confirmationMode must be "standard", "masked", or "biometric"',
      });
    }

    // ── Build payload ───────────────────────────────────────────────────────
    const token     = await getDarajaToken();
    const timestamp = generateTimestamp();
    const password  = generatePassword(config.shortCode, config.passkey, timestamp);
    const phone     = sanitizePhone(phoneNumber);

    const payload: STKPushPayload = {
      BusinessShortCode:  config.shortCode,
      Password:           password,
      Timestamp:          timestamp,
      TransactionType:    'CustomerPayBillOnline',
      Amount:             Math.round(amount),
      PartyA:             phone,
      PartyB:             config.shortCode,
      PhoneNumber:        phone,
      CallBackURL:        config.callbackUrl,
      AccountReference:   accountReference.slice(0, 12),   // Daraja 12-char limit
      TransactionDesc:    transactionDesc.slice(0, 13),    // Daraja 13-char limit
      // ── PROPOSED PARAMETERS ──────────────────────────────────────────────
      ConfirmationMode:   confirmationMode,
      BiometricFallback:  biometricFallback,
      // ─────────────────────────────────────────────────────────────────────
    };

    console.log('[STK Push] Initiating:', {
      phone,
      amount: formatAmount(amount),
      accountReference,
      confirmationMode,    // Log the proposed parameter
      biometricFallback,
    });

    const response = await axios.post(
      `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );

    console.log('[STK Push] Accepted:', response.data.CheckoutRequestID);
    return res.status(200).json(response.data);

  } catch (error) {
    const axiosErr = error as AxiosError;
    console.error('[STK Push] Error:', axiosErr.response?.data ?? axiosErr.message);
    return res.status(502).json({
      error:   'STK Push initiation failed',
      details: axiosErr.response?.data ?? axiosErr.message,
    });
  }
});

/**
 * POST /api/stkquery
 * Queries the status of a pending STK Push transaction.
 * Useful for polling when the callback is delayed.
 */
app.post('/api/stkquery', async (req: Request<object, object, STKQueryRequest>, res: Response) => {
  try {
    const { checkoutRequestId } = req.body;
    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'checkoutRequestId is required' });
    }

    const token     = await getDarajaToken();
    const timestamp = generateTimestamp();
    const password  = generatePassword(config.shortCode, config.passkey, timestamp);

    const response = await axios.post(
      `${DARAJA_BASE}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: config.shortCode,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );

    return res.json(response.data);
  } catch (error) {
    const axiosErr = error as AxiosError;
    return res.status(502).json({
      error: 'STK Query failed',
      details: axiosErr.response?.data ?? axiosErr.message,
    });
  }
});

/**
 * POST /api/callback
 *
 * Safaricom posts the transaction result to this URL after the customer
 * completes or cancels the STK Push prompt on their device.
 *
 * CRITICAL: This endpoint MUST return HTTP 200 quickly.
 * Safaricom retries failed callbacks — long processing blocks retries
 * and can cause duplicate fulfilment. Offload heavy work to a queue.
 */
app.post('/api/callback', (req: Request, res: Response) => {
  // Acknowledge immediately — process asynchronously
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const body = req.body as {
    Body?: {
      stkCallback?: {
        MerchantRequestID: string;
        CheckoutRequestID: string;
        ResultCode: number;
        ResultDesc: string;
        CallbackMetadata?: { Item: CallbackItem[] };
      };
    };
  };

  const callback = body?.Body?.stkCallback;

  if (!callback) {
    console.warn('[Callback] Unexpected payload structure:', JSON.stringify(req.body));
    return;
  }

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = callback;

  if (ResultCode === 0) {
    // ── SUCCESS ────────────────────────────────────────────────────────────
    const meta = CallbackMetadata?.Item ?? [];
    const get  = (name: string) => meta.find((i) => i.Name === name)?.Value;

    const txData = {
      checkoutRequestId:   CheckoutRequestID,
      amount:              get('Amount'),
      mpesaReceiptNumber:  get('MpesaReceiptNumber'),
      transactionDate:     get('TransactionDate'),
      phoneNumber:         get('PhoneNumber'),
    };

    console.log('[Callback] ✅ PAYMENT SUCCESS:', txData);

    // TODO: Persist to database
    // TODO: Trigger order fulfilment / send receipt
    // TODO: Emit WebSocket event to frontend for real-time status update

  } else {
    // ── FAILED / CANCELLED ─────────────────────────────────────────────────
    console.warn('[Callback] ❌ Payment FAILED/CANCELLED:', {
      checkoutRequestId: CheckoutRequestID,
      resultCode:        ResultCode,
      resultDesc:        ResultDesc,
    });

    // TODO: Mark order as cancelled
    // TODO: Notify merchant dashboard
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

validateConfig();

app.listen(config.port, () => {
  const bar = '═'.repeat(58);
  console.log(`
╔${bar}╗
║   M-Pesa STK Push — Masked PIN Proposal                    ║
║   github.com/SamKNato/mpesa-stk-masked-pin        ║
╠${bar}╣
║  Env      : ${config.environment.padEnd(45)}║
║  Port     : ${String(config.port).padEnd(45)}║
║  Callback : ${(config.callbackUrl || '⚠ NOT SET — set MPESA_CALLBACK_URL').slice(0, 45).padEnd(45)}║
╠${bar}╣
║  Proposed parameters sent on every STK Push:               ║
║    ConfirmationMode   → "masked" (default)                 ║
║    BiometricFallback  → true (default)                     ║
╚${bar}╝
  `);
});
