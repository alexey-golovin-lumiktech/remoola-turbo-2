import { type PayoutCasePageData } from './page.loader';
import { type PayoutCasePagePermissions } from './page.permissions';

type PayoutCase = PayoutCasePageData[`payoutCase`];

export type PayoutEscalationViewModel = {
  show: boolean;
  showForm: boolean;
  blockedReason: string;
};

type PayoutViewModel = {
  pills: string[];
  highValueThresholdLabel: string;
  destinationLabel: string | null;
  escalation: PayoutEscalationViewModel;
};

const ESCALATION_FALLBACK_REASON = `A payout escalation marker is not available for this case.`;

function buildPills(payoutCase: PayoutCase): string[] {
  const pills: string[] = [
    payoutCase.core.type,
    payoutCase.core.derivedStatus,
    payoutCase.core.currencyCode,
    payoutCase.highValue.eligibility,
  ];
  if (payoutCase.slaBreachDetected) pills.push(`threshold breached`);
  if (payoutCase.payoutEscalation) pills.push(`escalated`);
  return pills;
}

function buildHighValueThresholdLabel(payoutCase: PayoutCase): string {
  return payoutCase.highValue.thresholdAmount
    ? `${payoutCase.highValue.thresholdCurrency} >= ${payoutCase.highValue.thresholdAmount}`
    : `not configured`;
}

function buildDestinationLabel(payoutCase: PayoutCase): string | null {
  const paymentMethod = payoutCase.destinationPaymentMethodSummary;
  if (!paymentMethod) return null;
  const suffix = paymentMethod.last4 ?? paymentMethod.bankLast4 ?? `----`;
  return paymentMethod.brand ? `${paymentMethod.brand} •••• ${suffix}` : `${paymentMethod.type} •••• ${suffix}`;
}

function buildEscalationViewModel(
  payoutCase: PayoutCase,
  permissions: Pick<PayoutCasePagePermissions, `canManageEscalation` | `canSubmitEscalation`>,
): PayoutEscalationViewModel {
  const { canManageEscalation, canSubmitEscalation } = permissions;
  return {
    show: canManageEscalation || Boolean(payoutCase.payoutEscalation),
    showForm: canManageEscalation && canSubmitEscalation,
    blockedReason: payoutCase.actionControls.escalateBlockedReason ?? ESCALATION_FALLBACK_REASON,
  };
}

export function derivePayoutViewModel(payoutCase: PayoutCase, permissions: PayoutCasePagePermissions): PayoutViewModel {
  return {
    pills: buildPills(payoutCase),
    highValueThresholdLabel: buildHighValueThresholdLabel(payoutCase),
    destinationLabel: buildDestinationLabel(payoutCase),
    escalation: buildEscalationViewModel(payoutCase, permissions),
  };
}
