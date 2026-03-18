# Security Audit: Auth, Webhooks, PII, Permissions

**Scope:** Auth (admin + consumer, JWT, step-up, OAuth), Stripe webhooks, PII/logging, permission boundaries, rate limiting.  
**Date:** 2025-03-04.

---

## BLOCKERS

### B1. Stripe webhook: reject requests with missing `Stripe-Signature` before verification

**Area:** `apps/api/src/consumer/modules/payment-methods/stripe-webhook.service.ts`

**Finding:** `processStripeEvent` reads `req.headers['stripe-signature']` and passes it to `constructEvent()`. If the header is missing, `signature` is `undefined`. The Stripe SDK will throw inside `constructEvent`, and the catch block returns a generic 400. That is functionally safe (no unverified payload is processed) but:

- The response is 400 instead of 401 for “no signature,” which is less accurate.
- Explicitly rejecting missing signature with 401 avoids passing `undefined` into the SDK and makes the security contract clear.

**Fix:** After the raw-body check, require the signature header and return 401 if missing:

```ts
// After: if (!req.rawBody) { ... }
const signature = req.headers[`stripe-signature`];
if (!signature || (Array.isArray(signature) && signature.length === 0)) {
  res.status(401).json({ received: false, error: `Missing webhook signature` });
  return;
}
const event = this.stripe.webhooks.constructEvent(req.rawBody, signature, envs.STRIPE_WEBHOOK_SECRET);
```

Use the first element if `signature` is an array (Express can give `string | string[]`).

---

## WARN

### W1. Avoid leaking Stripe/internal error messages to the client

**Area:** `apps/api/src/consumer/modules/payments/consumer-payments.service.ts` (e.g. `getBalancesCompleted`), `apps/api/src/consumer/modules/payment-methods/stripe.service.ts`

**Finding:** In `consumer-payments.service.ts`, `getBalancesCompleted` (and similar flows) does `throw error` after logging. If the underlying error is from Stripe or another third party, Nest may send that error’s `message` to the client. Same risk wherever raw errors are rethrown to API responses.

**Recommendation:** Catch third-party/Stripe errors, log them (without PII/secrets), and throw a generic `InternalServerErrorException` (or appropriate code) with a safe message (e.g. from `errorCodes`) so clients never receive Stripe or internal details.

---

### W2. Email subject in mailing error logs

**Area:** `apps/api/src/shared/mailing.service.ts`, `apps/api/src/shared/brevo-mail.service.ts`

**Finding (historical):** Previously, mailing error logs could include the email subject. Subjects can contain user-specific or sensitive information (e.g. “Payment for John”, “Reset password for user@example.com”).

**Status:** As of the Brevo migration, `MailingService` and `BrevoMailService` do not log the subject on failure: only context (e.g. method name) and `error.message` / stack are logged. Brevo API errors are wrapped with status-only messages (no subject or body in logs).

**Recommendation:** If adding new mailing code, continue to avoid logging subject or recipient in error paths.

---

### W3. Prisma error `details` in API responses

**Area:** `apps/api/src/common/filters/utils/mapPrismaKnownError.ts`

**Finding:** For several Prisma codes (e.g. P2001, P2015), `details` is set from `error.meta` (e.g. `cause`, `path`, `argument_name`). These are usually schema/field names rather than user data, but they can reveal internal structure.

**Recommendation:** In production, consider omitting or sanitizing `details` (e.g. only for 4xx and generic messages) to reduce information disclosure. Default branch already avoids exposing raw Prisma messages.

---

## NOTE

### N1. Stripe webhook: signature verification and idempotency

**Area:** `apps/api/src/consumer/modules/payment-methods/stripe-webhook.service.ts`

**Finding:** Signature is verified with `this.stripe.webhooks.constructEvent(req.rawBody, signature, envs.STRIPE_WEBHOOK_SECRET)` before any processing. Idempotency is enforced by inserting into `stripe_webhook_event` by `event.id` and returning 200 on P2002. Raw body is ensured by `rawBody: true` in Nest and skipping `express.json()` for `/api/consumer/webhooks` in `main.ts`.

**Status:** Implemented correctly. B1 only improves clarity and status code for missing signature.

---

### N2. Auth: JWT, path-based admin vs consumer, step-up

**Area:** `apps/api/src/guards/auth.guard.ts`, `apps/api/src/admin/auth/`, `apps/api/src/consumer/auth/`

**Finding:**  
- Access token from cookie (path-based key) or Bearer; verified with JWT and checked against `accessRefreshTokenModel`; `secureCompare` for token match.  
- Admin vs consumer enforced by path prefix (`/api/admin/` vs `/api/consumer/`).  
- Step-up (`AdminAuthService.verifyStepUp`) is used for: admin delete/restore, admin password change, refund, chargeback (see `admin-admins.controller.ts`, `admin-payment-requests.controller.ts`).

