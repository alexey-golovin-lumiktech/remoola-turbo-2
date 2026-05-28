import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { type AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import {
  type PaymentMethodSummaryRow,
  PayoutPaymentMethodResolverService,
} from './payout-payment-method-resolver.service';

describe(`PayoutPaymentMethodResolverService`, () => {
  function buildService() {
    const repository = {
      fetchPaymentMethodsByIds: jest.fn<(...a: any[]) => any>(),
    };

    return {
      repository,
      service: new PayoutPaymentMethodResolverService(repository as unknown as AdminV2PayoutsRepository),
    };
  }

  function buildPaymentMethod(overrides: Partial<PaymentMethodSummaryRow> = {}): PaymentMethodSummaryRow {
    return {
      id: `pm-1`,
      consumerId: `consumer-1`,
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      brand: null,
      last4: null,
      bankLast4: `5511`,
      deletedAt: null,
      ...overrides,
    };
  }

  it(`returns no payment methods and unavailable destination when metadata has no payment method id`, async () => {
    const { repository, service } = buildService();

    const paymentMethodsById = await service.getPaymentMethodsById([
      { consumerId: `consumer-1`, metadata: null },
      { consumerId: `consumer-2`, metadata: {} },
      { consumerId: `consumer-3`, metadata: { paymentMethodId: `  ` } },
    ]);

    expect(paymentMethodsById.size).toBe(0);
    expect(repository.fetchPaymentMethodsByIds).not.toHaveBeenCalled();
    expect(service.resolveDestination({ consumerId: `consumer-1`, metadata: null }, paymentMethodsById)).toEqual({
      destinationPaymentMethodSummary: null,
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
    });
  });

  it(`deduplicates metadata payment method ids before batch lookup`, async () => {
    const { repository, service } = buildService();
    repository.fetchPaymentMethodsByIds.mockResolvedValueOnce([
      buildPaymentMethod({ id: `pm-1` }),
      buildPaymentMethod({ id: `pm-2` }),
    ]);

    const paymentMethodsById = await service.getPaymentMethodsById([
      { consumerId: `consumer-1`, metadata: { paymentMethodId: ` pm-1 ` } },
      { consumerId: `consumer-1`, metadata: { paymentMethodId: `pm-1` } },
      { consumerId: `consumer-2`, metadata: { paymentMethodId: `pm-2` } },
    ]);

    expect(repository.fetchPaymentMethodsByIds).toHaveBeenCalledWith([`pm-1`, `pm-2`]);
    expect(paymentMethodsById.has(`pm-1`)).toBe(true);
    expect(paymentMethodsById.has(`pm-2`)).toBe(true);
  });

  it(`returns unavailable destination when lookup result is missing or belongs to another consumer`, () => {
    const { service } = buildService();
    const paymentMethodsById = new Map<string, PaymentMethodSummaryRow>([
      [`pm-other-consumer`, buildPaymentMethod({ id: `pm-other-consumer`, consumerId: `consumer-2` })],
    ]);

    expect(
      service.resolveDestination(
        { consumerId: `consumer-1`, metadata: { paymentMethodId: `pm-missing` } },
        paymentMethodsById,
      ),
    ).toEqual({
      destinationPaymentMethodSummary: null,
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
    });
    expect(
      service.resolveDestination(
        { consumerId: `consumer-1`, metadata: { paymentMethodId: `pm-other-consumer` } },
        paymentMethodsById,
      ),
    ).toEqual({
      destinationPaymentMethodSummary: null,
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
    });
  });

  it(`returns linked destination summary for a matching payment method`, () => {
    const { service } = buildService();
    const paymentMethodsById = new Map<string, PaymentMethodSummaryRow>([
      [
        `pm-1`,
        buildPaymentMethod({
          brand: `Visa`,
          last4: `4242`,
          bankLast4: null,
        }),
      ],
    ]);

    expect(
      service.resolveDestination(
        { consumerId: `consumer-1`, metadata: { paymentMethodId: `pm-1` } },
        paymentMethodsById,
      ),
    ).toEqual({
      destinationPaymentMethodSummary: {
        id: `pm-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: `Visa`,
        last4: `4242`,
        bankLast4: null,
        deletedAt: null,
      },
      destinationAvailability: `linked`,
      destinationLinkageSource: `metadata.paymentMethodId`,
    });
  });

  it(`preserves deleted payment method details in the linked summary shape`, () => {
    const { service } = buildService();
    const deletedAt = new Date(`2026-04-10T00:00:00.000Z`);
    const paymentMethodsById = new Map<string, PaymentMethodSummaryRow>([[`pm-1`, buildPaymentMethod({ deletedAt })]]);

    expect(
      service.resolveDestination(
        { consumerId: `consumer-1`, metadata: { paymentMethodId: `pm-1` } },
        paymentMethodsById,
      ),
    ).toEqual({
      destinationPaymentMethodSummary: {
        id: `pm-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `5511`,
        deletedAt: deletedAt.toISOString(),
      },
      destinationAvailability: `linked`,
      destinationLinkageSource: `metadata.paymentMethodId`,
    });
  });
});
