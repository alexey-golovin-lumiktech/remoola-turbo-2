/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { ConsumerActionInterceptor, deviceIdMiddleware } from '../src/common';
import { envs } from '../src/envs';
import { ConsumerActionLogService } from '../src/shared/consumer-action-log.service';

describe(`Consumer action log integration (e2e)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await app.close();
  });

  it(`records oauth exchange failure in consumer_action_log`, async () => {
    const beforeCount = await prisma.consumerActionLogModel.count({
      where: { action: `consumer.auth.oauth_exchange_failure` },
    });

    const response = await request(app.getHttpServer()).post(`/api/consumer/auth/oauth/exchange`).send({}).expect(400);
    expect(response.body?.message).toBeDefined();

    let afterCount = beforeCount;
    for (let i = 0; i < 20; i += 1) {
      afterCount = await prisma.consumerActionLogModel.count({
        where: { action: `consumer.auth.oauth_exchange_failure` },
      });
      if (afterCount > beforeCount) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(afterCount).toBeGreaterThan(beforeCount);
    const latest = await prisma.consumerActionLogModel.findFirst({
      where: { action: `consumer.auth.oauth_exchange_failure` },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    });
    expect(latest?.deviceId).toBeTruthy();
    expect(latest?.resource).toBe(`auth`);
    expect(latest?.metadata).toEqual(
      expect.objectContaining({
        method: `POST`,
        path: expect.stringContaining(`/api/consumer/auth/oauth/exchange`),
      }),
    );
  });
});
