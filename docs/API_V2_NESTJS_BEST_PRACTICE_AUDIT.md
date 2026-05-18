# API v2 NestJS Best Practice Audit

Дата: 2026-05-18

Область: `apps/api-v2/src`

## Summary

`api-v2` уже устроен как зрелое NestJS 11 приложение, а не как CRUD-прототип. Сильные стороны: cookie-first auth boundary, scoped CORS, глобальная валидация, public endpoint metadata, Prisma lifecycle hooks, transaction runner, idempotency для admin-v2 мутаций и архитектурные тесты на module boundaries.

Главный следующий выигрыш не в переписывании домена, а в выравнивании framework boundary: общий bootstrap path, typed request metadata decorators, вынос inline DTO из больших контроллеров и расширение архитектурных guardrails.

## Current Strengths

- `apps/api-v2/src/configure-app.ts` централизует global prefix, scoped CORS, security middleware, raw body для Stripe webhooks, Swagger и `ValidationPipe`.
- `apps/api-v2/src/app.module.ts` использует global providers для throttling, auth, response transform, logging и Prisma/SQL filters.
- `apps/api-v2/src/guards/auth.guard.ts` реализует deny-by-default auth через `@PublicEndpoint()`, разделяет admin/consumer scope и применяет CSRF для authenticated mutations.
- `apps/api-v2/src/envs.ts` валидирует runtime config через Zod и отдельно ужесточает production-like окружения.
- `apps/api-v2/src/shared/prisma-transaction.runner.ts` централизует transaction policy, включая serializable ledger mutations и retry для `P2034`.
- `apps/api-v2/src/module-boundaries.spec.ts` уже фиксирует важные архитектурные инварианты: explicit exports, idempotency transaction posture и запрет прямых `$transaction` в admin-v2 repositories.

## Priority Risks

1. `apps/api-v2/src/main.ts` содержит два очень похожих пути создания приложения: persistent server и Vercel Express adapter. Любая будущая правка bootstrap может разойтись между ними.
2. В admin-v2 контроллерах повторяется одинаковый `requestMeta(req)` для `ipAddress`, `userAgent`, `idempotencyKey`. Это framework-boundary concern, и он лучше живет в typed decorator/helper, чем копируется в каждом controller file.
3. Крупные inline DTO в контроллерах вроде `admin-v2/admins`, `admin-v2/exchange`, `admin-v2/verification`, `admin-v2/payments` усложняют ревью и повышают риск случайно сломать `ValidationPipe`/Swagger shape.
4. `DatabaseModule` помечен `@Global()` и экспортирует не только database concern, но и `OriginResolverService`, Stripe client и balance module. Это удобно, но делает shared surface шире, чем название модуля обещает.
5. Error response shape частично нормализован Prisma/SQL filters, но общая политика для non-Prisma exceptions живет в стандартном Nest behavior. Перед изменением нужна отдельная совместимость с frontend/BFF contracts.

## Recommended Work Order

1. Consolidate app creation in a small bootstrap factory used by both persistent and adapter modes.
2. Introduce `@RequestMeta()` for repeated admin-v2 request metadata extraction, then migrate a few high-repeat controllers first.
3. Move large inline DTO/query classes from controllers into local `*.dto.ts` files without changing decorators or public API.
4. Add architecture tests for the new request-boundary helper and bootstrap factory shape.
5. Revisit module naming/global exports only after the lower-risk cleanup is stable.

## Verification Baseline

Because lint, build, typecheck, tests and e2e are currently green, changes should stay incremental. Minimum verification after framework-boundary changes:

- `yarn workspace @remoola/api-v2 run typecheck`
- `yarn workspace @remoola/api-v2 run test`
- targeted e2e when auth, cookies, webhooks or idempotency behavior changes
