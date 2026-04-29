import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ConsumerContactsController } from './consumer-contacts.controller';
import { ConsumerContactsService } from './consumer-contacts.service';
import { bootstrapApiTestApp } from '../../../../test/helpers/bootstrap-api-test-app';
import { extractMessage, withConsumerAppScope } from '../../../../test/helpers/http-test-helpers';

describe(`ConsumerContactsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const consumerIdentity = {
    id: `00000000-0000-4000-8000-000000000211`,
    email: `consumer-boundary@local.test`,
    type: `CONSUMER`,
  };

  const create = jest.fn(async (consumerId: string, body: Record<string, unknown>) => ({
    id: `contact-1`,
    consumerId,
    ...body,
  }));
  const update = jest.fn(async (_id: string, _consumerId: string, body: Record<string, unknown>) => ({
    id: `contact-1`,
    ...body,
  }));
  const service = {
    list: jest.fn(),
    search: jest.fn(),
    findByExactEmail: jest.fn(),
    create,
    get: jest.fn(),
    update,
    delete: jest.fn(),
    getDetails: jest.fn(),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerContactsController],
      providers: [{ provide: ConsumerContactsService, useValue: service }],
      preset: `validationOnly`,
      identity: consumerIdentity,
      cookieSecret: `test-secret`,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockImplementation(async (consumerId: string, body: Record<string, unknown>) => ({
      id: `contact-1`,
      consumerId,
      ...body,
    }));
    update.mockImplementation(async (_id: string, _consumerId: string, body: Record<string, unknown>) => ({
      id: `contact-1`,
      ...body,
    }));
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/consumer/contacts preserves validated nested address payloads`, async () => {
    const address = {
      postalCode: `10001`,
      country: `US`,
      state: `NY`,
      city: `New York`,
      street: `5th Avenue`,
    };

    const res = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/contacts`))
      .send({
        email: `created@example.com`,
        name: `Boundary Contact`,
        address,
      })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith(consumerIdentity.id, {
      email: `created@example.com`,
      name: `Boundary Contact`,
      address,
    });
    expect(res.body).toEqual(
      expect.objectContaining({
        id: `contact-1`,
        email: `created@example.com`,
        name: `Boundary Contact`,
        address,
      }),
    );
  });

  it(`PATCH /api/consumer/contacts/:id rejects non-string nested address fields`, async () => {
    const res = await withConsumerAppScope(request(app.getHttpServer()).patch(`/api/consumer/contacts/contact-1`))
      .send({
        address: {
          city: 123,
        },
      })
      .expect(400);

    expect(service.update).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`city must be a string`);
  });
});
