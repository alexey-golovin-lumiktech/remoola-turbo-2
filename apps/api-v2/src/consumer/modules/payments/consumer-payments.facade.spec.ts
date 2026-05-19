import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { type ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { type ConsumerPaymentsReadService } from './consumer-payments-read.service';
import { type ConsumerPaymentsWriteService } from './consumer-payments-write.service';
import { ConsumerPaymentsService } from './consumer-payments.service';

function createFacade() {
  const policiesService = {
    assertProfileCompleteForVerification: jest.fn(),
  } as unknown as jest.Mocked<ConsumerPaymentsPoliciesService>;
  const readService = {
    listPayments: jest.fn(),
    getPaymentView: jest.fn(),
    getBalancesCompleted: jest.fn(),
    getBalancesIncludePending: jest.fn(),
    getAvailableBalance: jest.fn(),
    getHistory: jest.fn(),
  } as unknown as jest.Mocked<ConsumerPaymentsReadService>;
  const writeService = {
    startPayment: jest.fn(),
    createPaymentRequest: jest.fn(),
    sendPaymentRequest: jest.fn(),
    withdraw: jest.fn(),
    transfer: jest.fn(),
  } as unknown as jest.Mocked<ConsumerPaymentsWriteService>;

  return {
    policiesService,
    readService,
    service: new ConsumerPaymentsService(policiesService, readService, writeService),
    writeService,
  };
}

describe(`ConsumerPaymentsService facade`, () => {
  const consumerId = `consumer-1`;

  it(`delegates profile-complete checks to the policy layer`, async () => {
    const { policiesService, service } = createFacade();
    policiesService.assertProfileCompleteForVerification.mockResolvedValue(undefined);

    await service.assertProfileCompleteForVerification(consumerId);

    expect(policiesService.assertProfileCompleteForVerification).toHaveBeenCalledWith(consumerId);
  });

  it(`delegates read paths without embedding query behavior`, async () => {
    const { readService, service } = createFacade();
    readService.listPayments.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    await expect(service.listPayments({ consumerId, page: 1, pageSize: 20, role: `REQUESTER` })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    expect(readService.listPayments).toHaveBeenCalledWith({ consumerId, page: 1, pageSize: 20, role: `REQUESTER` });
  });

  it(`delegates write paths with app scope and idempotency metadata intact`, async () => {
    const { service, writeService } = createFacade();
    writeService.startPayment.mockResolvedValue({
      paymentRequestId: `pr-1`,
      ledgerId: `00000000-0000-4000-8000-000000000001`,
    });
    writeService.withdraw.mockResolvedValue({ ledgerId: `00000000-0000-4000-8000-000000000002` });

    await service.startPayment(
      consumerId,
      {
        amount: `10.00`,
        currencyCode: $Enums.CurrencyCode.USD,
        email: `payer@example.com`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      },
      CURRENT_CONSUMER_APP_SCOPE,
    );
    await service.withdraw(consumerId, { amount: 25, currencyCode: $Enums.CurrencyCode.USD }, `withdraw-key`);

    expect(writeService.startPayment).toHaveBeenCalledWith(
      consumerId,
      expect.objectContaining({ email: `payer@example.com` }),
      CURRENT_CONSUMER_APP_SCOPE,
    );
    expect(writeService.withdraw).toHaveBeenCalledWith(
      consumerId,
      { amount: 25, currencyCode: $Enums.CurrencyCode.USD },
      `withdraw-key`,
    );
  });
});
