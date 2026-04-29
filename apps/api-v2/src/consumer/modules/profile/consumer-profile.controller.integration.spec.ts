import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ConsumerProfileController } from './consumer-profile.controller';
import { ConsumerProfileService } from './consumer-profile.service';
import { bootstrapApiTestApp } from '../../../../test/helpers/bootstrap-api-test-app';
import { extractMessage, withConsumerAppScope } from '../../../../test/helpers/http-test-helpers';

describe(`ConsumerProfileController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const consumerIdentity = {
    id: `00000000-0000-4000-8000-000000000211`,
    email: `consumer-boundary@local.test`,
    type: `CONSUMER`,
  };

  const service = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerProfileController],
      providers: [{ provide: ConsumerProfileService, useValue: service }],
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

  it(`PATCH /api/consumer/profile rejects invalid nested profile field types`, async () => {
    const res = await withConsumerAppScope(request(app.getHttpServer()).patch(`/api/consumer/profile`))
      .send({
        addressDetails: {
          city: 42,
        },
      })
      .expect(400);

    expect(service.updateProfile).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`city must be a string`);
  });
});
