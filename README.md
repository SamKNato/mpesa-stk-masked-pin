<div align="center">

# 🔒 M-Pesa STK Push, Masked PIN 

**Official proposal + reference implementation to eliminate the biggest real-world  
security gap in M-Pesa today: PINs typed in plain sight at supermarket checkouts.**

[![Daraja API](https://img.shields.io/badge/Daraja-3.0-00A651?style=for-the-badge&logo=safaricom&logoColor=white)](https://developer.safaricom.co.ke)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge)](./CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)

[**Live Demo**](https://mpesa-masked-pin.vercel.app) · [**Proposal Doc**](./docs/SAFARICOM-INTEGRATION-GUIDE.md) · [**Report Issue**](https://github.com/SamKNato/mpesa-stk-masked-pin/issues)

</div>

---

## The Problem — A Friday Evening at Naivas Junction

Imagine this scene, which plays out **millions of times every day** across Kenya.

It is 6:43 PM on a Friday. You are at the checkout counter at Naivas Junction Mall. Behind you, a queue of eight people stretches back toward the pasta aisle. The cashier, professionally friendly, Ask for your mobile number and triggers an Mpesa Payment payment request of your total: **KES 4,847.00.**

The STK Mpesa Push prompt appears and you start typing your M-Pesa PIN.

**four digits. In full view of:**
- 👤 The cashier, 60 cm from your screen
- 👤 The customer immediately behind you
- 📹 Three overhead CCTV cameras pointed at the checkout area
- 📹 The cashier's personal phone, propped on the register, camera facing outward

You press OK. Transaction complete. You collect your bags. You have no idea that for the 4 seconds you were typing, your M-Pesa PIN was on display like a departures board.

**This is not a hypothetical. This is every Nairobi supermarket, every petrol station, every pharmacy, every till, every day.**

And it is entirely, trivially fixable  with a single new API parameter.

---

## The Solution — `ConfirmationMode: "masked"`

The fix is a one-line addition to the Daraja STK Push API:

```diff
POST /mpesa/stkpush/v1/processrequest

{
  "BusinessShortCode": "174379",
  "Password": "...",
  "Timestamp": "20260511120000",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 4847,
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://merchant.co.ke/api/callback",
  "AccountReference": "Order #4821",
  "TransactionDesc": "Payment for groceries",
+ "ConfirmationMode": "masked",
+ "BiometricFallback": true
}
```

When `ConfirmationMode` is `"masked"`, Safaricom's native STK dialog renders the  
PIN field as a **password input** — each character is immediately replaced with `●`.  
No shoulder-surfing. No visual eavesdropping. No code changes needed at the merchant  
side ever again once deployed.

---

## Screenshots / Demo

| Current Behaviour | Proposed Behaviour |
|:-:|:-:|
| ![Current — PIN visible](./docs/assets/current-mode.png) | ![Proposed — PIN masked](./docs/assets/masked-mode.png) |
| ⚠️ PIN digits visible as typed | ✅ Immediately replaced with `●●●●●●` |
| `ConfirmationMode` absent (default) | `ConfirmationMode: "masked"` |

> **➡️ Interactive demo:** [mpesa-masked-pin.vercel.app](https://mpesa-masked-pin.vercel.app)  
> Toggle between both modes in real time and experience the difference yourself.

---

## Proposed API Specification

### New Parameters

| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| `ConfirmationMode` | `string` | `"standard"` \| `"masked"` \| `"biometric"` | `"standard"` | Controls how the customer authenticates on the STK dialog |
| `BiometricFallback` | `boolean` | `true` \| `false` | `false` | When `ConfirmationMode` is `"biometric"`, fall back to masked PIN if biometrics unavailable |

### Behaviour Matrix

| `ConfirmationMode` | PIN Masking | Biometric Prompt | Notes |
|--------------------|-------------|------------------|-------|
| `"standard"` | ❌ Digits visible | ❌ | Current behaviour — maintained for backward compatibility |
| `"masked"` | ✅ Immediate `●` masking | ❌ | **Recommended for all merchants immediately** |
| `"biometric"` | ✅ (fallback only) | ✅ Fingerprint / Face ID | Forward-looking — ideal for high-value transactions |

### Full Request Example

```json
{
  "BusinessShortCode": "174379",
  "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkZDljMzM4YjA2ZDc...",
  "Timestamp": "20260511143022",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 4847,
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://merchant.co.ke/api/callback",
  "AccountReference": "Order-4821",
  "TransactionDesc": "Carrefour supermarket purchase",
  "ConfirmationMode": "masked",
  "BiometricFallback": true
}
```

### Response (unchanged)

```json
{
  "MerchantRequestID": "26558-67537592-1",
  "CheckoutRequestID": "ws_CO_110520260836047602",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

---

## Repository Structure

```
mpesa-stk-masked-pin/
├── README.md                          ← You are here
├── LICENSE                            ← Apache 2.0
├── .gitignore
├── package.json                       ← Unified frontend + backend dependencies
├── server.ts                          ← Daraja 3.0 production backend (Express + TypeScript)
├── .env.example                       ← Environment variable template
├── vite.config.ts                     ← Vite config with API proxy
├── tsconfig.json
├── tailwind.config.ts
├── index.html                         ← Vite entry point
├── src/
│   ├── main.tsx                       ← React entry point
│   ├── App.tsx                        ← Main demo application
│   ├── index.css                      ← Tailwind base + custom styles
│   └── components/
│       └── STKPopup.tsx               ← High-fidelity M-Pesa dialog component
└── docs/
    └── SAFARICOM-INTEGRATION-GUIDE.md ← Detailed integration guide for Safaricom engineers
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- A [Safaricom Developer Portal](https://developer.safaricom.co.ke) account (for real API testing)

### 1 — Clone & Install

```bash
git clone https://github.com/SamKNato/mpesa-stk-masked-pin.git
cd mpesa-stk-masked-pin
npm install
```

### 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in your Daraja credentials:

```env
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://your-domain.ngrok.io/api/callback
MPESA_ENVIRONMENT=sandbox
PORT=3001
```

> **Tip:** Use [ngrok](https://ngrok.com) for the callback URL during local development:  
> `ngrok http 3001` → copy the HTTPS URL → paste as `MPESA_CALLBACK_URL`

### 3 — Run (Frontend + Backend concurrently)

```bash
npm run dev
```

- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend  → [http://localhost:3001](http://localhost:3001)
- Health   → [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## How Safaricom Developers Can Test This

> This section is written specifically for engineers at Safaricom who want to  
> validate the proposal and see the masked UI in action immediately.

### Step 1 — Add Server-Side Parameter Parsing

In the STK Push request handler, extract the new field:

```typescript
// In the Safaricom STK Push request processor
const confirmationMode = requestBody.ConfirmationMode ?? 'standard';
const biometricFallback = requestBody.BiometricFallback ?? false;
```

### Step 2 — Pass It to the USSD/Native Dialog Layer

The core change is instructing the device-side STK dialog renderer to change  
the input type for the PIN field:

```typescript
// Pseudo-code for the STK dialog instruction payload
const dialogConfig = {
  merchantName: shortcode.displayName,
  amount: request.Amount,
  accountRef: request.AccountReference,
  pinInput: {
    type: confirmationMode === 'standard' ? 'visible' : 'password',
    maxLength: 6,
    biometric: confirmationMode === 'biometric',
    biometricFallback: biometricFallback,
  },
};
```

### Step 3 — Clone This Repo and Fire a Real STK Push

```bash
git clone https://github.com/SamKNato/mpesa-stk-masked-pin.git
cd mpesa-stk-masked-pin
npm install && npm run dev

# In another terminal — trigger a real push:
curl -X POST http://localhost:3001/api/stkpush \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1,
    "phoneNumber": "254712345678",
    "accountReference": "TEST-MASKED-001",
    "transactionDesc": "Masked PIN test",
    "confirmationMode": "masked",
    "biometricFallback": true
  }'
```

### Step 4 — Observe the `ConfirmationMode` Field in Your Logs

The server sends `ConfirmationMode` in every request payload. Once the Safaricom  
backend starts reading it, the device-side change requires no merchant coordination.  
Every merchant who sends the field benefits immediately.

---

## Security Analysis

### Attack Surface — Current State

| Vector | Risk | Prevalence |
|--------|------|-----------|
| Shoulder surfing (human) | HIGH | Extremely common at busy checkouts |
| CCTV recording | HIGH | Standard retail infrastructure |
| Phone camera eavesdropping | MEDIUM | Deliberate attack, growing |
| PIN-reuse across services | CRITICAL | M-Pesa PIN often reused for other services |

### Risk Reduction — Proposed State

| Vector | Risk After | Notes |
|--------|-----------|-------|
| Shoulder surfing (human) | **ELIMINATED** | Nothing to see |
| CCTV recording | **ELIMINATED** | Masked characters captured instead |
| Phone camera eavesdropping | **ELIMINATED** | No readable digits |
| PIN-reuse across services | MEDIUM (unchanged) | Out of scope for this proposal |

---

## Why This Matters — The Numbers

- **M-Pesa has 51 million+ active users** in Kenya (Safaricom Annual Report 2025)
- **Estimated 15 million STK Push transactions per day** across all merchants
- **Supermarkets, petrol stations, and pharmacies** represent the highest-risk environments
- **A stolen M-Pesa PIN enables full account takeover** — funds transfer, Fuliza credit, Hustler Fund access
- **This fix requires zero user education**, zero app updates, zero merchant behaviour change

One API parameter. Tens of millions of customers protected. Today.

---

## Contributing

This is an open proposal. We need:

1. **Community validation** — Star ⭐ and share this repo to signal demand to Safaricom
2. **Security researchers** — Review the proposal and suggest improvements
3. **Merchants** — Share your checkout security concerns in [Issues](../../issues)
4. **Safaricom engineers** — Open a PR with your implementation questions or design feedback

---

## Roadmap

- [x] Core proposal and reference implementation
- [x] Frontend demo (masked vs standard comparison)
- [x] Daraja 3.0 backend integration
- [ ] Biometric (`face_id` / `fingerprint`) mode reference implementation
- [ ] Android native demo app (Kotlin)
- [ ] Load testing at supermarket-scale volumes
- [ ] Formal RFC document for Safaricom API committee

---

## License

Copyright 2026 — Released under the [Apache 2.0 License](./LICENSE).  
Free to use, fork, and reference — including by Safaricom in their own implementation.

---

<div align="center">

**Built with urgency by the Kenyan developer community.**  
**Every day we wait, millions of PINs are typed in plain sight.**

[⭐ Star this repo](https://github.com/SamKNato/mpesa-stk-masked-pin) to show Safaricom this matters.

</div>
