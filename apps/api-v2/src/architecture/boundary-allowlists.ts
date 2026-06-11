export const bareRouteIdParamsAllowlist = new Map<string, number>([
  [`admins/admin-v2-admins.controller.ts`, 11],
  [`operational-alerts/admin-v2-operational-alerts.controller.ts`, 2],
  [`quickstarts/admin-v2-quickstarts.controller.ts`, 1],
  [`saved-views/admin-v2-saved-views.controller.ts`, 2],
]);

export const adminStepUpVerifyAllowlist = new Map<string, number>([
  [`admins/admin-v2-admins.controller.ts`, 8],
  [`exchange/admin-v2-exchange.controller.ts`, 4],
  [`payments/admin-v2-payments.controller.ts`, 2],
]);

export const nonTransactionalExecuteAllowlist = {
  [`external-effect`]: new Map<string, number>([
    [`admins/admin-v2-admin-invitations.service.ts`, 1],
    [`admins/admin-v2-admin-password-flows.service.ts`, 1],
    [`consumers/admin-v2-consumer-admin-actions.service.ts`, 3],
    [`verification/admin-v2-verification-decision.service.ts`, 1],
  ]),
  [`legacy-db-only`]: new Map<string, number>([
    [`assignments/admin-v2-assignments.service.ts`, 3],
    [`documents/admin-document-tag.service.ts`, 3],
    [`documents/admin-document-tagger.service.ts`, 2],
    [`exchange/admin-exchange-rate-approval.service.ts`, 1],
    [`exchange/admin-scheduled-conversion-commands.service.ts`, 2],
    [`operational-alerts/admin-v2-operational-alerts.service.ts`, 3],
    [`payment-methods/admin-v2-payment-methods.service.ts`, 3],
    [`payouts/admin-v2-payout-escalation.service.ts`, 1],
    [`saved-views/admin-v2-saved-views.service.ts`, 3],
  ]),
  [`post-commit-event`]: new Map<string, number>([[`exchange/admin-exchange-rule-commands.service.ts`, 3]]),
} satisfies Record<string, Map<string, number>>;
