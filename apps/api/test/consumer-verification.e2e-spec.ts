/**
 * E2E coverage for consumer verification start + managed Stripe Identity webhook state.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import Stripe from 'stripe';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { StripeWebhookService } from '../src/consumer/modules/payment-methods/stripe-webhook.service';
import { ConsumerPaymentsService } from '../src/consumer/modules/payments/consumer-payments.service';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { STRIPE_IDENTITY_STATUS } from '../src/shared-common';

describe(`Consumer verification lifecycle (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let stripeWebhookService: StripeWebhookService;
  let consumerPaymentsService: ConsumerPaymentsService;
  let consumerId = ``;

  const consumerEmail = `verification-e2e-consumer@local.test`;
  const consumerPassword = `VerificationE2E1!`;

  function signedWebhookEvent(secret: string, event: Record<string, unknown>) {
    const payload = JSON.stringify(event);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    return { payload, signature };
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash, salt } = await hashPassword(consumerPassword);
    const consumer = await prisma.consumerModel.create({
      data: {
        email: consumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: hash,
        salt,
        personalDetails: {
          create: {
            citizenOf: `US`,
            dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
            passportOrIdNumber: `A1234567`,
            firstName: `Original`,
            lastName: `Consumer`,
          },
        },
      },
    });
    consumerId = consumer.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    stripeWebhookService = moduleFixture.get(StripeWebhookService);
    consumerPaymentsService = moduleFixture.get(ConsumerPaymentsService);

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(
      express.json({
        limit: `10mb`,
        verify: (req, _res, buf) => {
          (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
        },
      }),
    );
    app.use(cookieParser(envs.SECURE_SESSION_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({
        skipMissingProperties: true,
        skipNullProperties: true,
        skipUndefinedProperties: true,
        stopAtFirstError: true,
        transform: true,
        transformOptions: {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
          enableImplicitConversion: true,
          exposeDefaultValues: false,
        },
      }),
    );
    const reflector = moduleFixture.get(Reflector);
    const jwtService = moduleFixture.get(JwtService);
    const prismaService = moduleFixture.get(PrismaService);
    app.useGlobalGuards(new AuthGuard(reflector, jwtService, prismaService));
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it(`starts verification, ignores stale webhooks, and preserves profile identity data on verify`, async () => {
    jest.spyOn(consumerPaymentsService, `assertProfileCompleteForVerification`).mockResolvedValue(undefined);

    const stripeClient = (stripeWebhookService as unknown as { stripe: Stripe }).stripe;
    jest.spyOn(stripeClient.identity.verificationSessions, `create`).mockResolvedValue({
      id: `vs_live_e2e`,
      client_secret: `vs_secret_live_e2e`,
    } as unknown as Stripe.Response<Stripe.Identity.VerificationSession>);

    const agent = request.agent(app.getHttpServer());
    await agent.post(`/api/consumer/auth/login`).send({ email: consumerEmail, password: consumerPassword }).expect(201);

    const startRes = await agent.post(`/api/consumer/verification/sessions`).expect(201);
    expect(startRes.body).toEqual({
      clientSecret: `vs_secret_live_e2e`,
      sessionId: `vs_live_e2e`,
    });

    const pendingConsumer = await prisma.consumerModel.findUniqueOrThrow({
      where: { id: consumerId },
      select: {
        stripeIdentityStatus: true,
        stripeIdentitySessionId: true,
        stripeIdentityStartedAt: true,
        stripeIdentityUpdatedAt: true,
      },
    });
    expect(pendingConsumer.stripeIdentityStatus).toBe(STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION);
    expect(pendingConsumer.stripeIdentitySessionId).toBe(`vs_live_e2e`);
    expect(pendingConsumer.stripeIdentityStartedAt).toBeTruthy();
    expect(pendingConsumer.stripeIdentityUpdatedAt).toBeTruthy();

    const originalSecret = envs.STRIPE_WEBHOOK_SECRET;
    envs.STRIPE_WEBHOOK_SECRET = `whsec_consumer_verification_e2e`;

    try {
      const staleRequiresInput = signedWebhookEvent(envs.STRIPE_WEBHOOK_SECRET, {
        id: `evt_verification_stale`,
        object: `event`,
        type: `identity.verification_session.requires_input`,
        data: {
          object: {
            id: `vs_stale_e2e`,
            object: `identity.verification_session`,
            metadata: { consumerId },
            last_error: {
              code: `document_expired`,
              reason: `The provided document has expired.`,
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, staleRequiresInput.signature)
        .send(staleRequiresInput.payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });

      const afterStaleEvent = await prisma.consumerModel.findUniqueOrThrow({
        where: { id: consumerId },
        select: {
          stripeIdentityStatus: true,
          stripeIdentitySessionId: true,
          stripeIdentityLastErrorCode: true,
        },
      });
      expect(afterStaleEvent.stripeIdentityStatus).toBe(STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION);
      expect(afterStaleEvent.stripeIdentitySessionId).toBe(`vs_live_e2e`);
      expect(afterStaleEvent.stripeIdentityLastErrorCode).toBeNull();

      const requiresInput = signedWebhookEvent(envs.STRIPE_WEBHOOK_SECRET, {
        id: `evt_verification_requires_input`,
        object: `event`,
        type: `identity.verification_session.requires_input`,
        data: {
          object: {
            id: `vs_live_e2e`,
            object: `identity.verification_session`,
            metadata: { consumerId },
            last_error: {
              code: `document_expired`,
              reason: `The provided document has expired.`,
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, requiresInput.signature)
        .send(requiresInput.payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });

      const afterRequiresInput = await prisma.consumerModel.findUniqueOrThrow({
        where: { id: consumerId },
        select: {
          legalVerified: true,
          stripeIdentityStatus: true,
          stripeIdentitySessionId: true,
          stripeIdentityLastErrorCode: true,
          stripeIdentityLastErrorReason: true,
          stripeIdentityVerifiedAt: true,
        },
      });
      expect(afterRequiresInput.legalVerified).toBe(false);
      expect(afterRequiresInput.stripeIdentityStatus).toBe(STRIPE_IDENTITY_STATUS.REQUIRES_INPUT);
      expect(afterRequiresInput.stripeIdentitySessionId).toBe(`vs_live_e2e`);
      expect(afterRequiresInput.stripeIdentityLastErrorCode).toBe(`document_expired`);
      expect(afterRequiresInput.stripeIdentityLastErrorReason).toBe(`The provided document has expired.`);
      expect(afterRequiresInput.stripeIdentityVerifiedAt).toBeNull();

      const verified = signedWebhookEvent(envs.STRIPE_WEBHOOK_SECRET, {
        id: `evt_verification_verified`,
        object: `event`,
        type: `identity.verification_session.verified`,
        data: {
          object: {
            id: `vs_live_e2e`,
            object: `identity.verification_session`,
            metadata: { consumerId },
            verified_outputs: {
              first_name: `Verified`,
              last_name: `Consumer`,
              dob: { day: 1, month: 1, year: 1990 },
              address: { country: `US` },
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, verified.signature)
        .send(verified.payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });

      const verifiedConsumer = await prisma.consumerModel.findUniqueOrThrow({
        where: { id: consumerId },
        select: {
          legalVerified: true,
          stripeIdentityStatus: true,
          stripeIdentitySessionId: true,
          stripeIdentityLastErrorCode: true,
          stripeIdentityLastErrorReason: true,
          stripeIdentityVerifiedAt: true,
          personalDetails: {
            select: {
              firstName: true,
              lastName: true,
              citizenOf: true,
              passportOrIdNumber: true,
            },
          },
        },
      });
      expect(verifiedConsumer.legalVerified).toBe(true);
      expect(verifiedConsumer.stripeIdentityStatus).toBe(STRIPE_IDENTITY_STATUS.VERIFIED);
      expect(verifiedConsumer.stripeIdentitySessionId).toBe(`vs_live_e2e`);
      expect(verifiedConsumer.stripeIdentityLastErrorCode).toBeNull();
      expect(verifiedConsumer.stripeIdentityLastErrorReason).toBeNull();
      expect(verifiedConsumer.stripeIdentityVerifiedAt).toBeTruthy();
      expect(verifiedConsumer.personalDetails).toEqual({
        firstName: `Verified`,
        lastName: `Consumer`,
        citizenOf: `US`,
        passportOrIdNumber: `A1234567`,
      });
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = originalSecret;
    }
  });
});
