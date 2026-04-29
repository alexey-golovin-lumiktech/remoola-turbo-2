/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import Stripe from 'stripe';
import request from 'supertest';

import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';

describe(`Stripe webhook HTTP contract (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
    app.use(
      express.json({
        limit: `10mb`,
        verify: (req, _res, buf) => {
          (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
        },
      }),
    );
    app.use(cookieParser(envs.SECURE_SESSION_SECRET));
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  it(`returns 401 when webhook secret is not configured`, async () => {
    const original = envs.STRIPE_WEBHOOK_SECRET;
    try {
      envs.STRIPE_WEBHOOK_SECRET = `STRIPE_WEBHOOK_SECRET`;
      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .send({ id: `evt_secret_missing`, type: `unknown.event`, data: { object: {} } })
        .expect(401);
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  it(`returns 400 when signature validation fails`, async () => {
    const original = envs.STRIPE_WEBHOOK_SECRET;
    try {
      envs.STRIPE_WEBHOOK_SECRET = `whsec_e2e_contract`;
      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`stripe-signature`, `invalid-signature`)
        .send({ id: `evt_invalid_signature`, type: `unknown.event`, data: { object: {} } })
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({
            received: false,
            error: `Webhook processing failed`,
          });
        });
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  it(`returns 400 when raw body is missing`, async () => {
    const original = envs.STRIPE_WEBHOOK_SECRET;
    try {
      envs.STRIPE_WEBHOOK_SECRET = `whsec_e2e_missing_raw`;
      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `text/plain`)
        .set(`stripe-signature`, `t=1,v1=fake`)
        .send(`not-json-body`)
        .expect(400)
        .expect(({ body }) => {
          expect(body).toEqual({
            received: false,
            error: `Missing raw body`,
          });
        });
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  it(`returns 200 on duplicate event replay and persists one dedupe marker`, async () => {
    const original = envs.STRIPE_WEBHOOK_SECRET;
    try {
      const secret = `whsec_e2e_contract_replay`;
      envs.STRIPE_WEBHOOK_SECRET = secret;
      const payload = JSON.stringify({
        id: `evt_replay_contract`,
        object: `event`,
        type: `unknown.event`,
        data: { object: {} },
      });
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret,
      });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, signature)
        .send(payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhooks`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, signature)
        .send(payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });

      const rows = await prisma.stripeWebhookEventModel.count({
        where: { eventId: `evt_replay_contract` },
      });
      expect(rows).toBe(1);
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  it(`accepts the legacy singular webhook path`, async () => {
    const original = envs.STRIPE_WEBHOOK_SECRET;
    try {
      const secret = `whsec_e2e_contract_singular`;
      envs.STRIPE_WEBHOOK_SECRET = secret;
      const payload = JSON.stringify({
        id: `evt_singular_contract`,
        object: `event`,
        type: `identity.verification_session.verified`,
        data: {
          object: {
            id: `vs_singular_contract`,
            object: `identity.verification_session`,
            metadata: { consumerId: `00000000-0000-4000-8000-000000000001` },
          },
        },
      });
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret,
      });

      await request(app.getHttpServer())
        .post(`/api/consumer/webhook`)
        .set(`content-type`, `application/json`)
        .set(`stripe-signature`, signature)
        .send(payload)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ received: true });
        });
    } finally {
      envs.STRIPE_WEBHOOK_SECRET = original;
    }
  });
});
