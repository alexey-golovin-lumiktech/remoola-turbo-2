import { describe, expect, it } from '@jest/globals';

import { type PayoutCasePageData } from './page.loader';
import { type PayoutCasePagePermissions } from './page.permissions';
import { derivePayoutViewModel } from './payout-view-model';

type PayoutCase = PayoutCasePageData[`payoutCase`];

function buildPayoutCase(overrides: Partial<PayoutCase> = {}): PayoutCase {
  return {
    id: `payout-1`,
    core: {
      type: `USER_PAYOUT`,
      derivedStatus: `failed`,
      currencyCode: `USD`,
    },
    highValue: {
      eligibility: `below-threshold`,
      thresholdAmount: `100`,
      thresholdCurrency: `USD`,
    },
    slaBreachDetected: false,
    payoutEscalation: null,
    actionControls: {
      escalateBlockedReason: null,
    },
    destinationPaymentMethodSummary: {
      type: `BANK_ACCOUNT`,
      brand: null,
      last4: null,
      bankLast4: `5511`,
    },
    ...overrides,
  } as unknown as PayoutCase;
}

function buildPermissions(overrides: Partial<PayoutCasePagePermissions> = {}): PayoutCasePagePermissions {
  return {
    canManageEscalation: false,
    canSubmitEscalation: false,
    canClaim: false,
    canRelease: false,
    canReassign: false,
    ...overrides,
  };
}

describe(`derivePayoutViewModel`, () => {
  it(`maps the four core pills and the threshold + destination labels for a fully linked payout`, () => {
    const vm = derivePayoutViewModel(buildPayoutCase(), buildPermissions());

    expect(vm.pills).toEqual([`USER_PAYOUT`, `failed`, `USD`, `below-threshold`]);
    expect(vm.highValueThresholdLabel).toBe(`USD >= 100`);
    expect(vm.destinationLabel).toBe(`BANK_ACCOUNT •••• 5511`);
  });

  it(`appends conditional pills only when sla or escalation flags are set`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({
        slaBreachDetected: true,
        payoutEscalation: { confirmed: true } as PayoutCase[`payoutEscalation`],
      }),
      buildPermissions(),
    );

    expect(vm.pills).toEqual([`USER_PAYOUT`, `failed`, `USD`, `below-threshold`, `threshold breached`, `escalated`]);
  });

  it(`falls back to "not configured" when high-value threshold amount is missing`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({
        highValue: {
          eligibility: `not-evaluable`,
          thresholdAmount: null,
          thresholdCurrency: `USD`,
        } as PayoutCase[`highValue`],
      }),
      buildPermissions(),
    );

    expect(vm.highValueThresholdLabel).toBe(`not configured`);
  });

  it(`prefers the card brand and last4 over bankLast4 when present`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({
        destinationPaymentMethodSummary: {
          type: `CARD`,
          brand: `Visa`,
          last4: `4242`,
          bankLast4: null,
        } as PayoutCase[`destinationPaymentMethodSummary`],
      }),
      buildPermissions(),
    );

    expect(vm.destinationLabel).toBe(`Visa •••• 4242`);
  });

  it(`returns a null destination label when no payment method is linked`, () => {
    const vm = derivePayoutViewModel(buildPayoutCase({ destinationPaymentMethodSummary: null }), buildPermissions());

    expect(vm.destinationLabel).toBeNull();
  });

  it(`falls back to "----" suffix when both last4 fields are missing`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({
        destinationPaymentMethodSummary: {
          type: `BANK_ACCOUNT`,
          brand: null,
          last4: null,
          bankLast4: null,
        } as PayoutCase[`destinationPaymentMethodSummary`],
      }),
      buildPermissions(),
    );

    expect(vm.destinationLabel).toBe(`BANK_ACCOUNT •••• ----`);
  });

  it(`hides escalation entirely when neither manage nor active marker is present`, () => {
    const vm = derivePayoutViewModel(buildPayoutCase(), buildPermissions());

    expect(vm.escalation).toEqual({
      show: false,
      showForm: false,
      blockedReason: `A payout escalation marker is not available for this case.`,
    });
  });

  it(`shows the escalation section when a marker exists even without manage permission`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({ payoutEscalation: { confirmed: true } as PayoutCase[`payoutEscalation`] }),
      buildPermissions(),
    );

    expect(vm.escalation.show).toBe(true);
    expect(vm.escalation.showForm).toBe(false);
  });

  it(`enables the form only when both canManageEscalation and canSubmitEscalation are true`, () => {
    const both = derivePayoutViewModel(
      buildPayoutCase(),
      buildPermissions({ canManageEscalation: true, canSubmitEscalation: true }),
    );
    expect(both.escalation.showForm).toBe(true);

    const manageOnly = derivePayoutViewModel(
      buildPayoutCase(),
      buildPermissions({ canManageEscalation: true, canSubmitEscalation: false }),
    );
    expect(manageOnly.escalation.show).toBe(true);
    expect(manageOnly.escalation.showForm).toBe(false);
  });

  it(`propagates the upstream blocked reason verbatim when present`, () => {
    const vm = derivePayoutViewModel(
      buildPayoutCase({
        actionControls: {
          escalateBlockedReason: `Payout already escalated by another operator.`,
        } as PayoutCase[`actionControls`],
      }),
      buildPermissions({ canManageEscalation: true }),
    );

    expect(vm.escalation.blockedReason).toBe(`Payout already escalated by another operator.`);
  });
});
