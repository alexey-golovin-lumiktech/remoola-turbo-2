import { BadRequestException } from '@nestjs/common';

import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerStripeController } from './stripe.controller';

describe(`ConsumerStripeController`, () => {
  const service = {
    payWithSavedPaymentMethod: jest.fn(),
  };
  const originResolver = {
    validateRedirectOrigin: jest.fn(),
    resolveConsumerRedirectOrigin: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as unknown as ConsumerModel;
  const paymentRequestId = `payment-request-1`;
  const body = { paymentMethodId: `pm_123` };

  beforeEach(() => {
    service.payWithSavedPaymentMethod.mockResolvedValue({ ok: true });
    originResolver.validateRedirectOrigin.mockReturnValue(`https://consumer.example.com`);
    originResolver.resolveConsumerRedirectOrigin.mockReturnValue(`https://consumer.example.com`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`uses provided idempotency-key header when valid`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = { get: jest.fn().mockReturnValue(`key-123`) } as never;

    await controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, req);

    expect(service.payWithSavedPaymentMethod).toHaveBeenCalledWith(consumer.id, paymentRequestId, body, `key-123`);
  });

  it(`rejects when idempotency-key header is missing`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = { get: jest.fn().mockReturnValue(undefined) } as never;

    await expect(controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, req)).rejects.toThrow(
      new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD),
    );
  });

  it(`rejects invalid idempotency-key header`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = { get: jest.fn().mockReturnValue(`bad key with spaces`) } as never;

    await expect(controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, req)).rejects.toThrow(
      new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD),
    );
  });
});
