# Safaricom Integration Guide — STK Push Masked PIN Proposal

**For:** Safaricom Daraja Platform Engineering Team  
**From:** SamKNato — github.com/SamKNato  
**Date:** May 2026  
**Status:** Ready for implementation  
**Repo:** https://github.com/SamKNato/mpesa-stk-masked-pin

---

## Executive Summary

This document describes a minimal, backward-compatible addition to the Daraja STK Push API
that eliminates the most widespread real-world security gap in M-Pesa: customer PINs being
visible as they are typed at merchant checkout points.

**The change:** Two new optional request parameters.  
**The effort:** Backend parameter parsing + one conditional in the STK dialog renderer.  
**The impact:** Immediate protection for millions of daily transactions.

---

## Background — The Shoulder-Surfing Problem

The Safaricom STK Push product is a masterpiece of financial inclusion. However, the
current implementation has a security flaw that is visible in every supermarket in Kenya
every hour of every business day:

When a customer receives an STK Push prompt and types their PIN:

1. The PIN digits are briefly visible on screen as they are typed
2. At a retail checkout, the cashier is typically 50–70 cm away
3. The customer behind in the queue has a direct line of sight
4. CCTV cameras positioned to monitor the checkout area capture the screen
5. Coordinated attacks (compromised cashier + confederate nearby) can capture the PIN silently

This is not theoretical. Social engineering attacks that exploit PIN visibility at physical
checkouts are a documented fraud vector in retail banking globally.

---

## Proposed Parameters

### `ConfirmationMode` (string, optional)

Controls how the customer authenticates on the STK native dialog.

| Value | Behaviour | Recommended for |
|-------|-----------|----------------|
| `"standard"` | Current behaviour — digits visible as typed | Backward compatibility only |
| `"masked"` | **Immediate ● masking — no digit ever shown** | All merchants, immediately |
| `"biometric"` | Fingerprint / face-ID prompt; PIN fallback per `BiometricFallback` | High-value merchants |

**Default:** `"standard"` (no change to existing behaviour when parameter is absent)

### `BiometricFallback` (boolean, optional)

Only relevant when `ConfirmationMode` is `"biometric"`.

- `true` → If the device doesn't support biometrics or the user cancels, fall back to
  `"masked"` PIN entry.
- `false` → Biometric only; fail the prompt if not available.

**Default:** `false`

---

## Implementation Specification

### 1 — Backend API Layer

Add the parameters to the STK Push request schema:

```typescript
interface STKPushRequest {
  // ... existing fields unchanged ...

  /**
   * PROPOSED: Controls PIN entry masking on the customer's device.
   * Default "standard" maintains current behaviour.
   */
  ConfirmationMode?: 'standard' | 'masked' | 'biometric';

  /**
   * PROPOSED: Whether to fall back to masked PIN if biometrics fail.
   * Only used when ConfirmationMode is "biometric".
   */
  BiometricFallback?: boolean;
}
```

Parse them server-side:

```typescript
const confirmationMode  = request.ConfirmationMode  ?? 'standard';
const biometricFallback = request.BiometricFallback ?? false;
```

Validation rules:
- `ConfirmationMode` must be one of `["standard", "masked", "biometric"]` or absent
- `BiometricFallback` must be a boolean or absent
- Unknown values: reject with `400 Bad Request` and a clear error message

### 2 — STK Dialog Renderer

Pass the parsed parameters to the native dialog instruction payload:

```typescript
// Existing dialog config
const dialogConfig = {
  merchantName:    shortcode.displayName,
  amount:          request.Amount,
  accountRef:      request.AccountReference,
  transactionDesc: request.TransactionDesc,
  // ... existing fields ...

  // ── NEW: PIN authentication config ────────────────────────────────────
  pinAuthentication: {
    mode:              confirmationMode,   // 'standard' | 'masked' | 'biometric'
    biometricFallback: biometricFallback,
  },
};
```

### 3 — Device-Side Dialog Changes

#### For `"masked"` mode

The PIN input field should be rendered with password-style masking:

```kotlin
// Android — STK dialog PIN field
val pinEditText = EditText(context).apply {
  inputType = when (confirmationMode) {
    "masked"   -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
    "standard" -> InputType.TYPE_CLASS_NUMBER
    else       -> InputType.TYPE_CLASS_NUMBER
  }
  maxLength = 6
  filters = arrayOf(InputFilter.LengthFilter(6))
}
```

The key change: `TYPE_NUMBER_VARIATION_PASSWORD` causes Android to replace each digit with
a bullet (`●`) immediately after entry, exactly as password fields behave in banking apps.

#### For `"biometric"` mode

