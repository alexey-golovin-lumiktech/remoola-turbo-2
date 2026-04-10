import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerStripeController } from './stripe.controller';

describe(`ConsumerStripeController`, () => {
  const service = {
    createStripeSession: jest.fn(),
    payWithSavedPaymentMethod: jest.fn(),
  };
  const originResolver = {
    validateConsumerAppScope: jest.fn(),
    validateConsumerAppScopeHeader: jest.fn(),
    resolveConsumerOriginByScope: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as unknown as ConsumerModel;
  const paymentRequestId = `payment-request-1`;
  const body = { paymentMethodId: `pm_123` };

  beforeEach(() => {
    service.createStripeSession.mockResolvedValue({ url: `https://checkout.stripe.test/session` });
    service.payWithSavedPaymentMethod.mockResolvedValue({ ok: true });
    originResolver.validateConsumerAppScope.mockReturnValue(`consumer`);
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer`);
    originResolver.resolveConsumerOriginByScope.mockReturnValue(`https://consumer.example.com`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`routes checkout session redirects through explicit app scope`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as never;

    await controller.createStripeSession(consumer, paymentRequestId, `consumer`, undefined, undefined, req);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(`consumer`);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(`consumer`);
    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer`);
    expect(service.createStripeSession).toHaveBeenCalledWith(
      consumer.id,
      paymentRequestId,
      `https://consumer.example.com`,
      undefined,
    );
  });

  it(`forwards contract redirect context into checkout session creation`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as never;

    await controller.createStripeSession(
      consumer,
      paymentRequestId,
      `consumer`,
      `contract-1`,
      `/contracts/contract-1`,
      req,
    );

    expect(service.createStripeSession).toHaveBeenCalledWith(
      consumer.id,
      paymentRequestId,
      `https://consumer.example.com`,
      {
        contractId: `contract-1`,
        returnTo: `/contracts/contract-1`,
      },
    );
  });

  it(`rejects checkout session creation when app scope is invalid`, async () => {
    originResolver.validateConsumerAppScope.mockReturnValue(undefined);
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await expect(
      controller.createStripeSession(consumer, paymentRequestId, `legacy-consumer`, undefined, undefined, {
        headers: {},
      } as never),
    ).rejects.toThrow(new BadRequestException(`Invalid app scope`));
    expect(service.createStripeSession).not.toHaveBeenCalled();
  });

  it(`rejects checkout session creation when request app scope mismatches claimed app scope`, async () => {
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer-mobile`);
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await expect(
      controller.createStripeSession(consumer, paymentRequestId, `consumer`, undefined, undefined, {
        path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
        headers: {},
      } as never),
    ).rejects.toThrow(new UnauthorizedException(`Invalid app scope`));
    expect(service.createStripeSession).not.toHaveBeenCalled();
  });

  it(`uses provided idempotency-key header when valid`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(`key-123`),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as never;

    await controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, `consumer`, req);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(`consumer`);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(`consumer`);
    expect(service.payWithSavedPaymentMethod).toHaveBeenCalledWith(consumer.id, paymentRequestId, body, `key-123`);
  });

  it(`rejects when idempotency-key header is missing`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(undefined),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as never;

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, `consumer`, req),
    ).rejects.toThrow(new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD));
  });

  it(`rejects invalid idempotency-key header`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(`bad key with spaces`),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      },
    } as never;

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, `consumer`, req),
    ).rejects.toThrow(new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD));
  });

  it(`rejects saved-method payments when app scope is invalid`, async () => {
    originResolver.validateConsumerAppScope.mockReturnValue(undefined);
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, `legacy-consumer`, {
        get: jest.fn(),
        path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
        headers: {},
      } as never),
    ).rejects.toThrow(new BadRequestException(`Invalid app scope`));
    expect(service.payWithSavedPaymentMethod).not.toHaveBeenCalled();
  });

  it(`rejects saved-method payments when request app scope mismatches claimed app scope`, async () => {
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(`consumer-mobile`);
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, `consumer`, {
        get: jest.fn(),
        path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
        headers: {},
      } as never),
    ).rejects.toThrow(new UnauthorizedException(`Invalid app scope`));
    expect(service.payWithSavedPaymentMethod).not.toHaveBeenCalled();
  });
});
