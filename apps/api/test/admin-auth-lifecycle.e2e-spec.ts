/**
 * E2E admin auth lifecycle tests for login/me/refresh-access/logout contracts.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
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
import { ADMIN_ACCESS_TOKEN_COOKIE_KEY, ADMIN_REFRESH_TOKEN_COOKIE_KEY } from '../src/shared-common';

describe(`Admin auth lifecycle (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminEmail = `admin-auth-lifecycle@local.test`;
  const adminPassword = `AdminLifecycle1!@#`;

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

  it(`GET /api/admin/auth/me rejects when unauthenticated`, async () => {
    await request(app.getHttpServer()).get(`/api/admin/auth/me`).expect(401);
  });

  it(`login sets cookies, refresh-access rotates tokens, logout clears session`, async () => {
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent
      .post(`/api/admin/auth/login`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    const setCookie = asCookieArray(loginRes.headers[`set-cookie`]);
    expect(setCookie.length).toBeGreaterThan(0);
    expect(setCookie.some((line) => line.startsWith(`${ADMIN_ACCESS_TOKEN_COOKIE_KEY}=`))).toBe(true);
    expect(setCookie.some((line) => line.startsWith(`${ADMIN_REFRESH_TOKEN_COOKIE_KEY}=`))).toBe(true);
    expect(typeof loginRes.body?.refreshToken).toBe(`string`);

    const meAfterLogin = await agent.get(`/api/admin/auth/me`).expect(200);
    expect(meAfterLogin.body?.email).toBe(adminEmail);
    expect(meAfterLogin.body?.type).toBe(`ADMIN`);

    const refreshRes = await request(app.getHttpServer())
      .post(`/api/admin/auth/refresh-access`)
      .send({ refreshToken: loginRes.body?.refreshToken });
    expect(refreshRes.status).toBeLessThan(400);
    expect(typeof refreshRes.body?.accessToken).toBe(`string`);
    expect(typeof refreshRes.body?.refreshToken).toBe(`string`);

    await request(app.getHttpServer())
      .post(`/api/admin/auth/refresh-access`)
      .send({ refreshToken: `definitely-invalid-refresh-token` })
      .expect(400);

    const logoutRes = await agent.post(`/api/admin/auth/logout`).expect(201);
    const logoutCookies = asCookieArray(logoutRes.headers[`set-cookie`]);
    expect(logoutCookies.some((line) => line.startsWith(`${ADMIN_ACCESS_TOKEN_COOKIE_KEY}=`))).toBe(true);
    expect(logoutCookies.some((line) => line.startsWith(`${ADMIN_REFRESH_TOKEN_COOKIE_KEY}=`))).toBe(true);

    await agent.get(`/api/admin/auth/me`).expect(401);
  });
});
