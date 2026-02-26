# Remoola Monorepo — Code Duplication Audit Report

**Date:** 2025-02-26  
**Scope:** apps/api, apps/consumer, apps/admin, packages/*  
**Method:** Search by interface names, property structures, function bodies, similar filenames, constant values; semantic comparison; near-duplicate detection (~80% similarity).  
**Constraint:** Audit only — no code changes. CTO-level paranoid mode.

---

## 1️⃣ Confirmed Duplicates

| File A | File B | Why duplicated | Recommended canonical location |
|--------|--------|-----------------|--------------------------------|
| `apps/consumer/src/types/contact.ts` (ConsumerContact, ConsumerContactAddress, ConsumerContactDetails) | `apps/api/src/consumer/modules/contacts/dto/consumer-contact.dto.ts` (class-based ConsumerContact, ConsumerContactAddress, ConsumerContactsResponse) | Same API contract: contact + address shape. Frontend defines its own types instead of using shared contract. | **packages/api-types**: Add consumer contact response/create/update shapes (or document that consumer types mirror API; prefer moving shared shapes to api-types). |
| `apps/consumer/src/types/auth/address-details.types.ts` (IAddressDetails) | `apps/api/src/shared-common/models/address-details.model.ts` (IAddressDetailsModel) | Same field set: postalCode, country, state, city, street. Nullability differs (consumer allows null). | **packages/api-types**: Add `TAddressDetails` (or `IAddressDetails`) for forms/API contract; consumer and API can reference it. |
| `apps/consumer/src/types/payment-requests.ts` (CreatePaymentRequestPayload, PaymentRequestSummary) | `apps/api/src/consumer/modules/payments/dto/create-payment-request.dto.ts` (CreatePaymentRequest class) | Same create payload: email, amount, currencyCode?, description?, dueDate?. Frontend type is local. | **packages/api-types**: Add `CreatePaymentRequestPayload` (and optionally `PaymentRequestSummary`) so FE and BE share one contract. |
| `apps/consumer/src/types/payment-methods.ts` (BillingDetails, PaymentMethodItem, CreatePaymentMethodDto, UpdatePaymentMethodDto, StripeSetupIntentPayload) | `apps/api/src/consumer/modules/payment-methods/dto/payment-method.dto.ts` (class DTOs) | Same response/create/update shapes; frontend mirrors API. | **packages/api-types**: Add shared response/create/update types for consumer payment methods; API DTOs can implement these. |
| `apps/api/src/dtos/consumer/contact.dto.ts` (Contact, ContactResponse, ContactCreate, ContactUpdate, ContactListResponse) | `apps/api/src/dtos/admin/contact.dto.ts` (same classes) | Identical class definitions; only namespace (consumer vs admin) differs. | **apps/api**: Single shared DTO module (e.g. `dtos/common/contact.dto.ts`) re-exported by consumer and admin; or keep separate but derive from one base to avoid drift. |
| `apps/api/src/dtos/consumer/address-details.dto.ts` | `apps/api/src/dtos/admin/address-details.dto.ts` | Same AddressDetails, AddressDetailsCreate, AddressDetailsUpdate pattern. | **apps/api**: Shared DTO module for address-details, re-used by consumer and admin. |
| `apps/api/src/dtos/consumer/billing-details.dto.ts` | `apps/api/src/dtos/admin/billing-details.dto.ts` | Same BillingDetails, Create, Update, Response. | **apps/api**: Shared billing-details DTO module. |
| `apps/consumer/src/lib/api.ts` (ApiErrorSchema zod) | `apps/admin/src/lib/api.ts` (ApiErrorSchema zod) | Identical `z.object({ message, code?, details? })` for parsing API errors. | **packages/api-types** (or a small shared package): Export `ApiErrorSchema` once; both apps import it. |
| `apps/consumer/src/lib/api-utils.ts` (interface ApiError) | `packages/api-types/src/common/api-error.ts` (ApiErrorShape) | Same shape (message, code); consumer adds statusCode. Redundant local interface. | **Consumer**: Use `ApiErrorShape` from api-types only; extend in api-utils if statusCode needed for NextResponse. |
| `apps/consumer/src/components/payments/PaymentsList.tsx` (formatAmount) | `apps/consumer/src/components/payments/PaymentView.tsx` (formatAmount) | Same implementation: `Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)`. | **apps/consumer**: Single helper in `lib/currency.ts` (e.g. `formatCurrencyDisplay(amount, currencyCode)`); already has `formatCurrencyAmount` — align naming and use everywhere. |
| `apps/consumer/src/components/payments/PaymentView.tsx` (formatAmount) | `apps/consumer/src/components/dashboard/PendingRequestsTable.tsx` (formatAmount) | Same as above. | Same as above. |
| `apps/admin/src/components/dashboard/RecentPaymentRequestsCard.tsx` (formatAmount) | `apps/admin/src/components/dashboard/StatusTotalsCard.tsx` (formatAmount) | Same pattern: parseFloat(amount) then Intl.NumberFormat with USD. | **apps/admin**: Shared `lib/format.ts` or `lib/currency.ts` with `formatAmount(amount: string, currency?: string)`. |
| `apps/consumer/src/lib/currency.ts` (formatCurrencyAmount) | `apps/api/src/shared-common/utils/format-currency.ts` (formatCurrency) | Same purpose (format number as currency); API uses locale + optional replaceDoubleZero; consumer uses fraction digits + toFixed. | **Near-duplicate**: Different signatures and behavior. Prefer one shared formatter in packages (e.g. `packages/ui` or a tiny `packages/format-utils`) only if both need it; else document and keep separate to avoid cross-app dependency. |
| `apps/consumer/src/lib/error-messages.ts` (localToastKeys + MESSAGE_MAP + getErrorMessageForUser + getLocalToastMessage) | `apps/admin/src/lib/error-messages.ts` (localToastKeys + API_ERROR_MAP + same helpers) | Same structure: key constants, code→message map, getErrorMessageForUser, getLocalToastMessage. Different key sets (consumer vs admin). | **Pattern duplicate**: Consider shared package for “error message resolver” pattern; keys and maps stay app-specific. Low priority. |
| `apps/consumer/src/lib/hooks.ts` (queryKeys) | `apps/admin/src/lib/types.ts` (queryKeys) | Same pattern: nested query key factories for SWR/cache. Different keys (consumer vs admin APIs). | **Pattern duplicate**: Shared type or helper for “query key factory” pattern optional; keys remain per-app. |

---

## 2️⃣ Near Duplicates

| Description | Risk | Suggested consolidation |
|-------------|------|--------------------------|
| **CreatePaymentRequestPayload (consumer)** vs **CreatePaymentRequest (API)**: consumer uses `currencyCode?: string`, API uses `currencyCode?: $Enums.CurrencyCode`. | **Medium** | Align types: use `TCurrencyCode` from api-types on frontend; validate before submit to avoid enum mismatch. |
| **ConsumerContact** (consumer types) vs **ConsumerContact** (API DTO): field names match; API has class-transformer/validation. | **Low** | Move shared shape to api-types; consumer imports for UI, API DTOs implement or extend. |
| **formatMoney** (SummaryCards, cents → display) vs **formatCurrencyAmount** (lib/currency) vs **formatAmount** (multiple components): multiple ways to format money in consumer app. | **Medium** | Unify on one or two helpers: e.g. `formatCurrencyDisplay(amount, currency)` and optionally `formatCentsToDisplay(cents, currency)`. |
| **proxyApiRequest** (consumer) vs **proxyToBackend** (admin): both forward request to backend, forward cookies and response. Consumer has timeout + retries; admin is simpler. | **Low** | Optional: shared proxy utility in a package (e.g. `packages/next-api-utils`) with options for timeout/retries; apps pass different configs. |
| **status.replace(/_/g, ' ')** repeated in consumer and admin (PaymentsList, PaymentView, PendingRequestsTable, RecentPaymentRequestsCard, StatusTotalsCard, LedgerAnomaliesCard, LedgerPageClient, PaymentRequestsPageClient, etc.). | **Low** | Shared helper e.g. `formatEnumForDisplay(value: string)` in packages/api-types or packages/ui to avoid scattered string logic. |
| **ApiClient** (consumer lib/api.ts) vs **ApiClient** (admin lib/api.ts): both have fetch, cache, parseError with ApiErrorSchema. | **Medium** | Consider shared base in a package (e.g. api-types or a small “api-client” package) with app-specific baseURL and optional cache config. |
| **IAddressDetails** (consumer, nullable fields) vs **IAddressDetailsModel** (API, required postalCode/country, optional rest): slight structural drift. | **Low** | Single source of truth in api-types for “address details” shape; document nullability for form vs API. |

---

## 3️⃣ Dangerous Duplicates (Fintech Risk)

| Duplicate | Risk | Mitigation |
|-----------|------|------------|
| **CreatePaymentRequestPayload.currencyCode** (string) vs **CreatePaymentRequest.currencyCode** ($Enums.CurrencyCode) | **Request/response drift**: Frontend can send invalid currency; backend validation may reject or behave inconsistently. | Use `TCurrencyCode` / enum from api-types on frontend; validate in form or before submit. |
| **Payment request amount**: Consumer sends `amount: string`; API expects `@IsNumberString() amount: string`. Same semantically but if frontend ever sends number or wrong format, validation mismatch. | **Validation mismatch** | Keep string; ensure FE always sends string and uses same validation rules (e.g. positive number string). |
| **Consumer contact address**: Consumer `ConsumerContactAddress` vs API `ConsumerContactAddress` (class). If API adds or renames a field and frontend type is not updated, UI can break or send wrong payload. | **Enum/field drift** | Move shared shape to api-types; single place to update. |
| **Error codes**: Consumer and admin each map `errorCodes` / `adminErrorCodes` to messages. If backend adds a new code and one app forgets to add a message, user sees raw code. | **Inconsistent UX / support** | Centralize error-code→message mapping where possible; consider codegen from shared constants. |
| **Payment method types**: Frontend `PaymentMethodItem` / `CreatePaymentMethodDto` mirror API. If API adds required field or changes enum, frontend can desync. | **Ledger/UX inconsistency** | Shared types in api-types for payment method response and create payload. |

---

## 4️⃣ Refactor Plan (Minimal Diff Strategy)

### Phase 1 — Types (packages/api-types)

1. **ApiErrorSchema**  
   - Add and export `ApiErrorSchema` (zod) in `packages/api-types` (e.g. `common/api-error.ts`).  
   - Consumer and admin: remove local `ApiErrorSchema`, import from api-types.

2. **Consumer contact & address**  
   - Add `TConsumerContactAddress`, `TConsumerContact`, `TConsumerContactDetails`, `TConsumerContactsResponse` (or minimal set needed by FE).  
   - Add `TAddressDetails` (postalCode, country, state?, city?, street?) for form/API alignment.  
   - Consumer app: replace local types in `types/contact.ts` and `types/auth/address-details.types.ts` with imports from api-types (or keep local types extending api-types).

3. **Consumer payment request & payment method**  
   - Add `CreatePaymentRequestPayload` (email, amount, currencyCode?, description?, dueDate?) and align `currencyCode` with `TCurrencyCode`.  
   - Add `PaymentRequestSummary` if used by multiple consumers.  
   - Add consumer payment method types: response item, create/update payloads, Stripe setup intent payload.  
   - Consumer: import from api-types; remove or narrow local definitions.

### Phase 2 — API DTOs (apps/api)

4. **Shared contact DTOs**  
   - Introduce `dtos/common/contact.dto.ts` (or shared module) with Contact, ContactResponse, ContactCreate, ContactUpdate, ContactListResponse.  
   - `dtos/consumer/contact.dto.ts` and `dtos/admin/contact.dto.ts` re-export from shared (or extend).  
   - Same approach for **address-details** and **billing-details** if desired.

5. **No cross-app imports**  
   - Ensure shared DTOs live under `apps/api` or shared-common only; no consumer/admin app importing api.

### Phase 3 — Formatting & utilities (consumer + admin)

6. **Currency/amount formatting**  
   - Consumer: One `formatCurrencyDisplay(amount, currency)` in `lib/currency.ts`; replace all inline `formatAmount` / `formatMoney` usages.  
   - Admin: One `formatAmount` in `lib/format.ts` or `lib/currency.ts`; replace inline implementations.

7. **Status/enum display**  
   - Optional: add `formatEnumForDisplay(value: string)` (e.g. replace underscores with spaces) in api-types or ui; use in consumer and admin.

8. **Proxy**  
   - Optional: extract shared proxy logic to a small package only if both apps need same behavior; otherwise keep current split (consumer with retries, admin simple).

### Phase 4 — Error handling

9. **ApiError in consumer**  
   - Replace local `ApiError` interface in `api-utils.ts` with `ApiErrorShape` from api-types; use for NextResponse payload.

10. **Error message maps**  
    - No immediate change; pattern is duplicated but keys are app-specific. Optionally later: shared “resolver” pattern, app-specific maps.

### Safety checks (before/after)

- [ ] No cross-app imports (admin ↔ consumer).  
- [ ] Shared types only in `packages/api-types`.  
- [ ] Database logic remains in apps/api / packages/database-2.  
- [ ] Frontend does not import backend-only code (no Prisma in frontend).  
- [ ] After moving types: run tests and typecheck; ensure no breaking changes for Vercel deployment.

### Migration / tests

- Add or update tests for any changed formatting or API client behavior.  
- No DB migrations required for type-only moves.  
- E2E or integration tests for payment/contact flows recommended after contract consolidation.

---

## 5️⃣ Optional — Duplication density and patterns

### Duplication density (by area)

| Area | Duplication density | Notes |
|------|---------------------|--------|
| Consumer types (contact, payment, address) | High | Many types mirror API; few in api-types. |
| API dtos (consumer vs admin) | High | Same DTOs in two namespaces. |
| Currency/amount formatting | Medium | Multiple implementations in consumer; two in admin. |
| Error handling (ApiError, ApiErrorSchema) | Medium | Duplicated in both apps. |
| Proxy / fetch wrapper | Low | Two implementations; different features. |
| Query keys / localToastKeys | Low | Same pattern, different keys; acceptable. |

### Top duplicated patterns (ranked)

1. **Contact/address/payment types** — Frontend types mirroring API DTOs without shared definition.  
2. **API consumer vs admin DTOs** — Same Contact, AddressDetails, BillingDetails, etc. in two DTO trees.  
3. **formatAmount / formatCurrency** — Inline or per-app currency formatting.  
4. **ApiErrorSchema + parseError** — Same zod schema and parsing in both Next apps.  
5. **Error code → user message** — Same pattern (MESSAGE_MAP / API_ERROR_MAP + getErrorMessageForUser) in consumer and admin.  
6. **status.replace(/_/g, ' ')** — Repeated enum display logic.  
7. **queryKeys** — Same nested factory pattern in both apps.  
8. **ApiClient** — Similar fetch/cache/error handling in consumer and admin.  
9. **Proxy to backend** — proxyApiRequest vs proxyToBackend.  
10. **Create payload types** — CreatePaymentRequestPayload, CreateContactInput, CreatePaymentMethodDto defined only on frontend.

### Architectural smells from duplication

- **Contract drift**: Frontend and backend define same contracts independently → risk of enum/field mismatch (e.g. currencyCode, status values).  
- **Double maintenance**: Contact, address, billing, payment request types updated in multiple places.  
- **Inconsistent UX**: Different formatting (currency, dates) and error message patterns across consumer vs admin.  
- **No single source of truth**: api-types underused for consumer-facing API contracts; most shared types are auth/pagination/admin.

---

## Safety check (final)

- **No cross-app imports suggested** — All shared code is either in `packages/*` or within `apps/api` (shared DTOs).  
- **Shared types → packages/api-types only** — Recommended canonical location for all new shared request/response shapes.  
- **Database logic in apps/api** — No suggestion to move DB or Prisma to frontend.  
- **Frontend does not import backend-only code** — No Prisma in consumer/admin; api-types and optional format helpers are safe.

---

*End of audit. No code was modified; recommendations only.*
