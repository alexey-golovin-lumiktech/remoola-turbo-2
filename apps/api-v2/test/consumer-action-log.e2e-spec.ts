/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { ConsumerActionInterceptor, deviceIdMiddleware } from '../src/common';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { ConsumerActionLogService } from '../src/shared/consumer-action-log.service';

describe(`Consumer action log integration (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const consumerOrigin = `http://127.0.0.1:3003`;
  const appScope = CURRENT_CONSUMER_APP_SCOPE;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(cookieParser(envs.SECURE_SESSION_SECRET));
    app.use(deviceIdMiddleware);
    app.useGlobalInterceptors(
      new ConsumerActionInterceptor(moduleFixture.get(ConsumerActionLogService), moduleFixture.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  it(`records oauth complete failure in consumer_action_log`, async () => {
    const beforeCount = await prisma.consumerActionLogModel.count({
      where: { action: `consumer.auth.oauth_complete_failure` },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/consumer/auth/oauth/complete?appScope=${appScope}`)
      .set(`origin`, consumerOrigin)
      .set(CONSUMER_APP_SCOPE_HEADER, appScope)
      .send({})
      .expect(400);
    expect(response.body?.message).toBeDefined();

    let afterCount = beforeCount;
    for (let i = 0; i < 20; i += 1) {
      afterCount = await prisma.consumerActionLogModel.count({
        where: { action: `consumer.auth.oauth_complete_failure` },
      });
      if (afterCount > beforeCount) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(afterCount).toBeGreaterThan(beforeCount);
    const latest = await prisma.consumerActionLogModel.findFirst({
      where: { action: `consumer.auth.oauth_complete_failure` },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    });
    expect(latest?.deviceId).toBeTruthy();
    expect(latest?.resource).toBe(`auth`);
    expect(latest?.metadata).toEqual(
      expect.objectContaining({
        method: `POST`,
        path: expect.stringContaining(`/api/consumer/auth/oauth/complete`),
      }),
    );
  });
});
