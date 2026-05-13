import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { syncBootstrapAdminSeedAccounts } from './admin-bootstrap-rbac';
import { runBootstrapSeed } from './bootstrap-seed';

jest.mock(`@nestjs/core`, () => ({
  NestFactory: {
    createApplicationContext: jest.fn(),
  },
}));
jest.mock(`../app.module`, () => ({
  AppModule: class AppModule {},
}));
jest.mock(`../envs`, () => ({
  envs: {
    ALLOW_PRODUCTION_BOOTSTRAP_SEED: false,
    DEFAULT_ADMIN_EMAIL: `regular.admin@example.com`,
    DEFAULT_ADMIN_PASSWORD: `regular-password`,
    NODE_ENV: `production`,
    SUPER_ADMIN_EMAIL: `super.admin@example.com`,
    SUPER_ADMIN_PASSWORD: `super-password`,
    isProductionLike: true,
  },
}));
jest.mock(`./admin-bootstrap-rbac`, () => ({
  syncBootstrapAdminSeedAccounts: jest.fn(async () => undefined),
}));

const mockedNestFactory = jest.mocked(NestFactory);
const mockedSyncBootstrapAdminSeedAccounts = jest.mocked(syncBootstrapAdminSeedAccounts);

describe(`bootstrap seed runner`, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`refuses production-like bootstrap seeding without the explicit opt-in`, async () => {
    await expect(runBootstrapSeed()).rejects.toThrow(/ALLOW_PRODUCTION_BOOTSTRAP_SEED=true/);

    expect(mockedNestFactory.createApplicationContext).not.toHaveBeenCalled();
  });

  it(`runs production-like bootstrap seeding when explicitly opted in`, async () => {
    const { envs } = await import(`../envs`);
    envs.ALLOW_PRODUCTION_BOOTSTRAP_SEED = true;
    const prisma = {
      exchangeRateModel: {
        count: jest.fn(async () => 1),
        createMany: jest.fn(async () => ({ count: 0 })),
      },
    } as unknown as PrismaClient;
    const app = {
      close: jest.fn(async () => undefined),
      get: jest.fn(() => prisma),
    };
    mockedNestFactory.createApplicationContext.mockResolvedValue(app as unknown as INestApplicationContext);

    await runBootstrapSeed();

    expect(mockedSyncBootstrapAdminSeedAccounts).toHaveBeenCalledWith({
      admins: [
        {
          email: `regular.admin@example.com`,
          password: `regular-password`,
          type: $Enums.AdminType.ADMIN,
        },
        {
          email: `super.admin@example.com`,
          password: `super-password`,
          type: $Enums.AdminType.SUPER,
        },
      ],
      logger: expect.anything(),
      prisma,
    });
    expect(app.close).toHaveBeenCalledTimes(1);
  });
});
