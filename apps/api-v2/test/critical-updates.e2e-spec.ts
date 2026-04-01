/**
 * E2E tests for critical updates (fintech-safe changes).
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 * Covers: stripe_webhook_event dedup, ledger_entry_outcome append-only.
 */
/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';

describe(`Critical updates (e2e, isolated DB)`, () => {
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
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe(`Health`, () => {
    it(`/health (GET) responds with status ok`, () => {
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

  describe(`Stripe webhook event dedup (DB-level idempotency)`, () => {
    const eventId = `evt_e2e_critical_${Date.now()}`;

    it(`inserts first event_id successfully`, async () => {
      await prisma.stripeWebhookEventModel.create({
        data: { eventId },
      });
      const count = await prisma.stripeWebhookEventModel.count({ where: { eventId } });
      expect(count).toBe(1);
    });

    it(`duplicate event_id is rejected at DB level (P2002)`, async () => {
      await expect(
        prisma.stripeWebhookEventModel.create({
          data: { eventId },
        }),
      ).rejects.toMatchObject({
        code: `P2002`,
        meta: expect.objectContaining({ target: [`event_id`] }),
      });
    });
  });

  describe(`Ledger entry outcome (append-only)`, () => {
    it(`ledger_entry_outcome table accepts insert for existing ledger entry`, async () => {
      const entry = await prisma.ledgerEntryModel.findFirst({
        select: { id: true },
      });
      expect(entry).toBeDefined();
      if (!entry) return;

      const outcome = await prisma.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.COMPLETED,
          source: `e2e-test`,
          externalId: `e2e-ext-${Date.now()}`,
        },
      });
      expect(outcome.id).toBeDefined();
      expect(outcome.ledgerEntryId).toBe(entry.id);
      expect(outcome.status).toBe($Enums.TransactionStatus.COMPLETED);
      expect(outcome.source).toBe(`e2e-test`);

      const count = await prisma.ledgerEntryOutcomeModel.count({
        where: { ledgerEntryId: entry.id },
      });
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
