import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

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
    originResolver.validateConsumerAppScope.mockReturnValue(`consumer-mobile`);
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer-mobile`);
  });

  it(`passes the claimed consumer app scope when starting a payment`, async () => {
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);
    const body = { email: `payer@example.com`, amount: `10`, method: `CREDIT_CARD` } as any;
    const req = {
      path: `/api/consumer/payments/start`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer-mobile`,
      },
    } as any;

    const result = await controller.startPayment(consumer, body, req, `consumer-mobile`);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(`consumer-mobile`);
    expect(service.startPayment).toHaveBeenCalledWith(`consumer-1`, body, `consumer-mobile`);
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

  it(`rejects start payment when request app scope mismatches claimed app scope`, () => {
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer`);
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);

    expect(() =>
      controller.startPayment(
        consumer,
        { amount: `10`, method: `CREDIT_CARD` } as any,
        { path: `/api/consumer/payments/start`, headers: { [CONSUMER_APP_SCOPE_HEADER]: `consumer` } } as any,
        `consumer-mobile`,
      ),
    ).toThrow(UnauthorizedException);
    expect(service.startPayment).not.toHaveBeenCalled();
  });
});
