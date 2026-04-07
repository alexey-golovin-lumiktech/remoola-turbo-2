/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';
import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { configureApp } from '../src/main';
import { MailingService } from '../src/shared/mailing.service';

describe(`Signup verification cutover (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mailingService: MailingService;
  let jwtService: JwtService;
  let consumerId: string;
  let consumerEmail: string;
  let initialConsumerOrigin: string;
  let initialConsumerMobileOrigin: string;

  const consumerOrigin = `http://127.0.0.1:3001`;
  const consumerMobileOrigin = `http://127.0.0.1:3002`;
  const consumerMobileAppScope = `consumer-mobile` as const;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    initialConsumerOrigin = envs.CONSUMER_APP_ORIGIN;
    initialConsumerMobileOrigin = envs.CONSUMER_MOBILE_APP_ORIGIN;
    envs.CONSUMER_APP_ORIGIN = consumerOrigin;
    envs.CONSUMER_MOBILE_APP_ORIGIN = consumerMobileOrigin;

    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash, salt } = await hashPassword(`SignupVerify1!`);
    consumerEmail = `signup-verify-${Date.now()}@local.test`;
    const consumer = await prisma.consumerModel.create({
      data: {
        email: consumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: hash,
        salt,
        verified: false,
      },
    });
    consumerId = consumer.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    mailingService = app.get(MailingService);
    jwtService = app.get(JwtService);
    jest.spyOn(mailingService, `sendConsumerSignupVerificationEmail`).mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.consumerModel.update({
      where: { id: consumerId },
      data: { verified: false },
    });
  });

  afterAll(async () => {
    envs.CONSUMER_APP_ORIGIN = initialConsumerOrigin;
    envs.CONSUMER_MOBILE_APP_ORIGIN = initialConsumerMobileOrigin;
    await prisma.$disconnect();
    await app.close();
  });

  it(`issues token-only signup verification mail and redirects by token app scope`, async () => {
    const completeRes = await request(app.getHttpServer())
      .get(`/api/consumer/auth/signup/${consumerId}/complete-profile-creation?appScope=${consumerMobileAppScope}`)
      .set(CONSUMER_APP_SCOPE_HEADER, consumerMobileAppScope)
      .expect(200);
    expect(completeRes.text).toBe(`success`);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((mailingService.sendConsumerSignupVerificationEmail as jest.Mock).mock.calls.length > 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const mailCall = (mailingService.sendConsumerSignupVerificationEmail as jest.Mock).mock.calls[0]?.[0] as
      | { email: string; token: string }
      | undefined;
    expect(mailCall).toEqual({
      email: consumerEmail,
      token: expect.any(String),
    });
    expect(`referer` in (mailCall ?? {})).toBe(false);

    const verifyRes = await request(app.getHttpServer())
      .get(`/api/consumer/auth/signup/verification`)
      .query({ token: mailCall!.token })
      .expect(302);
    expect(verifyRes.headers.location).toContain(`${consumerMobileOrigin}/signup/verification`);
    expect(verifyRes.headers.location).toContain(`verified=yes`);
    expect(verifyRes.headers.location).toContain(`email=`);

    const updatedConsumer = await prisma.consumerModel.findUniqueOrThrow({
      where: { id: consumerId },
      select: { verified: true },
    });
    expect(updatedConsumer.verified).toBe(true);
  });

  it(`routes expired signup verification tokens by embedded app scope without referer query`, async () => {
    const expiredToken = await jwtService.signAsync(
      {
        sub: consumerId,
        identityId: consumerId,
        typ: `access`,
        scope: `consumer`,
        appScope: `consumer-mobile`,
      },
      { expiresIn: -1 },
    );

    const verifyRes = await request(app.getHttpServer())
      .get(`/api/consumer/auth/signup/verification`)
      .query({ token: expiredToken })
      .expect(302);

    expect(verifyRes.headers.location).toBe(`${consumerMobileOrigin}/signup/verification?verified=no`);
  });
});