```kotlin
val biometricPrompt = BiometricPrompt(
  activity,
  executor,
  object : BiometricPrompt.AuthenticationCallback() {

    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
      // Submit transaction with biometric token
      submitWithBiometric(result.cryptoObject)
    }

    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
      if (biometricFallback &&
          errorCode in listOf(
            BiometricPrompt.ERROR_HW_UNAVAILABLE,
            BiometricPrompt.ERROR_NO_BIOMETRICS,
            BiometricPrompt.ERROR_USER_CANCELED
          )
      ) {
        // Fall back gracefully to masked PIN entry
        showMaskedPINDialog()
      } else {
        cancelTransaction()
      }
    }
  }
)
```

### 4 — Backward Compatibility

This change is fully backward-compatible:

- Merchants who do **not** send `ConfirmationMode` get current behaviour
  (equivalent to `"standard"`)
- Merchants who send `ConfirmationMode: "masked"` get improved security immediately
- No existing integrations break under any circumstance

### 5 — New Error Codes

Add these to the STK Push response schema:

| Code | Description |
|------|-------------|
| `CONFIRMATION_MODE_UNSUPPORTED` | Device OS version doesn't support the requested mode; merchant should retry with `"masked"` |
| `BIOMETRIC_UNAVAILABLE` | No biometric hardware/enrollment on device; returned only when `BiometricFallback: false` |

---

## Testing Checklist

Before shipping, verify each of the following:

- [ ] `ConfirmationMode` absent → standard behaviour, unchanged
- [ ] `ConfirmationMode: "standard"` → standard behaviour explicitly set
- [ ] `ConfirmationMode: "masked"` → PIN digits replaced with ● immediately on Android 8.0+
- [ ] `ConfirmationMode: "biometric"` + `BiometricFallback: true` → fingerprint prompt,
      falls back to masked PIN entry on authentication failure
- [ ] `ConfirmationMode: "biometric"` + `BiometricFallback: false` + no biometric hardware
      → `BIOMETRIC_UNAVAILABLE` error returned
- [ ] Invalid `ConfirmationMode` value → `400 Bad Request` with descriptive error message
- [ ] All existing merchant integrations passing regression suite unaffected

---

## Reference Implementation

A complete working merchant integration is available at:

> **https://github.com/SamKNato/mpesa-stk-masked-pin**

### What the repo includes

| File | Description |
|------|-------------|
| `server.ts` | Production Express/TypeScript backend that sends `ConfirmationMode` on every request |
| `src/components/STKPopup.tsx` | High-fidelity visual demo of both modes |
| `src/App.tsx` | Interactive comparison UI — three modes, side-by-side |
| `.env.example` | Daraja credential template |

### Run it in 2 minutes

```bash
git clone https://github.com/SamKNato/mpesa-stk-masked-pin.git
cd mpesa-stk-masked-pin
npm install
cp .env.example .env   # Add your sandbox Daraja credentials
npm run dev
# → http://localhost:5173  (interactive UI)
# → http://localhost:3001  (API server)
```

### Fire a real STK Push with the proposed parameters

```bash
curl -X POST http://localhost:3001/api/stkpush \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1,
    "phoneNumber": "254712345678",
    "accountReference": "TEST-MASKED",
    "transactionDesc": "Masked PIN test",
    "confirmationMode": "masked",
    "biometricFallback": true
  }'
```

The server logs will show `ConfirmationMode: "masked"` being sent. Once Safaricom reads
it server-side, the device dialog changes automatically — no further merchant action needed.

---

## Frequently Asked Questions

**Q: Will this break any existing merchant integrations?**  
A: No. Both new parameters are optional with safe defaults. Any request that omits them
behaves exactly as today.

**Q: Does this require changes to the M-Pesa app?**  
A: No. The STK Push dialog is rendered natively by Safaricom's infrastructure, not by
the M-Pesa app. The change is entirely server → dialog renderer.

**Q: What Android API level is required for masked input?**  
A: `TYPE_NUMBER_VARIATION_PASSWORD` has been available since Android API 3 (2009).
All Android devices running M-Pesa support it.

**Q: What about iOS / iPhone users?**  
A: STK Push uses native USSD/push infrastructure. The implementation path may differ
slightly on iOS but the same `password` input semantic is available.

**Q: How long would implementation take?**  
A: Estimated 1–2 sprint weeks for a team familiar with the Daraja codebase:
  - Backend parameter parsing: ~1 day
  - Dialog renderer conditional: ~2 days
  - QA and regression testing: ~1 week
  - Staged rollout: configurable

---

## Contact

This proposal is maintained as an open-source community effort by:

- **Author:** SamKNato — https://github.com/SamKNato
- **GitHub Issues:** https://github.com/SamKNato/mpesa-stk-masked-pin/issues
- **GitHub Discussions:** https://github.com/SamKNato/mpesa-stk-masked-pin/discussions

Available to demo live to the Daraja platform team at any time.

---

*Apache 2.0 — free to use, reference, and incorporate in Safaricom's implementation.*
