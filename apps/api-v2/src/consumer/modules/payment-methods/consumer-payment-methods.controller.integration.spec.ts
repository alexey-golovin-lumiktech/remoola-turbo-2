import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { bootstrapApiTestApp } from '../../../../test/helpers/bootstrap-api-test-app';
import { extractMessage, withConsumerAppScope } from '../../../../test/helpers/http-test-helpers';

describe(`ConsumerPaymentMethodsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const consumerIdentity = {
    id: `00000000-0000-4000-8000-000000000211`,
    email: `consumer-boundary@local.test`,
    type: `CONSUMER`,
  };

  const service = {
    list: jest.fn(),
    createManual: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerPaymentMethodsController],
      providers: [{ provide: ConsumerPaymentMethodsService, useValue: service }],
      preset: `validationOnly`,
      identity: consumerIdentity,
      cookieSecret: `test-secret`,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/consumer/payment-methods validates billingEmail on create`, async () => {
    const res = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/payment-methods`))
      .send({
        type: `CREDIT_CARD`,
        brand: `Visa`,
        last4: `4242`,
        billingEmail: `not-an-email`,
      })
      .expect(400);

    expect(service.createManual).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`billingEmail must be an email`);
  });

  it(`PATCH /api/consumer/payment-methods/:id validates defaultSelected as boolean`, async () => {
    const res = await withConsumerAppScope(request(app.getHttpServer()).patch(`/api/consumer/payment-methods/pm-test`))
      .send({
        defaultSelected: `yes`,
      })
      .expect(400);

    expect(service.update).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`defaultSelected must be a boolean value`);
  });
});
