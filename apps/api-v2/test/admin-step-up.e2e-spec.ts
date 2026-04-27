/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';
import { adminErrorCodes } from '@remoola/shared-constants';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { getApiAdminCsrfTokenCookieKey } from '../src/shared-common';

const STEP_UP_SUPER_EMAIL = `stepup-super@e2e.local`;
const STEP_UP_SUPER_PASSWORD = `StepUpSuper1!@#`;
const STEP_UP_TARGET_EMAIL = `stepup-target@e2e.local`;
const STEP_UP_TARGET_PASSWORD = `StepUpTarget1!@#`;

describe(`Admin step-up (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminOrigin = `http://127.0.0.1:3010`;
  let targetAdminId: string;

  function parseCookieValue(cookies: string[] | undefined, key: string): string | null {
    if (!Array.isArray(cookies)) return null;
    const row = cookies.find((line) => line.startsWith(`${key}=`));
    if (!row) return null;
    const [raw] = row.split(`;`);
    return raw.slice(`${key}=`.length);
  }

  function asCookieArray(header: string | string[] | undefined): string[] | undefined {
    if (Array.isArray(header)) return header;
    if (typeof header === `string`) return [header];
    return undefined;
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();

    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash: superHash, salt: superSalt } = await hashPassword(STEP_UP_SUPER_PASSWORD);
    await prisma.adminModel.create({
      data: {
        email: STEP_UP_SUPER_EMAIL,
        password: superHash,
        salt: superSalt,
        type: $Enums.AdminType.SUPER,
      },
    });

    const { hash: targetHash, salt: targetSalt } = await hashPassword(STEP_UP_TARGET_PASSWORD);
    const targetAdmin = await prisma.adminModel.create({
      data: {
        email: STEP_UP_TARGET_EMAIL,
        password: targetHash,
        salt: targetSalt,
        type: $Enums.AdminType.ADMIN,
      },
    });
    targetAdminId = targetAdmin.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(express.json({ limit: `10mb` }));
    app.use(cookieParser(`test-secret`));
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

  describe(`PATCH /api/admin-v2/admins/:adminId/password (step-up required)`, () => {
    it(`returns 400 when passwordConfirmation is missing`, async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post(`/api/admin-v2/auth/login`)
        .set(`origin`, adminOrigin)
        .send({ email: STEP_UP_SUPER_EMAIL, password: STEP_UP_SUPER_PASSWORD })
        .expect(201);
      const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
      expect(csrf).toBeTruthy();

      const res = await agent
        .patch(`/api/admin-v2/admins/${targetAdminId}/password`)
        .set(`origin`, adminOrigin)
        .set(`x-csrf-token`, csrf ?? ``)
        .send({ password: `NewValid1!@#abc` })
        .expect(400);

      const body = res.body as { message?: string | string[] };
      const message = Array.isArray(body.message) ? body.message.join(`, `) : (body.message ?? ``);
      expect(message).toMatch(/passwordConfirmation|ADMIN_PASSWORD_CONFIRMATION_REQUIRED/i);
    });

    it(`returns 400 when passwordConfirmation is empty`, async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post(`/api/admin-v2/auth/login`)
        .set(`origin`, adminOrigin)
        .send({ email: STEP_UP_SUPER_EMAIL, password: STEP_UP_SUPER_PASSWORD })
        .expect(201);
      const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
      expect(csrf).toBeTruthy();

      const res = await agent
        .patch(`/api/admin-v2/admins/${targetAdminId}/password`)
        .set(`origin`, adminOrigin)
        .set(`x-csrf-token`, csrf ?? ``)
        .send({ password: `NewValid1!@#abc`, passwordConfirmation: `` })
        .expect(400);

      const body = res.body as { message?: string };
      expect(body.message).toBe(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED);
    });

    it(`returns 401 when passwordConfirmation is wrong`, async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post(`/api/admin-v2/auth/login`)
        .set(`origin`, adminOrigin)
        .send({ email: STEP_UP_SUPER_EMAIL, password: STEP_UP_SUPER_PASSWORD })
        .expect(201);
      const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
      expect(csrf).toBeTruthy();

      const res = await agent
        .patch(`/api/admin-v2/admins/${targetAdminId}/password`)
        .set(`origin`, adminOrigin)
        .set(`x-csrf-token`, csrf ?? ``)
        .send({ password: `NewValid1!@#abc`, passwordConfirmation: `WrongPassword1!@#` })
        .expect(401);

      const body = res.body as { message?: string };
      expect(body.message).toBe(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    });
  });

  describe(`PATCH /api/admin-v2/admins/:adminId (delete, step-up required)`, () => {
    it(`returns 400 when passwordConfirmation is missing for delete`, async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post(`/api/admin-v2/auth/login`)
        .set(`origin`, adminOrigin)
        .send({ email: STEP_UP_SUPER_EMAIL, password: STEP_UP_SUPER_PASSWORD })
        .expect(201);
      const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
      expect(csrf).toBeTruthy();

      const res = await agent
        .patch(`/api/admin-v2/admins/${targetAdminId}`)
        .set(`origin`, adminOrigin)
        .set(`x-csrf-token`, csrf ?? ``)
        .send({ action: `delete` })
        .expect(400);

      const body = res.body as { message?: string };
      expect(body.message).toBe(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED);
    });

    it(`returns 401 when passwordConfirmation is wrong for delete`, async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post(`/api/admin-v2/auth/login`)
        .set(`origin`, adminOrigin)
        .send({ email: STEP_UP_SUPER_EMAIL, password: STEP_UP_SUPER_PASSWORD })
        .expect(201);
      const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
      expect(csrf).toBeTruthy();

      const res = await agent
        .patch(`/api/admin-v2/admins/${targetAdminId}`)
        .set(`origin`, adminOrigin)
        .set(`x-csrf-token`, csrf ?? ``)
        .send({ action: `delete`, passwordConfirmation: `WrongPassword1!@#` })
        .expect(401);

      const body = res.body as { message?: string };
      expect(body.message).toBe(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    });
  });
});
