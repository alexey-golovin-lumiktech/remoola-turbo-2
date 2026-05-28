/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { HealthModule } from './health.module';
import { bootstrapApiTestApp } from '../../test/helpers/bootstrap-api-test-app';
import { envs } from '../envs';
import { DatabaseModule } from '../shared/database.module';
import { MAIL_TRANSPORT } from '../shared/mail-transport.port';

describe(`HealthController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      imports: [DatabaseModule, HealthModule],
      providerOverrides: [
        {
          provide: MAIL_TRANSPORT,
          useValue: {
            verify: jest.fn<(...a: any[]) => any>(async () => undefined),
            sendMail: jest.fn<(...a: any[]) => any>(async () => undefined),
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

  it(`rejects detailed health without the internal bearer secret`, () => {
    return request(app.getHttpServer()).get(`/health/detailed`).expect(403);
  });

  it(`allows detailed health with the internal bearer secret`, () => {
    return request(app.getHttpServer())
      .get(`/health/detailed`)
      .set(`Authorization`, `Bearer ${envs.CRON_SECRET}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: `ok`,
            uptime: expect.any(Number),
          }),
        );
        expect(body).not.toHaveProperty(`memory`);
        expect(body).not.toHaveProperty(`version`);
      });
  });
});
