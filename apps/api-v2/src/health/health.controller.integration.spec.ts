/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { HealthModule } from './health.module';
import { bootstrapApiTestApp } from '../../test/helpers/bootstrap-api-test-app';
import { BrevoMailService } from '../shared/brevo-mail.service';
import { DatabaseModule } from '../shared/database.module';

describe(`HealthController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      imports: [DatabaseModule, HealthModule],
      providerOverrides: [
        {
          provide: BrevoMailService,
          useValue: {
            verify: jest.fn(async () => undefined),
            sendMail: jest.fn(async () => undefined),
          },
        },
      ],
      preset: `minimal`,
    });

    app = harness.app;
    close = harness.close;
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`GET /health returns status ok with database service ok`, () => {
    return request(app.getHttpServer())
      .get(`/health`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: `ok`,
            services: expect.objectContaining({ database: `ok` }),
          }),
        );
      });
  });
});
