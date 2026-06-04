import { readFileSync } from 'node:fs';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';

import { jest, expect, afterEach, describe, it } from '@jest/globals';
import { Logger } from '@nestjs/common';

import { type PrismaClient } from '@remoola/database-2';

async function loadMainWithEnv(envOverrides: { NODE_ENV: string; isProductionLike: boolean }): Promise<{
  runDevBootstrapSeed: (logger: Logger, prisma: PrismaClient) => Promise<void>;
  seedBootstrapData: jest.Mock<(...a: any[]) => any>;
}> {
  jest.resetModules();

  const seedBootstrapData = jest.fn<(...a: any[]) => any>(async () => undefined);

  jest.doMock(`./app.module`, () => ({
    AppModule: class AppModule {},
  }));
  jest.doMock(`./bootstrap/bootstrap-seed`, () => ({
    seedBootstrapData,
  }));
  jest.doMock(`./configure-app`, () => ({
    configureApp: jest.fn<(...a: any[]) => any>(),
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

  async function loadVercelMain(options?: {
    createApiAppImpl?: jest.Mock<(...a: any[]) => Promise<any>>;
    envOverrides?: Partial<{
      NGROK_AUTH_TOKEN: string;
      NGROK_DOMAIN: string;
      NGROK_ENABLED: boolean;
      PORT: number;
      SWAGGER_ENABLED: boolean;
      VERCEL: number;
      isProductionLike: boolean;
    }>;
  }) {
    jest.resetModules();

    const server = jest.fn<(req: IncomingMessage, res: ServerResponse) => void>();
    const app = {
      init: jest.fn<(...a: any[]) => any>(async () => undefined),
      listen: jest.fn<(...a: any[]) => any>(async () => undefined),
    };
    const expressFactory = jest.fn<(...a: any[]) => any>(() => server);
    const createApiApp = options?.createApiAppImpl ?? jest.fn<(...a: any[]) => Promise<typeof app>>(async () => app);
    const nestFactorySentinel = {
      create: jest.fn<(...a: any[]) => any>(),
    };

    jest.doMock(`express`, () => ({
      __esModule: true,
      default: expressFactory,
    }));
    jest.doMock(`@nestjs/core`, () => ({
      NestFactory: nestFactorySentinel,
    }));
    jest.doMock(`./bootstrap/create-api-app`, () => ({
      createApiApp,
    }));
    jest.doMock(`./envs`, () => ({
      envs: {
        NGROK_AUTH_TOKEN: `ngrok-token`,
        NGROK_DOMAIN: `test.ngrok.app`,
        NGROK_ENABLED: false,
        PORT: 3000,
        SWAGGER_ENABLED: false,
        VERCEL: 1,
        isProductionLike: true,
        ...options?.envOverrides,
      },
    }));
    jest.doMock(`./infrastructure/ngrok/ngrok-ingress.service`, () => ({
      NgrokIngressService: class NgrokIngressService {},
    }));

    const mainModule = await import(`./main`);

    return {
      app,
      createApiApp,
      expressFactory,
      handler: mainModule.default,
      server,
      vercelNestEntrypointDetector: mainModule.vercelNestEntrypointDetector,
      nestFactorySentinel,
    };
  }

  it(`initializes the cached Vercel server through createApiApp without calling listen`, async () => {
    const { app, createApiApp, expressFactory, handler, nestFactorySentinel, server, vercelNestEntrypointDetector } =
      await loadVercelMain();
    const firstReq = {} as IncomingMessage;
    const firstRes = {} as ServerResponse;
    const secondReq = {} as IncomingMessage;
    const secondRes = {} as ServerResponse;

    await expect(handler(firstReq, firstRes)).resolves.toBeUndefined();
    await expect(handler(secondReq, secondRes)).resolves.toBeUndefined();

    expect(vercelNestEntrypointDetector).toBe(nestFactorySentinel);
    expect(expressFactory).toHaveBeenCalledTimes(1);
    expect(createApiApp).toHaveBeenCalledTimes(1);
    expect(createApiApp).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: expect.objectContaining({
          context: `Bootstrap`,
        }),
        server,
      }),
    );
    expect(app.init).toHaveBeenCalledTimes(1);
    expect(app.listen).not.toHaveBeenCalled();
    expect(server).toHaveBeenNthCalledWith(1, firstReq, firstRes);
    expect(server).toHaveBeenNthCalledWith(2, secondReq, secondRes);
  });

  it(`retries server creation after a failed cold start`, async () => {
    const coldStartError = new Error(`cold start failed`);
    const retryApp = {
      init: jest.fn<(...a: any[]) => any>(async () => undefined),
      listen: jest.fn<(...a: any[]) => any>(async () => undefined),
    };
    const createApiApp = jest.fn<(...a: any[]) => Promise<typeof retryApp>>();
    createApiApp.mockRejectedValueOnce(coldStartError);
    createApiApp.mockResolvedValueOnce(retryApp);

    const { handler, server } = await loadVercelMain({
      createApiAppImpl: createApiApp,
    });
    const req = {} as IncomingMessage;
    const res = {} as ServerResponse;

    await expect(handler(req, res)).rejects.toBe(coldStartError);
    await expect(handler(req, res)).resolves.toBeUndefined();

    expect(createApiApp).toHaveBeenCalledTimes(2);
    expect(retryApp.init).toHaveBeenCalledTimes(1);
    expect(retryApp.listen).not.toHaveBeenCalled();
    expect(server).toHaveBeenCalledWith(req, res);
  });

  it(`keeps the persistent Node bootstrap side effects in the entrypoint source`, () => {
    const source = readFileSync(join(__dirname, `main.ts`), `utf8`);

    expect(source).toContain(`process.env.NO_COLOR = \`true\``);
    expect(source).toContain(`await app.listen(port)`);
    expect(source).toContain(`if (!isOnVercel && envs.NGROK_ENABLED)`);
    expect(source).toContain(`await ngrokService.startIfEnabled`);
    expect(source).toContain(`registerProcessHandlers(app)`);
  });
});
