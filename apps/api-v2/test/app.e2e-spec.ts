/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';

describe(`API health smoke (e2e, isolated DB)`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`/health (GET)`, () => {
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
