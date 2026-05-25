import { BadRequestException } from '@nestjs/common';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
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
    originResolver.validateConsumerAppScope.mockReturnValue(CURRENT_CONSUMER_APP_SCOPE);
    originResolver.validateConsumerAppScopeHeader.mockReturnValue(CURRENT_CONSUMER_APP_SCOPE);
    originResolver.resolveConsumerOriginByScope.mockReturnValue(`https://grid.example.com`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`routes checkout session redirects through explicit app scope`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as never;

    await controller.createStripeSession(
      consumer,
      paymentRequestId,
      CURRENT_CONSUMER_APP_SCOPE,
      undefined,
      undefined,
      req,
    );

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.createStripeSession).toHaveBeenCalledWith(
      consumer.id,
      paymentRequestId,
      `https://grid.example.com`,
      undefined,
    );
  });

  it(`forwards contract redirect context into checkout session creation`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as never;

    await controller.createStripeSession(
      consumer,
      paymentRequestId,
      CURRENT_CONSUMER_APP_SCOPE,
      `contract-1`,
      `/contracts/contract-1`,
      req,
    );

    expect(service.createStripeSession).toHaveBeenCalledWith(
      consumer.id,
      paymentRequestId,
      `https://grid.example.com`,
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

  it(`accepts the canonical claimed app scope for checkout`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await controller.createStripeSession(consumer, paymentRequestId, CURRENT_CONSUMER_APP_SCOPE, undefined, undefined, {
      path: `/api/consumer/stripe/${paymentRequestId}/stripe-session`,
      headers: {},
    } as never);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.createStripeSession).toHaveBeenCalled();
  });

  it(`uses provided idempotency-key header when valid`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(`key-123`),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as never;

    await controller.payWithSavedPaymentMethod(
      consumer,
      paymentRequestId,
      body as never,
      CURRENT_CONSUMER_APP_SCOPE,
      req,
    );

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.payWithSavedPaymentMethod).toHaveBeenCalledWith(consumer.id, paymentRequestId, body, `key-123`);
  });

  it(`rejects when idempotency-key header is missing`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(undefined),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as never;

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, CURRENT_CONSUMER_APP_SCOPE, req),
    ).rejects.toThrow(new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_PAY_WITH_SAVED_METHOD));
  });

  it(`rejects invalid idempotency-key header`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);
    const req = {
      get: jest.fn().mockReturnValue(`bad key with spaces`),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    } as never;

    await expect(
      controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, CURRENT_CONSUMER_APP_SCOPE, req),
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

  it(`accepts the canonical claimed app scope for saved-method payments`, async () => {
    const controller = new ConsumerStripeController(service as never, originResolver as never);

    await controller.payWithSavedPaymentMethod(consumer, paymentRequestId, body as never, CURRENT_CONSUMER_APP_SCOPE, {
      get: jest.fn().mockReturnValue(`key-123`),
      path: `/api/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
      headers: {},
    } as never);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.payWithSavedPaymentMethod).toHaveBeenCalledWith(consumer.id, paymentRequestId, body, `key-123`);
  });
});
