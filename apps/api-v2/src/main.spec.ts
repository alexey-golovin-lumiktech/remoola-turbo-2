import { type PrismaClient } from '@remoola/database-2';

async function loadMainWithEnv(envOverrides: { NODE_ENV: string; isProductionLike: boolean }): Promise<{
  runDevBootstrapSeed: (prisma: PrismaClient) => Promise<void>;
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

  const main = await import(`./main`);
  return {
    runDevBootstrapSeed: main.runDevBootstrapSeed,
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

    await runDevBootstrapSeed(prisma);

    expect(seedBootstrapData).toHaveBeenCalledTimes(1);
    expect(seedBootstrapData).toHaveBeenCalledWith(prisma, expect.anything());
  });

  it(`does not run bootstrap seed during production-like server boot`, async () => {
    const { runDevBootstrapSeed, seedBootstrapData } = await loadMainWithEnv({
      NODE_ENV: `production`,
      isProductionLike: true,
    });

    await runDevBootstrapSeed({} as PrismaClient);

    expect(seedBootstrapData).not.toHaveBeenCalled();
  });
});
