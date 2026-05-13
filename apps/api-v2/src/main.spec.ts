import { type IncomingMessage, type ServerResponse } from 'node:http';

import { jest, expect, afterEach, describe, it } from '@jest/globals';
import { Logger } from '@nestjs/common';

import { type PrismaClient } from '@remoola/database-2';

async function loadMainWithEnv(envOverrides: { NODE_ENV: string; isProductionLike: boolean }): Promise<{
  runDevBootstrapSeed: (logger: Logger, prisma: PrismaClient) => Promise<void>;
  seedBootstrapData: jest.Mock;
}> {
  jest.resetModules();

  const seedBootstrapData = jest.fn(async () => undefined);

  jest.doMock(`./app.module`, () => ({
    AppModule: class AppModule {},
  }));
  jest.doMock(`./bootstrap/bootstrap-seed`, () => ({
    seedBootstrapData,
  }));
  jest.doMock(`./configure-app`, () => ({
    configureApp: jest.fn(),
  }));
  jest.doMock(`./envs`, () => ({
    envs: {
      NODE_ENV: envOverrides.NODE_ENV,
      isProductionLike: envOverrides.isProductionLike,
    },
  }));
  jest.doMock(`./infrastructure/ngrok/ngrok-ingress.service`, () => ({
    NgrokIngressService: class NgrokIngressService {},
  }));
  jest.doMock(`./shared/origin-resolver.service`, () => ({
    OriginResolverService: class OriginResolverService {},
  }));
  jest.doMock(`./shared/prisma.service`, () => ({
    PrismaService: class PrismaService {},
  }));

  const seeder = await import(`./devBootstrapSeed`);
  return {
    runDevBootstrapSeed: seeder.devBootstrapSeed,
    seedBootstrapData,
  };
}

describe(`main bootstrap seed`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it(`runs bootstrap seed during non-production-like server boot`, async () => {
    const { runDevBootstrapSeed, seedBootstrapData } = await loadMainWithEnv({
      NODE_ENV: `development`,
      isProductionLike: false,
    });
    const prisma = {} as PrismaClient;
    const logger = new Logger(`MAIN SPEC Bootstrap`);

    await runDevBootstrapSeed(logger, prisma);

    expect(seedBootstrapData).toHaveBeenCalledTimes(1);
    expect(seedBootstrapData).toHaveBeenCalledWith(prisma, expect.anything());
  });

  it(`does not run bootstrap seed during production-like server boot`, async () => {
    const { runDevBootstrapSeed, seedBootstrapData } = await loadMainWithEnv({
      NODE_ENV: `production`,
      isProductionLike: true,
    });
    const logger = new Logger(`MAIN SPEC Bootstrap`);

    await runDevBootstrapSeed(logger, {} as PrismaClient);
    expect(seedBootstrapData).not.toHaveBeenCalled();
  });
});

describe(`Vercel handler bootstrap`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it(`retries server creation after a failed cold start`, async () => {
    jest.resetModules();

    const server = jest.fn<(req: IncomingMessage, res: ServerResponse) => void>();
    const coldStartError = new Error(`cold start failed`);
    const app = {
      get: jest.fn(() => ({})),
      init: jest.fn(async () => undefined),
    };
    const create = jest.fn<() => Promise<typeof app>>();

    create.mockRejectedValueOnce(coldStartError);
    create.mockResolvedValueOnce(app);

    jest.doMock(`express`, () => ({
      __esModule: true,
      default: jest.fn(() => server),
    }));
    jest.doMock(`@nestjs/core`, () => ({
      NestFactory: {
        create,
      },
    }));
    jest.doMock(`@nestjs/platform-express`, () => ({
      ExpressAdapter: class ExpressAdapter {
        constructor(readonly serverInstance: unknown) {}
      },
    }));
    jest.doMock(`./app.module`, () => ({
      AppModule: class AppModule {},
    }));
    jest.doMock(`./configure-app`, () => ({
      configureApp: jest.fn(),
    }));
    jest.doMock(`./devBootstrapSeed`, () => ({
      devBootstrapSeed: jest.fn(async () => undefined),
    }));
    jest.doMock(`./envs`, () => ({
      envs: {
        isProductionLike: true,
        VERCEL: 1,
      },
    }));
    jest.doMock(`./infrastructure/ngrok/ngrok-ingress.service`, () => ({
      NgrokIngressService: class NgrokIngressService {},
    }));
    jest.doMock(`./shared/origin-resolver.service`, () => ({
      OriginResolverService: class OriginResolverService {},
    }));
    jest.doMock(`./shared/prisma.service`, () => ({
      PrismaService: class PrismaService {},
    }));
    jest.doMock(`./waitForDatabase`, () => ({
      waitForDatabase: jest.fn(async () => undefined),
    }));

    const { default: handler } = await import(`./main`);
    const req = {} as IncomingMessage;
    const res = {} as ServerResponse;

    await expect(handler(req, res)).rejects.toBe(coldStartError);
    await expect(handler(req, res)).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(2);
    expect(server).toHaveBeenCalledWith(req, res);
  });
});
