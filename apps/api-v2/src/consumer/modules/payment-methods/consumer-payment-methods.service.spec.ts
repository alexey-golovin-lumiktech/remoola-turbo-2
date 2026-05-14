import { $Enums } from '@remoola/database-2';

import { type ConsumerPaymentMethodsRepository } from './consumer-payment-methods.repository';
import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';

describe(`ConsumerPaymentMethodsService`, () => {
  const consumerId = `consumer-1`;

  function createRepositoryMock() {
    return {
      listForConsumer: jest.fn(),
      createManualPaymentMethod: jest.fn(),
      findActiveByIdForConsumer: jest.fn(),
      clearDefaultForType: jest.fn(),
      createBillingDetails: jest.fn(),
      attachBillingDetails: jest.fn(),
      updateBillingDetails: jest.fn(),
      updatePaymentMethodDefault: jest.fn(),
      softDeleteAndPromoteFallback: jest.fn(),
    } as unknown as jest.Mocked<ConsumerPaymentMethodsRepository>;
  }

  it(`marks only Stripe-backed cards as reusable for payer payments`, async () => {
    const paymentMethodsRepository = createRepositoryMock();
    paymentMethodsRepository.listForConsumer.mockResolvedValue([
      {
        id: `pm-manual-card`,
        consumerId,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        brand: `Manual Probe`,
        last4: `9999`,
        expMonth: `12`,
        expYear: `2034`,
        defaultSelected: false,
        stripePaymentMethodId: null,
        billingDetails: null,
      },
      {
        id: `pm-reusable-card`,
        consumerId,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        brand: `visa`,
        last4: `4242`,
        expMonth: `12`,
        expYear: `2034`,
        defaultSelected: true,
        stripePaymentMethodId: `pm_stripe`,
        billingDetails: null,
      },
      {
        id: `pm-bank`,
        consumerId,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: `Test Bank`,
        last4: `6789`,
        expMonth: null,
        expYear: null,
        defaultSelected: true,
        stripePaymentMethodId: null,
        billingDetails: null,
      },
    ] as never);

    const service = new ConsumerPaymentMethodsService(paymentMethodsRepository);

    await expect(service.list(consumerId)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: `pm-manual-card`,
          reusableForPayerPayments: false,
        }),
        expect.objectContaining({
          id: `pm-reusable-card`,
          reusableForPayerPayments: true,
        }),
        expect.objectContaining({
          id: `pm-bank`,
          reusableForPayerPayments: false,
        }),
      ],
    });
    expect(paymentMethodsRepository.listForConsumer).toHaveBeenCalledWith(consumerId);
  });

  it(`honors defaultSelected when creating a new manual method`, async () => {
    const paymentMethodsRepository = createRepositoryMock();
    paymentMethodsRepository.createManualPaymentMethod.mockResolvedValue({
      id: `pm-2`,
      defaultSelected: true,
    } as never);
    const service = new ConsumerPaymentMethodsService(paymentMethodsRepository);
    const body = {
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      brand: `Backup Bank`,
      last4: `4321`,
      billingName: `Jon Dow`,
      defaultSelected: true,
    };

    await expect(service.createManual(consumerId, body)).resolves.toEqual({ id: `pm-2`, defaultSelected: true });

    expect(paymentMethodsRepository.createManualPaymentMethod).toHaveBeenCalledWith(consumerId, body);
  });

  it(`promotes a fallback method when deleting the current default`, async () => {
    const paymentMethodsRepository = createRepositoryMock();
    paymentMethodsRepository.findActiveByIdForConsumer.mockResolvedValue({
      id: `pm-default`,
      consumerId,
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      defaultSelected: true,
    } as never);
    paymentMethodsRepository.softDeleteAndPromoteFallback.mockResolvedValue(undefined);
    const service = new ConsumerPaymentMethodsService(paymentMethodsRepository);

    await service.delete(consumerId, `pm-default`);

    expect(paymentMethodsRepository.findActiveByIdForConsumer).toHaveBeenCalledWith(consumerId, `pm-default`);
    expect(paymentMethodsRepository.softDeleteAndPromoteFallback).toHaveBeenCalledWith({
      consumerId,
      paymentMethodId: `pm-default`,
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      wasDefault: true,
    });
  });

  it(`keeps bank default when a card becomes default`, async () => {
    const paymentMethodsRepository = createRepositoryMock();
    const service = new ConsumerPaymentMethodsService(paymentMethodsRepository);
    const body = {
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      brand: `Visa`,
      last4: `4242`,
      expMonth: `12`,
      expYear: `2030`,
      billingName: `Jon Dow`,
      defaultSelected: true,
    };

    await service.createManual(consumerId, body);

    expect(paymentMethodsRepository.createManualPaymentMethod).toHaveBeenCalledWith(consumerId, body);
  });

  it(`clears same-type defaults when updating a method to default`, async () => {
    const paymentMethodsRepository = createRepositoryMock();
    paymentMethodsRepository.findActiveByIdForConsumer.mockResolvedValue({
      id: `pm-card`,
      consumerId,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      defaultSelected: false,
      billingDetailsId: null,
    } as never);
    const service = new ConsumerPaymentMethodsService(paymentMethodsRepository);

    await service.update(consumerId, `pm-card`, { defaultSelected: true });

    expect(paymentMethodsRepository.clearDefaultForType).toHaveBeenCalledWith(
      consumerId,
      $Enums.PaymentMethodType.CREDIT_CARD,
    );
    expect(paymentMethodsRepository.updatePaymentMethodDefault).toHaveBeenCalledWith(`pm-card`, true);
  });
});