**Status:** Aligned with requirements. No blockers in this area.

---

### N3. Cookies: httpOnly, secure, sameSite

**Area:** `apps/api/src/admin/auth/admin-auth.controller.ts`, `apps/api/src/consumer/auth/auth.controller.ts`

**Finding:** Admin and consumer auth set cookies with `httpOnly: true`, `secure` (depending on env/proxy), and `sameSite` (`none` in prod/Vercel, `lax` otherwise). No sensitive data in cookie names.

**Status:** Acceptable for fintech.

---

### N4. PII in auth audit log and access control

**Area:** `apps/api/src/shared/auth-audit.service.ts`, `apps/api/src/admin/modules/audit/admin-audit.controller.ts`

**Finding:** Auth audit stores `email` (PII). Audit endpoints `GET admin/audit/auth` and `GET admin/audit/actions` are protected by `JwtAuthGuard` and restricted to `admin.type === 'SUPER'` (ADMIN_ONLY_SUPER_CAN_VIEW_AUDIT).

**Status:** PII access limited to SUPER admins; acceptable with proper access control and audit of who uses these endpoints.

---

### N5. Lockout and rate limiting

**Area:** `apps/api/src/shared/auth-audit.service.ts`, auth controllers

**Finding:**  
- **Lockout:** `AuthAuditService.checkLockoutAndRateLimit` is used before password check for both admin and consumer login; `recordFailedAttempt` updates `auth_login_lockout` and sets `lockedUntil` when max attempts exceeded.  
- **Per-email rate limit:** Same service enforces a window and cap (e.g. `AUTH_PER_EMAIL_RATE_LIMIT` / `AUTH_PER_EMAIL_RATE_WINDOW_MINUTES`).  
- **Throttle:** `@Throttle` applied on admin login (10/60s), consumer login (10/60s), consumer auth routes (various limits), payment-requests reversal endpoints (20/60s).

**Status:** Lockout and rate limiting in place for auth; reversal endpoints throttled.

---

### N6. Public endpoints

**Area:** `@PublicEndpoint()` usage

**Finding:** Public routes include: health, admin auth (login, refresh), consumer auth (login, OAuth, callback, etc.), and **consumer webhooks** (`POST consumer/webhooks`). Only the webhook endpoint is unauthenticated by design; it is protected by Stripe signature verification and secret check.

**Status:** No unintended public exposure of sensitive actions.

---

### N7. Logs: no raw tokens or secrets

**Area:** `apps/api/src/guards/auth.guard.ts`, `apps/api/src/admin/auth/admin-auth.service.ts`, `apps/api/src/consumer/auth/auth.service.ts`

**Finding:** Auth guard and auth services use generic log messages (e.g. “JWT verification failed”, “token mismatch”, “refresh token verification failed”). No logging of raw tokens, passwords, or secrets.

**Status:** Compliant with “no raw secrets in logs” for these paths. W2 covers email subject in mailing logs.

---

### N8. STRIPE_WEBHOOK_SECRET_BILLING

**Area:** `apps/api/src/envs.ts`, packages/env

**Finding:** `STRIPE_WEBHOOK_SECRET_BILLING` is defined in env schema and examples; no separate billing webhook handler or route was found that uses it.

**Status:** NOTE only. If a billing webhook is added later, it must verify signature with this secret (and enforce idempotency) in the same way as the main Stripe webhook.

---

## Summary

| Severity | Count | Action |
|----------|--------|--------|
| BLOCKER  | 1     | Add explicit rejection of missing Stripe-Signature (401) before `constructEvent`. |
| WARN     | 3     | Wrap third-party errors for clients; reduce PII in mailing logs; consider sanitizing Prisma `details`. |
| NOTE     | 8     | Documented for compliance; no code change required except optional hardening. |

---

## Optional: Minimal diff for B1

```diff
--- a/apps/api/src/consumer/modules/payment-methods/stripe-webhook.service.ts
+++ b/apps/api/src/consumer/modules/payment-methods/stripe-webhook.service.ts
@@ -62,6 +62,12 @@ export class StripeWebhookService {
     if (!req.rawBody) {
       res.status(400).json({ received: false, error: `Missing raw body` });
       return;
     }
+
+    const signatureRaw = req.headers[`stripe-signature`];
+    const signature = Array.isArray(signatureRaw) ? signatureRaw[0] : signatureRaw;
+    if (!signature || typeof signature !== `string`) {
+      res.status(401).json({ received: false, error: `Missing webhook signature` });
+      return;
+    }
 
     try {
-      const signature = req.headers[`stripe-signature`];
       const event = this.stripe.webhooks.constructEvent(req.rawBody, signature, envs.STRIPE_WEBHOOK_SECRET);
```

Apply this in the actual file if you want the blocker fix in code.
