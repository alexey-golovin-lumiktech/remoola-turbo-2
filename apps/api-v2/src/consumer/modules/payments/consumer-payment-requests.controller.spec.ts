import { BadRequestException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

import { ConsumerPaymentRequestsController } from './consumer-payment-requests.controller';

describe(`ConsumerPaymentRequestsController`, () => {
  const service = {
    createPaymentRequest: jest.fn(),
    sendPaymentRequest: jest.fn(),
  };

  const originResolver = {
    validateConsumerAppScope: jest.fn(),
    validateConsumerAppScopeHeader: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service.sendPaymentRequest.mockResolvedValue({ paymentRequestId: `pr-1` });
    originResolver.validateConsumerAppScope.mockReturnValue(`consumer-css-grid`);
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer-css-grid`);
  });

  it(`passes canonical app scope when sending a payment request`, async () => {
    const controller = new ConsumerPaymentRequestsController(service as any, originResolver as any);
    const req = {
      path: `/api/consumer/payment-requests/pr-1/send`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as any;

    const result = await controller.send(consumer, `pr-1`, `consumer`, req);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(`consumer`);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(`consumer`);
    expect(service.sendPaymentRequest).toHaveBeenCalledWith(`consumer-1`, `pr-1`, `consumer-css-grid`);
    expect(result).toEqual({ paymentRequestId: `pr-1` });
  });

  it(`rejects send when app scope is invalid`, async () => {
    originResolver.validateConsumerAppScope.mockReturnValue(undefined);
    const controller = new ConsumerPaymentRequestsController(service as any, originResolver as any);

    expect(() => controller.send(consumer, `pr-1`, `legacy-scope`, { headers: {} } as any)).toThrow(
      new BadRequestException(`Invalid app scope`),
    );
    expect(service.sendPaymentRequest).not.toHaveBeenCalled();
  });

  it(`accepts legacy claimed app scopes after normalization`, async () => {
    const controller = new ConsumerPaymentRequestsController(service as any, originResolver as any);

    const result = await controller.send(consumer, `pr-1`, `consumer-mobile`, {
      path: `/api/consumer/payment-requests/pr-1/send`,
      headers: {},
    } as any);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(service.sendPaymentRequest).toHaveBeenCalledWith(`consumer-1`, `pr-1`, `consumer-css-grid`);
    expect(result).toEqual({ paymentRequestId: `pr-1` });
  });
});
