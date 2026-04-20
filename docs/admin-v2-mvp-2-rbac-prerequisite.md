# Admin-v2 MVP-2 RBAC Prerequisite Slice

## Status

Этот prerequisite slice больше не является будущим rollout-gate для текущего repo-state.
schema-backed RBAC primitives уже landed, а `admin-v2` runtime уже использует их для broad admin lifecycle и capability overrides.

Этот документ сохраняется как reconciliation note, чтобы явно зафиксировать:

- prerequisite был корректным architectural gate
- prerequisite уже удовлетворен
- дальнейшее планирование не должно ссылаться на этот документ как на justification для read-only-only или prerequisite-only чтения текущего runtime

## Prerequisite That Was Required

Ниже перечислены schema-backed primitives, которые действительно были нужны перед broad admin lifecycle:

- `AdminRoleModel`
- `AdminPermissionModel`
- `AdminRolePermissionModel`
- `AdminInvitationModel`

## Current Reconciled Reading

В текущем codebase эти primitives уже присутствуют и broad lifecycle уже активирован:

- schema-backed role and permission resolution работает в backend access layer
- `admins.manage` уже используется как live capability boundary
- admins workspace уже ship'ит invite / deactivate / restore / role-change / permissions-change / password-reset
- prerequisite больше нельзя трактовать как запрет на `admins.manage`

## What This Document Still Guards

Из этого prerequisite по-прежнему следуют важные guardrails:

- broad admin lifecycle не должен откатываться обратно к config-only shortcuts
- read-only breadth не должна использоваться как proxy-обоснование для новых writes вне явного phase decision
- consumer support mutations (`consumer_suspend`, `consumer_email_resend`) остаются отдельным mutation slice со своими audit / notification / confirmation contracts
- payment-method, exchange и payout writes не должны quietly расширяться за пределы уже зафиксированного runtime contract

## What This Document No Longer Means

Этот документ больше не означает:

- что `admins.manage` ещё не активирован
- что broad role-management UI ещё запрещён текущим runtime
- что следующий implementation chat должен ограничиваться только schema addition и read-path verification

## Next Planning Boundary

Следующий planning step после satisfied RBAC prerequisite:

- не повторный `MVP-2 prerequisite`
- не повторный read-only kickoff for payment methods
- а `MVP-3 maturity` reconciliation and rollout sequencing

Приоритет следующей фазы:

- `ledger anomalies`
- `risk` maturity surface
- assignments поверх `OperationalAssignmentModel`
- saved views / alerts / reporting maturity
