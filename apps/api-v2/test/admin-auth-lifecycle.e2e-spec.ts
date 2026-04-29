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

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import {
  getApiAdminAccessTokenCookieKey,
  getApiAdminCsrfTokenCookieKey,
  getApiAdminRefreshTokenCookieKey,
} from '../src/shared-common';

describe(`Admin auth lifecycle (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminEmail = `admin-auth-lifecycle@local.test`;
  const adminPassword = `AdminLifecycle1!@#`;
  const adminOrigin = `http://127.0.0.1:3010`;

  function asCookieArray(header: string | string[] | undefined): string[] {
    if (Array.isArray(header)) return header;
    if (typeof header === `string`) return [header];
    return [];
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash, salt } = await hashPassword(adminPassword);
    await prisma.adminModel.create({
      data: {
        email: adminEmail,
        password: hash,
        salt,
        type: $Enums.AdminType.ADMIN,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
    if (app) {
      await app.close();
    }
  });

  it(`GET /api/admin-v2/auth/me rejects when unauthenticated`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/auth/me`).expect(401);
  });

  it(`login sets cookies, refresh-access rotates tokens, logout clears session`, async () => {
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent
      .post(`/api/admin-v2/auth/login`)
      .set(`origin`, adminOrigin)
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    const setCookie = asCookieArray(loginRes.headers[`set-cookie`]);
    expect(setCookie.length).toBeGreaterThan(0);
    expect(setCookie.some((line) => line.startsWith(`${getApiAdminAccessTokenCookieKey()}=`))).toBe(true);
    expect(setCookie.some((line) => line.startsWith(`${getApiAdminRefreshTokenCookieKey()}=`))).toBe(true);
    const csrfCookie = setCookie.find((line) => line.startsWith(`${getApiAdminCsrfTokenCookieKey()}=`));
    const csrfToken = csrfCookie?.split(`;`)[0]?.slice(`${getApiAdminCsrfTokenCookieKey()}=`.length);
    expect(loginRes.body).toEqual({ ok: true });
    expect(csrfToken).toBeTruthy();

    const meAfterLogin = await agent.get(`/api/admin-v2/auth/me`).expect(200);
    expect(meAfterLogin.body?.email).toBe(adminEmail);
    expect(meAfterLogin.body?.type).toBe(`ADMIN`);

    const refreshRes = await agent
      .post(`/api/admin-v2/auth/refresh-access`)
      .set(`origin`, adminOrigin)
      .set(`x-csrf-token`, csrfToken ?? ``);
    expect(refreshRes.status).toBeLessThan(400);
    expect(refreshRes.body).toEqual({ ok: true });
    const refreshCookies = asCookieArray(refreshRes.headers[`set-cookie`]);
    expect(refreshCookies.some((line) => line.startsWith(`${getApiAdminAccessTokenCookieKey()}=`))).toBe(true);
    expect(refreshCookies.some((line) => line.startsWith(`${getApiAdminRefreshTokenCookieKey()}=`))).toBe(true);
    const refreshedCsrfCookie = refreshCookies.find((line) => line.startsWith(`${getApiAdminCsrfTokenCookieKey()}=`));
    const refreshedCsrfToken =
      refreshedCsrfCookie?.split(`;`)[0]?.slice(`${getApiAdminCsrfTokenCookieKey()}=`.length) ?? csrfToken;

    await agent.post(`/api/admin-v2/auth/refresh-access`).expect(401);

    const logoutRes = await agent
      .post(`/api/admin-v2/auth/logout`)
      .set(`origin`, adminOrigin)
      .set(`x-csrf-token`, refreshedCsrfToken ?? ``)
      .expect(201);
    const logoutCookies = asCookieArray(logoutRes.headers[`set-cookie`]);
    expect(logoutCookies.some((line) => line.startsWith(`${getApiAdminAccessTokenCookieKey()}=`))).toBe(true);
    expect(logoutCookies.some((line) => line.startsWith(`${getApiAdminRefreshTokenCookieKey()}=`))).toBe(true);

    await agent.get(`/api/admin-v2/auth/me`).expect(401);
  });
});
