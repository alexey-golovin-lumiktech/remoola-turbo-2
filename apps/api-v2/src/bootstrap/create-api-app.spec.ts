import { jest, expect, afterEach, describe, it } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { type Express } from 'express';

describe(`createApiApp`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  async function loadFactory() {
    jest.resetModules();

    const mockOriginResolver = {};
    const mockPrisma = {};
    const mockApp = {
      get: jest.fn<(...a: any[]) => any>((token: { name?: string }) => {
        if (token.name === `OriginResolverService`) return mockOriginResolver;
        if (token.name === `PrismaService`) return mockPrisma;
        throw new Error(`Unexpected provider token ${token.name ?? `<anonymous>`}`);
      }),
    };
    const mockCreate = jest.fn<(...args: unknown[]) => Promise<typeof mockApp>>(async () => mockApp);
    const mockAdapterServers: unknown[] = [];
    const mockConfigureApp = jest.fn<(app: unknown, originResolver: unknown) => void>();
    const mockWaitForDatabase = jest.fn<(logger: Logger, prisma: unknown) => Promise<void>>(async () => undefined);
    const mockDevBootstrapSeed = jest.fn<(logger: Logger, prisma: unknown) => Promise<void>>(async () => undefined);

    jest.doMock(`@nestjs/core`, () => ({
      NestFactory: {
        create: mockCreate,
      },
    }));
    jest.doMock(`@nestjs/platform-express`, () => ({
      ExpressAdapter: class ExpressAdapter {
        constructor(server: unknown) {
          mockAdapterServers.push(server);
        }
      },
    }));
    jest.doMock(`../app.module`, () => ({
      AppModule: class AppModule {},
    }));
    jest.doMock(`../configure-app`, () => ({
      configureApp: mockConfigureApp,
    }));
    jest.doMock(`../devBootstrapSeed`, () => ({
      devBootstrapSeed: mockDevBootstrapSeed,
    }));
    jest.doMock(`../shared/origin-resolver.service`, () => ({
      OriginResolverService: class OriginResolverService {},
    }));
    jest.doMock(`../shared/prisma.service`, () => ({
      PrismaService: class PrismaService {},
    }));
    jest.doMock(`../waitForDatabase`, () => ({
      waitForDatabase: mockWaitForDatabase,
    }));

    const { createApiApp } = await import(`./create-api-app`);

    return {
      createApiApp,
      mockAdapterServers,
      mockApp,
      mockConfigureApp,
      mockCreate,
      mockDevBootstrapSeed,
      mockOriginResolver,
      mockPrisma,
      mockWaitForDatabase,
    };
  }

  it(`creates the persistent Nest app with raw body parsing and shared boot steps`, async () => {
    const {
      createApiApp,
      mockApp,
      mockConfigureApp,
      mockCreate,
      mockDevBootstrapSeed,
      mockOriginResolver,
      mockPrisma,
      mockWaitForDatabase,
    } = await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);

    await expect(createApiApp({ logger })).resolves.toBe(mockApp);

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Function), { rawBody: true });
    expect(mockConfigureApp).toHaveBeenCalledWith(mockApp, mockOriginResolver);
    expect(mockWaitForDatabase).toHaveBeenCalledWith(logger, mockPrisma);
    expect(mockDevBootstrapSeed).toHaveBeenCalledWith(logger, mockPrisma);
  });

  it(`runs create, configure, waitForDatabase, and devBootstrapSeed in the current order`, async () => {
    const { createApiApp, mockConfigureApp, mockCreate, mockDevBootstrapSeed, mockWaitForDatabase } =
      await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);

    await createApiApp({ logger });

    expect(mockCreate.mock.invocationCallOrder[0]).toBeLessThan(mockConfigureApp.mock.invocationCallOrder[0]);
    expect(mockConfigureApp.mock.invocationCallOrder[0]).toBeLessThan(mockWaitForDatabase.mock.invocationCallOrder[0]);
    expect(mockWaitForDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockDevBootstrapSeed.mock.invocationCallOrder[0],
    );
  });

  it(`creates the Vercel Express-adapter Nest app with the same shared boot steps`, async () => {
    const { createApiApp, mockAdapterServers, mockApp, mockConfigureApp, mockCreate, mockOriginResolver } =
      await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);
    const server = (() => undefined) as unknown as Express;

    await expect(createApiApp({ logger, server })).resolves.toBe(mockApp);

    expect(mockAdapterServers).toEqual([server]);
    expect(mockCreate).toHaveBeenCalledWith(expect.any(Function), expect.any(Object), { rawBody: true });
    expect(mockConfigureApp).toHaveBeenCalledWith(mockApp, mockOriginResolver);
  });

  it(`propagates configureApp failures before database startup work begins`, async () => {
    const { createApiApp, mockConfigureApp, mockDevBootstrapSeed, mockWaitForDatabase } = await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);
    const failure = new Error(`configureApp failed`);

    mockConfigureApp.mockImplementation(() => {
      throw failure;
    });

    await expect(createApiApp({ logger })).rejects.toBe(failure);
    expect(mockWaitForDatabase).not.toHaveBeenCalled();
    expect(mockDevBootstrapSeed).not.toHaveBeenCalled();
  });

  it(`propagates waitForDatabase failures before devBootstrapSeed runs`, async () => {
    const { createApiApp, mockDevBootstrapSeed, mockWaitForDatabase } = await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);
    const failure = new Error(`database unavailable`);

    mockWaitForDatabase.mockRejectedValueOnce(failure);

    await expect(createApiApp({ logger })).rejects.toBe(failure);
    expect(mockDevBootstrapSeed).not.toHaveBeenCalled();
  });

  it(`propagates devBootstrapSeed failures after the database wait succeeds`, async () => {
    const { createApiApp, mockDevBootstrapSeed, mockWaitForDatabase } = await loadFactory();
    const logger = new Logger(`CreateApiAppSpec`);
    const failure = new Error(`bootstrap seed failed`);

    mockDevBootstrapSeed.mockRejectedValueOnce(failure);

    await expect(createApiApp({ logger })).rejects.toBe(failure);
    expect(mockWaitForDatabase).toHaveBeenCalledTimes(1);
  });
});
