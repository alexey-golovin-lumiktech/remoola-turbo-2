import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { ConsumerPaymentsController } from './consumer-payments.controller';

describe(`ConsumerPaymentsController`, () => {
  const service = {
    startPayment: jest.fn(),
  };

  const invoiceService = {} as any;
  const originResolver = {
    validateConsumerAppScope: jest.fn(),
    validateConsumerAppScopeHeader: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service.startPayment.mockResolvedValue({ paymentRequestId: `pr-1` });
    originResolver.validateConsumerAppScope.mockReturnValue(CURRENT_CONSUMER_APP_SCOPE);
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(CURRENT_CONSUMER_APP_SCOPE);
  });

  it(`passes the claimed consumer app scope when starting a payment`, async () => {
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);
    const body = { email: `payer@example.com`, amount: `10`, method: `CREDIT_CARD` } as any;
    const req = {
      path: `/api/consumer/payments/start`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as any;

    const result = await controller.startPayment(consumer, body, req, CURRENT_CONSUMER_APP_SCOPE);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.startPayment).toHaveBeenCalledWith(`consumer-1`, body, CURRENT_CONSUMER_APP_SCOPE);
    expect(result).toEqual({ paymentRequestId: `pr-1` });
  });

  it(`rejects start payment when app scope is invalid`, () => {
    originResolver.validateConsumerAppScope.mockReturnValue(undefined);
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);

    expect(() =>
      controller.startPayment(
        consumer,
        { amount: `10`, method: `CREDIT_CARD` } as any,
        { headers: {} } as any,
        `legacy`,
      ),
    ).toThrow(BadRequestException);
    expect(service.startPayment).not.toHaveBeenCalled();
  });

  it(`rejects start payment when claimed app scope is invalid`, () => {
    originResolver.validateConsumerAppScope.mockReturnValue(undefined);
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);

    expect(() =>
      controller.startPayment(
        consumer,
        { amount: `10`, method: `CREDIT_CARD` } as any,
        {
          path: `/api/consumer/payments/start`,
          headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
        } as any,
        `unknown-scope` as never,
      ),
    ).toThrow(BadRequestException);
    expect(service.startPayment).not.toHaveBeenCalled();
  });
});
